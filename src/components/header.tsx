
'use client'; // Add use client directive

import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { Utensils } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Header() {
  const { isMobile, state } = useSidebar(); // Get sidebar state

  return (
    <div className="flex items-center justify-between p-2 border-b">
       <div className={cn(
           "flex items-center gap-2",
           !isMobile && state === 'collapsed' && "hidden" // Hide title when collapsed on desktop
         )}>
        <Utensils className="h-6 w-6 text-primary" />
        <h1 className="text-lg font-semibold text-primary">PantryWise</h1>
      </div>
      {/* Always show trigger */}
      <SidebarTrigger />
    </div>
  );
}
