
'use server';

/**
 * @fileOverview Generates a recipe based on pantry ingredients (with quantities) and user preferences.
 *
 * - generateRecipeFromPantry - Generates a recipe considering pantry, dietary needs, cuisine, and goals.
 * - GenerateRecipeFromPantryInput - Input type including pantry (with quantity) and preferences.
 * - GenerateRecipeFromPantryOutput - Output type for the generated recipe.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

// Updated Input Schema to include quantity in pantry ingredients
const GenerateRecipeFromPantryInputSchema = z.object({
  pantryIngredients: z
    .array(
      z.object({
        name: z.string().describe('The name of the ingredient.'),
        quantity: z.string().describe('The quantity of the ingredient available (e.g., "1 cup", "2 tbsp", "some").'), // Keep quantity description flexible
      })
    )
    .min(1, 'At least one pantry ingredient is required.')
    .describe('A list of ingredients available in the pantry with their quantities.'),
  dietaryRestrictions: z
    .string()
    .optional()
    .describe('Comma-separated list of dietary restrictions (e.g., "vegetarian, gluten-free").'),
  cuisinePreference: z
    .string()
    .optional()
    .describe('The preferred cuisine (e.g., Italian, Mexican, Thai).'),
  foodGoals: z
    .string()
    .optional()
    .describe('The user\'s goal for this meal (e.g., Quick weeknight meal, Healthy lunch).'),
  // cookTimePreference is kept for potential future use or if needed by the model
  cookTimePreference: z
    .string()
    .optional()
    .describe('Maximum cook time in minutes.'),
});

export type GenerateRecipeFromPantryInput = z.infer<typeof GenerateRecipeFromPantryInputSchema>;

// Updated Output schema for ingredients used, reflecting quantities might be consumed
const GenerateRecipeFromPantryOutputSchema = z.object({
  title: z.string().describe('The title of the generated recipe.'),
  ingredients: z
    .array(
      z.object({
        name: z.string().describe('The name of the ingredient.'),
        quantity: z.string().describe('The quantity of the ingredient **used** in the recipe (e.g., "1/2 cup", "1 tbsp").'), // Specify quantity used
      })
    )
    .describe('The ingredients **from the pantry** required for the recipe, specifying the amount used.'),
  instructions: z.array(z.string()).describe('The preparation instructions for the recipe.'),
  cuisine: z.string().describe('The cuisine of the recipe (e.g., Italian, Mexican).'),
  cookTime: z.number().describe('The time it takes to cook the recipe in minutes.'),
  description: z.string().describe('A brief description of the recipe.'),
  notes: z.string().optional().describe('Optional notes, like suggesting additional ingredients not in the pantry for enhancement, stating if the recipe is limited by pantry quantities, or couldn\'t meet all preferences.'),
});

export type GenerateRecipeFromPantryOutput = z.infer<typeof GenerateRecipeFromPantryOutputSchema>;

export async function generateRecipeFromPantry(input: GenerateRecipeFromPantryInput): Promise<
  GenerateRecipeFromPantryOutput
> {
  return generateRecipeFromPantryFlow(input);
}

// Updated prompt to incorporate ingredient quantities and instruct the model on usage
const prompt = ai.definePrompt({
  name: 'generateRecipeFromPantryPrompt',
  input: { schema: GenerateRecipeFromPantryInputSchema },
  output: { schema: GenerateRecipeFromPantryOutputSchema },
  prompt: `You are a creative and adaptable recipe generator. Your task is to generate a delicious recipe based *primarily* on the ingredients and their **available quantities** provided in the user's pantry, while also considering their stated preferences.

**Constraint:** You **MUST** create the recipe using **only** the ingredients listed in the pantry. You **cannot use more** of an ingredient than the specified available quantity. The 'ingredients' output field must only list items from the pantry and specify the quantity *used*, which must be less than or equal to the available quantity.

Pantry Ingredients (Name - Available Quantity):
{{#each pantryIngredients}}
- {{this.name}} - {{this.quantity}}
{{/each}}

User Preferences:
{{#if foodGoals}}
- Goal: Try to create a recipe suitable for "{{foodGoals}}".
{{/if}}
{{#if cuisinePreference}}
- Cuisine: Aim for {{cuisinePreference}} cuisine if possible with the available ingredients.
{{/if}}
{{#if dietaryRestrictions}}
- Dietary Needs: Strictly adhere to the following: {{dietaryRestrictions}}.
{{/if}}
{{#if cookTimePreference}}
- Max Cook Time: Keep the cook time under {{cookTimePreference}} minutes if feasible.
{{/if}}

Generate the recipe with a title, a list of the pantry ingredients *used* (with their quantities used), step-by-step instructions, the cuisine type, estimated cook time, and a brief description.

**Important:**
1.  **Strictly use only the pantry ingredients listed above**.
2.  **Pay close attention to the available quantity** for each ingredient. Do not use more than what's available.
3.  In the 'ingredients' output list, specify the quantity **used** for each ingredient in the recipe (e.g., if "1 cup Rice" is available, you might use "1/2 cup Rice").
4.  Adapt the recipe to meet the user's preferences (Goal, Cuisine, Dietary Needs, Cook Time) as much as possible using *only* the pantry items and respecting quantities.
5.  If you cannot create a satisfying recipe adhering to all constraints (especially quantity limits) and preferences, create the best possible recipe you can.
6.  In the 'notes' field:
    - Mention if any preferences could not be fully met due to pantry limitations (including quantity).
    - Optionally suggest 1-2 common ingredients *not* in the pantry that could enhance the dish, clearly stating these are optional additions.
    - If the pantry ingredients/quantities are too limited for *any* reasonable dish, state this clearly.
7.  Ensure the 'ingredients' list in your output contains *only* items from the input 'pantryIngredients' list, and the quantity specified is the amount *used*.
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
  // Add validation: Ensure dietaryRestrictions is a string if provided
   if (input.dietaryRestrictions && Array.isArray(input.dietaryRestrictions)) {
       // Safely handle potential array type - Though schema should prevent this
       console.warn("dietaryRestrictions is an array, joining to string:", input.dietaryRestrictions);
       const safeRestrictions = input.dietaryRestrictions as unknown as string[];
       input.dietaryRestrictions = safeRestrictions.join(', ');
   }

    // Ensure all pantry items have a quantity (fallback if somehow missed)
    input.pantryIngredients = input.pantryIngredients.map(ing => ({
      ...ing,
      quantity: ing.quantity || 'some'
    }));

  const {output} = await prompt(input);

  // Optional: Post-processing validation could be added here
  // e.g., verify output ingredients are subset of pantryIngredients, quantities are reasonable (complex)

  if (!output) {
     throw new Error("Failed to generate a recipe. The AI model did not return a valid output.");
  }
  return output;
});
