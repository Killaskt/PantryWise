'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { generateRecipeFromPantry, GenerateRecipeFromPantryOutput } from '@/ai/flows/generate-recipe-from-pantry';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, ChefHat, Clock, Tag } from 'lucide-react';
import type { PantryIngredient } from '@/components/pantry-builder'; // Use type import
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

// Helper to get pantry from localStorage
const getPantryFromStorage = (): PantryIngredient[] => {
  // This check ensures localStorage is accessed only on the client-side
  if (typeof window !== 'undefined') {
    const storedPantry = localStorage.getItem('pantrywise_pantry');
    if (storedPantry) {
      try {
        const parsedPantry = JSON.parse(storedPantry);
         if (Array.isArray(parsedPantry) && parsedPantry.every(item => typeof item.name === 'string' && typeof item.quantity === 'string')) {
           return parsedPantry;
        }
      } catch (error) {
        console.error("Failed to parse pantry from localStorage:", error);
        localStorage.removeItem('pantrywise_pantry'); // Clear corrupted data
      }
    }
  }
  return [];
};

export function RecipeSuggestions() {
  const [suggestedRecipe, setSuggestedRecipe] = useState<GenerateRecipeFromPantryOutput | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [pantry, setPantry] = useState<PantryIngredient[]>([]);

  // Function to fetch suggestions
  const fetchSuggestions = useCallback(async () => {
    const currentPantry = getPantryFromStorage();
    setPantry(currentPantry); // Update local state for display logic

    if (currentPantry.length === 0) {
      setSuggestedRecipe(null); // Clear suggestions if pantry is empty
      setError(null); // Clear any previous errors
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuggestedRecipe(null); // Clear previous recipe while loading new one

    try {
      const recipe = await generateRecipeFromPantry({
        pantryIngredients: currentPantry,
        // Add dietary restrictions, cuisine preference, cook time preference later if needed
      });
      setSuggestedRecipe(recipe);
    } catch (err) {
      console.error('Error generating recipe:', err);
      setError('Failed to generate recipe suggestion. Please try again.');
      setSuggestedRecipe(null);
    } finally {
      setIsLoading(false);
    }
  }, []); // No dependencies needed initially

  // Initial fetch on component mount (client-side only)
  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]); // fetchSuggestions is stable due to useCallback

  // Listen for pantry updates from PantryBuilder
  useEffect(() => {
    const handlePantryUpdate = (event: Event) => {
       // We know the detail is PantryIngredient[] based on how we dispatch it
      const updatedPantry = (event as CustomEvent<PantryIngredient[]>).detail;
      setPantry(updatedPantry);
      fetchSuggestions(); // Re-fetch suggestions when pantry updates
    };

    window.addEventListener('pantryUpdated', handlePantryUpdate);

    return () => {
      window.removeEventListener('pantryUpdated', handlePantryUpdate);
    };
  }, [fetchSuggestions]); // Re-run if fetchSuggestions changes (though it's stable)


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold tracking-tight">Recipe Suggestions</h2>
        <Button variant="outline" size="sm" onClick={fetchSuggestions} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Refreshing...' : 'Refresh Suggestions'}
        </Button>
      </div>

      {error && (
         <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

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

      {!isLoading && !error && !suggestedRecipe && pantry.length === 0 && (
        <Card className="border-dashed border-2">
           <CardHeader className="items-center text-center">
             <ChefHat className="h-12 w-12 text-muted-foreground mb-2" />
             <CardTitle>Your Pantry is Empty</CardTitle>
            <CardDescription>Add some ingredients to your pantry to get recipe suggestions.</CardDescription>
          </CardHeader>
        </Card>
      )}

      {!isLoading && !error && !suggestedRecipe && pantry.length > 0 && (
         <Card className="border-dashed border-2">
           <CardHeader className="items-center text-center">
             <ChefHat className="h-12 w-12 text-muted-foreground mb-2" />
            <CardTitle>No Suggestions Yet</CardTitle>
            <CardDescription>We couldn't find a recipe with your current pantry items. Try adding more ingredients or click Refresh.</CardDescription>
             <Button onClick={fetchSuggestions} className="mt-4">Refresh Suggestions</Button>
          </CardHeader>
        </Card>
      )}


      {!isLoading && !error && suggestedRecipe && (
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
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">Ingredients</h3>
              <ul className="list-disc pl-5 space-y-1 text-foreground/90">
                {suggestedRecipe.ingredients.map((ing, index) => (
                  <li key={index}>
                    <span className="font-medium">{ing.quantity}</span> {ing.name}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">Instructions</h3>
              <ol className="list-decimal pl-5 space-y-2 text-foreground/90">
                {suggestedRecipe.instructions.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
