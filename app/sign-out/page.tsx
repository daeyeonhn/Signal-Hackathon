"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { ErrorBox } from "@/components/portal/common";
export default function Page() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <main id="main-content" className="panel auth-required">
      <h1 className="text-2xl font-semibold">Sign out of Signal?</h1>
      <p>Your saved application will be here when you return.</p>
      <ErrorBox message={error} />
      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const result = await authClient.signOut();
            if (result.error) throw new Error(result.error.message);
            window.location.assign("/");
          } catch {
            setError("We could not sign you out. Please try again.");
            setBusy(false);
          }
        }}
      >
        {busy ? "Signing out…" : "Sign out"}
      </Button>
      <a href="/" className="block mt-5 text-sm underline">
        Stay signed in
      </a>
    </main>
  );
}
