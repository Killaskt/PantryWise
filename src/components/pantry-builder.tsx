'use client';

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ingredientSchema = z.object({
  name: z.string().min(1, 'Ingredient name is required'),
  quantity: z.string().min(1, 'Quantity is required'),
});

const pantrySchema = z.object({
  ingredients: z.array(ingredientSchema),
});

type PantryFormValues = z.infer<typeof pantrySchema>;
export type PantryIngredient = z.infer<typeof ingredientSchema>;

// Store pantry data in localStorage
const PANTRY_STORAGE_KEY = 'pantrywise_pantry';

export function PantryBuilder() {
  const [pantry, setPantry] = useState<PantryIngredient[]>([]);
  const { toast } = useToast();

  // Load pantry from localStorage on initial render
  useEffect(() => {
    const storedPantry = localStorage.getItem(PANTRY_STORAGE_KEY);
    if (storedPantry) {
      try {
        const parsedPantry = JSON.parse(storedPantry);
        // Basic validation to ensure it's an array of objects with name/quantity
        if (Array.isArray(parsedPantry) && parsedPantry.every(item => typeof item.name === 'string' && typeof item.quantity === 'string')) {
           setPantry(parsedPantry);
           reset({ ingredients: parsedPantry }); // Sync form state
        } else {
          console.error("Invalid pantry data found in localStorage.");
          localStorage.removeItem(PANTRY_STORAGE_KEY); // Clear invalid data
        }
      } catch (error) {
        console.error("Failed to parse pantry from localStorage:", error);
        localStorage.removeItem(PANTRY_STORAGE_KEY); // Clear corrupted data
      }
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  // Save pantry to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(PANTRY_STORAGE_KEY, JSON.stringify(pantry));
    // Dispatch a custom event to notify other components (like RecipeSuggestions)
    window.dispatchEvent(new CustomEvent('pantryUpdated', { detail: pantry }));
  }, [pantry]);


  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PantryFormValues>({
    resolver: zodResolver(pantrySchema),
    defaultValues: {
      ingredients: pantry,
    },
    mode: 'onChange', // Show errors immediately
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'ingredients',
  });

  const onSubmit = (data: PantryFormValues) => {
    setPantry(data.ingredients);
    toast({
      title: 'Pantry Updated',
      description: 'Your pantry ingredients have been saved.',
    });
  };

  // Add a new empty ingredient field
  const addIngredientField = () => {
    append({ name: '', quantity: '' });
  };

  // Handle removing an ingredient and update state immediately
  const handleRemoveIngredient = (index: number) => {
    remove(index);
    // Update pantry state directly after removing from the form array
    const currentValues = control._formValues.ingredients;
    setPantry(currentValues);
     toast({
      title: 'Ingredient Removed',
      description: 'The ingredient has been removed from your pantry.',
      variant: 'destructive',
    });
  };

  // Handle input changes and update state immediately
  const handleInputChange = (index: number, field: 'name' | 'quantity', value: string) => {
    const currentValues = [...control._formValues.ingredients];
    currentValues[index][field] = value;
    setPantry(currentValues);
  };


  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>My Pantry</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <ScrollArea className="h-[400px] pr-4"> {/* Adjust height as needed */}
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-start space-x-2">
                  <div className="flex-grow grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor={`ingredients.${index}.name`} className="sr-only">Ingredient Name</Label>
                       <Controller
                        name={`ingredients.${index}.name`}
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            placeholder="Ingredient Name"
                            aria-invalid={!!errors.ingredients?.[index]?.name}
                            onChange={(e) => {
                              field.onChange(e);
                              handleInputChange(index, 'name', e.target.value);
                            }}
                          />
                        )}
                      />
                      {errors.ingredients?.[index]?.name && (
                        <p className="text-sm text-destructive mt-1">{errors.ingredients[index]?.name?.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor={`ingredients.${index}.quantity`} className="sr-only">Quantity</Label>
                       <Controller
                        name={`ingredients.${index}.quantity`}
                        control={control}
                        render={({ field }) => (
                           <Input
                            {...field}
                            placeholder="Quantity (e.g., 1 cup)"
                            aria-invalid={!!errors.ingredients?.[index]?.quantity}
                            onChange={(e) => {
                              field.onChange(e);
                              handleInputChange(index, 'quantity', e.target.value);
                            }}
                          />
                        )}
                      />
                      {errors.ingredients?.[index]?.quantity && (
                        <p className="text-sm text-destructive mt-1">{errors.ingredients[index]?.quantity?.message}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveIngredient(index)}
                    className="mt-1 text-muted-foreground hover:text-destructive"
                    aria-label="Remove ingredient"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addIngredientField}
            className="mt-4"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Ingredient
          </Button>
        </form>
      </CardContent>
       {/* Removed CardFooter with explicit Save button as changes are saved on input */}
    </Card>
  );
}
