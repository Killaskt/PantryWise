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
    .describe('The ingredients required for the recipe.'),
  instructions: z.array(z.string()).describe('The preparation instructions for the recipe.'),
  cuisine: z.string().describe('The cuisine of the recipe (e.g., Italian, Mexican).'),
  cookTime: z.number().describe('The time it takes to cook the recipe in minutes.'),
  description: z.string().describe('A brief description of the recipe.'),
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
        .describe('The ingredients required for the recipe.'),
      instructions: z.array(z.string()).describe('The preparation instructions for the recipe.'),
      cuisine: z.string().describe('The cuisine of the recipe (e.g., Italian, Mexican).'),
      cookTime: z.number().describe('The time it takes to cook the recipe in minutes.'),
      description: z.string().describe('A brief description of the recipe.'),
    }),
  },
  prompt: `You are a recipe generator. Generate a recipe based on the ingredients in the user's pantry, their dietary restrictions, cuisine preferences, and cook time preferences.

Pantry Ingredients:
{{#each pantryIngredients}}
- {{this.name}} ({{this.quantity}})
{{/each}}

{{#if dietaryRestrictions}}
Dietary Restrictions: {{dietaryRestrictions}}
{{/if}}

{{#if cuisinePreference}}
Cuisine Preference: {{cuisinePreference}}
{{/if}}

{{#if cookTimePreference}}
Maximum Cook Time: {{cookTimePreference}} minutes
{{/if}}`,
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
  return output!;
});

