
'use client'; // Add use client directive

import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { Utensils } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button'; // Import Button

export function Header() {
  const { isMobile, state, toggleSidebar } = useSidebar(); // Get sidebar state and toggle function

  const showTrigger = isMobile || state === 'collapsed'; // Show trigger on mobile OR when collapsed on desktop

  return (
    <div className="flex items-center justify-between p-2 border-b">
       <div className={cn(
           "flex items-center gap-2 transition-opacity duration-300",
           state === 'collapsed' && !isMobile ? "opacity-0 w-0 h-0 overflow-hidden" : "opacity-100" // Hide title and icon smoothly when collapsed on desktop
         )}>
        <Utensils className="h-6 w-6 text-primary flex-shrink-0" />
        <h1 className="text-lg font-semibold text-primary truncate">PantryWise</h1>
      </div>
      {/* Show trigger conditionally */}
       <Button
          variant="ghost"
          size="icon"
          className={cn(
             "h-7 w-7",
             showTrigger ? "flex" : "hidden" // Show based on condition
          )}
          onClick={toggleSidebar} // Use toggle function from context
       >
         <PanelLeft /> {/* Assuming PanelLeft is imported or available */}
         <span className="sr-only">Toggle Sidebar</span>
       </Button>
    </div>
  );
}

// Make sure PanelLeft is imported if not already:
import { PanelLeft } from 'lucide-react';
