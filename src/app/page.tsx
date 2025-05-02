
import { SidebarProvider, Sidebar, SidebarInset, SidebarContent, SidebarHeader, SidebarFooter, SidebarTrigger } from '@/components/ui/sidebar';
import { PreferencesManager } from '@/components/preferences-manager';
import { RecipeSuggestions } from '@/components/recipe-suggestions';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { ClearPreferencesButton } from '@/components/clear-preferences-button'; // Import the new component
import { Save, UtensilsCrossed, BookOpen, PanelLeft } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  // Define IDs or functions needed for the buttons moved from PreferencesManager
  const preferencesFormId = 'preferences-form'; // Assuming PreferencesManager uses this ID for its form

  return (
    // Default to collapsed on desktop for wider initial content view
    <SidebarProvider defaultOpen={true}> {/* Default to open */}
      {/* Sidebar component - Takes full height and flex column */}
      <Sidebar side="left" collapsible="icon" className="flex flex-col h-svh">
        {/* Header - Fixed at the top */}
        <SidebarHeader className="p-2 flex-shrink-0 border-b">
          <Header />
        </SidebarHeader>
        {/* Content - Takes remaining space and scrolls */}
        <SidebarContent className="flex-grow overflow-y-auto p-2">
          <PreferencesManager formId={preferencesFormId} /> {/* Pass form ID */}
        </SidebarContent>
        {/* Footer - Fixed at the bottom */}
        <SidebarFooter className="p-2 border-t flex-shrink-0">
           <div className="flex flex-col gap-2 w-full">
             {/* View Pantry Button - Use Link asChild */}
             <Link href="/pantry" passHref legacyBehavior>
                <Button
                    asChild // Let Button render the <a> tag from Link
                    variant="outline"
                    className="w-full" // Full width
                    size="sm"
                >
                   <a> {/* Content of the link/button */}
                     <BookOpen className="mr-2 h-4 w-4" />
                     View Pantry
                   </a>
                </Button>
             </Link>

             <div className="flex gap-2 w-full">
                 {/* Clear Button - Use the new client component */}
                 <ClearPreferencesButton />
                 {/* Save Button */}
                 <Button
                     type="submit"
                     form={preferencesFormId} // Trigger form submission in PreferencesManager
                     // disabled={isSubmitting} // Needs state access
                     className="flex-1"
                     size="sm"
                 >
                     <Save className="mr-2 h-4 w-4" />
                     Save {/* Consider showing 'Saving...' based on form state */}
                 </Button>
             </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      {/* Main Content Area */}
      <SidebarInset>
        <div className="flex flex-col h-full">
           {/* Mobile Header with Sidebar Trigger */}
           <header className="p-2 border-b md:hidden flex items-center sticky top-0 bg-background z-10"> {/* Show only on mobile */}
              <SidebarTrigger>
                  <PanelLeft className="h-5 w-5"/>
                  <span className="sr-only">Toggle Sidebar</span>
              </SidebarTrigger>
              <h1 className="text-lg font-semibold text-primary ml-2">PantryWise</h1> {/* Optional title */}
           </header>
          {/* Scrollable Content */}
          <div className="p-4 md:p-6 flex-grow overflow-y-auto">
             <RecipeSuggestions />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
