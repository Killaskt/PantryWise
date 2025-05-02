// src/ai/flows/improve-recipe-suggestion.ts
'use server';

/**
 * @fileOverview Improves recipe suggestions based on user feedback.
 *
 * This file defines a Genkit flow that takes user feedback on recipe suggestions
 * (likes, dislikes, skips) and uses it to refine future suggestions. The flow
 * adjusts recipe parameters or filters to align with the user's preferences.
 *
 * @exported improveRecipeSuggestion - Function to trigger the recipe improvement flow.
 * @exported ImproveRecipeSuggestionInput - Input type for the improveRecipeSuggestion function.
 * @exported ImproveRecipeSuggestionOutput - Output type for the improveRecipeSuggestion function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

/**
 * Input schema for the improveRecipeSuggestion flow.
 */
const ImproveRecipeSuggestionInputSchema = z.object({
  recipeId: z.string().describe('The ID of the recipe the user is providing feedback on.'),
  feedbackType: z
    .enum(['like', 'dislike', 'skip'])
    .describe('The type of feedback provided by the user.'),
  userId: z.string().describe('The ID of the user providing the feedback.'),
});

export type ImproveRecipeSuggestionInput = z.infer<
  typeof ImproveRecipeSuggestionInputSchema
>;

/**
 * Output schema for the improveRecipeSuggestion flow.
 */
const ImproveRecipeSuggestionOutputSchema = z.object({
  success: z
    .boolean()
    .describe(
      'Indicates whether the recipe suggestion improvement was successfully processed.'
    ),
  message: z
    .string()
    .describe('A message indicating the outcome of the improvement process.'),
});

export type ImproveRecipeSuggestionOutput = z.infer<
  typeof ImproveRecipeSuggestionOutputSchema
>;

/**
 * Improves recipe suggestions based on user feedback.
 *
 * @param input - The input containing the recipe ID, feedback type, and user ID.
 * @returns A promise that resolves to an ImproveRecipeSuggestionOutput object.
 */
export async function improveRecipeSuggestion(
  input: ImproveRecipeSuggestionInput
): Promise<ImproveRecipeSuggestionOutput> {
  return improveRecipeSuggestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'improveRecipeSuggestionPrompt',
  input: {
    schema: z.object({
      recipeId: z.string().describe('The ID of the recipe the user is providing feedback on.'),
      feedbackType: z
        .enum(['like', 'dislike', 'skip'])
        .describe('The type of feedback provided by the user.'),
      userId: z.string().describe('The ID of the user providing the feedback.'),
    }),
  },
  output: {
    schema: z.object({
      success: z
        .boolean()
        .describe(
          'Indicates whether the recipe suggestion improvement was successfully processed.'
        ),
      message: z
        .string()
        .describe('A message indicating the outcome of the improvement process.'),
    }),
  },
  prompt: `You are an AI assistant that improves recipe suggestions based on user feedback.

A user with ID {{userId}} has provided {{feedbackType}} feedback on recipe {{recipeId}}.

Based on this feedback, adjust the recipe suggestion algorithm to better suit the user's taste.

Return a success boolean and a message indicating the outcome of the improvement process.`,
});

const improveRecipeSuggestionFlow = ai.defineFlow<
  typeof ImproveRecipeSuggestionInputSchema,
  typeof ImproveRecipeSuggestionOutputSchema
>(
  {
    name: 'improveRecipeSuggestionFlow',
    inputSchema: ImproveRecipeSuggestionInputSchema,
    outputSchema: ImproveRecipeSuggestionOutputSchema,
  },
  async input => {
    // In a real application, this is where you would update the user's recipe preferences
    // in a database or other storage mechanism.
    // For this example, we'll just return a success message.

    const {output} = await prompt(input);

    return output!;
  }
);
