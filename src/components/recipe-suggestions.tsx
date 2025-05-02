
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { generateRecipeFromPantry, GenerateRecipeFromPantryOutput, GenerateRecipeFromPantryInput } from '@/ai/flows/generate-recipe-from-pantry';
import { refineRecipe, RefineRecipeInput } from '@/ai/flows/refine-recipe';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, ChefHat, Clock, Info, Sparkles, Wand2 } from 'lucide-react';
import type { PantryIngredient } from '@/components/pantry-builder'; // Use type import
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const PANTRY_STORAGE_KEY = 'pantrywise_pantry';
const PREFERENCES_STORAGE_KEY = 'pantrywise_preferences';

// Type for Preferences stored in localStorage
type StoredPreferences = {
  foodGoals?: string;
  cuisinePreference?: string;
  dietaryRestrictions?: string[];
};

// Helper to get pantry from localStorage
const getPantryFromStorage = (): PantryIngredient[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(PANTRY_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
       if (Array.isArray(parsed) && parsed.every(item => typeof item.name === 'string')) {
         return parsed;
      } else {
        localStorage.removeItem(PANTRY_STORAGE_KEY);
      }
    } catch (error) {
      localStorage.removeItem(PANTRY_STORAGE_KEY);
    }
  }
  return [];
};

// Helper to get preferences from localStorage
const getPreferencesFromStorage = (): StoredPreferences => {
  if (typeof window === 'undefined') return {};
  const stored = localStorage.getItem(PREFERENCES_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Add basic validation if needed
      return parsed;
    } catch (error) {
      localStorage.removeItem(PREFERENCES_STORAGE_KEY);
    }
  }
  return {};
};


export function RecipeSuggestions() {
  const [suggestedRecipe, setSuggestedRecipe] = useState<GenerateRecipeFromPantryOutput | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pantry, setPantry] = useState<PantryIngredient[]>([]);
  const [preferences, setPreferences] = useState<StoredPreferences>({});
  const [refinementInput, setRefinementInput] = useState<string>('');
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [refinementError, setRefinementError] = useState<string | null>(null);
  const { toast } = useToast();

  // Function to fetch suggestions, now including preferences
  const fetchSuggestions = useCallback(async (currentPantry: PantryIngredient[], currentPrefs: StoredPreferences) => {
    if (currentPantry.length === 0) {
      setSuggestedRecipe(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuggestedRecipe(null);

    try {
       if (!Array.isArray(currentPantry) || currentPantry.length === 0) {
         throw new Error("Pantry is empty or invalid.");
      }

      // Prepare input for the AI flow, including preferences
      const input: GenerateRecipeFromPantryInput = {
        pantryIngredients: currentPantry,
        // Combine dietary restrictions array into a string for the prompt, if present
        dietaryRestrictions: currentPrefs.dietaryRestrictions?.join(', '),
        cuisinePreference: currentPrefs.cuisinePreference,
        // Optionally add foodGoals to the input if your flow uses it
        // foodGoals: currentPrefs.foodGoals, // Example: uncomment if flow expects foodGoals
      };

      const recipe = await generateRecipeFromPantry(input);
      setSuggestedRecipe(recipe);
      setRefinementInput('');
      setRefinementError(null);
    } catch (err: any) {
      console.error('Error generating recipe:', err);
      setError(`Failed to generate recipe suggestion: ${err.message || 'Please try again.'}`);
      setSuggestedRecipe(null);
    } finally {
      setIsLoading(false);
    }
  }, []); // No dependencies needed here as it gets called with current state

  // Effect to load initial data and set up listeners
  useEffect(() => {
    const initialPantry = getPantryFromStorage();
    const initialPrefs = getPreferencesFromStorage();
    setPantry(initialPantry);
    setPreferences(initialPrefs);
    fetchSuggestions(initialPantry, initialPrefs); // Fetch initial suggestions

    // Listener for pantry updates
    const handlePantryUpdate = (event: Event) => {
      const updatedPantry = (event as CustomEvent<PantryIngredient[]>).detail;
      setPantry(updatedPantry);
      // Fetch new suggestions with current preferences
      const currentPrefs = getPreferencesFromStorage();
      setPreferences(currentPrefs);
      fetchSuggestions(updatedPantry, currentPrefs);
    };

    // Listener for preferences updates
    const handlePreferencesUpdate = (event: Event) => {
        const updatedPrefs = (event as CustomEvent<StoredPreferences>).detail;
        setPreferences(updatedPrefs);
        // Fetch new suggestions with current pantry
        const currentPantry = getPantryFromStorage();
        setPantry(currentPantry);
        fetchSuggestions(currentPantry, updatedPrefs);
    };

    window.addEventListener('pantryUpdated', handlePantryUpdate);
    window.addEventListener('preferencesUpdated', handlePreferencesUpdate);

    return () => {
      window.removeEventListener('pantryUpdated', handlePantryUpdate);
      window.removeEventListener('preferencesUpdated', handlePreferencesUpdate);
    };
  }, [fetchSuggestions]); // fetchSuggestions is stable due to useCallback

   // Manual refresh handler - uses current state
  const handleRefresh = () => {
    const currentPantry = getPantryFromStorage(); // Re-fetch latest
    const currentPrefs = getPreferencesFromStorage(); // Re-fetch latest
    setPantry(currentPantry);
    setPreferences(currentPrefs);
    fetchSuggestions(currentPantry, currentPrefs);
  };

  // Handler for refining the recipe - uses current state
  const handleRefineRecipe = async () => {
    if (!suggestedRecipe || !refinementInput.trim()) {
      setRefinementError("Please enter your suggestions for refinement.");
      return;
    }

    setIsRefining(true);
    setRefinementError(null);

    try {
      const currentPantry = getPantryFromStorage(); // Get latest pantry
      const currentPrefs = getPreferencesFromStorage(); // Get latest preferences

      const refineInput: RefineRecipeInput = {
        originalRecipe: suggestedRecipe,
        refinementPrompt: refinementInput,
        pantryIngredients: currentPantry,
        // Pass current preferences to the refine flow
        preferences: { // Assuming refine flow accepts preferences
            dietaryRestrictions: currentPrefs.dietaryRestrictions?.join(', '),
            cuisinePreference: currentPrefs.cuisinePreference,
            // foodGoals: currentPrefs.foodGoals, // Optional
        }
      };
      const refinedRecipe = await refineRecipe(refineInput);
      setSuggestedRecipe(refinedRecipe); // Update displayed recipe
      setRefinementInput(''); // Clear input field
      toast({
        title: 'Recipe Refined',
        description: 'The suggestion updated based on your feedback.',
      });
    } catch (err: any) {
      console.error('Error refining recipe:', err);
      setRefinementError(`Failed to refine recipe: ${err.message || 'Please try again.'}`);
      toast({
        variant: 'destructive',
        title: 'Refinement Failed',
        description: `Could not refine. ${err.message || 'Please try again.'}`,
      });
    } finally {
      setIsRefining(false);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold tracking-tight">Recipe Suggestions</h2>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading || pantry.length === 0}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Refreshing...' : 'Refresh Suggestions'}
        </Button>
      </div>

      {error && (
         <Alert variant="destructive">
           <AlertTitle>Error Generating Recipe</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
         <Card>
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
             <Skeleton className="h-4 w-full" />
             <Skeleton className="h-4 w-5/6" />
             <Skeleton className="h-4 w-full" />
             <Skeleton className="h-4 w-4/5" />
          </CardContent>
        </Card>
      )}

       {/* Empty Pantry State */}
      {!isLoading && !error && pantry.length === 0 && (
        <Card className="border-dashed border-2">
           <CardHeader className="items-center text-center">
             <ChefHat className="h-12 w-12 text-muted-foreground mb-2" />
             <CardTitle>Your Pantry is Empty</CardTitle>
            <CardDescription>Add some ingredients to your pantry (on the left!) to get recipe suggestions.</CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* No Suggestions State */}
      {!isLoading && !error && !suggestedRecipe && pantry.length > 0 && (
         <Card className="border-dashed border-2">
           <CardHeader className="items-center text-center">
             <ChefHat className="h-12 w-12 text-muted-foreground mb-2" />
            <CardTitle>No Suggestion Available</CardTitle>
            <CardDescription>
              Couldn't generate a recipe with current pantry/preferences.
              Try adding more items, adjusting preferences, or click Refresh.
            </CardDescription>
             <Button onClick={handleRefresh} className="mt-4" disabled={isLoading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Refreshing...' : 'Refresh Suggestions'}
             </Button>
          </CardHeader>
        </Card>
      )}


      {/* Recipe Found State */}
      {!isLoading && !error && suggestedRecipe && (
        <>
          <Card className="shadow-md rounded-lg overflow-hidden bg-card">
            <CardHeader>
              <CardTitle className="text-2xl text-primary">{suggestedRecipe.title}</CardTitle>
              <CardDescription className="text-muted-foreground pt-1">{suggestedRecipe.description}</CardDescription>
               <div className="flex flex-wrap gap-2 pt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1 bg-secondary px-2 py-1 rounded-full">
                  <ChefHat className="h-4 w-4 text-primary" />
                  {suggestedRecipe.cuisine || 'Unknown Cuisine'}
                </span>
                <span className="flex items-center gap-1 bg-secondary px-2 py-1 rounded-full">
                  <Clock className="h-4 w-4 text-primary" />
                  {suggestedRecipe.cookTime ? `${suggestedRecipe.cookTime} mins` : 'N/A'}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pb-4">
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">Ingredients</h3>
                {suggestedRecipe.ingredients.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-1 text-foreground/90">
                    {suggestedRecipe.ingredients.map((ing, index) => (
                      <li key={index}>
                        <span className="font-medium">{ing.quantity}</span> {ing.name}
                      </li>
                    ))}
                  </ul>
                ) : (
                   <p className="text-sm text-muted-foreground italic">No specific ingredients listed.</p>
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">Instructions</h3>
                 {suggestedRecipe.instructions.length > 0 ? (
                    <ol className="list-decimal pl-5 space-y-2 text-foreground/90">
                      {suggestedRecipe.instructions.map((step, index) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No instructions provided.</p>
                  )}
              </div>
            </CardContent>
             {/* Notes Section */}
            {suggestedRecipe.notes && (
              <CardFooter className="bg-secondary/50 p-4 border-t">
                  <div className="flex items-start gap-2 text-sm">
                      <Info className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <p className="text-muted-foreground"><span className="font-semibold">Notes:</span> {suggestedRecipe.notes}</p>
                  </div>
              </CardFooter>
             )}
          </Card>

          {/* Refinement Section */}
          <Card className="mt-6 shadow-md rounded-lg overflow-hidden bg-card border border-dashed border-accent/50">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-accent" />
                Refine This Recipe
              </CardTitle>
              <CardDescription>Suggest changes like "make it spicier", "add mushrooms", "vegetarian version", etc. (We'll check your pantry for additions!)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
               <Label htmlFor="refinementInput">Your Suggestions</Label>
              <Textarea
                id="refinementInput"
                value={refinementInput}
                onChange={(e) => setRefinementInput(e.target.value)}
                placeholder="e.g., Make it gluten-free, add bell peppers if possible..."
                className="min-h-[60px]"
                disabled={isRefining}
              />
              {refinementError && (
                <p className="text-sm text-destructive">{refinementError}</p>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={handleRefineRecipe} disabled={isRefining || !refinementInput.trim()}>
                <Sparkles className={`mr-2 h-4 w-4 ${isRefining ? 'animate-spin' : ''}`} />
                {isRefining ? 'Refining...' : 'Generate Variation'}
              </Button>
            </CardFooter>
          </Card>
        </>
      )}
    </div>
  );
}

    