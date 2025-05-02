
import { SidebarProvider, Sidebar, SidebarInset, SidebarContent, SidebarHeader, SidebarFooter } from '@/components/ui/sidebar';
import { PreferencesManager } from '@/components/preferences-manager'; // Changed import
import { RecipeSuggestions } from '@/components/recipe-suggestions';
import { Header } from '@/components/header';

export default function Home() {
  return (
    <SidebarProvider defaultOpen>
      <Sidebar side="left" collapsible="icon">
        <SidebarHeader>
          <Header />
        </SidebarHeader>
        <SidebarContent className="p-4">
          <PreferencesManager /> {/* Changed component */}
        </SidebarContent>
        <SidebarFooter>
          {/* Footer content if needed */}
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="flex flex-col h-full">
          <div className="p-6 flex-grow overflow-y-auto">
             <RecipeSuggestions />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
