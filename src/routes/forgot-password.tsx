import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { KeyRound, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isCollegeEmail } from "@/lib/campus";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot password — Campus Hustle" },
      { name: "description", content: "Reset your Campus Hustle password with your registered college email." },
      { property: "og:title", content: "Forgot password — Campus Hustle" },
      { property: "og:description", content: "Securely reset your Campus Hustle password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isCollegeEmail(email)) {
      toast.error("Use your official college email (.edu, .ac.in, .edu.in …)");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error && error.status === 429) {
      toast.error("Too many requests. Please wait a few minutes and try again.");
      return;
    }
    // Generic response either way — never reveal whether the account exists.
    setSent(true);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
      <div className="glass-card rounded-2xl p-5">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary">
          {sent ? <MailCheck className="size-7" /> : <KeyRound className="size-7" />}
        </span>
        <h1 className="mt-4 text-center text-2xl font-bold">
          {sent ? "Check your inbox" : "Forgot your password?"}
        </h1>
        {sent ? (
          <p className="mt-2 text-center text-sm text-muted-foreground">
            If an account exists with this email, you will receive a password reset link shortly.
          </p>
        ) : (
          <>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Enter your registered college email address and we'll send you a secure password
              reset link.
            </p>
            <form onSubmit={submit} className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Registered college email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@nit.ac.in"
                  required
                />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                Send Reset Link
              </Button>
            </form>
          </>
        )}
        <Link to="/login" className="mt-5 block text-center text-sm font-semibold text-primary">
          Back to Login
        </Link>
      </div>
    </main>
  );
}
