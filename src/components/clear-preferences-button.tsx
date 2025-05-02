
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { UtensilsCrossed } from 'lucide-react';

export function ClearPreferencesButton() {
  const handleClick = () => {
    // Dispatch event to trigger clear in PreferencesManager
    document.dispatchEvent(new CustomEvent('clear-preferences-event'));
  };

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={handleClick}
      className="flex-1"
      size="sm"
      // disabled={isSubmitting} // If needed, manage disabled state within this component or via props/context
    >
      <UtensilsCrossed className="mr-2 h-4 w-4" />
      Clear
    </Button>
  );
}
