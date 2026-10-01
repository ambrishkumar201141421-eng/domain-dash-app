import { Moon, Sun } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { setStoredTheme, useResolvedTheme } from "@/lib/theme";

export function ThemeToggle({ userId }: { userId?: string }) {
  const mode = useResolvedTheme();
  const next = mode === "dark" ? "light" : "dark";

  function toggle() {
    setStoredTheme(next);
    if (userId) void supabase.from("profiles").update({ theme_pref: next }).eq("id", userId);
  }

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${next} mode`}
      title={mode === "dark" ? "Dark mode" : "Light mode"}
      className="grid size-9 place-items-center rounded-full bg-surface text-muted-foreground transition-colors hover:text-foreground"
    >
      {mode === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </button>
  );
}
