
import { SidebarProvider, Sidebar, SidebarInset, SidebarContent, SidebarHeader, SidebarFooter } from '@/components/ui/sidebar';
import { PreferencesManager } from '@/components/preferences-manager'; // Changed import
import { RecipeSuggestions } from '@/components/recipe-suggestions';
import { Header } from '@/components/header';

export default function Home() {
  return (
    <SidebarProvider defaultOpen={false}> {/* Default to closed on desktop */}
      <Sidebar side="left" collapsible="icon">
        <SidebarHeader className="p-2">
          <Header />
        </SidebarHeader>
        <SidebarContent className="p-2"> {/* Reduced padding */}
          <PreferencesManager /> {/* Changed component */}
        </SidebarContent>
        {/* SidebarFooter moved inside PreferencesManager to stick to bottom */}
      </Sidebar>
      <SidebarInset>
        <div className="flex flex-col h-full">
          <div className="p-4 md:p-6 flex-grow overflow-y-auto"> {/* Adjusted padding */}
             <RecipeSuggestions />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
