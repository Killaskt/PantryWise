
'use client';

import React, { useState, useEffect, useId } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Save, Settings, UtensilsCrossed, BookOpen } from 'lucide-react'; // Added BookOpen for View Pantry
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link'; // Import Link for navigation

// Define available dietary restrictions
const dietaryOptions = [
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'gluten-free', label: 'Gluten-Free' },
  { id: 'dairy-free', label: 'Dairy-Free' },
  { id: 'nut-free', label: 'Nut-Free' },
] as const;

// Define the schema for the preferences form
const preferencesSchema = z.object({
  foodGoals: z.string().optional(),
  cuisinePreference: z.string().optional(),
  dietaryRestrictions: z.array(z.string()).optional().default([]), // Array of selected restriction IDs
});

type PreferencesFormValues = z.infer<typeof preferencesSchema>;

// Store preferences in localStorage
const PREFERENCES_STORAGE_KEY = 'pantrywise_preferences';

// Type for Preferences stored in localStorage
type StoredPreferences = PreferencesFormValues;

export function PreferencesManager() {
  const { toast } = useToast();
  const formId = useId();

  const { control, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<PreferencesFormValues>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      foodGoals: '',
      cuisinePreference: '',
      dietaryRestrictions: [],
    },
  });

  // Load preferences from localStorage on initial render
  useEffect(() => {
    const storedPrefs = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    let initialPrefs: StoredPreferences = { foodGoals: '', cuisinePreference: '', dietaryRestrictions: [] };
    if (storedPrefs && typeof window !== 'undefined') {
       try {
         const parsedPrefs: StoredPreferences = JSON.parse(storedPrefs);
         initialPrefs = parsedPrefs;
       } catch (error) {
          localStorage.removeItem(PREFERENCES_STORAGE_KEY);
       }
    }

    // Reset form with loaded data
    reset({
      foodGoals: initialPrefs.foodGoals ?? '',
      cuisinePreference: initialPrefs.cuisinePreference ?? '',
      dietaryRestrictions: initialPrefs.dietaryRestrictions ?? [],
    });

  }, [reset]);

  // Save preferences (called on successful submit)
  const saveData = (data: PreferencesFormValues) => {
    // Save Preferences
    const preferencesToStore: StoredPreferences = {
      foodGoals: data.foodGoals,
      cuisinePreference: data.cuisinePreference,
      dietaryRestrictions: data.dietaryRestrictions,
    };
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferencesToStore));

    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('preferencesUpdated', { detail: preferencesToStore }));

     toast({
      title: 'Preferences Saved',
      description: 'Your preferences have been updated.',
    });
  };

  const onSubmit = (data: PreferencesFormValues) => {
    saveData(data);
  };

  // Clear preferences
  const clearPreferences = () => {
    localStorage.removeItem(PREFERENCES_STORAGE_KEY);
    reset({
        foodGoals: '',
        cuisinePreference: '',
        dietaryRestrictions: [],
    });
    // Dispatch update event with empty data
    window.dispatchEvent(new CustomEvent('preferencesUpdated', { detail: { foodGoals: '', cuisinePreference: '', dietaryRestrictions: [] } }));
     toast({
       title: 'Preferences Cleared',
       description: 'Your preferences have been cleared.',
       variant: 'destructive',
     });
  }


  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader>
        <CardTitle>My Preferences</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col overflow-y-auto">
        {/* The form now wraps all content */}
        <form onSubmit={handleSubmit(onSubmit)} id={formId} className="space-y-6 flex-grow flex flex-col">

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
                    placeholder="e.g., Quick weeknight meal, Healthy lunch"
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
       <CardFooter className="border-t pt-4 flex flex-col sm:flex-row gap-2 justify-between items-center">
          {/* View Pantry Button */}
          <Link href="/pantry" passHref legacyBehavior>
            <Button
                asChild={false} // Ensure it renders as a button for styling
                variant="outline"
                className="w-full sm:w-auto"
            >
                <a> {/* Link component wraps the Button */}
                  <BookOpen className="mr-2 h-4 w-4" />
                  View Pantry
                </a>
            </Button>
          </Link>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                  type="button"
                  variant="ghost" // Changed variant for less emphasis
                  onClick={clearPreferences}
                  className="w-full sm:w-auto"
                  disabled={isSubmitting}
              >
                  <UtensilsCrossed className="mr-2 h-4 w-4" />
                  Clear Prefs
              </Button>
              <Button
                type="submit"
                form={formId} // Associate with the form via its ID
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSubmitting ? 'Saving...' : 'Save Prefs'}
              </Button>
          </div>
      </CardFooter>
    </Card>
  );
}
