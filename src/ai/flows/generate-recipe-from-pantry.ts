'use server';

/**
 * @fileOverview Generates a recipe based on the ingredients in the user's pantry and their dietary restrictions.
 *
 * - generateRecipeFromPantry - A function that generates a recipe based on pantry and dietary restrictions.
 * - GenerateRecipeFromPantryInput - The input type for the generateRecipeFromPantry function.
 * - GenerateRecipeFromPantryOutput - The return type for the generateRecipeFromPantry function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const GenerateRecipeFromPantryInputSchema = z.object({
  pantryIngredients: z
    .array(
      z.object({
        name: z.string().describe('The name of the ingredient.'),
        quantity: z.string().describe('The quantity of the ingredient (e.g., 1 cup, 2 tbsp).'),
      })
    )
    .min(1, 'At least one pantry ingredient is required.') // Ensure pantry is not empty
    .describe('A list of ingredients available in the pantry.'),
  dietaryRestrictions: z
    .string()
    .optional()
    .describe('Any dietary restrictions the recipe should adhere to (e.g., vegetarian, gluten-free).'),
  cuisinePreference: z
    .string()
    .optional()
    .describe('The cuisine the user prefers (e.g., Italian, Mexican).'),
  cookTimePreference: z
    .string()
    .optional()
    .describe('The maximum amount of time in minutes the user wants to spend cooking (e.g., 30 minutes).'),
});

export type GenerateRecipeFromPantryInput = z.infer<typeof GenerateRecipeFromPantryInputSchema>;

const GenerateRecipeFromPantryOutputSchema = z.object({
  title: z.string().describe('The title of the generated recipe.'),
  ingredients: z
    .array(
      z.object({
        name: z.string().describe('The name of the ingredient.'),
        quantity: z.string().describe('The quantity of the ingredient.'),
      })
    )
    .describe('The ingredients **from the pantry** required for the recipe.'), // Emphasize pantry origin
  instructions: z.array(z.string()).describe('The preparation instructions for the recipe.'),
  cuisine: z.string().describe('The cuisine of the recipe (e.g., Italian, Mexican).'),
  cookTime: z.number().describe('The time it takes to cook the recipe in minutes.'),
  description: z.string().describe('A brief description of the recipe.'),
  notes: z.string().optional().describe('Optional notes, like suggesting additional ingredients not in the pantry for enhancement, or stating if the recipe is limited by the pantry.'),
});

export type GenerateRecipeFromPantryOutput = z.infer<typeof GenerateRecipeFromPantryOutputSchema>;

export async function generateRecipeFromPantry(input: GenerateRecipeFromPantryInput): Promise<
  GenerateRecipeFromPantryOutput
> {
  return generateRecipeFromPantryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateRecipeFromPantryPrompt',
  input: {
    schema: z.object({
      pantryIngredients: z
        .array(
          z.object({
            name: z.string().describe('The name of the ingredient.'),
            quantity: z.string().describe('The quantity of the ingredient (e.g., 1 cup, 2 tbsp).'),
          })
        )
        .min(1)
        .describe('A list of ingredients available in the pantry.'),
      dietaryRestrictions: z
        .string()
        .optional()
        .describe('Any dietary restrictions the recipe should adhere to (e.g., vegetarian, gluten-free).'),
      cuisinePreference: z
        .string()
        .optional()
        .describe('The cuisine the user prefers (e.g., Italian, Mexican).'),
      cookTimePreference: z
        .string()
        .optional()
        .describe('Maximum cook time in minutes.'),
    }),
  },
  output: {
    schema: z.object({
      title: z.string().describe('The title of the generated recipe.'),
      ingredients: z
        .array(
          z.object({
            name: z.string().describe('The name of the ingredient.'),
            quantity: z.string().describe('The quantity of the ingredient.'),
          })
        )
        .describe('The ingredients **strictly from the provided pantry list** required for the recipe.'),
      instructions: z.array(z.string()).describe('The preparation instructions for the recipe.'),
      cuisine: z.string().describe('The cuisine of the recipe (e.g., Italian, Mexican).'),
      cookTime: z.number().describe('The time it takes to cook the recipe in minutes.'),
      description: z.string().describe('A brief description of the recipe.'),
       notes: z.string().optional().describe('Optional notes, like suggesting additional ingredients not in the pantry for enhancement, or stating if the recipe is limited by the pantry.'),
    }),
  },
  prompt: `You are a creative recipe generator. Your task is to generate a delicious recipe based *only* on the ingredients provided in the user's pantry.

**Constraint:** You **MUST** create the recipe using **only** the ingredients listed below. Do not add any ingredients that are not on this list to the main recipe ingredients list.

Pantry Ingredients:
{{#each pantryIngredients}}
- {{this.name}} ({{this.quantity}})
{{/each}}

{{#if dietaryRestrictions}}
Dietary Restrictions: Adhere strictly to {{dietaryRestrictions}}.
{{/if}}

{{#if cuisinePreference}}
Cuisine Preference: Try to match {{cuisinePreference}} cuisine if possible with the given ingredients.
{{/if}}

{{#if cookTimePreference}}
Maximum Cook Time: The recipe should take no longer than {{cookTimePreference}} minutes to cook.
{{/if}}

Generate the recipe with a title, a list of the pantry ingredients used, step-by-step instructions, the cuisine type, estimated cook time, and a brief description.

**Important:**
1.  **Strictly use only the pantry ingredients listed above** for the main recipe ingredients.
2.  If you cannot create a satisfying recipe with *only* the provided ingredients, create the best possible recipe you can with them, and optionally add suggestions for 1-2 additional common ingredients (like salt, pepper, oil if not listed, or a specific spice) in the 'notes' field to enhance the dish, clearly stating these are optional additions not from the original pantry list.
3.  If the pantry ingredients are too limited to make *any* reasonable dish, state this limitation clearly in the 'notes' field and provide a minimal recipe if possible, or explain why it's not feasible.
4.  Ensure the 'ingredients' list in your output contains *only* items from the input 'pantryIngredients' list.
`,
});


const generateRecipeFromPantryFlow = ai.defineFlow<
  typeof GenerateRecipeFromPantryInputSchema,
  typeof GenerateRecipeFromPantryOutputSchema
>({
  name: 'generateRecipeFromPantryFlow',
  inputSchema: GenerateRecipeFromPantryInputSchema,
  outputSchema: GenerateRecipeFromPantryOutputSchema,
}, async input => {
  const {output} = await prompt(input);
  // Optional: Post-processing validation could be added here to ensure
  // output.ingredients only contains items from input.pantryIngredients.
  // However, relying on the strengthened prompt is the primary approach.
  return output!;
});
