import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

interface SophisticatedTooltipProps {
  children: React.ReactNode;
  content: string;
  description?: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  delayDuration?: number;
  disabled?: boolean;
  className?: string;
}

export function SophisticatedTooltip({
  children,
  content,
  description,
  side = "right",
  align = "center",
  delayDuration = 200,
  disabled = false,
  className,
}: SophisticatedTooltipProps) {
  if (disabled) {
    return <>{children}</>;
  }

  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            align={align}
            sideOffset={8}
            className={cn(
              "z-[9999] max-w-xs overflow-hidden rounded-xl border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-3 shadow-2xl backdrop-blur-sm animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
              // Dark theme adjustments
              "dark:from-slate-800 dark:via-slate-700 dark:to-slate-800",
              // Glass effect overlay
              "before:absolute before:inset-0 before:rounded-xl before:border before:border-white/10 before:bg-white/5 before:backdrop-blur-sm",
              // Shine effect
              "after:absolute after:inset-0 after:rounded-xl after:bg-gradient-to-br after:from-white/10 after:via-transparent after:to-transparent after:opacity-50",
              className
            )}
          >
            <div className="relative z-10">
              <p className="text-sm font-semibold text-white leading-tight">
                {content}
              </p>
              {description && (
                <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}