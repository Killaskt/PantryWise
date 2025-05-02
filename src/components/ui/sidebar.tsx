
"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { VariantProps, cva } from "class-variance-authority"
import { PanelLeft, X } from "lucide-react" // Import X for close button

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet" // Import Sheet components
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const SIDEBAR_COOKIE_NAME = "sidebar_state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
// Adjusted widths for better layout
const SIDEBAR_WIDTH_EXPANDED = "16rem" // Standard expanded width
const SIDEBAR_WIDTH_COLLAPSED = "3.5rem" // Icon-only width (slightly wider for touch)
const SIDEBAR_WIDTH_MOBILE = "80%" // Use percentage for mobile drawer width
const SIDEBAR_MIN_APP_WIDTH = "320px" // Minimum width for the app layout

const SIDEBAR_KEYBOARD_SHORTCUT = "b"

type SidebarContext = {
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContext | null>(null)

function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }

  return context
}

const SidebarProvider = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    defaultOpen?: boolean // Default state for desktop (true=expanded, false=collapsed)
    open?: boolean        // Controlled state for desktop
    onOpenChange?: (open: boolean) => void // Callback for desktop state change
  }
>(
  (
    {
      defaultOpen = true, // Default to expanded on desktop
      open: openProp,
      onOpenChange: setOpenProp,
      className,
      style,
      children,
      ...props
    },
    ref
  ) => {
    const isMobile = useIsMobile()
    const [openMobile, setOpenMobile] = React.useState(false) // State for mobile drawer

    // Desktop state management
    const [_open, _setOpen] = React.useState(() => {
        // Initialize from cookie or defaultOpen
        if (typeof window !== 'undefined') {
            const cookieValue = document.cookie.split('; ').find(row => row.startsWith(`${SIDEBAR_COOKIE_NAME}=`));
            if (cookieValue) {
                return cookieValue.split('=')[1] === 'true';
            }
        }
        return defaultOpen;
    });

    const open = openProp ?? _open // Allow controlled state override
    const setOpen = React.useCallback(
      (value: boolean | ((value: boolean) => boolean)) => {
        const openState = typeof value === "function" ? value(open) : value;
        if (setOpenProp) {
          setOpenProp(openState);
        } else {
          _setOpen(openState);
        }

        // Set cookie for desktop state persistence
        if (typeof window !== 'undefined') {
            document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
        }
      },
      [setOpenProp, open]
    );

    // Toggle sidebar based on platform
    const toggleSidebar = React.useCallback(() => {
      if (isMobile) {
        setOpenMobile((current) => !current);
      } else {
        setOpen((current) => !current);
      }
    }, [isMobile, setOpen, setOpenMobile]);

    // Keyboard shortcut listener
    React.useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (
          event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
          (event.metaKey || event.ctrlKey)
        ) {
          event.preventDefault();
          toggleSidebar();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [toggleSidebar]);

    // Determine desktop state (expanded/collapsed)
    const state = open ? "expanded" : "collapsed";

    const contextValue = React.useMemo<SidebarContext>(
      () => ({
        state,
        open,
        setOpen,
        isMobile,
        openMobile,
        setOpenMobile,
        toggleSidebar,
      }),
      [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar]
    );

    return (
      <SidebarContext.Provider value={contextValue}>
        <TooltipProvider delayDuration={0}>
          <div
            style={
              {
                "--sidebar-width-expanded": SIDEBAR_WIDTH_EXPANDED,
                "--sidebar-width-collapsed": SIDEBAR_WIDTH_COLLAPSED,
                "--sidebar-width-mobile": SIDEBAR_WIDTH_MOBILE,
                "--min-app-width": SIDEBAR_MIN_APP_WIDTH,
                ...style,
              } as React.CSSProperties
            }
            className={cn(
              // Use min-w to ensure layout doesn't break on very small screens
              "group/sidebar-wrapper flex min-h-svh w-full min-w-[--min-app-width]",
              // Apply background to the wrapper if using inset sidebar
              "has-[[data-variant=inset]]:bg-sidebar",
              className
            )}
            ref={ref}
            {...props}
          >
            {children}
          </div>
        </TooltipProvider>
      </SidebarContext.Provider>
    );
  }
);
SidebarProvider.displayName = "SidebarProvider";

// --- Sidebar Component ---
const Sidebar = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    side?: "left" | "right";
    variant?: "sidebar" | "floating" | "inset"; // Standard, floating, or inset within main content
    collapsible?: "icon" | "none"; // Icon toggle or always expanded (none)
    className?: string;
  }
>(
  (
    {
      side = "left",
      variant = "sidebar",
      collapsible = "icon", // Default to icon collapsing
      className,
      children,
      ...props
    },
    ref
  ) => {
    const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

    // --- Mobile Rendering (Uses Sheet/Drawer) ---
    if (isMobile) {
      return (
        <Sheet open={openMobile} onOpenChange={setOpenMobile}>
          <SheetContent
            side={side}
            className={cn(
              "w-[--sidebar-width-mobile] bg-sidebar p-0 text-sidebar-foreground flex flex-col", // Use variable, ensure flex column
              className
            )}
            {...props} // Pass other props
          >
            {/* Add a Header inside the Sheet for Title and Close Button */}
            <SheetHeader className="p-4 border-b flex flex-row justify-between items-center flex-shrink-0">
               {/* You might want a title or logo here */}
               <SheetTitle>PantryWise</SheetTitle>
               <SheetClose asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                     <X className="h-4 w-4"/>
                     <span className="sr-only">Close</span>
                  </Button>
               </SheetClose>
            </SheetHeader>
            {/* The rest of the children (SidebarHeader, Content, Footer from page.tsx) */}
            {/* The children should already be structured with flex-grow for content */}
            {children}
          </SheetContent>
        </Sheet>
      );
    }

    // --- Desktop Rendering ---
    const isCollapsed = state === "collapsed" && collapsible === "icon";
    const desktopWidth = isCollapsed ? "var(--sidebar-width-collapsed)" : "var(--sidebar-width-expanded)";

    return (
      // Container div to manage positioning and transitions
      // Apply h-svh here to ensure it takes full screen height
      <div
        ref={ref}
        data-sidebar="sidebar" // For styling/selection
        data-state={state}
        data-collapsible={collapsible === "icon" ? "true" : "false"}
        data-variant={variant}
        data-side={side}
        className={cn(
          "hidden md:flex flex-col h-svh", // Hide on mobile, use flex column layout, ensure full height
          "transition-[width] duration-300 ease-in-out", // Smooth width transition
          "bg-sidebar text-sidebar-foreground", // Base styles
          // Handle positioning based on 'side'
          side === 'left' ? "border-r border-sidebar-border" : "border-l border-sidebar-border",
          // Inset variant specific styles
          variant === 'inset' && "m-2 rounded-lg shadow-sm",
          // Floating variant specific styles (similar to inset but might differ)
          variant === 'floating' && "m-2 rounded-lg border border-sidebar-border shadow-md",
          className // Allow external class overrides
        )}
        style={{ width: desktopWidth }}
        {...props}
      >
        {/* Render children (Header, Content, Footer) */}
        {/* The flex-col structure ensures Header and Footer are fixed, Content scrolls */}
        {children}
      </div>
    );
  }
);
Sidebar.displayName = "Sidebar";


// --- SidebarTrigger Component ---
// Used to open the mobile drawer
const SidebarTrigger = React.forwardRef<
  React.ElementRef<typeof Button>,
  React.ComponentProps<typeof Button>
>(({ className, children, ...props }, ref) => {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      ref={ref}
      data-sidebar="trigger"
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8 md:hidden", className)} // Only show on mobile (md:hidden)
      onClick={toggleSidebar}
      {...props}
    >
       {children || <PanelLeft />} {/* Default icon or provided children */}
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
});
SidebarTrigger.displayName = "SidebarTrigger";

// --- SidebarInset Component ---
// Adjusts margin based on sidebar state and variant for desktop
const SidebarInset = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"main">
>(({ className, children, ...props }, ref) => {
  const { state, side, isMobile, open } = useSidebar(); // Get sidebar state

  // Calculate margin based on sidebar state for desktop
  const getMargin = () => {
    if (isMobile) return '0'; // No margin on mobile
    if (state === 'expanded') {
        return side === 'left' ? 'var(--sidebar-width-expanded)' : 'var(--sidebar-width-expanded)';
    }
    // Only apply collapsed margin if the sidebar is actually collapsible
    if (state === 'collapsed') { // Check if actually collapsible if needed
        return side === 'left' ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width-collapsed)';
    }
    return '0'; // Default to no margin
  };

  const marginStyle = {
    ...(side === 'left' ? { marginLeft: getMargin() } : { marginRight: getMargin() }),
  };

  return (
    <main
      ref={ref}
      className={cn(
        "relative flex flex-1 flex-col bg-background transition-[margin] duration-300 ease-in-out", // Added transition
        // Desktop margin is handled via style below
        className
      )}
      // Apply style directly for dynamic margins only on desktop
      style={!isMobile ? { ...marginStyle, ...(props.style || {}) } : props.style}
      {...props}
    >
       {/* Ensure children fill the main area */}
       <div className="flex flex-col flex-1 min-h-0"> {/* Added wrapper */}
         {children}
       </div>
    </main>
  )
})
SidebarInset.displayName = "SidebarInset"

// --- SidebarHeader ---
const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="header"
      className={cn(
          "flex flex-col gap-2 flex-shrink-0", // Ensure header doesn't shrink
          className
       )}
      {...props}
    />
  )
})
SidebarHeader.displayName = "SidebarHeader"

// --- SidebarFooter ---
const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="footer"
      className={cn(
          "flex flex-col gap-2 mt-auto flex-shrink-0", // Push footer down, prevent shrinking
           className
      )}
      {...props}
    />
  )
})
SidebarFooter.displayName = "SidebarFooter"

// --- SidebarSeparator ---
const SidebarSeparator = React.forwardRef<
  React.ElementRef<typeof Separator>,
  React.ComponentProps<typeof Separator>
>(({ className, ...props }, ref) => {
  return (
    <Separator
      ref={ref}
      data-sidebar="separator"
      className={cn("mx-2 w-auto bg-sidebar-border", className)}
      {...props}
    />
  )
})
SidebarSeparator.displayName = "SidebarSeparator"

// --- SidebarContent ---
// This should be the main scrollable area
const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="content"
      className={cn(
        "flex-grow overflow-y-auto overflow-x-hidden", // Allow vertical scroll, hide horizontal
        className
      )}
      {...props}
    />
  )
})
SidebarContent.displayName = "SidebarContent";


// --- SidebarGroupLabel ---
const SidebarGroupLabel = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & { asChild?: boolean }
>(({ className, asChild = false, children, ...props }, ref) => {
  const Comp = asChild ? Slot : "div";
  const { state, isMobile } = useSidebar();
  const isCollapsed = state === 'collapsed' && !isMobile;

  if (isCollapsed) return null; // Don't render label when collapsed on desktop

  return (
    <Comp
      ref={ref}
      data-sidebar="group-label"
      className={cn(
        "flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70",
        className
      )}
      {...props}
    >
       {children}
    </Comp>
  );
});
SidebarGroupLabel.displayName = "SidebarGroupLabel";


// --- SidebarMenuButton ---
const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    asChild?: boolean;
    isActive?: boolean;
    tooltip?: string | React.ComponentProps<typeof TooltipContent>;
    variant?: "default" | "outline";
    size?: "default" | "sm" | "lg";
  }
>(
  (
    {
      asChild = false,
      isActive = false,
      variant = "default",
      size = "default",
      tooltip,
      className,
      children, // Capture children
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    const { state, isMobile } = useSidebar();
    const isCollapsed = state === 'collapsed' && !isMobile;

    const button = (
      <Comp
        ref={ref}
        data-sidebar="menu-button"
        data-size={size}
        data-active={isActive}
        className={cn(
            sidebarMenuButtonVariants({ variant, size }),
            "flex items-center gap-2 overflow-hidden", // Ensure flex and gap
            // Apply collapse styles only on desktop when state is collapsed
             isCollapsed ? "justify-center w-[calc(var(--sidebar-width-collapsed)-1rem)] h-[calc(var(--sidebar-width-collapsed)-1rem)] p-0 mx-auto" : "w-full", // Centered icon button
            className
         )}
        {...props}
      >
        {/* Render icon (first child) */}
        {React.Children.toArray(children).find((child, index) => index === 0 && React.isValidElement(child))}
        {/* Render text (second child) only if NOT collapsed on desktop */}
        {!isCollapsed && (
            <span className="truncate flex-grow text-left">
                {React.Children.toArray(children).find((child, index) => index === 1)}
            </span>
        )}
         {/* Render other children (e.g., badge) only if NOT collapsed */}
        {!isCollapsed && React.Children.toArray(children).filter((child, index) => index > 1)}
      </Comp>
    );

    // Tooltip logic: Show tooltip only when collapsed on desktop
    if (!tooltip || !isCollapsed) { // Show tooltip only when collapsed
      return button;
    }

    if (typeof tooltip === "string") {
      tooltip = {
        children: tooltip,
        side: "right", // Default side for collapsed sidebar
        align: "center",
      };
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent
          {...tooltip} // Spread tooltip props (allows customization)
        />
      </Tooltip>
    );
  }
);
SidebarMenuButton.displayName = "SidebarMenuButton";


// Define the variants for menu buttons
const sidebarMenuButtonVariants = cva(
  "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        outline:
          "bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]",
      },
      size: {
        default: "h-8 text-sm",
        sm: "h-7 text-xs",
        lg: "h-12 text-base", // Adjusted for potential larger icons/text
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);


// --- SidebarInput ---
const SidebarInput = React.forwardRef<
  React.ElementRef<typeof Input>,
  React.ComponentProps<typeof Input>
>(({ className, ...props }, ref) => {
  const { state, isMobile } = useSidebar();
  const isCollapsed = state === 'collapsed' && !isMobile;

  if (isCollapsed) return null; // Hide input when collapsed on desktop

  return (
     <div className={cn("p-2")}>
         <Input
             ref={ref}
             data-sidebar="input"
             className={cn(
                 "h-8 w-full bg-background shadow-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                 className
             )}
             {...props}
         />
     </div>
  )
})
SidebarInput.displayName = "SidebarInput"

// --- SidebarRail (Desktop collapse trigger) ---
const SidebarRail = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button">
>(({ className, ...props }, ref) => {
  const { toggleSidebar, isMobile, state } = useSidebar()

  // Hide rail on mobile or when sidebar is not collapsible
  if (isMobile) return null;

  return (
    <button
      ref={ref}
      data-sidebar="rail"
      aria-label="Toggle Sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      title="Toggle Sidebar (Ctrl+B)" // Add shortcut hint
      className={cn(
        "absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border group-data-[side=left]:-right-4 group-data-[side=right]:left-0 md:flex",
        "[[data-side=left]_&]:cursor-w-resize [[data-side=right]_&]:cursor-e-resize",
        // Change cursor based on expanded/collapsed state
        state === 'expanded' && "[[data-side=left]_&]:cursor-w-resize [[data-side=right]_&]:cursor-e-resize",
        state === 'collapsed' && "[[data-side=left]_&]:cursor-e-resize [[data-side=right]_&]:cursor-w-resize",
        className
      )}
      {...props}
    />
  )
})
SidebarRail.displayName = "SidebarRail"


// --- SidebarGroup ---
const SidebarGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="group"
      className={cn("relative flex w-full min-w-0 flex-col p-2", className)}
      {...props}
    />
  )
})
SidebarGroup.displayName = "SidebarGroup"

// --- SidebarGroupAction ---
const SidebarGroupAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & { asChild?: boolean }
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
   const { state, isMobile } = useSidebar();
   const isCollapsed = state === 'collapsed' && !isMobile;

   if(isCollapsed) return null; // Hide action when collapsed

  return (
    <Comp
      ref={ref}
      data-sidebar="group-action"
      className={cn(
        "absolute right-3 top-3.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-opacity hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        // Increases the hit area of the button on mobile.
        "after:absolute after:-inset-2 after:md:hidden",
        className
      )}
      {...props}
    />
  )
})
SidebarGroupAction.displayName = "SidebarGroupAction"

// --- SidebarGroupContent ---
const SidebarGroupContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="group-content"
    className={cn("w-full text-sm", className)}
    {...props}
  />
))
SidebarGroupContent.displayName = "SidebarGroupContent"

// --- SidebarMenu ---
const SidebarMenu = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    data-sidebar="menu"
    className={cn("flex w-full min-w-0 flex-col gap-1", className)}
    {...props}
  />
))
SidebarMenu.displayName = "SidebarMenu"

// --- SidebarMenuItem ---
const SidebarMenuItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    data-sidebar="menu-item"
    className={cn("group/menu-item relative", className)}
    {...props}
  />
))
SidebarMenuItem.displayName = "SidebarMenuItem"

// --- SidebarMenuAction ---
const SidebarMenuAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    asChild?: boolean
    showOnHover?: boolean
  }
>(({ className, asChild = false, showOnHover = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
   const { state, isMobile } = useSidebar();
   const isCollapsed = state === 'collapsed' && !isMobile;

   if (isCollapsed) return null; // Hide actions when collapsed

  return (
    <Comp
      ref={ref}
      data-sidebar="menu-action"
      className={cn(
        "absolute right-1 top-1.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-opacity hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 peer-hover/menu-button:text-sidebar-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0",
        // Increases the hit area of the button on mobile.
        "after:absolute after:-inset-2 after:md:hidden",
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-1.5",
        "peer-data-[size=lg]/menu-button:top-2.5",
        showOnHover && "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground md:opacity-0",
        className
      )}
      {...props}
    />
  )
})
SidebarMenuAction.displayName = "SidebarMenuAction"

// --- SidebarMenuBadge ---
const SidebarMenuBadge = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, children, ...props }, ref) => {
    const { state, isMobile } = useSidebar();
    const isCollapsed = state === 'collapsed' && !isMobile;

    if (isCollapsed) return null; // Don't render badge when collapsed

    return (
        <div
            ref={ref}
            data-sidebar="menu-badge"
            className={cn(
                "absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums text-sidebar-foreground select-none pointer-events-none",
                "peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground",
                "peer-data-[size=sm]/menu-button:top-1",
                "peer-data-[size=default]/menu-button:top-1.5",
                "peer-data-[size=lg]/menu-button:top-2.5",
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
})
SidebarMenuBadge.displayName = "SidebarMenuBadge"

// --- SidebarMenuSkeleton ---
const SidebarMenuSkeleton = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    showIcon?: boolean
  }
>(({ className, showIcon = false, ...props }, ref) => {
  const { state, isMobile } = useSidebar();
  const isCollapsed = state === 'collapsed' && !isMobile;
  // Random width between 50 to 90%.
  const width = React.useMemo(() => {
    return `${Math.floor(Math.random() * 40) + 50}%`
  }, [])

  return (
    <div
      ref={ref}
      data-sidebar="menu-skeleton"
      className={cn(
        "rounded-md h-8 flex gap-2 px-2 items-center",
        isCollapsed && 'justify-center p-0 w-[calc(var(--sidebar-width-collapsed)-1rem)] h-[calc(var(--sidebar-width-collapsed)-1rem)] mx-auto', // Center icon when collapsed
        className
      )}
      {...props}
    >
      {showIcon && (
        <Skeleton
          className={cn(
             "size-4 rounded-md flex-shrink-0",
             isCollapsed && "size-6" // Make icon slightly larger when collapsed
           )}
          data-sidebar="menu-skeleton-icon"
        />
      )}
       {!isCollapsed && ( // Show text skeleton only when expanded
           <Skeleton
             className="h-4 flex-1 max-w-[--skeleton-width]"
             data-sidebar="menu-skeleton-text"
             style={
               {
                 "--skeleton-width": width,
               } as React.CSSProperties
             }
           />
       )}
    </div>
  )
})
SidebarMenuSkeleton.displayName = "SidebarMenuSkeleton"

// --- SidebarMenuSub ---
const SidebarMenuSub = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => {
   const { state, isMobile } = useSidebar();
   const isCollapsed = state === 'collapsed' && !isMobile;

   if (isCollapsed) return null; // Hide submenus when collapsed

   return (
     <ul
       ref={ref}
       data-sidebar="menu-sub"
       className={cn(
         "mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5",
         className
       )}
       {...props}
     />
   )
})
SidebarMenuSub.displayName = "SidebarMenuSub"

// --- SidebarMenuSubItem ---
const SidebarMenuSubItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ ...props }, ref) => <li ref={ref} {...props} />)
SidebarMenuSubItem.displayName = "SidebarMenuSubItem"

// --- SidebarMenuSubButton ---
const SidebarMenuSubButton = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentProps<"a"> & {
    asChild?: boolean
    size?: "sm" | "md"
    isActive?: boolean
  }
>(({ asChild = false, size = "md", isActive, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "a";
    const { state, isMobile } = useSidebar();
    const isCollapsed = state === 'collapsed' && !isMobile;

    if (isCollapsed) return null; // Hide sub-buttons when collapsed

  return (
    <Comp
      ref={ref}
      data-sidebar="menu-sub-button"
      data-size={size}
      data-active={isActive}
      className={cn(
        "flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground outline-none ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground",
        "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
        size === "sm" && "text-xs",
        size === "md" && "text-sm",
        className
      )}
      {...props}
    />
  )
})
SidebarMenuSubButton.displayName = "SidebarMenuSubButton"


export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
}
