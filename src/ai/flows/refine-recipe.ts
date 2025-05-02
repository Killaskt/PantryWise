
'use server';

/**
 * @fileOverview Refines an existing recipe based on user suggestions, considering pantry limitations (with quantities) and preferences.
 *
 * - refineRecipe - Refines a recipe based on user input, pantry, and preferences.
 * - RefineRecipeInput - Input type including original recipe, prompt, pantry (with quantity), and preferences.
 * - RefineRecipeOutput - Output type (same as GenerateRecipeFromPantryOutput).
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import type { GenerateRecipeFromPantryOutput } from './generate-recipe-from-pantry'; // Import the output type

// Define the input schema for the refinement flow, including preferences and pantry quantities
const RefineRecipeInputSchema = z.object({
  originalRecipe: z.object({
      title: z.string().describe('The title of the original recipe.'),
      ingredients: z.array(z.object({ name: z.string(), quantity: z.string() })).describe('Original ingredients list with quantities used.'),
      instructions: z.array(z.string()).describe('Original instructions.'),
      cuisine: z.string().optional().describe('Original cuisine.'),
      cookTime: z.number().optional().describe('Original cook time.'),
      description: z.string().optional().describe('Original description.'),
      notes: z.string().optional().describe('Original notes.'),
  }).describe('The recipe suggestion that needs refinement.'),
  refinementPrompt: z.string().min(1).describe('User\'s request for modifying the recipe (e.g., "make it spicier", "add mushrooms if available").'),
  pantryIngredients: z
    .array(
      z.object({
        name: z.string().describe('The name of the ingredient.'),
        quantity: z.string().describe('The quantity of the ingredient currently available (e.g., "1 cup", "2 tbsp", "some").'), // Reflect available quantity
      })
    )
    .min(1)
    .describe('A list of ingredients currently available in the pantry with their quantities. **Use ONLY these** for any additions and respect available amounts.'),
  preferences: z.object({
        dietaryRestrictions: z.string().optional().describe('User\'s general dietary restrictions (e.g., "vegetarian, gluten-free").'),
        cuisinePreference: z.string().optional().describe('User\'s general cuisine preference (e.g., Italian).'),
        foodGoals: z.string().optional().describe('User\'s general food goal (e.g., Quick meal).'),
   }).optional().describe('The user\'s general preferences to keep in mind during refinement.'),
});

export type RefineRecipeInput = z.infer<typeof RefineRecipeInputSchema>;

// Output schema remains the same structure as the generated recipe, emphasizing quantities used
const RefineRecipeOutputSchema = z.object({
  title: z.string().describe('The title of the *refined* recipe.'),
  ingredients: z
    .array(
      z.object({
        name: z.string().describe('The name of the ingredient.'),
        quantity: z.string().describe('The quantity of the ingredient **used** in the refined recipe.'), // Quantity used
      })
    )
    .describe('The ingredients list for the *refined* recipe, **strictly derived from the provided pantry list and respecting available quantities**.'),
  instructions: z.array(z.string()).describe('The *refined* preparation instructions, as a list of numbered steps starting from 1.'),
  cuisine: z.string().describe('The cuisine of the *refined* recipe.'),
  cookTime: z.number().describe('The estimated cook time for the *refined* recipe in minutes.'),
  description: z.string().describe('A brief description of the *refined* recipe.'),
  notes: z.string().optional().describe('Optional notes about the refinement, such as inability to fully meet the request due to pantry/quantity/preference limitations, or suggestions for non-pantry additions.'),
});

export type RefineRecipeOutput = z.infer<typeof RefineRecipeOutputSchema>;


// Exported async wrapper function calling the flow
export async function refineRecipe(input: RefineRecipeInput): Promise<RefineRecipeOutput> {
  return refineRecipeFlow(input);
}


// Updated prompt to consider pantry quantities during refinement
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
Ingredients Used:
{{#each originalRecipe.ingredients}}
- {{this.quantity}} {{this.name}}
{{/each}}
Instructions:
{{#each originalRecipe.instructions}}
{{#if @index}} {{!-- Add step number if not the first item --}}
{{add @index 1}}. {{this}}
{{else}} {{!-- Handle first item --}}
1. {{this}}
{{/if}}
{{/each}}
{{#if originalRecipe.notes}}
Notes: {{originalRecipe.notes}}
{{/if}}

---

The user wants to refine this recipe with the following request:
"{{refinementPrompt}}"

---

Also, keep the user's general preferences in mind:
{{#if preferences.foodGoals}}
- Goal: {{preferences.foodGoals}}
{{/if}}
{{#if preferences.cuisinePreference}}
- Preferred Cuisine: {{preferences.cuisinePreference}} (Adapt if possible, but prioritize the refinement request)
{{/if}}
{{#if preferences.dietaryRestrictions}}
- Dietary Needs: MUST adhere to {{preferences.dietaryRestrictions}}
{{/if}}

---

**Constraint:** You MUST modify the recipe considering **only** the ingredients and their **available quantities** in the user's current pantry listed below. Do **NOT** add ingredients to the main refined recipe's ingredients list if they are not present in the pantry. Do **NOT** use more of an ingredient than is available. Adhere strictly to dietary restrictions if provided.

**Current Pantry Ingredients (Name - Available Quantity):**
{{#each pantryIngredients}}
- {{this.name}} - {{this.quantity}}
{{/each}}

---

**Your Task:**
Generate a **new, refined version** of the recipe based on the user's request and preferences, strictly adhering to the pantry availability (including quantity) and dietary constraints.
- Modify the title, description, ingredients, instructions, cuisine, and cook time as necessary.
- The 'ingredients' list in your output **must only** contain items available in the 'Current Pantry Ingredients' list, and the quantity specified must be the amount *used* (which cannot exceed the available quantity).
- The 'instructions' list in your output **must be a list of numbered steps starting from 1**.
- If the user's refinement request asks for an ingredient not in the pantry, or asks for more than is available, try to achieve the desired effect using available pantry items/quantities, or state in the 'notes' field that the specific ingredient/quantity wasn't available. You can suggest it as an *optional* non-pantry addition in the notes if appropriate.
- If the request or preferences fundamentally cannot be met with the current pantry (e.g., "make it vegetarian" when the only protein is meat, adding an allergen specified in restrictions, needing more quantity than available), explain this limitation clearly in the 'notes' field. Return the *original recipe* data or a minimally modified version if some aspect could be changed safely within constraints.
- Ensure the output format matches the required schema, especially the format for the 'ingredients' list (name and quantity used) and numbered 'instructions'.
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
  // Basic validation/transformation if needed
  input.preferences = input.preferences ?? {};
    // Ensure all pantry items have a quantity (fallback)
  input.pantryIngredients = input.pantryIngredients.map(ing => ({
      ...ing,
      quantity: ing.quantity || 'some'
  }));

  const { output } = await prompt(input);

  if (!output) {
    throw new Error("Failed to get a valid response from the refinement prompt.");
  }

  // Post-processing validation (ensure output ingredients are a subset of pantry)
  const pantryMap = new Map(input.pantryIngredients.map(p => [p.name.toLowerCase(), p.quantity]));
  const refinedIngredients = output.ingredients || [];
  const invalidIngredients: { name: string; reason: string }[] = [];

  const validRefinedIngredients = refinedIngredients.filter(ing => {
      const pantryKey = ing.name.toLowerCase();
      if (!pantryMap.has(pantryKey)) {
          invalidIngredients.push({ name: ing.name, reason: 'Not in pantry' });
          return false;
      }
      // Basic quantity check is complex due to varied formats ("some", "1 cup", "2").
      // We'll rely on the model for now, but could add stricter checks later.
      // Example: Check if quantity used exceeds available quantity (would need parsing logic).
      return true;
  });


  if (invalidIngredients.length > 0) {
     console.warn("Refine recipe flow included invalid ingredients:", invalidIngredients);
     const nonPantryNames = invalidIngredients.map(i => `${i.name} (${i.reason})`).join(', ');
      output.notes = `${output.notes ? output.notes + ' ' : ''}Note: The suggestion included items (${nonPantryNames}) that were invalid or not in your pantry and were omitted from the ingredients list.`;
      output.ingredients = validRefinedIngredients;
  } else {
      output.ingredients = refinedIngredients; // Keep original if all valid
  }

  // Ensure instructions are numbered (basic check)
  if (output.instructions && output.instructions.length > 0 && !/^\d+\./.test(output.instructions[0])) {
      console.warn("Refined recipe instructions might not be numbered correctly.");
      // Attempt basic numbering if missing
      output.instructions = output.instructions.map((step, index) => `${index + 1}. ${step.replace(/^\d+\.\s*/, '')}`);
  }


  return output;
});
