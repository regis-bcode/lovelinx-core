import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

type ThemeToggleVariant = "default" | "sidebar";

interface ThemeToggleProps {
  variant?: ThemeToggleVariant;
  className?: string;
}

export function ThemeToggle({ variant = "default", className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  const variantClasses: Record<ThemeToggleVariant, string> = {
    default:
      "h-10 w-10 rounded-full border border-white/50 bg-white/30 text-primary shadow-[0_10px_25px_-15px_rgba(15,65,120,0.55)] backdrop-blur-xl transition-colors hover:border-primary/40 hover:bg-white/50 supports-[backdrop-filter]:bg-white/20 dark:border-white/10 dark:bg-background/60 dark:text-white",
    sidebar:
      "h-11 w-11 rounded-2xl border border-white/20 bg-white/10 text-white shadow-[0_12px_30px_rgba(8,32,70,0.45)] transition-colors hover:border-white/40 hover:bg-white/20",
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={cn(variantClasses[variant], className)}
      aria-label="Alternar tema"
    >
      {theme === "light" ? (
        <Moon className="h-[1.2rem] w-[1.2rem]" />
      ) : (
        <Sun className="h-[1.2rem] w-[1.2rem]" />
      )}
      <span className="sr-only">Alternar tema</span>
    </Button>
  );
}

