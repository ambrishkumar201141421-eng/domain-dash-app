import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GraduationCap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isCollegeEmail, domainOf } from "@/lib/campus";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in with your college email — Campus Hustle" },
      {
        name: "description",
        content:
          "Join your campus marketplace with your official college email and start swapping errands, games and hangouts.",
      },
      { property: "og:title", content: "Sign in with your college email — Campus Hustle" },
      {
        property: "og:description",
        content: "Campus-only sign in for Campus Hustle. Verified .edu and .ac.in students only.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  const domain = domainOf(email);
  const domainOk = isCollegeEmail(email);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!domainOk) {
      toast.error("Use your official college email (.edu, .ac.in, .edu.in …)");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name.trim() },
          },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Check your college inbox to confirm your account.");
        } else {
          navigate({ to: "/", replace: true });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        navigate({ to: "/", replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary">
          <GraduationCap className="size-7" />
        </span>
        <h1 className="mt-4 text-3xl font-bold">Campus Hustle</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your campus, your crew. Errands, games and hangouts — only with verified students from
          your college.
        </p>
      </div>

      <div className="glass-card rounded-2xl p-5">
        <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-surface p-1">
          {(["signup", "signin"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={
                "rounded-lg py-2 text-sm font-semibold transition-colors " +
                (mode === m
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              {m === "signup" ? "College sign up" : "Log in"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" ? (
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ananya Sharma"
                required
                maxLength={60}
              />
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="email">College email</Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@nit.ac.in"
              required
            />
            {email.length > 3 ? (
              <p className={"text-xs " + (domainOk ? "text-primary" : "text-urgent")}>
                {domainOk
                  ? `Campus detected: ${domain}`
                  : "Only official college addresses (.edu, .ac.in, .edu.in …) work here."}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              minLength={6}
              required
            />
            {mode === "signin" ? (
              <Link to="/forgot-password" className="block pt-1 text-right text-xs font-semibold text-primary">
                Forgot Password?
              </Link>
            ) : null}
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {mode === "signup" ? "Create campus account" : "Log in"}
          </Button>
        </form>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        By continuing you agree to keep it friendly and campus-only.{" "}
        <Link to="/login" className="text-primary">
          Campus Hustle
        </Link>
      </p>
    </main>
  );
}
