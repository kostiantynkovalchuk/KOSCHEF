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
    const prompt = `${SYSTEM_PROMPT}\n\nI have ${ingredientsString}. Please give me a recipe you'd recommend I make!`;

    // Try the direct API approach with fetch instead of HfInference
    const response = await fetch(
      "https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.koschef}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 200,
            temperature: 0.7,
            wait_for_model: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("API Response:", data); // Debug log

    // Handle different response formats
    let recipe = "";
    if (Array.isArray(data) && data[0]?.generated_text) {
      recipe = data[0].generated_text;
    } else if (data.generated_text) {
      recipe = data.generated_text;
    } else {
      recipe = "Sorry, couldn't generate a recipe. Please try again.";
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ recipe }),
    };
  } catch (err) {
    console.error("API error:", err);
    return {
      statusCode: 503,
      body: JSON.stringify({
        error: `Recipe generation failed: ${err.message}`,
      }),
    };
  }
}
