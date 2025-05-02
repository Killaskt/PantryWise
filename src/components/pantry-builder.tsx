'use client';

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea'; // Import Textarea

// Define the structure for a single pantry ingredient
export const pantryIngredientSchema = z.object({
  name: z.string().min(1, 'Ingredient name cannot be empty'),
  quantity: z.string().optional().default('some'), // Make quantity optional, default to 'some'
});
export type PantryIngredient = z.infer<typeof pantryIngredientSchema>;

// Define the schema for the bulk pantry input (textarea)
const pantrySchema = z.object({
  ingredientsText: z.string().optional(), // Textarea content
});

type PantryFormValues = z.infer<typeof pantrySchema>;

// Store pantry data in localStorage
const PANTRY_STORAGE_KEY = 'pantrywise_pantry';

// Helper function to parse comma-separated string into PantryIngredient array
const parseIngredientsText = (text: string | undefined): PantryIngredient[] => {
  if (!text) return [];
  return text
    .split(',')
    .map(item => item.trim())
    .filter(name => name.length > 0) // Filter out empty strings
    .map(name => ({ name, quantity: 'some' })); // Assign default quantity
};

// Helper function to format PantryIngredient array into comma-separated string
const formatIngredientsText = (ingredients: PantryIngredient[]): string => {
  return ingredients.map(ing => ing.name).join(', ');
};

const exampleIngredients = [
  { name: 'Chicken Breasts', quantity: '2' },
  { name: 'Broccoli', quantity: '1 head' },
  { name: 'Rice', quantity: '1 cup' },
  { name: 'Soy Sauce', quantity: 'some' },
  { name: 'Garlic', quantity: '2 cloves' },
  { name: 'Olive Oil', quantity: 'some' },
  { name: 'Onion', quantity: '1' },
  { name: 'Canned Tomatoes', quantity: '1 can' },
  { name: 'Pasta', quantity: '500g' },
  { name: 'Cheese', quantity: 'some' },
];

export function PantryBuilder() {
  const [pantry, setPantry] = useState<PantryIngredient[]>([]);
  const { toast } = useToast();

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PantryFormValues>({
    resolver: zodResolver(pantrySchema),
    defaultValues: {
      ingredientsText: '',
    },
  });

  // Load pantry from localStorage on initial render
  useEffect(() => {
    const storedPantry = localStorage.getItem(PANTRY_STORAGE_KEY);
    if (storedPantry) {
      try {
        const parsedPantry: PantryIngredient[] = JSON.parse(storedPantry);
        // Basic validation
        if (Array.isArray(parsedPantry) && parsedPantry.every(item => typeof item.name === 'string')) {
           setPantry(parsedPantry);
           reset({ ingredientsText: formatIngredientsText(parsedPantry) }); // Sync form state
        } else {
          console.error("Invalid pantry data found in localStorage.");
          localStorage.removeItem(PANTRY_STORAGE_KEY); // Clear invalid data
        }
      } catch (error) {
        console.error("Failed to parse pantry from localStorage:", error);
        localStorage.removeItem(PANTRY_STORAGE_KEY); // Clear corrupted data
      }
    }
  }, [reset]); // Add reset to dependency array

  // Save pantry to localStorage whenever it changes (called on successful submit)
  const savePantry = (newPantry: PantryIngredient[]) => {
    setPantry(newPantry);
    localStorage.setItem(PANTRY_STORAGE_KEY, JSON.stringify(newPantry));
    // Dispatch a custom event to notify other components (like RecipeSuggestions)
    window.dispatchEvent(new CustomEvent('pantryUpdated', { detail: newPantry }));
     toast({
      title: 'Pantry Updated',
      description: 'Your pantry ingredients have been saved.',
    });
  };

  const onSubmit = (data: PantryFormValues) => {
    const parsedIngredients = parseIngredientsText(data.ingredientsText);
    savePantry(parsedIngredients);
  };

  // Function to populate the textarea with example ingredients
  const populateExamples = () => {
    const exampleText = formatIngredientsText(exampleIngredients);
    reset({ ingredientsText: exampleText }); // Update form state
    // Optionally immediately save examples to pantry & storage:
    // const parsedExamples = parseIngredientsText(exampleText);
    // savePantry(parsedExamples);
    // toast({
    //   title: 'Examples Added',
    //   description: 'Example ingredients added to your pantry. Click Save Pantry to confirm.',
    // });
  };

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader>
        <CardTitle>My Pantry</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 flex-grow flex flex-col">
          <div className="flex-grow">
             <Label htmlFor="ingredientsText">Ingredients</Label>
            <Controller
              name="ingredientsText"
              control={control}
              render={({ field }) => (
                <Textarea
                  {...field}
                  id="ingredientsText"
                  placeholder="Enter ingredients separated by commas (e.g., chicken, rice, broccoli, soy sauce...)"
                  className="h-full min-h-[200px] resize-none" // Make textarea fill available space
                  aria-invalid={!!errors.ingredientsText}
                />
              )}
            />
            {errors.ingredientsText && (
              <p className="text-sm text-destructive mt-1">{errors.ingredientsText.message}</p>
            )}
          </div>
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={populateExamples}
                className="mt-auto" // Push button towards bottom if content area is large
            >
                <Sparkles className="mr-2 h-4 w-4" />
                Add Example Ingredients
            </Button>

        </form>
      </CardContent>
       <CardFooter className="border-t pt-4">
         {/* Add Save Button */}
          <Button
            type="submit" // Change type to submit to trigger form submission
            form="pantry-form" // Associate with the form if needed, but onSubmit in form tag handles it
            disabled={isSubmitting}
            onClick={handleSubmit(onSubmit)} // Trigger submit handler
            className="w-full"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Saving...' : 'Save Pantry'}
          </Button>
      </CardFooter>
    </Card>
  );
}
