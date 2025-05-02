
'use client';

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Removed CardFooter
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link'; // Keep Link if needed elsewhere, but button is removed

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

// Accept formId as a prop
interface PreferencesManagerProps {
  formId: string;
}

export function PreferencesManager({ formId }: PreferencesManagerProps) {
  const { toast } = useToast();

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
         // Basic validation
         if (typeof parsedPrefs === 'object' && parsedPrefs !== null) {
            initialPrefs = {
                foodGoals: typeof parsedPrefs.foodGoals === 'string' ? parsedPrefs.foodGoals : '',
                cuisinePreference: typeof parsedPrefs.cuisinePreference === 'string' ? parsedPrefs.cuisinePreference : '',
                dietaryRestrictions: Array.isArray(parsedPrefs.dietaryRestrictions) ? parsedPrefs.dietaryRestrictions.filter((r: any) => typeof r === 'string') : [],
            };
         } else {
             localStorage.removeItem(PREFERENCES_STORAGE_KEY);
         }
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

     // Expose clear function (example using custom event or state lift)
     const handleClearRequest = () => clearPreferences();
     window.addEventListener('clearPreferencesRequest', handleClearRequest);
     return () => window.removeEventListener('clearPreferencesRequest', handleClearRequest);


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

  // Clear preferences function remains, might be triggered externally now
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

  // Expose clear function to be called externally (e.g., by button in SidebarFooter)
  useEffect(() => {
     const handleClearRequest = () => clearPreferences();
     // Assuming the button in SidebarFooter dispatches this event or calls a context function
     document.addEventListener('clear-preferences-event', handleClearRequest);
     return () => document.removeEventListener('clear-preferences-event', handleClearRequest);
  }, [reset]); // Dependencies as needed


  return (
    // Adjust Card styling: remove shadow/border if sidebar provides it, ensure full height
    <Card className="w-full h-full flex flex-col border-0 shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0 pb-2"> {/* Adjust padding */}
        <CardTitle className="text-xl">My Preferences</CardTitle>
      </CardHeader>
      {/* Use flex-grow on CardContent and the form inside it */}
      <CardContent className="flex-grow overflow-y-auto px-0 pb-0">
        {/* The form now wraps all content and takes full height */}
        <form onSubmit={handleSubmit(onSubmit)} id={formId} className="space-y-4 flex flex-col h-full">

          {/* Preferences Section */}
          <div className="space-y-3 flex-grow"> {/* Make this section grow */}
            {/* Food Goals */}
            <div className="space-y-1">
              <Label htmlFor="foodGoals" className="text-xs">Food Goals</Label>
              <Controller
                name="foodGoals"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="foodGoals"
                    placeholder="e.g., Quick meal, Healthy lunch"
                    className="text-sm h-9" // Ensure input height is consistent
                  />
                )}
              />
              {errors.foodGoals && <p className="text-xs text-destructive">{errors.foodGoals.message}</p>}
            </div>

            {/* Cuisine Preference */}
            <div className="space-y-1">
              <Label htmlFor="cuisinePreference" className="text-xs">Cuisine Preference</Label>
              <Controller
                name="cuisinePreference"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="cuisinePreference"
                    placeholder="e.g., Italian, Mexican"
                    className="text-sm h-9" // Consistent height
                  />
                )}
              />
              {errors.cuisinePreference && <p className="text-xs text-destructive">{errors.cuisinePreference.message}</p>}
            </div>

            {/* Dietary Restrictions */}
            <div className="space-y-1">
              <Label className="text-xs">Dietary Restrictions</Label>
              <div className="space-y-1.5">
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
                            className="font-normal cursor-pointer text-sm"
                          >
                            {option.label}
                          </Label>
                        </div>
                      )
                    }}
                  />
                ))}
              </div>
              {errors.dietaryRestrictions && <p className="text-xs text-destructive">{errors.dietaryRestrictions.message}</p>}
            </div>
          </div>

          {/* Removed Spacer and Footer - Buttons are external now */}
        </form>
      </CardContent>
       {/* CardFooter removed */}
    </Card>
  );
}
