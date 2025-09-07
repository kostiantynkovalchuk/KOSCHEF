const SYSTEM_PROMPT = `You are a helpful cooking assistant. When given a list of ingredients, suggest a creative and practical recipe that uses some or all of those ingredients. You can suggest additional common ingredients if needed. Format your response in markdown with clear sections for ingredients and instructions.`;

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

    console.log("Calling Claude API with ingredients:", ingredientsString);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307", // Fast and cost-effective
        max_tokens: 500,
        temperature: 0.7,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `I have these ingredients: ${ingredientsString}. Please suggest a recipe I can make with them.`,
          },
        ],
      }),
    });

    console.log("Claude API response status:", response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Claude API error:", errorData);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Claude API success");

    const recipe = data.content[0].text;

    return {
      statusCode: 200,
      body: JSON.stringify({ recipe }),
    };
  } catch (err) {
    console.error("Claude API failed, using fallback:", err);

    // Keep your smart fallback system as backup
    const fallbackRecipe = `# Quick Recipe with ${ingredientsString}

## Ingredients:
- ${ingredients.join("\n- ")}
- Salt and pepper to taste
- Olive oil for cooking

## Instructions:
1. Prepare and wash all ingredients
2. Heat olive oil in a pan over medium heat
3. Cook ingredients according to their cooking times
4. Season with salt and pepper
5. Serve hot

*Note: Claude AI is temporarily unavailable. This is a basic recipe template.*`;

    return {
      statusCode: 200,
      body: JSON.stringify({ recipe: fallbackRecipe }),
    };
  }
}
