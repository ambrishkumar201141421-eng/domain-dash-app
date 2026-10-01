import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { browserAlertsSupported } from "@/lib/notifications";

export function NotificationSettings({ userId, enabled }: { userId: string; enabled: boolean }) {
  const qc = useQueryClient();
  const [on, setOn] = useState(enabled);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => setOn(enabled), [enabled]);
  useEffect(() => {
    setPerm(browserAlertsSupported() ? Notification.permission : "unsupported");
  }, []);

  async function toggle(value: boolean) {
    setOn(value);
    const { error } = await supabase.from("profiles").update({ notify_campus_tasks: value }).eq("id", userId);
    if (error) {
      setOn(!value);
      toast.error("Couldn't save your notification setting");
      return;
    }
    qc.invalidateQueries({ queryKey: ["profile", "me"] });
    // Ask for browser permission only after the student opts in, and never re-ask once decided.
    if (value && browserAlertsSupported() && Notification.permission === "default") {
      setPerm(await Notification.requestPermission());
    }
  }

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface text-primary">
          <Bell className="size-4" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold">Task notifications</p>
          <p className="text-xs text-muted-foreground">Notify me whenever a new task is posted on my campus.</p>
        </div>
        <Switch checked={on} onCheckedChange={toggle} aria-label="New tasks posted on my campus" />
      </div>
      {on ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {perm === "granted"
            ? "Browser alerts are on while Campus Hustle is open. You'll also see every alert under the bell."
            : perm === "denied"
              ? "Browser notifications are currently disabled. You can enable them from your browser settings. Alerts will still appear under the bell."
              : perm === "unsupported"
                ? "This browser doesn't support notifications — alerts will appear under the bell."
                : "Allow browser notifications to receive alerts when new tasks are posted on your campus."}
        </p>
      ) : null}
    </div>
  );
}
