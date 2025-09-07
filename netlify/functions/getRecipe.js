import { HfInference } from "@huggingface/inference";

const SYSTEM_PROMPT = `
You are an assistant that receives a list of ingredients that a user has and suggests a recipe they could make with some or all of those ingredients. You don't need to use every ingredient they mention in your recipe. The recipe can include additional ingredients they didn't mention in your recipe. Format your response in markdown.
`;

const hf = new HfInference(process.env.koschef); // Change this line

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

    const response = await hf.textGeneration({
      model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
      inputs: prompt,
      parameters: {
        max_new_tokens: 500,
        temperature: 0.7,
        wait_for_model: true,
        use_cache: false, // Add this
      },
      options: {
        retry_on_error: true, // Add this
        wait_for_model: true, // Add this
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ recipe: response.generated_text }),
    };
  } catch (err) {
    console.error("HF error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
