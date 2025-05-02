
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
        document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
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
            // Remove close button from SheetContent props if adding manually
            // showCloseButton={false} // Assuming SheetContent doesn't have this prop directly
            {...props} // Pass other props
          >
            {/* Add a Header inside the Sheet for Title and Close Button */}
            <SheetHeader className="p-4 border-b flex flex-row justify-between items-center">
               {/* You might want a title or logo here */}
               {/* <SheetTitle>Menu</SheetTitle> */}
               <div></div> {/* Placeholder for alignment */}
               <SheetClose asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                     <X className="h-4 w-4"/>
                     <span className="sr-only">Close</span>
                  </Button>
               </SheetClose>
            </SheetHeader>
            {/* The rest of the children (SidebarHeader, Content, Footer from page.tsx) */}
            <div className="flex-grow overflow-y-auto"> {/* Allow content scrolling */}
               {children}
            </div>
          </SheetContent>
        </Sheet>
      );
    }

    // --- Desktop Rendering ---
    const isCollapsed = state === "collapsed" && collapsible === "icon";
    const desktopWidth = isCollapsed ? "var(--sidebar-width-collapsed)" : "var(--sidebar-width-expanded)";

    return (
      // Container div to manage positioning and transitions
      <div
        ref={ref}
        data-sidebar="sidebar" // For styling/selection
        data-state={state}
        data-collapsible={collapsible === "icon" ? "true" : "false"}
        data-variant={variant}
        data-side={side}
        className={cn(
          "hidden md:flex flex-col", // Hide on mobile, use flex column layout
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
        {/* Ensure children adapt to collapsed state (handled within those components) */}
        {children}
      </div>
    );
  }
);
Sidebar.displayName = "Sidebar";


// --- SidebarTrigger Component ---
// Remains largely the same, triggers mobile drawer or desktop toggle
const SidebarTrigger = React.forwardRef<
  React.ElementRef<typeof Button>,
  React.ComponentProps<typeof Button>
>(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar, isMobile } = useSidebar();

  return (
    <Button
      ref={ref}
      data-sidebar="trigger"
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7", isMobile ? "flex" : "md:flex", className)} // Show always on mobile, optional on desktop
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeft />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
});
SidebarTrigger.displayName = "SidebarTrigger";

// --- SidebarInset Component ---
// Adjusts margin based on sidebar state and variant
const SidebarInset = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"main">
>(({ className, ...props }, ref) => {
  const { state, side, isMobile, open } = useSidebar(); // Get sidebar state

  // Calculate margin based on sidebar state for desktop
  const marginLeft = !isMobile && side === 'left' && open ? 'var(--sidebar-width-expanded)' : '0';
  const marginRight = !isMobile && side === 'right' && open ? 'var(--sidebar-width-expanded)' : '0';
   // Collapsed margin assumes icon width + some padding perhaps
  const collapsedMarginLeft = !isMobile && side === 'left' && !open ? 'var(--sidebar-width-collapsed)' : '0';
  const collapsedMarginRight = !isMobile && side === 'right' && !open ? 'var(--sidebar-width-collapsed)' : '0';


  return (
    <main
      ref={ref}
      className={cn(
        "relative flex min-h-svh flex-1 flex-col bg-background transition-[margin] duration-300 ease-in-out", // Added transition
        // Desktop margin adjustments based on state
        // state === 'expanded' && side === 'left' && 'md:ml-[--sidebar-width-expanded]',
        // state === 'expanded' && side === 'right' && 'md:mr-[--sidebar-width-expanded]',
        // state === 'collapsed' && side === 'left' && 'md:ml-[--sidebar-width-collapsed]',
        // state === 'collapsed' && side === 'right' && 'md:mr-[--sidebar-width-collapsed]',

        // Potential inset styling (might need refinement)
        "peer-data-[variant=inset]:min-h-[calc(100svh-theme(spacing.4))] md:peer-data-[variant=inset]:m-2 md:peer-data-[state=collapsed]:peer-data-[variant=inset]:ml-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow",
        className
      )}
      // Apply style directly for dynamic margins
      // style={{
      //   marginLeft: state === 'expanded' ? marginLeft : collapsedMarginLeft,
      //   marginRight: state === 'expanded' ? marginRight : collapsedMarginRight,
      //   ...(props.style || {}) // Merge with existing styles
      // }}
      {...props}
    />
  )
})
SidebarInset.displayName = "SidebarInset"

// --- Other Sidebar Components (Header, Footer, Content, etc.) ---
// Need adjustments to handle collapsed state visually (e.g., hide text)

const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  const { state } = useSidebar();
  return (
    <div
      ref={ref}
      data-sidebar="header"
      className={cn(
          "flex flex-col gap-2 p-2 flex-shrink-0", // Ensure header doesn't shrink
           // Add conditional styles for collapsed state if needed
           // state === 'collapsed' ? "items-center" : "",
          className
       )}
      {...props}
    />
  )
})
SidebarHeader.displayName = "SidebarHeader"

const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
   const { state } = useSidebar();
  return (
    <div
      ref={ref}
      data-sidebar="footer"
      className={cn(
          "flex flex-col gap-2 p-2 mt-auto border-t border-sidebar-border flex-shrink-0", // Push footer down, add top border, prevent shrinking
          // state === 'collapsed' ? "items-center" : "", // Center items when collapsed
           className
      )}
      {...props}
    />
  )
})
SidebarFooter.displayName = "SidebarFooter"

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

const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  const { state } = useSidebar();
  return (
    <div
      ref={ref}
      data-sidebar="content"
      className={cn(
        "flex-1 overflow-y-auto overflow-x-hidden", // Allow vertical scroll, hide horizontal
        state === 'collapsed' && "overflow-hidden", // Hide overflow completely when collapsed? Or just x?
        className
      )}
      {...props}
    />
  )
})
SidebarContent.displayName = "SidebarContent";


// Example adjustment for SidebarGroupLabel to hide text when collapsed
const SidebarGroupLabel = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & { asChild?: boolean }
>(({ className, asChild = false, children, ...props }, ref) => {
  const Comp = asChild ? Slot : "div";
  const { state } = useSidebar();

  return (
    <Comp
      ref={ref}
      data-sidebar="group-label"
      className={cn(
        "flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 transition-opacity duration-300",
        state === 'collapsed' ? "opacity-0 w-0 h-0 p-0 m-0 overflow-hidden" : "opacity-100", // Hide smoothly
        className
      )}
      {...props}
    >
       {state === 'expanded' && children} {/* Render children only when expanded */}
    </Comp>
  );
});
SidebarGroupLabel.displayName = "SidebarGroupLabel";


// Example adjustment for SidebarMenuButton to show only icon when collapsed
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

    const buttonContent = (
       <>
         {/* Render icon if available (assuming first child is icon) */}
         {React.Children.toArray(children).find(child => React.isValidElement(child) && child.type !== 'string')}
         {/* Render text only if expanded */}
         {!isCollapsed && (
            <span className="truncate flex-1 text-left">
                {/* Render text node if available (assuming second child is text) */}
                {React.Children.toArray(children).find(child => typeof child === 'string' || (React.isValidElement(child) && typeof child.props.children === 'string'))}
            </span>
         )}
       </>
    );


    const button = (
      <Comp
        ref={ref}
        data-sidebar="menu-button"
        data-size={size}
        data-active={isActive}
        className={cn(
            sidebarMenuButtonVariants({ variant, size }),
            "flex items-center gap-2 overflow-hidden", // Ensure flex and gap
             isCollapsed ? "justify-center w-[var(--sidebar-width-collapsed)] h-[var(--sidebar-width-collapsed)] p-0" : "w-full", // Collapse styles
            className
         )}
        {...props}
      >
        {/* Render adjusted content */}
         {React.Children.map(children, (child, index) => {
            // Assuming the first element is the icon
            if (index === 0 && React.isValidElement(child)) {
               return React.cloneElement(child as React.ReactElement, { className: cn((child.props as any).className, "flex-shrink-0") });
            }
            // Render text only if expanded
            if (index === 1 && !isCollapsed) {
                return <span className="truncate flex-grow text-left">{child}</span>;
            }
            // Render other children if expanded
            if (index > 1 && !isCollapsed) {
                 return child;
            }
            return null;
         })}
      </Comp>
    );

    // Tooltip logic remains the same, but now more useful when collapsed
    if (!tooltip || isMobile || state === 'expanded') {
      return button;
    }

    if (typeof tooltip === "string") {
      tooltip = {
        children: tooltip,
      };
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent
          side="right"
          align="center"
          // hidden={state !== "collapsed" || isMobile} // Redundant check now
          {...tooltip}
        />
      </Tooltip>
    );
  }
);
SidebarMenuButton.displayName = "SidebarMenuButton";


// Define the variants for menu buttons (copied and adjusted if needed)
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


// Other components (Input, Rail, Group, Action, Badge, Skeletons, SubMenu)
// may also need minor adjustments based on the collapsed state if they contain text
// or elements that should be hidden/centered.

const SidebarInput = React.forwardRef<
  React.ElementRef<typeof Input>,
  React.ComponentProps<typeof Input>
>(({ className, ...props }, ref) => {
  const { state } = useSidebar();
  return (
     <div className={cn("p-2", state === 'collapsed' ? 'hidden' : 'block')}> {/* Hide input container when collapsed */}
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

const SidebarRail = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button">
>(({ className, ...props }, ref) => {
  const { toggleSidebar } = useSidebar()

  return (
    <button
      ref={ref}
      data-sidebar="rail"
      aria-label="Toggle Sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      title="Toggle Sidebar"
      className={cn(
        "absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border group-data-[side=left]:-right-4 group-data-[side=right]:left-0 md:flex", // Changed sm:flex to md:flex
        "[[data-side=left]_&]:cursor-w-resize [[data-side=right]_&]:cursor-e-resize",
        "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
        "group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full group-data-[collapsible=offcanvas]:hover:bg-sidebar", // Offcanvas styles might not be needed if collapsible is only icon/none
        "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
        "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
        className
      )}
      {...props}
    />
  )
})
SidebarRail.displayName = "SidebarRail"


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

const SidebarGroupAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & { asChild?: boolean }
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
   const { state } = useSidebar();

  return (
    <Comp
      ref={ref}
      data-sidebar="group-action"
      className={cn(
        "absolute right-3 top-3.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-opacity hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        // Increases the hit area of the button on mobile.
        "after:absolute after:-inset-2 after:md:hidden",
         state === 'collapsed' ? "opacity-0" : "opacity-100", // Hide when collapsed
        className
      )}
      {...props}
    />
  )
})
SidebarGroupAction.displayName = "SidebarGroupAction"

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


const SidebarMenuAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    asChild?: boolean
    showOnHover?: boolean
  }
>(({ className, asChild = false, showOnHover = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
   const { state } = useSidebar();

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
        state === 'collapsed' ? "opacity-0" : "opacity-100", // Hide when collapsed
        showOnHover && state === 'expanded' &&
          "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground md:opacity-0",
        className
      )}
      {...props}
    />
  )
})
SidebarMenuAction.displayName = "SidebarMenuAction"

const SidebarMenuBadge = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, children, ...props }, ref) => {
    const { state } = useSidebar();
    if (state === 'collapsed') return null; // Don't render badge when collapsed

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
                // Removed collapsed hiding logic here, handled by parent conditional render
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
})
SidebarMenuBadge.displayName = "SidebarMenuBadge"

const SidebarMenuSkeleton = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    showIcon?: boolean
  }
>(({ className, showIcon = false, ...props }, ref) => {
  const { state } = useSidebar();
  // Random width between 50 to 90%.
  const width = React.useMemo(() => {
    return `${Math.floor(Math.random() * 40) + 50}%`
  }, [])

  return (
    <div
      ref={ref}
      data-sidebar="menu-skeleton"
      className={cn("rounded-md h-8 flex gap-2 px-2 items-center",
        state === 'collapsed' && 'justify-center p-2', // Center icon when collapsed
       className
      )}
      {...props}
    >
      {showIcon && (
        <Skeleton
          className="size-4 rounded-md flex-shrink-0" // Ensure icon doesn't shrink weirdly
          data-sidebar="menu-skeleton-icon"
        />
      )}
       {state === 'expanded' && ( // Show text skeleton only when expanded
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

const SidebarMenuSub = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => {
   const { state } = useSidebar();
   if (state === 'collapsed') return null; // Hide submenus when collapsed

   return (
     <ul
       ref={ref}
       data-sidebar="menu-sub"
       className={cn(
         "mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5",
         // group-data-[collapsible=icon]:hidden, // Replaced by direct state check
         className
       )}
       {...props}
     />
   )
})
SidebarMenuSub.displayName = "SidebarMenuSub"

const SidebarMenuSubItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ ...props }, ref) => <li ref={ref} {...props} />)
SidebarMenuSubItem.displayName = "SidebarMenuSubItem"

const SidebarMenuSubButton = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentProps<"a"> & {
    asChild?: boolean
    size?: "sm" | "md"
    isActive?: boolean
  }
>(({ asChild = false, size = "md", isActive, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "a";
    const { state } = useSidebar();
    if (state === 'collapsed') return null; // Hide sub-buttons when collapsed

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
        // group-data-[collapsible=icon]:hidden, // Replaced by direct state check
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
