import { HfInference } from "@huggingface/inference";

const SYSTEM_PROMPT = `
You are an assistant that receives a list of ingredients that a user has and suggests a recipe they could make with some or all of those ingredients. You don't need to use every ingredient they mention in your recipe. The recipe can include additional ingredients they didn't mentioned in your recipe. Format your response in markdown.
`;

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

    console.log(
      "Token value (first 10 chars):",
      process.env.koschef?.substring(0, 10)
    );
    console.log("Token exists:", !!process.env.koschef);

    // Create HF instance and try with very basic parameters
    const hf = new HfInference(process.env.koschef);

    try {
      console.log("Attempting with minimal parameters...");
      const response = await hf.textGeneration({
        model: "gpt2", // Most basic model
        inputs: `Recipe using ${ingredientsString}: `,
        parameters: {
          max_length: 200, // Use max_length instead of max_new_tokens
          temperature: 0.8,
        },
      });

      console.log("AI Response received:", typeof response.generated_text);

      return {
        statusCode: 200,
        body: JSON.stringify({ recipe: response.generated_text }),
      };
    } catch (aiError) {
      console.error(
        "AI model failed, using enhanced fallback:",
        aiError.message
      );

      // Enhanced fallback with actual recipe suggestions
      const recipeTemplates = {
        "avocado,potato,olive oil,cucumber": {
          title: "Mediterranean Potato Salad",
          instructions: [
            "Boil potatoes until tender (15-20 minutes)",
            "Dice cucumber and avocado",
            "Mix with olive oil, lemon juice, salt and pepper",
            "Serve chilled",
          ],
        },
        default: {
          title: `Simple ${ingredientsString} Recipe`,
          instructions: [
            "Prepare all ingredients",
            "Heat olive oil in a pan if needed",
            "Cook ingredients according to type",
            "Season and serve",
          ],
        },
      };

      const key = ingredients.sort().join(",");
      const template = recipeTemplates[key] || recipeTemplates["default"];

      const fallbackRecipe = `# ${template.title}

## Ingredients:
- ${ingredients.join("\n- ")}
- Salt and pepper to taste

## Instructions:
${template.instructions.map((step, i) => `${i + 1}. ${step}`).join("\n")}

*Generated with backup recipe system*`;

      return {
        statusCode: 200,
        body: JSON.stringify({ recipe: fallbackRecipe }),
      };
    }
  } catch (err) {
    console.error("Function error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
