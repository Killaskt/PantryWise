
'use client';

import React, { useState, useEffect, useId } from 'react';
import { useForm, Controller, useFieldArray, set } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, PlusCircle, Save, Pencil, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton


// Define the structure for a single pantry ingredient
export const pantryIngredientSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()), // Add unique ID for list keys
  name: z.string().min(1, 'Ingredient name cannot be empty'),
  quantity: z.string().min(1, 'Quantity cannot be empty').default('some'), // Make quantity required
});
export type PantryIngredient = z.infer<typeof pantryIngredientSchema>;

// Schema for the add/edit form
const pantryItemFormSchema = pantryIngredientSchema.omit({ id: true }); // Omit id for form validation
type PantryItemFormValues = z.infer<typeof pantryItemFormSchema>;

// Store pantry data in localStorage
const PANTRY_STORAGE_KEY = 'pantrywise_pantry';

export function PantryManager() {
  const [pantry, setPantry] = useState<PantryIngredient[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Add loading state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const { toast } = useToast();
  const formId = useId();

  const { control, handleSubmit, reset, formState: { errors, isSubmitting }, register } = useForm<PantryItemFormValues>({
    resolver: zodResolver(pantryItemFormSchema),
    defaultValues: {
      name: '',
      quantity: '',
    },
  });

  // Load pantry from localStorage on initial render
  useEffect(() => {
    setIsLoading(true);
    const storedPantry = localStorage.getItem(PANTRY_STORAGE_KEY);
    let initialPantry: PantryIngredient[] = [];
    if (storedPantry && typeof window !== 'undefined') {
      try {
        const parsedPantry: Omit<PantryIngredient, 'id'>[] = JSON.parse(storedPantry);
         if (Array.isArray(parsedPantry) && parsedPantry.every(item => typeof item.name === 'string')) {
            // Add IDs if missing from old format
           initialPantry = parsedPantry.map(item => ({
               ...item,
               id: crypto.randomUUID(), // Assign a new UUID
               quantity: item.quantity || 'some' // Ensure quantity exists
           }));
           setPantry(initialPantry);
           // Re-save with IDs
           localStorage.setItem(PANTRY_STORAGE_KEY, JSON.stringify(initialPantry));
         } else {
           localStorage.removeItem(PANTRY_STORAGE_KEY);
         }
      } catch (error) {
        console.error("Error parsing pantry data:", error);
        localStorage.removeItem(PANTRY_STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  // Function to save the entire pantry state to localStorage
  const savePantryState = (updatedPantry: PantryIngredient[]) => {
    localStorage.setItem(PANTRY_STORAGE_KEY, JSON.stringify(updatedPantry));
    window.dispatchEvent(new CustomEvent('pantryUpdated', { detail: updatedPantry }));
  };

  // Add or Update Ingredient
  const onSubmit = (data: PantryItemFormValues) => {
    let updatedPantry: PantryIngredient[];
    if (editingItemId) {
        // Update existing item
        updatedPantry = pantry.map(item =>
            item.id === editingItemId ? { ...item, name: data.name, quantity: data.quantity } : item
        );
        toast({ title: 'Item Updated', description: `${data.name} quantity updated.` });
        setEditingItemId(null); // Exit editing mode
    } else {
        // Add new item
        const newItem: PantryIngredient = { ...data, id: crypto.randomUUID() };
        updatedPantry = [...pantry, newItem];
        toast({ title: 'Item Added', description: `${data.name} added to your pantry.` });
    }
    setPantry(updatedPantry);
    savePantryState(updatedPantry);
    reset({ name: '', quantity: '' }); // Clear form
  };

  // Delete Ingredient
  const deleteItem = (id: string) => {
    const itemToDelete = pantry.find(item => item.id === id);
    if (!itemToDelete) return;

    const updatedPantry = pantry.filter(item => item.id !== id);
    setPantry(updatedPantry);
    savePantryState(updatedPantry);
    toast({
      title: 'Item Removed',
      description: `${itemToDelete.name} removed from your pantry.`,
      variant: 'destructive',
    });
    if (editingItemId === id) {
        setEditingItemId(null); // Cancel edit if deleting the item being edited
        reset({ name: '', quantity: '' });
    }
  };

   // Start editing an item
  const startEditing = (item: PantryIngredient) => {
    setEditingItemId(item.id);
    reset({ name: item.name, quantity: item.quantity }); // Pre-fill form
  };

   // Cancel editing
   const cancelEditing = () => {
    setEditingItemId(null);
    reset({ name: '', quantity: '' }); // Clear form
   }


  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
       <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">My Pantry</h1>
            <Link href="/" passHref legacyBehavior>
                 <Button variant="outline">
                    Back to Recipes
                 </Button>
            </Link>
       </div>


      {/* Add/Edit Item Form */}
      <Card>
        <CardHeader>
          <CardTitle>{editingItemId ? 'Edit Item' : 'Add New Item'}</CardTitle>
        </CardHeader>
        <CardContent>
           <form onSubmit={handleSubmit(onSubmit)} id={formId} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="space-y-1">
              <Label htmlFor="name">Ingredient Name</Label>
              <Input
                id="name"
                placeholder="e.g., Flour, Chicken Breast"
                aria-invalid={!!errors.name}
                {...register("name")}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                placeholder="e.g., 1 kg, 2 cans, some"
                aria-invalid={!!errors.quantity}
                {...register("quantity")}
              />
              {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}
            </div>
             <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                    {editingItemId ? <><Check className="mr-2 h-4 w-4" /> Update</> : <><PlusCircle className="mr-2 h-4 w-4" /> Add</>}
                </Button>
                 {editingItemId && (
                    <Button type="button" variant="ghost" onClick={cancelEditing} className="w-full sm:w-auto">
                       <X className="mr-2 h-4 w-4" /> Cancel
                    </Button>
                 )}
             </div>
          </form>
        </CardContent>
      </Card>

      {/* Pantry List Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pantry Items</CardTitle>
        </CardHeader>
        <CardContent>
           {isLoading ? (
               <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
               </div>
           ) : pantry.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Your pantry is empty. Add some items above!</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingredient</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pantry.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell className="text-right space-x-2">
                       <Button variant="ghost" size="icon" onClick={() => startEditing(item)} title="Edit Item">
                         <Pencil className="h-4 w-4" />
                       </Button>
                       <Button variant="ghost" size="icon" onClick={() => deleteItem(item.id)} className="text-destructive hover:text-destructive" title="Delete Item">
                         <Trash2 className="h-4 w-4" />
                       </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
