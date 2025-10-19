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

function renderValue(content: ReactNode, placeholder: string) {
  const resolved =
    content === undefined || content === null || content === "" ? placeholder : content;

  if (typeof resolved === "string" || typeof resolved === "number") {
    return <span className="font-medium leading-tight">{resolved as Primitive}</span>;
  }

  return <div className="font-medium leading-tight">{resolved}</div>;
}

export function Field({
  label,
  value,
  placeholder = "—",
  icon,
  className,
  tooltip
}: FieldProps) {
  const content = (
    <div className={cn("space-y-1", className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex items-start gap-2 text-sm text-slate-900 md:text-base">
        {icon ? <span className="mt-0.5 text-slate-500">{icon}</span> : null}
        {renderValue(value, placeholder)}
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
