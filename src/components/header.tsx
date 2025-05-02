import { SidebarTrigger } from '@/components/ui/sidebar';
import { Utensils } from 'lucide-react';

export function Header() {
  return (
    <div className="flex items-center justify-between p-2 border-b">
       <div className="flex items-center gap-2">
        <Utensils className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-semibold text-primary">PantryWise</h1>
      </div>
      <div className="md:hidden"> {/* Hide trigger on larger screens where sidebar is visible */}
        <SidebarTrigger />
      </div>
    </div>
  );
}
