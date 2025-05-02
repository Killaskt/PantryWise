'use server';

/**
 * @fileOverview Refines an existing recipe based on user suggestions, considering pantry limitations.
 *
 * - refineRecipe - A function that refines a recipe based on user input and pantry.
 * - RefineRecipeInput - The input type for the refineRecipe function.
 * - RefineRecipeOutput - The return type for the refineRecipe function (same as GenerateRecipeFromPantryOutput).
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import type { GenerateRecipeFromPantryOutput } from './generate-recipe-from-pantry'; // Import the output type

// Define the input schema for the refinement flow
const RefineRecipeInputSchema = z.object({
  originalRecipe: z.object({
      title: z.string().describe('The title of the original recipe.'),
      ingredients: z.array(z.object({ name: z.string(), quantity: z.string() })).describe('Original ingredients list.'),
      instructions: z.array(z.string()).describe('Original instructions.'),
      cuisine: z.string().optional().describe('Original cuisine.'),
      cookTime: z.number().optional().describe('Original cook time.'),
      description: z.string().optional().describe('Original description.'),
      notes: z.string().optional().describe('Original notes.'),
  }).describe('The recipe suggestion that needs refinement.'),
  refinementPrompt: z.string().min(1).describe('User\'s request for modifying the recipe (e.g., "make it spicier", "add mushrooms").'),
  pantryIngredients: z
    .array(
      z.object({
        name: z.string().describe('The name of the ingredient.'),
        quantity: z.string().describe('The quantity of the ingredient (e.g., 1 cup, 2 tbsp).'),
      })
    )
    .min(1) // Ensure pantry is not empty for context
    .describe('A list of ingredients currently available in the pantry. **Use ONLY these** for any additions.'),
});

export type RefineRecipeInput = z.infer<typeof RefineRecipeInputSchema>;

// The output is the same structure as the generated recipe
const RefineRecipeOutputSchema = z.object({
  title: z.string().describe('The title of the *refined* recipe.'),
  ingredients: z
    .array(
      z.object({
        name: z.string().describe('The name of the ingredient.'),
        quantity: z.string().describe('The quantity of the ingredient.'),
      })
    )
    .describe('The ingredients list for the *refined* recipe, **strictly derived from the provided pantry list only**.'),
  instructions: z.array(z.string()).describe('The *refined* preparation instructions.'),
  cuisine: z.string().describe('The cuisine of the *refined* recipe.'),
  cookTime: z.number().describe('The estimated cook time for the *refined* recipe in minutes.'),
  description: z.string().describe('A brief description of the *refined* recipe.'),
  notes: z.string().optional().describe('Optional notes about the refinement, such as inability to fully meet the request due to pantry limitations, or suggestions for non-pantry additions.'),
});

export type RefineRecipeOutput = z.infer<typeof RefineRecipeOutputSchema>;


// Exported async wrapper function calling the flow
export async function refineRecipe(input: RefineRecipeInput): Promise<RefineRecipeOutput> {
  return refineRecipeFlow(input);
}


const prompt = ai.definePrompt({
  name: 'refineRecipePrompt',
  input: { schema: RefineRecipeInputSchema },
  output: { schema: RefineRecipeOutputSchema },
  prompt: `You are a helpful recipe assistant. You previously suggested the following recipe:

**Original Recipe:**
Title: {{originalRecipe.title}}
Description: {{originalRecipe.description}}
Cuisine: {{#if originalRecipe.cuisine}}{{originalRecipe.cuisine}}{{else}}N/A{{/if}}
Cook Time: {{#if originalRecipe.cookTime}}{{originalRecipe.cookTime}} minutes{{else}}N/A{{/if}}
Ingredients:
{{#each originalRecipe.ingredients}}
- {{this.quantity}} {{this.name}}
{{/each}}
Instructions:
{{#each originalRecipe.instructions}}
{{@index + 1}}. {{this}}
{{/each}}
{{#if originalRecipe.notes}}
Notes: {{originalRecipe.notes}}
{{/if}}

---

The user wants to refine this recipe based on the following request:
"{{refinementPrompt}}"

---

**Constraint:** You MUST modify the recipe considering **only** the ingredients available in the user's current pantry listed below. Do **NOT** add ingredients to the main refined recipe's ingredients list if they are not present in the pantry.

**Current Pantry Ingredients:**
{{#each pantryIngredients}}
- {{this.name}} ({{this.quantity}})
{{/each}}

---

**Your Task:**
Generate a **new, refined version** of the recipe based on the user's request, strictly adhering to the pantry constraint.
- Modify the title, description, ingredients, instructions, cuisine, and cook time as necessary to reflect the changes.
- The 'ingredients' list in your output **must only** contain items available in the 'Current Pantry Ingredients' list.
- If the user's request asks for an ingredient not in the pantry, try to adapt the recipe without it, or state in the 'notes' field that the ingredient wasn't available in the pantry and couldn't be added. You can suggest it as an *optional* addition in the notes if appropriate.
- If the request fundamentally cannot be met with the current pantry (e.g., "make it vegetarian" when the only protein is meat), explain this limitation clearly in the 'notes' field and return the *original recipe* data, or a minimally modified version if some aspect could be changed.
- Ensure the output format matches the required schema.
`,
});


// Define the Genkit flow
const refineRecipeFlow = ai.defineFlow<
  typeof RefineRecipeInputSchema,
  typeof RefineRecipeOutputSchema
>({
  name: 'refineRecipeFlow',
  inputSchema: RefineRecipeInputSchema,
  outputSchema: RefineRecipeOutputSchema,
}, async (input) => {
  const { output } = await prompt(input);

  // Add post-processing validation (optional but recommended)
  // Ensure output ingredients are a subset of pantry ingredients
  const pantryNames = new Set(input.pantryIngredients.map(p => p.name.toLowerCase()));
  const refinedIngredients = output?.ingredients || [];

  const invalidIngredients = refinedIngredients.filter(ing => !pantryNames.has(ing.name.toLowerCase()));

  if (invalidIngredients.length > 0 && output) {
     // Handle the case where the AI included non-pantry items despite instructions
     console.warn("Refine recipe flow included non-pantry ingredients:", invalidIngredients);
     // Option 1: Filter out invalid ingredients (might make recipe nonsensical)
     // output.ingredients = refinedIngredients.filter(ing => pantryNames.has(ing.name.toLowerCase()));
     // Option 2: Add a note about the discrepancy (Safer)
     const nonPantryNames = invalidIngredients.map(i => i.name).join(', ');
      output.notes = `${output.notes ? output.notes + ' ' : ''}Note: The suggestion included '${nonPantryNames}' which are not in your pantry and were omitted from the ingredients list.`;
      output.ingredients = refinedIngredients.filter(ing => pantryNames.has(ing.name.toLowerCase()));
      // Option 3: Return an error or the original recipe (if deviation is severe)
      // For now, we'll add a note and filter.
  }


  if (!output) {
    throw new Error("Failed to get a valid response from the refinement prompt.");
  }

  return output;
});
