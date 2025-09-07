import { HfInference } from "@huggingface/inference";

const SYSTEM_PROMPT = `
You are an assistant that receives a list of ingredients that a user has and suggests a recipe they could make with some or all of those ingredients. You don't need to use every ingredient they mention in your recipe. The recipe can include additional ingredients they didn't mention, but try not to include too many extra ingredients. Format your response in markdown to make it easier to render to a web page.
`;

// Use Vite's environment variable for frontend safety
const hf = new HfInference(import.meta.env.VITE_HF_ACCESS_TOKEN);

export async function getRecipeFromMistral(ingredientsArr) {
  const ingredientsString = ingredientsArr.join(", ");
  const prompt = `${SYSTEM_PROMPT}\n\nI have ${ingredientsString}. Please give me a recipe you'd recommend I make!`;

  try {
    const response = await hf.textGeneration({
      model: "tiiuae/falcon-7b-instruct",
      inputs: prompt,
      parameters: {
        max_new_tokens: 500,
        temperature: 0.7,
        wait_for_model: true,
      },
    });

    return response.generated_text;
  } catch (err) {
    console.error("HF error:", err.message);
  }
}
