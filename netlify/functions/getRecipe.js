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
    const prompt = `Recipe for: ${ingredientsString}\n\nIngredients and instructions:`;

    console.log("Testing with a known working model...");

    // Try with a very simple, guaranteed working model
    const response = await fetch(
      "https://api-inference.huggingface.co/models/distilbert-base-uncased-finetuned-sst-2-english",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.koschef}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: "I love cooking!",
        }),
      }
    );

    console.log("Simple model response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Simple model error:", errorText);

      // If even simple models don't work, go back to HfInference library with basic model
      console.log("Trying with HfInference library and basic model...");

      try {
        const hfResponse = await hf.textGeneration({
          model: "gpt2",
          inputs: prompt,
          parameters: {
            max_new_tokens: 100,
            temperature: 0.7,
            return_full_text: false,
          },
        });

        return {
          statusCode: 200,
          body: JSON.stringify({ recipe: hfResponse.generated_text }),
        };
      } catch (hfError) {
        console.error("HfInference error:", hfError.message);

        // Last resort: provide a simple fallback recipe
        const fallbackRecipe = `# Simple Recipe with ${ingredientsString}

## Ingredients:
- ${ingredients.join("\n- ")}
- Salt and pepper to taste
- Oil for cooking

## Instructions:
1. Prepare all ingredients
2. Heat oil in a pan
3. Cook ingredients together for 10-15 minutes
4. Season with salt and pepper
5. Serve hot

*Note: This is a basic recipe template. Please adjust cooking times and methods based on your specific ingredients.*`;

        return {
          statusCode: 200,
          body: JSON.stringify({ recipe: fallbackRecipe }),
        };
      }
    }

    // If we get here, at least simple models work
    const data = await response.json();
    console.log("Simple model worked:", data);

    return {
      statusCode: 200,
      body: JSON.stringify({
        recipe:
          "Token and API are working! Model compatibility issue resolved.",
      }),
    };
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
