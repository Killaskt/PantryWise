
'use client';

import React, { useState, useEffect, useId } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input'; // Import Input
import { Checkbox } from '@/components/ui/checkbox'; // Import Checkbox
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Sparkles, Save, Settings, UtensilsCrossed } from 'lucide-react'; // Add Settings icon, Fix UtensilsCross -> UtensilsCrossed
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator'; // Import Separator

// Define the structure for a single pantry ingredient
export const pantryIngredientSchema = z.object({
  name: z.string().min(1, 'Ingredient name cannot be empty'),
  quantity: z.string().optional().default('some'),
});
export type PantryIngredient = z.infer<typeof pantryIngredientSchema>;

// Define available dietary restrictions
const dietaryOptions = [
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'gluten-free', label: 'Gluten-Free' },
  { id: 'dairy-free', label: 'Dairy-Free' },
  { id: 'nut-free', label: 'Nut-Free' },
] as const; // Use 'as const' for stricter typing

// Define the schema for the pantry and preferences form
const pantryAndPrefsSchema = z.object({
  ingredientsText: z.string().optional(), // Textarea content
  foodGoals: z.string().optional(),
  cuisinePreference: z.string().optional(),
  dietaryRestrictions: z.array(z.string()).optional().default([]), // Array of selected restriction IDs
});

type PantryFormValues = z.infer<typeof pantryAndPrefsSchema>;

// Store pantry data and preferences in localStorage
const PANTRY_STORAGE_KEY = 'pantrywise_pantry';
const PREFERENCES_STORAGE_KEY = 'pantrywise_preferences';

// Helper function to parse comma-separated string into PantryIngredient array
const parseIngredientsText = (text: string | undefined): PantryIngredient[] => {
  if (!text) return [];
  return text
    .split(',')
    .map(item => item.trim())
    .filter(name => name.length > 0)
    .map(name => ({ name, quantity: 'some' }));
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

// Type for Preferences stored in localStorage
type StoredPreferences = Omit<PantryFormValues, 'ingredientsText'>;

export function PantryBuilder() {
  const [pantry, setPantry] = useState<PantryIngredient[]>([]);
  const { toast } = useToast();
  const formId = useId();

  const { control, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<PantryFormValues>({
    resolver: zodResolver(pantryAndPrefsSchema),
    defaultValues: {
      ingredientsText: '',
      foodGoals: '',
      cuisinePreference: '',
      dietaryRestrictions: [],
    },
  });

  // Load pantry and preferences from localStorage on initial render
  useEffect(() => {
    // Load Pantry
    const storedPantry = localStorage.getItem(PANTRY_STORAGE_KEY);
    let initialPantry: PantryIngredient[] = [];
    if (storedPantry) {
      try {
        const parsedPantry: PantryIngredient[] = JSON.parse(storedPantry);
        if (Array.isArray(parsedPantry) && parsedPantry.every(item => typeof item.name === 'string')) {
          initialPantry = parsedPantry;
          setPantry(initialPantry);
        } else {
          localStorage.removeItem(PANTRY_STORAGE_KEY);
        }
      } catch (error) {
        localStorage.removeItem(PANTRY_STORAGE_KEY);
      }
    }

    // Load Preferences
    const storedPrefs = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    let initialPrefs: StoredPreferences = { foodGoals: '', cuisinePreference: '', dietaryRestrictions: [] };
    if (storedPrefs) {
       try {
         const parsedPrefs: StoredPreferences = JSON.parse(storedPrefs);
         // Add basic validation for preferences if needed
         initialPrefs = parsedPrefs;
       } catch (error) {
          localStorage.removeItem(PREFERENCES_STORAGE_KEY);
       }
    }

    // Reset form with loaded data
    reset({
      ingredientsText: formatIngredientsText(initialPantry),
      foodGoals: initialPrefs.foodGoals ?? '',
      cuisinePreference: initialPrefs.cuisinePreference ?? '',
      dietaryRestrictions: initialPrefs.dietaryRestrictions ?? [],
    });

  }, [reset]);

  // Save pantry and preferences (called on successful submit)
  const saveData = (data: PantryFormValues) => {
    // Save Pantry
    const parsedIngredients = parseIngredientsText(data.ingredientsText);
    setPantry(parsedIngredients);
    localStorage.setItem(PANTRY_STORAGE_KEY, JSON.stringify(parsedIngredients));

    // Save Preferences
    const preferencesToStore: StoredPreferences = {
      foodGoals: data.foodGoals,
      cuisinePreference: data.cuisinePreference,
      dietaryRestrictions: data.dietaryRestrictions,
    };
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferencesToStore));

    // Dispatch events to notify other components
    window.dispatchEvent(new CustomEvent('pantryUpdated', { detail: parsedIngredients }));
    window.dispatchEvent(new CustomEvent('preferencesUpdated', { detail: preferencesToStore }));

     toast({
      title: 'Pantry & Preferences Saved',
      description: 'Your ingredients and preferences have been updated.',
    });
  };

  const onSubmit = (data: PantryFormValues) => {
    saveData(data);
  };

  // Function to populate the textarea with example ingredients
  const populateExamples = () => {
    const exampleText = formatIngredientsText(exampleIngredients);
    reset({ ...watch(), ingredientsText: exampleText }); // Update only ingredientsText
     toast({
       title: 'Examples Added',
       description: 'Example ingredients loaded. Click Save to confirm.',
     });
  };

  // Clear all pantry and preferences
  const clearAll = () => {
    setPantry([]);
    localStorage.removeItem(PANTRY_STORAGE_KEY);
    localStorage.removeItem(PREFERENCES_STORAGE_KEY);
    reset({
        ingredientsText: '',
        foodGoals: '',
        cuisinePreference: '',
        dietaryRestrictions: [],
    });
    // Dispatch update events with empty data
    window.dispatchEvent(new CustomEvent('pantryUpdated', { detail: [] }));
    window.dispatchEvent(new CustomEvent('preferencesUpdated', { detail: { foodGoals: '', cuisinePreference: '', dietaryRestrictions: [] } }));
     toast({
       title: 'Cleared',
       description: 'Pantry and preferences have been cleared.',
       variant: 'destructive',
     });
  }


  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader>
        <CardTitle>My Pantry & Preferences</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col overflow-y-auto">
        {/* The form now wraps all content */}
        <form onSubmit={handleSubmit(onSubmit)} id={formId} className="space-y-6 flex-grow flex flex-col">

          {/* Ingredients Section */}
          <div className="space-y-2">
            <Label htmlFor="ingredientsText">Pantry Ingredients</Label>
            <Controller
              name="ingredientsText"
              control={control}
              render={({ field }) => (
                <Textarea
                  {...field}
                  id="ingredientsText"
                  placeholder="Enter ingredients separated by commas (e.g., chicken, rice, broccoli...)"
                  className="min-h-[150px] resize-y" // Allow vertical resize
                  aria-invalid={!!errors.ingredientsText}
                />
              )}
            />
            {errors.ingredientsText && (
              <p className="text-sm text-destructive mt-1">{errors.ingredientsText.message}</p>
            )}
             <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={populateExamples}
            >
                <Sparkles className="mr-2 h-4 w-4" />
                Add Examples
            </Button>
          </div>

          <Separator />

          {/* Preferences Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2"><Settings className="h-5 w-5"/> Preferences</h3>

            {/* Food Goals */}
            <div className="space-y-2">
              <Label htmlFor="foodGoals">Food Goals</Label>
              <Controller
                name="foodGoals"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="foodGoals"
                    placeholder="e.g., Quick weeknight meal, Healthy lunch, Impress guests"
                  />
                )}
              />
              {errors.foodGoals && <p className="text-sm text-destructive">{errors.foodGoals.message}</p>}
            </div>

            {/* Cuisine Preference */}
            <div className="space-y-2">
              <Label htmlFor="cuisinePreference">Cuisine Preference</Label>
              <Controller
                name="cuisinePreference"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="cuisinePreference"
                    placeholder="e.g., Italian, Mexican, Thai, No preference"
                  />
                )}
              />
              {errors.cuisinePreference && <p className="text-sm text-destructive">{errors.cuisinePreference.message}</p>}
            </div>

            {/* Dietary Restrictions */}
            <div className="space-y-2">
              <Label>Dietary Restrictions</Label>
              <div className="space-y-2">
                {dietaryOptions.map((option) => (
                  <Controller
                    key={option.id}
                    name="dietaryRestrictions"
                    control={control}
                    render={({ field }) => {
                      return (
                        <div className="flex items-center space-x-2">
                           <Checkbox
                              id={`diet-${option.id}`}
                              checked={field.value?.includes(option.id)}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? field.onChange([...(field.value ?? []), option.id])
                                  : field.onChange(
                                      (field.value ?? []).filter(
                                        (value) => value !== option.id
                                      )
                                    )
                              }}
                           />
                          <Label
                            htmlFor={`diet-${option.id}`}
                            className="font-normal cursor-pointer"
                          >
                            {option.label}
                          </Label>
                        </div>
                      )
                    }}
                  />
                ))}
              </div>
              {errors.dietaryRestrictions && <p className="text-sm text-destructive">{errors.dietaryRestrictions.message}</p>}
            </div>
          </div>

          {/* Spacer to push buttons down */}
           <div className="flex-grow"></div>


        </form>
      </CardContent>
       <CardFooter className="border-t pt-4 flex flex-col sm:flex-row gap-2 justify-between">
          <Button
              type="button"
              variant="outline"
              onClick={clearAll}
              className="w-full sm:w-auto"
              disabled={isSubmitting}
          >
              <UtensilsCrossed className="mr-2 h-4 w-4" /> {/* Fix: UtensilsCross -> UtensilsCrossed */}
              Clear All
          </Button>
          <Button
            type="submit"
            form={formId} // Associate with the form via its ID
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Saving...' : 'Save All'}
          </Button>
      </CardFooter>
    </Card>
  );
}
