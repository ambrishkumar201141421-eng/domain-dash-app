import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, ShieldX, Check, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Campus Hustle" },
      { name: "description", content: "Choose a new password for your Campus Hustle account." },
      { property: "og:title", content: "Reset password — Campus Hustle" },
      { property: "og:description", content: "Set a new password for Campus Hustle." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

const RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number", test: (p: string) => /\d/.test(p) },
  { label: "One special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

type Phase = "checking" | "ready" | "invalid" | "done";

function ResetPasswordPage() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    if (hash.get("error") || query.get("error")) {
      setPhase("invalid");
      return;
    }
    const isRecovery = hash.get("type") === "recovery" || query.has("code");
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) setPhase("ready");
    });
    const timer = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      setPhase((p) => (p === "checking" ? (isRecovery && data.session ? "ready" : "invalid") : p));
    }, 1500);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const passed = RULES.filter((r) => r.test(pw)).length;
  const valid = passed === RULES.length;
  const match = pw.length > 0 && pw === confirm;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || !match) return;
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) {
      if (/session|expired|invalid|jwt/i.test(error.message)) setPhase("invalid");
      else toast.error(error.message);
      return;
    }
    await supabase.auth.signOut();
    setPhase("done");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
      <div className="glass-card rounded-2xl p-5">
        {phase === "checking" ? (
          <div className="grid place-items-center py-10">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : phase === "invalid" ? (
          <div className="text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-urgent/15 text-urgent">
              <ShieldX className="size-7" />
            </span>
            <h1 className="mt-4 text-xl font-bold">
              This password reset link is invalid or has expired.
            </h1>
            <Button asChild className="mt-6 w-full" size="lg">
              <Link to="/forgot-password">Request a New Reset Link</Link>
            </Button>
          </div>
        ) : phase === "done" ? (
          <div className="text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary">
              <CheckCircle2 className="size-7" />
            </span>
            <h1 className="mt-4 text-xl font-bold">Password Reset Successfully</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your password has been updated. You can now log in with your new password.
            </p>
            <Button asChild className="mt-6 w-full" size="lg">
              <Link to="/login">Go to Login</Link>
            </Button>
          </div>
        ) : (
          <>
            <h1 className="text-center text-2xl font-bold">Reset Password</h1>
            <form onSubmit={submit} className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="pw">New Password</Label>
                <PasswordInput
                  id="pw"
                  autoComplete="new-password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                />
                <div className="flex gap-1 pt-1">
                  {RULES.map((_, i) => (
                    <span
                      key={i}
                      className={"h-1 flex-1 rounded-full " + (i < passed ? (passed >= 4 ? "bg-primary" : "bg-urgent") : "bg-surface")}
                    />
                  ))}
                </div>
                <ul className="space-y-0.5 pt-1 text-xs">
                  {RULES.map((r) => {
                    const ok = r.test(pw);
                    return (
                      <li key={r.label} className={"flex items-center gap-1.5 " + (ok ? "text-primary" : "text-muted-foreground")}>
                        {ok ? <Check className="size-3" /> : <X className="size-3" />}
                        {r.label}
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirm New Password</Label>
                <PasswordInput
                  id="confirm"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
                {confirm.length > 0 && !match ? (
                  <p className="text-xs text-urgent">Passwords don't match.</p>
                ) : null}
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={!valid || !match || busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                Reset Password
              </Button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
