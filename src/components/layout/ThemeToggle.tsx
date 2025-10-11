import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-10 w-10 rounded-full border border-white/50 bg-white/30 text-primary shadow-[0_10px_25px_-15px_rgba(15,65,120,0.55)] backdrop-blur-xl transition-colors hover:border-primary/40 hover:bg-white/50 supports-[backdrop-filter]:bg-white/20 dark:border-white/10 dark:bg-background/60 dark:text-white"
    >
      {theme === 'light' ? (
        <Moon className="h-[1.2rem] w-[1.2rem]" />
      ) : (
        <Sun className="h-[1.2rem] w-[1.2rem]" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}