import { HfInference } from "@huggingface/inference";

const SYSTEM_PROMPT = `
You are an assistant that receives a list of ingredients that a user has and suggests a recipe they could make with some or all of those ingredients. You don't need to use every ingredient they mention in your recipe. The recipe can include additional ingredients they didn't mentioned in your recipe. Format your response in markdown.
`;

const hf = new HfInference(process.env.koschef);

export async function handler(event, context) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const { ingredients } = JSON.parse(event.body);
    if (!ingredients || !Array.isArray(ingredients)) {
      return { statusCode: 400, body: "Invalid ingredients array" };
    }

    const ingredientsString = ingredients.join(", ");
    const prompt = `Generate a recipe using these ingredients: ${ingredientsString}`;

    // Test if your token works at all with a simple model
    console.log("Testing token with sentence transformers...");

    const response = await fetch(
      "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.koschef}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: "Hello world",
        }),
      }
    );

    console.log("Token test response status:", response.status);

    if (response.status === 401) {
      throw new Error("Invalid token - check your HuggingFace access token");
    }

    if (response.status === 404) {
      // Try a different approach - use OpenAI API format for HF
      console.log("Trying text generation with different format...");

      const textGenResponse = await fetch(
        "https://api-inference.huggingface.co/models/facebook/opt-350m",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.koschef}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              max_new_tokens: 100,
              temperature: 0.7,
              do_sample: true,
            },
          }),
        }
      );

      console.log("Text gen response status:", textGenResponse.status);

      if (!textGenResponse.ok) {
        const errorText = await textGenResponse.text();
        console.error("Text gen error:", errorText);
        throw new Error(
          `Text generation failed: ${textGenResponse.status} - ${errorText}`
        );
      }

      const data = await textGenResponse.json();
      console.log("Text gen response:", data);

      let recipe = "";
      if (Array.isArray(data) && data[0]?.generated_text) {
        recipe = data[0].generated_text.replace(prompt, "").trim();
      } else if (data.generated_text) {
        recipe = data.generated_text.replace(prompt, "").trim();
      } else {
        recipe = "Sorry, couldn't generate a recipe. Please try again.";
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ recipe }),
      };
    }

    // If we get here, token works but model might be wrong
    throw new Error("Unexpected response from HuggingFace API");
  } catch (err) {
    console.error("Full error details:", err);
    return {
      statusCode: 503,
      body: JSON.stringify({
        error: `Recipe generation failed: ${err.message}`,
      }),
    };
  }
}
