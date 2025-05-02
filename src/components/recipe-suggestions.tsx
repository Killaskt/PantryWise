
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link'; // Import Link
import { generateRecipeFromPantry, GenerateRecipeFromPantryOutput, GenerateRecipeFromPantryInput } from '@/ai/flows/generate-recipe-from-pantry';
import { refineRecipe, RefineRecipeInput, RefineRecipeOutput } from '@/ai/flows/refine-recipe'; // Ensure RefineRecipeOutput is imported if needed elsewhere
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, ChefHat, Clock, Info, Bot } from 'lucide-react'; // Replaced Sparkles, Wand2 with Bot
import type { PantryIngredient } from '@/components/pantry-manager'; // Import from pantry-manager
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

// Storage keys remain the same, assuming pantry-manager uses the same key
const PANTRY_STORAGE_KEY = 'pantrywise_pantry';
const PREFERENCES_STORAGE_KEY = 'pantrywise_preferences';

// Type for Preferences stored in localStorage (align with preferences-manager)
type StoredPreferences = {
  foodGoals?: string;
  cuisinePreference?: string;
  dietaryRestrictions?: string[];
};

// Helper to get pantry from localStorage (now expects PantryIngredient with id and quantity)
const getPantryFromStorage = (): PantryIngredient[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(PANTRY_STORAGE_KEY);
  if (stored) {
    try {
      const parsed: PantryIngredient[] = JSON.parse(stored);
       if (Array.isArray(parsed) && parsed.every(item => typeof item.name === 'string' && typeof item.id === 'string' && typeof item.quantity === 'string')) {
         return parsed;
      } else {
        // Attempt migration or clear if format is wrong
        console.warn("Invalid pantry format found in localStorage. Clearing.");
        localStorage.removeItem(PANTRY_STORAGE_KEY);
      }
    } catch (error) {
      console.error("Error parsing pantry from localStorage:", error);
      localStorage.removeItem(PANTRY_STORAGE_KEY);
    }
  }
  return [];
};

// Helper to get preferences from localStorage (align with preferences-manager)
const getPreferencesFromStorage = (): StoredPreferences => {
  if (typeof window === 'undefined') return {};
  const stored = localStorage.getItem(PREFERENCES_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Basic validation: ensure it's an object
      if (typeof parsed === 'object' && parsed !== null) {
          return {
              foodGoals: typeof parsed.foodGoals === 'string' ? parsed.foodGoals : undefined,
              cuisinePreference: typeof parsed.cuisinePreference === 'string' ? parsed.cuisinePreference : undefined,
              dietaryRestrictions: Array.isArray(parsed.dietaryRestrictions) ? parsed.dietaryRestrictions.filter((r: any) => typeof r === 'string') : undefined,
          };
      } else {
          console.warn("Invalid preferences format found in localStorage. Clearing.");
          localStorage.removeItem(PREFERENCES_STORAGE_KEY);
      }
    } catch (error) {
      console.error("Error parsing preferences from localStorage:", error);
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

  // Function to fetch suggestions, now including preferences and quantities
  const fetchSuggestions = useCallback(async (currentPantry: PantryIngredient[], currentPrefs: StoredPreferences) => {
    if (currentPantry.length === 0) {
      setSuggestedRecipe(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuggestedRecipe(null); // Clear previous suggestion

    try {
       if (!Array.isArray(currentPantry) || currentPantry.length === 0) {
         throw new Error("Pantry is empty or invalid.");
      }

       // Ensure pantry items have name and quantity for the flow
       const validPantryItems = currentPantry
           .filter(item => item.name && item.quantity)
           .map(({ id, ...rest }) => rest); // Remove ID before sending to flow

       if (validPantryItems.length === 0) {
            throw new Error("No valid ingredients with quantities found in the pantry.");
       }


      // Prepare input for the AI flow, including preferences and quantities
      const input: GenerateRecipeFromPantryInput = {
        pantryIngredients: validPantryItems, // Use items with name and quantity
        dietaryRestrictions: currentPrefs.dietaryRestrictions?.join(', '),
        cuisinePreference: currentPrefs.cuisinePreference,
        foodGoals: currentPrefs.foodGoals, // Pass food goals
      };

      console.log("Generating recipe with input:", JSON.stringify(input, null, 2)); // Log input

      const recipe = await generateRecipeFromPantry(input);
      console.log("Generated recipe output:", JSON.stringify(recipe, null, 2)); // Log output
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
  }, []);

  // Effect to load initial data and set up listeners
  useEffect(() => {
    const initialPantry = getPantryFromStorage();
    const initialPrefs = getPreferencesFromStorage();
    setPantry(initialPantry);
    setPreferences(initialPrefs);
    fetchSuggestions(initialPantry, initialPrefs); // Fetch initial suggestions

    // Listener for pantry updates (now expects PantryIngredient[])
    const handlePantryUpdate = (event: Event) => {
      const updatedPantry = (event as CustomEvent<PantryIngredient[]>).detail;
      setPantry(updatedPantry);
      const currentPrefs = getPreferencesFromStorage(); // Get potentially updated prefs
      setPreferences(currentPrefs);
      fetchSuggestions(updatedPantry, currentPrefs);
    };

    // Listener for preferences updates (now expects StoredPreferences)
    const handlePreferencesUpdate = (event: Event) => {
        const updatedPrefs = (event as CustomEvent<StoredPreferences>).detail;
        setPreferences(updatedPrefs);
        const currentPantry = getPantryFromStorage(); // Get potentially updated pantry
        setPantry(currentPantry);
        fetchSuggestions(currentPantry, updatedPrefs);
    };

    window.addEventListener('pantryUpdated', handlePantryUpdate);
    window.addEventListener('preferencesUpdated', handlePreferencesUpdate);

    return () => {
      window.removeEventListener('pantryUpdated', handlePantryUpdate);
      window.removeEventListener('preferencesUpdated', handlePreferencesUpdate);
    };
  }, [fetchSuggestions]);

   // Manual refresh handler - uses current state from storage
  const handleRefresh = () => {
    const currentPantry = getPantryFromStorage(); // Re-fetch latest
    const currentPrefs = getPreferencesFromStorage(); // Re-fetch latest
    setPantry(currentPantry);
    setPreferences(currentPrefs);
    fetchSuggestions(currentPantry, currentPrefs);
  };

  // Handler for refining the recipe - uses current state from storage
  const handleRefineRecipe = async () => {
    if (!suggestedRecipe || !refinementInput.trim()) {
      setRefinementError("Please enter your suggestions for refinement.");
      return;
    }

    setIsRefining(true);
    setRefinementError(null);

    try {
      const currentPantry = getPantryFromStorage(); // Get latest pantry with quantities and IDs
      const currentPrefs = getPreferencesFromStorage(); // Get latest preferences

       // Ensure pantry items have name and quantity for the flow
       const validPantryItems = currentPantry
           .filter(item => item.name && item.quantity)
           .map(({ id, ...rest }) => rest); // Remove ID before sending to flow

        if (validPantryItems.length === 0) {
             throw new Error("Cannot refine recipe without valid pantry items.");
        }

      const refineInput: RefineRecipeInput = {
        originalRecipe: {
          // Ensure all fields expected by the flow are present
          title: suggestedRecipe.title,
          ingredients: suggestedRecipe.ingredients || [],
          instructions: suggestedRecipe.instructions || [],
          cuisine: suggestedRecipe.cuisine,
          cookTime: suggestedRecipe.cookTime,
          description: suggestedRecipe.description,
          notes: suggestedRecipe.notes,
        },
        refinementPrompt: refinementInput,
        pantryIngredients: validPantryItems, // Pass pantry items with name/quantity
        preferences: {
            dietaryRestrictions: currentPrefs.dietaryRestrictions?.join(', '),
            cuisinePreference: currentPrefs.cuisinePreference,
            foodGoals: currentPrefs.foodGoals,
        }
      };

      console.log("Refining recipe with input:", JSON.stringify(refineInput, null, 2)); // Log input

      const refinedRecipe = await refineRecipe(refineInput);

      console.log("Refined recipe output:", JSON.stringify(refinedRecipe, null, 2)); // Log output

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
            <CardDescription>Add some ingredients via the 'View Pantry' button to get recipe suggestions.</CardDescription>
            {/* Optionally add a link/button to the pantry page */}
            <Link href="/pantry" passHref legacyBehavior>
                <Button variant="secondary" className="mt-4">Manage Pantry</Button>
            </Link>
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
                <h3 className="text-lg font-semibold mb-2 text-foreground">Ingredients Used</h3>
                {suggestedRecipe.ingredients && suggestedRecipe.ingredients.length > 0 ? (
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
                 {suggestedRecipe.instructions && suggestedRecipe.instructions.length > 0 ? (
                    <ol className="list-decimal pl-5 space-y-2 text-foreground/90">
                      {suggestedRecipe.instructions.map((step, index) => (
                        <li key={index}>{step.replace(/^\d+\.\s*/, '')}</li> // Remove existing numbering just in case
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
                <Bot className="h-5 w-5 text-accent" /> {/* Changed icon */}
                Refine This Recipe
              </CardTitle>
              <CardDescription>Suggest changes like "make it spicier", "add mushrooms", "use less chicken", etc. (We'll check your pantry for availability!)</CardDescription>
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
                <Bot className={`mr-2 h-4 w-4 ${isRefining ? 'animate-spin' : ''}`} /> {/* Changed icon */}
                {isRefining ? 'Refining...' : 'Generate Variation'}
              </Button>
            </CardFooter>
          </Card>
        </>
      )}
    </div>
  );
}
