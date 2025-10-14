import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassPanelHeaderProps {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  actionsPlacement?: "left" | "right";
}

export function GlassPanelHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
  actionsPlacement = "right",
}: GlassPanelHeaderProps) {
  return (
    <div className={cn("sticky top-6 z-30", className)}>
      <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/70 p-6 shadow-[0_30px_80px_-25px_rgba(15,23,42,0.45)] backdrop-blur-2xl transition-all duration-500 dark:border-white/10 dark:bg-slate-900/65">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-12 -top-24 h-60 w-60 rounded-full bg-sky-400/30 blur-3xl" />
          <div className="absolute -bottom-16 -right-10 h-56 w-56 rounded-full bg-blue-500/25 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.55),transparent_45%)] opacity-60" />
        </div>

        <div
          className={cn(
            "relative flex flex-col gap-6 md:flex-row md:items-center",
            actionsPlacement === "left" ? "md:justify-start md:gap-10" : "md:justify-between",
          )}
        >
          <div className="space-y-4">
            {eyebrow ? (
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.42em] text-primary/80">
                {eyebrow}
              </span>
            ) : null}

            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                {title}
              </h1>
              <p className="max-w-2xl text-base text-slate-600 dark:text-slate-300">
                {description}
              </p>
            </div>

            {children ? (
              <div className="flex flex-wrap gap-3 text-sm text-slate-600/90 dark:text-slate-300/80">
                {children}
              </div>
            ) : null}
          </div>

          {actions ? (
            <div
              className={cn(
                "flex shrink-0 flex-col items-stretch gap-3 sm:flex-row sm:items-center",
                actionsPlacement === "left" && "md:self-start",
              )}
            >
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
