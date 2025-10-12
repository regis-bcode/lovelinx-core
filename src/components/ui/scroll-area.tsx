import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";

import { cn } from "@/lib/utils";

type ScrollAreaProps = React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> & {
  scrollBarOrientation?: "vertical" | "horizontal" | "both";
};

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  ScrollAreaProps
>(({ className, children, scrollBarOrientation = "vertical", type, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    type={type ?? "always"}
    className={cn("relative w-full overflow-hidden", className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport className="h-full w-full overflow-x-auto overflow-y-hidden rounded-[inherit]">
      {children}
    </ScrollAreaPrimitive.Viewport>
    {(scrollBarOrientation === "vertical" || scrollBarOrientation === "both") && <ScrollBar />}
    {(scrollBarOrientation === "horizontal" || scrollBarOrientation === "both") && (
      <ScrollAreaPrimitive.Scrollbar
        orientation="horizontal"
        className={cn(
          "h-2 flex touch-none select-none rounded-sm bg-border/20 backdrop-blur-sm transition-colors hover:bg-border/40",
        )}
      >
        <ScrollAreaPrimitive.Thumb className="rounded-sm bg-border/70" />
      </ScrollAreaPrimitive.Scrollbar>
    )}
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
));
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Scrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Scrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.Scrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none rounded-sm bg-border/20 backdrop-blur-sm transition-colors hover:bg-border/40",
      orientation === "vertical"
        ? "h-full w-3 border-l border-border/20 p-[2px]"
        : "h-3 flex-col border-t border-border/20 p-[2px]",
      className,
    )}
    {...props}
  >
    <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-sm bg-border/70" />
  </ScrollAreaPrimitive.Scrollbar>
));
ScrollBar.displayName = ScrollAreaPrimitive.Scrollbar.displayName;

const ScrollAreaScrollbar = ScrollAreaPrimitive.Scrollbar;
const ScrollAreaThumb = ScrollAreaPrimitive.Thumb;

export { ScrollArea, ScrollBar, ScrollAreaScrollbar, ScrollAreaThumb };
