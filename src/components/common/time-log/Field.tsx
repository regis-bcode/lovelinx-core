import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Primitive = string | number;

interface FieldProps {
  label: string;
  value?: ReactNode;
  placeholder?: string;
  icon?: ReactNode;
  className?: string;
  tooltip?: string | null;
}

function resolveValue(content: ReactNode, placeholder: string) {
  if (content === undefined || content === null || content === "") {
    return placeholder;
  }

  return content;
}

export function Field({
  label,
  value,
  placeholder = "—",
  icon,
  className,
  tooltip
}: FieldProps) {
  const resolved = resolveValue(value, placeholder);
  const isPrimitive = typeof resolved === "string" || typeof resolved === "number";

  const valueContent = !isPrimitive ? (
    <div className="font-semibold text-slate-900">{resolved}</div>
  ) : null;

  const content = (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm transition hover:border-slate-300",
        className
      )}
    >
      <div className="flex items-start gap-3 text-sm text-slate-700 md:text-base">
        {icon ? <span className="mt-0.5 text-slate-500">{icon}</span> : null}
        <div className="space-y-1">
          <div className="font-semibold text-slate-600">
            {label}:
            {isPrimitive ? (
              <span className="ml-1 font-semibold text-slate-900">{resolved as Primitive}</span>
            ) : null}
          </div>
          {valueContent}
        </div>
      </div>
    </div>
  );

  if (!tooltip) {
    return content;
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
