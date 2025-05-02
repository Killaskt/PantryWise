
'use server';

/**
 * @fileOverview Generates a recipe based on pantry ingredients and user preferences.
 *
 * - generateRecipeFromPantry - Generates a recipe considering pantry, dietary needs, cuisine, and goals.
 * - GenerateRecipeFromPantryInput - Input type including pantry and preferences.
 * - GenerateRecipeFromPantryOutput - Output type for the generated recipe.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

// Updated Input Schema to include new preference fields
const GenerateRecipeFromPantryInputSchema = z.object({
  pantryIngredients: z
    .array(
      z.object({
        name: z.string().describe('The name of the ingredient.'),
        quantity: z.string().describe('The quantity of the ingredient (e.g., 1 cup, 2 tbsp).'),
      })
    )
    .min(1, 'At least one pantry ingredient is required.')
    .describe('A list of ingredients available in the pantry.'),
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

// Output schema remains the same
const GenerateRecipeFromPantryOutputSchema = z.object({
  title: z.string().describe('The title of the generated recipe.'),
  ingredients: z
    .array(
      z.object({
        name: z.string().describe('The name of the ingredient.'),
        quantity: z.string().describe('The quantity of the ingredient.'),
      })
    )
    .describe('The ingredients **from the pantry** required for the recipe.'),
  instructions: z.array(z.string()).describe('The preparation instructions for the recipe.'),
  cuisine: z.string().describe('The cuisine of the recipe (e.g., Italian, Mexican).'),
  cookTime: z.number().describe('The time it takes to cook the recipe in minutes.'),
  description: z.string().describe('A brief description of the recipe.'),
  notes: z.string().optional().describe('Optional notes, like suggesting additional ingredients not in the pantry for enhancement, or stating if the recipe is limited by the pantry or couldn\'t meet all preferences.'),
});

export type GenerateRecipeFromPantryOutput = z.infer<typeof GenerateRecipeFromPantryOutputSchema>;

export async function generateRecipeFromPantry(input: GenerateRecipeFromPantryInput): Promise<
  GenerateRecipeFromPantryOutput
> {
  return generateRecipeFromPantryFlow(input);
}

// Updated prompt to incorporate new preferences
const prompt = ai.definePrompt({
  name: 'generateRecipeFromPantryPrompt',
  input: { schema: GenerateRecipeFromPantryInputSchema }, // Use updated schema
  output: { schema: GenerateRecipeFromPantryOutputSchema },
  prompt: `You are a creative and adaptable recipe generator. Your task is to generate a delicious recipe based *primarily* on the ingredients provided in the user's pantry, while also considering their stated preferences.

**Constraint:** You **MUST** create the recipe using **only** the ingredients listed in the pantry for the main recipe ingredients list. Do not add ingredients not on this list to the 'ingredients' output field.

Pantry Ingredients:
{{#each pantryIngredients}}
- {{this.name}} ({{this.quantity}})
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

Generate the recipe with a title, a list of the pantry ingredients used, step-by-step instructions, the cuisine type, estimated cook time, and a brief description.

**Important:**
1.  **Strictly use only the pantry ingredients listed above** for the main recipe 'ingredients' list.
2.  Adapt the recipe to meet the user's preferences (Goal, Cuisine, Dietary Needs, Cook Time) as much as possible using *only* the pantry items.
3.  If you cannot create a satisfying recipe adhering to all constraints and preferences with *only* the provided ingredients, create the best possible recipe you can.
4.  In the 'notes' field:
    - Mention if any preferences (like cuisine or specific dietary needs) could not be fully met due to pantry limitations.
    - Optionally suggest 1-2 common ingredients (like salt, pepper, oil if not listed, or a specific spice) *not* in the pantry that could enhance the dish, clearly stating these are optional additions.
    - If the pantry ingredients are too limited for *any* reasonable dish matching the general request, state this clearly.
5.  Ensure the 'ingredients' list in your output contains *only* items from the input 'pantryIngredients' list.
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
   if (input.dietaryRestrictions && !Array.isArray(input.dietaryRestrictions)) {
        // Assuming it might accidentally be passed as an array still
        console.warn("dietaryRestrictions received as array, joining to string:", input.dietaryRestrictions);
        // input.dietaryRestrictions = (input.dietaryRestrictions as unknown as string[]).join(', '); // This line causes TS error if input is correctly typed
   } else if (Array.isArray(input.dietaryRestrictions)) {
      // This case handles if the schema validation somehow failed or was bypassed upstream
       console.warn("dietaryRestrictions is an array, joining to string:", input.dietaryRestrictions);
       // input.dietaryRestrictions = input.dietaryRestrictions.join(', '); // This line also causes TS error
       // Safely handle potential array type - Though schema should prevent this
       const safeRestrictions = input.dietaryRestrictions as unknown as string[];
       input.dietaryRestrictions = safeRestrictions.join(', ');
   }


  const {output} = await prompt(input);

  // Optional: Post-processing validation could be added here
  // e.g., verify output ingredients are subset of pantryIngredients

  if (!output) {
     throw new Error("Failed to generate a recipe. The AI model did not return a valid output.");
  }
  return output;
});

    