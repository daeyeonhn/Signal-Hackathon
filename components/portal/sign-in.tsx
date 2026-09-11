"use client";
import { useEffect, useState } from "react";
import { ArrowRight, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brand, ErrorBox } from "./common";
import { authClient, safeNext } from "@/lib/auth-client";

export function SignIn({ ready, google }: { ready: boolean; google: boolean }) {
  const [mode, setMode] = useState("sign-in"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [visible, setVisible] = useState(false),
    [next, setNext] = useState("/applicant");
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    setNext(safeNext(query.get("next")));
    if (query.has("error"))
      setError(
        "Google sign-in did not finish. Please try again or use email and password.",
      );
  }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const fields = new FormData(event.currentTarget);
    const email = String(fields.get("email") ?? "")
      .trim()
      .toLowerCase();
    const password = String(fields.get("password") ?? "");
    if (mode === "sign-up" && password !== fields.get("confirm")) {
      setError("Your passwords do not match.");
      setBusy(false);
      return;
    }
    try {
      const result =
        mode === "sign-up"
          ? await authClient.signUp.email({
              email,
              password,
              name: String(fields.get("name") ?? "").trim(),
            })
          : await authClient.signIn.email({ email, password });
      if (result.error) {
        setError(
          result.error.message || "We could not sign you in. Please try again.",
        );
        setBusy(false);
        return;
      }
      window.location.assign(next);
    } catch {
      setError("We could not connect. Please try again.");
      setBusy(false);
    }
  }
  async function googleSignIn() {
    setBusy(true);
    setError("");
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: next,
        errorCallbackURL:
          "/sign-in?error=google&next=" + encodeURIComponent(next),
      });
      if (result.error) {
        setError(result.error.message || "Google sign-in is unavailable.");
        setBusy(false);
      }
    } catch {
      setError("We could not start Google sign-in.");
      setBusy(false);
    }
  }
  return (
    <main
      id="main-content"
      className="min-h-screen bg-[#f4f6ef] px-5 py-10 sm:py-16"
    >
      <div className="mx-auto max-w-[450px]">
        <a href="/" className="inline-block rounded-xl bg-[#153725] px-5 py-3">
          <Brand />
        </a>
        <section className="panel mt-8 p-6 sm:p-8">
          <p className="eyebrow text-primary">YOUR SIGNAL ACCOUNT</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            {mode === "sign-up"
              ? "Make room for possibility."
              : "Welcome back."}
          </h1>
          <p className="muted mt-3 text-sm leading-relaxed">
            {next === "/organizer"
              ? "Sign in to your review workspace. Organizer access is granted separately."
              : "One account for your application, saved drafts, and updates."}
          </p>
          {!ready ? (
            <ErrorBox message="Sign-in is being configured. You can still explore the demos from the welcome page." />
          ) : (
            <>
              {google && (
                <>
                  <Button
                    onClick={googleSignIn}
                    disabled={busy}
                    variant="outline"
                    className="w-full mt-6"
                  >
                    Continue with Google
                  </Button>
                  <p className="text-center text-xs muted my-5">
                    or continue with email
                  </p>
                </>
              )}
              <Tabs
                value={mode}
                onValueChange={(value) => {
                  setMode(value);
                  setError("");
                }}
                className="mt-6"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="sign-in" disabled={busy}>
                    Sign in
                  </TabsTrigger>
                  <TabsTrigger value="sign-up" disabled={busy}>
                    Create account
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <form onSubmit={submit} className="space-y-5 mt-6">
                {mode === "sign-up" && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Your name</Label>
                    <Input
                      id="name"
                      name="name"
                      autoComplete="name"
                      minLength={2}
                      maxLength={100}
                      required
                      disabled={busy}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    required
                    disabled={busy}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={visible ? "text" : "password"}
                      autoComplete={
                        mode === "sign-up" ? "new-password" : "current-password"
                      }
                      minLength={mode === "sign-up" ? 12 : undefined}
                      maxLength={128}
                      className="pr-12"
                      required
                      disabled={busy}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="absolute right-0 top-0"
                      aria-label={visible ? "Hide password" : "Show password"}
                      onClick={() => setVisible(!visible)}
                    >
                      {visible ? <EyeOff size={16} /> : <Eye size={16} />}
                    </Button>
                  </div>
                  {mode === "sign-up" && (
                    <p className="text-xs muted">
                      Use at least 12 characters. A long, unique passphrase
                      works well.
                    </p>
                  )}
                </div>
                {mode === "sign-up" && (
                  <div className="space-y-2">
                    <Label htmlFor="confirm">Confirm password</Label>
                    <Input
                      id="confirm"
                      name="confirm"
                      type={visible ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      disabled={busy}
                    />
                  </div>
                )}
                <ErrorBox message={error} />
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy
                    ? "Please wait…"
                    : mode === "sign-up"
                      ? "Create account"
                      : "Sign in"}
                  <ArrowRight size={16} />
                </Button>
              </form>
            </>
          )}
          <p className="flex items-start gap-2 text-xs muted mt-6 leading-relaxed">
            <ShieldCheck size={16} className="shrink-0" />
            Your application is visible only to you and the organizers.
          </p>
        </section>
        <a
          href="/"
          className="inline-block mt-6 text-sm text-primary underline"
        >
          Back to welcome
        </a>
      </div>
    </main>
  );
}
