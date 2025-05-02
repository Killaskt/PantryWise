
'use client'; // Add use client directive

import { useSidebar } from '@/components/ui/sidebar'; // Removed SidebarTrigger import
import { Utensils } from 'lucide-react';
import { cn } from '@/lib/utils';
// Button import removed as it's no longer used here
// PanelLeft import removed

export function Header() {
  // Get sidebar state for conditional rendering of title/icon, but trigger is removed
  const { isMobile, state } = useSidebar();

  // Trigger is no longer shown in this component
  // const showTrigger = isMobile || state === 'collapsed'; // Logic removed

  return (
    // Adjusted padding/margins might be needed depending on layout
    <div className="flex items-center justify-between">
       <div className={cn(
           "flex items-center gap-2 transition-opacity duration-300",
           // Hide title/icon smoothly when collapsed on desktop
           state === 'collapsed' && !isMobile ? "opacity-0 w-0 h-0 overflow-hidden p-0" : "opacity-100 p-2"
         )}>
        <Utensils className="h-6 w-6 text-primary flex-shrink-0" />
        <h1 className="text-lg font-semibold text-primary truncate">PantryWise</h1>
      </div>
      {/* SidebarTrigger button removed from here */}
    </div>
  );
}

// PanelLeft import removed
