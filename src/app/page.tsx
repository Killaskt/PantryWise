
import { SidebarProvider, Sidebar, SidebarInset, SidebarContent, SidebarHeader, SidebarFooter } from '@/components/ui/sidebar';
import { PreferencesManager } from '@/components/preferences-manager'; // Changed import
import { RecipeSuggestions } from '@/components/recipe-suggestions';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button'; // Import Button
import { Save, UtensilsCrossed, BookOpen } from 'lucide-react'; // Import necessary icons
import Link from 'next/link'; // Import Link

export default function Home() {
  // Define IDs or functions needed for the buttons moved from PreferencesManager
  // These might need to be passed down or handled via context/state management if complex interactions are needed
  const preferencesFormId = 'preferences-form'; // Assuming PreferencesManager uses this ID for its form

  return (
    <SidebarProvider defaultOpen={false}> {/* Default to closed on desktop */}
      <Sidebar side="left" collapsible="icon" className="flex flex-col"> {/* Add flex flex-col */}
        <SidebarHeader className="p-2 flex-shrink-0"> {/* Prevent header shrinking */}
          <Header />
        </SidebarHeader>
        <SidebarContent className="p-2 flex-grow"> {/* Allow content to grow and scroll */}
          <PreferencesManager formId={preferencesFormId} /> {/* Pass form ID */}
        </SidebarContent>
        <SidebarFooter className="p-2 border-t flex-shrink-0"> {/* Prevent footer shrinking */}
           <div className="flex flex-col gap-2 w-full">
             {/* View Pantry Button */}
             <Link href="/pantry" passHref legacyBehavior className="w-full">
                <Button
                    asChild={false} // Ensure it renders as a button for styling
                    variant="outline"
                    className="w-full" // Full width
                    size="sm"
                >
                   <a> {/* Link component wraps the Button */}
                     <BookOpen className="mr-2 h-4 w-4" />
                     View Pantry
                   </a>
                </Button>
             </Link>

             <div className="flex gap-2 w-full">
                 {/* Clear Button - Needs wiring if moved out of PreferencesManager context */}
                 <Button
                     type="button"
                     variant="ghost"
                     // onClick={clearPreferences} // This needs to trigger the clear logic, possibly via context or prop drilling
                     className="flex-1"
                     size="sm"
                     // disabled={isSubmitting} // Needs state access
                 >
                     <UtensilsCrossed className="mr-2 h-4 w-4" />
                     Clear
                 </Button>
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
      <SidebarInset>
        <div className="flex flex-col h-full">
           {/* Optional: Add a Header here if needed for the main content area */}
           {/* <header className="p-4 border-b md:hidden"> {/* Example mobile header */}
           {/*   <SidebarTrigger /> {/* Ensure trigger is accessible */}
           {/* </header> */}
          <div className="p-4 md:p-6 flex-grow overflow-y-auto"> {/* Main content area */}
             <RecipeSuggestions />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
