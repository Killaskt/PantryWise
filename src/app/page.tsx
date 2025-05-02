import { SidebarProvider, Sidebar, SidebarInset, SidebarContent, SidebarHeader, SidebarFooter } from '@/components/ui/sidebar';
import { PantryBuilder } from '@/components/pantry-builder';
import { RecipeSuggestions } from '@/components/recipe-suggestions';
import { Header } from '@/components/header'; // Assuming Header is created

export default function Home() {
  return (
    <SidebarProvider defaultOpen>
      <Sidebar side="left" collapsible="icon">
        <SidebarHeader>
          <Header />
        </SidebarHeader>
        <SidebarContent className="p-4">
          <PantryBuilder />
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
