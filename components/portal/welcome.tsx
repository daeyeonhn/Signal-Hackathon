"use client";
import { useState } from "react";
import {
  Code2,
  MessagesSquare,
  ArrowUpRight,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Brand, ErrorBox } from "./common";
import { api } from "@/lib/client";
export function Welcome({ signedIn }: { signedIn: boolean }) {
  const [type, setType] = useState("hacker"),
    [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  async function demo(mode: string) {
    setBusy(mode);
    setError("");
    try {
      await api("/api/demo", { method: "POST", body: "{}" });
      window.location.href = "/demo/" + mode + "?type=" + type;
    } catch (e) {
      setError((e as Error).message);
      setBusy("");
    }
  }
  const target = "/applicant?type=" + type;
  return (
    <main id="main-content" className="landing">
      <aside className="landing-story">
        <a href="/">
          <Brand />
        </a>
        <div className="story-details">
          <div className="eyebrow text-[#a8c9b1]">
            SIGNAL HACKATHON / FALL 2026
          </div>
          <h2>
            Good ideas.
            <br />
            Great <span>people.</span>
          </h2>
          <p className="text-[#b7cdbf] leading-relaxed max-w-xs">
            There’s a place here for the things you know, and the things you’re
            ready to learn.
          </p>
          <div className="mt-10">
            <div className="story-index">
              <b>01</b>Find your role
            </div>
            <div className="story-index">
              <b>02</b>Tell us what drives you
            </div>
            <div className="story-index">
              <b>03</b>Follow your application
            </div>
          </div>
        </div>
        <footer className="text-xs text-[#92ac9b]">
          Signal Hackathon · Fall 2026
        </footer>
      </aside>
      <section className="landing-main">
        <div className="eyebrow text-primary">YOUR NEXT CHAPTER</div>
        <h1>How will you make your mark?</h1>
        <p className="intro">
          Choose your role to start an application. Already applied? Sign in to
          pick up where you left off.
        </p>
        <RadioGroup
          value={type}
          onValueChange={setType}
          className="gap-3 mt-8"
          aria-label="Applicant account type"
        >
          {[
            {
              id: "hacker",
              title: "I’m here to build",
              desc: "Bring an idea, meet your people, and make something.",
              icon: Code2,
            },
            {
              id: "mentor",
              title: "I’m here to mentor",
              desc: "Share your experience. Help someone get unstuck.",
              icon: MessagesSquare,
            },
          ].map((r) => (
            <label
              key={r.id}
              className="role-card"
              data-state={type === r.id ? "checked" : "unchecked"}
            >
              <div className="role-icon">
                <r.icon size={25} />
              </div>
              <div className="flex-1">
                <strong>{r.title}</strong>
                <p>{r.desc}</p>
              </div>
              <RadioGroupItem value={r.id} aria-label={r.id} />
            </label>
          ))}
        </RadioGroup>
        <Button asChild className="signin-button">
          <a
            target="_top"
            href={
              signedIn ? target : "/sign-in?next=" + encodeURIComponent(target)
            }
          >
            {signedIn
              ? "Continue to your application"
              : "Sign in or create an account"}
            <ArrowRight size={17} />
          </a>
        </Button>
        <p className="text-xs muted flex items-center gap-2 mt-3">
          <ShieldCheck size={14} />
          Your application is visible only to you and the organizers.
        </p>
        <div className="border-t border-border mt-8 pt-6">
          <p className="text-sm font-semibold">Take a look around</p>
          <p className="text-sm muted mt-2">
            Try the full portal with your own sample workspace.
          </p>
          <div className="demo-choice">
            <Button
              variant="outline"
              disabled={!!busy}
              onClick={() => demo("applicant")}
            >
              {busy === "applicant" ? "Opening…" : "Applicant demo"}
              <ArrowUpRight />
            </Button>
            <Button
              variant="outline"
              disabled={!!busy}
              onClick={() => demo("organizer")}
            >
              {busy === "organizer" ? "Opening…" : "Organizer demo"}
              <ArrowUpRight />
            </Button>
          </div>
        </div>
        <ErrorBox message={error} />
        <a
          target="_top"
          href={signedIn ? "/organizer" : "/sign-in?next=%2Forganizer"}
          className="text-sm text-primary mt-7 underline"
        >
          Organizer sign-in
        </a>
      </section>
    </main>
  );
}
