"use client";
import { useEffect, useState, useRef } from "react";
import {
  Check,
  ArrowRight,
  ArrowLeft,
  Save,
  Send,
  CheckCircle2,
  Lightbulb,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Shell, ErrorBox, Loading, Gate, StatusBadge } from "./common";
import { ApplicationAnswers } from "./answers";
import { api, ApiError, formatDate } from "@/lib/client";
import {
  BLANK_ANSWERS,
  SKILLS,
  readiness,
  STATUSES,
  type Application,
  type ApplicantType,
  type Answers,
  type Profile,
  type HistoryEvent,
} from "@/lib/types";
import { validateSubmission } from "@/lib/validation";
type Mine = {
  profile: Profile;
  application: Application | null;
  events: HistoryEvent[];
};
export function Applicant({ demo = false }: { demo?: boolean }) {
  const [data, setData] = useState<Mine | null>(null),
    [answers, setAnswers] = useState<Answers>(BLANK_ANSWERS),
    [type, setType] = useState<ApplicantType>("hacker");
  const [tab, setTab] = useState("about"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false);
  const [name, setName] = useState(""),
    [confirm, setConfirm] = useState(false),
    [authError, setAuthError] = useState(false);
  const busyRef = useRef(false);
  const base = demo ? "/api/demo" : "/api";
  const endpoint = (path: string, t = type) => base + path + "?type=" + t;
  async function load(t: ApplicantType = type) {
    setError("");
    try {
      let d = await api<Mine>(endpoint("/applications/mine", t));
      if (d.profile.role === "hacker" || d.profile.role === "mentor") {
        const role = d.profile.role;
        if (!d.application)
          d = await api<Mine>(endpoint("/applications/start", t), {
            method: "POST",
            body: "{}",
          });
        setType(role);
      }
      setData(d);
      setAnswers(d.application?.answers ?? BLANK_ANSWERS);
      setName(d.profile.name);
      setDirty(false);
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof ApiError && e.status === 401) setAuthError(true);
    }
  }
  useEffect(() => {
    const t =
      new URLSearchParams(window.location.search).get("type") === "mentor"
        ? "mentor"
        : "hacker";
    setType(t);
    void load(t);
  }, [demo]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function change<K extends keyof Answers>(key: K, value: Answers[K]) {
    setAnswers((a) => ({ ...a, [key]: value }));
    setDirty(true);
  }
  async function onboard(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const d = await api<Mine>("/api/profile", {
        method: "POST",
        body: JSON.stringify({ name, type }),
      });
      setData(d);
      setAnswers(d.application!.answers);
      toast.success("Your application is ready to start.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save(submit = false) {
    if (!data?.application || busyRef.current) return;
    if (submit) {
      const issues = validateSubmission(answers, type);
      if (issues.length) {
        setError(issues.join(" "));
        return;
      }
    }
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const d = await api<Mine>(
        endpoint(submit ? "/applications/submit" : "/applications/mine"),
        {
          method: submit ? "POST" : "PUT",
          body: JSON.stringify({ answers, version: data.application.version }),
        },
      );
      setData(d);
      setAnswers(d.application!.answers);
      setDirty(false);
      setConfirm(false);
      toast.success(
        submit ? "Application submitted. You’re all set." : "Draft saved.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  if (authError)
    return (
      <Gate message={error} href={demo ? "/" : "/sign-in?next=%2Fapplicant"} />
    );
  if (data?.profile.role === "organizer")
    return (
      <Gate
        message="Your account has organizer access. Open the review workspace to see applications."
        href="/organizer"
      />
    );
  const app = data?.application,
    mentor = type === "mentor",
    submitted = app && app.status !== "draft",
    percent = readiness(answers, type);
  return (
    <Shell demo={demo} mode="applicant" profile={data?.profile}>
      <div className="workspace-heading">
        <div>
          <div className="eyebrow text-primary">YOUR APPLICATION</div>
          <h1>
            {submitted
              ? "You’re on our radar."
              : data
                ? "Let’s get to know you."
                : "Your next build starts here."}
          </h1>
          <p>
            {submitted
              ? "Follow your progress and revisit what you shared."
              : "You don’t need a perfect résumé. We want to know what makes you curious."}
          </p>
        </div>
        {demo && (
          <Select
            value={type}
            disabled={dirty || busy}
            onValueChange={(v) => {
              setTab("about");
              setData(null);
              setType(v as ApplicantType);
              void load(v as ApplicantType);
            }}
          >
            <SelectTrigger
              className="bg-white w-[165px]"
              aria-label="Demo applicant type"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hacker">Hacker account</SelectItem>
              <SelectItem value="mentor">Mentor account</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
      <ErrorBox message={error} />
      {!data ? (
        error ? (
          <Button onClick={() => load()} variant="outline">
            <RefreshCw />
            Try again
          </Button>
        ) : (
          <Loading />
        )
      ) : data.profile.role === "unassigned" ? (
        <section className="panel max-w-xl">
          <div className="panel-title">
            <h2>Set up your account</h2>
          </div>
          <form className="form-content" onSubmit={onboard}>
            <p className="text-sm muted">Signed in as {data.profile.email}</p>
            <div className="field">
              <Label htmlFor="name">Your name</Label>
              <Input
                id="name"
                value={name}
                maxLength={100}
                minLength={2}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
            <div className="field">
              <span className="field-label">I’m applying as a</span>
              <RadioGroup
                value={type}
                onValueChange={(v) => setType(v as ApplicantType)}
                className="flex gap-7 mt-2"
              >
                {["hacker", "mentor"].map((t) => (
                  <label key={t} className="flex gap-2 items-center capitalize">
                    <RadioGroupItem value={t} />
                    {t}
                  </label>
                ))}
              </RadioGroup>
            </div>
            <Button disabled={busy} className="mt-8 h-11" type="submit">
              {busy ? "Creating…" : "Start my application"}
              <ArrowRight />
            </Button>
          </form>
        </section>
      ) : (
        <div className="applicant-grid">
          <div>
            {submitted ? (
              <>
                <section className="panel mb-6">
                  <div className="panel-title">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="text-primary" />
                      <h2>Application {STATUSES[app.status].toLowerCase()}</h2>
                    </div>
                    <StatusBadge status={app.status} />
                  </div>
                  <div className="form-content">
                    <p className="leading-relaxed">
                      {app.decision_note ||
                        "Your application is safely submitted. Any decision will appear here, so you can check back without wondering where things stand."}
                    </p>
                    <p className="text-sm muted mt-4">
                      Submitted{" "}
                      {app.submitted_at
                        ? formatDate(app.submitted_at)
                        : "just now"}{" "}
                      · {mentor ? "Mentor" : "Hacker"}
                    </p>
                    <Button
                      onClick={() => load()}
                      variant="outline"
                      className="mt-5"
                    >
                      <RefreshCw />
                      Check for updates
                    </Button>
                  </div>
                </section>
                <section className="panel">
                  <div className="panel-title">
                    <h2>Your submitted answers</h2>
                  </div>
                  <div className="form-content">
                    <ApplicationAnswers application={app} />
                  </div>
                </section>
              </>
            ) : (
              <section className="panel">
                <div className="panel-title">
                  <div className="flex items-center gap-3">
                    <h2>{mentor ? "Mentor" : "Hacker"} application</h2>
                    <StatusBadge status="draft" />
                  </div>
                  <span className="text-xs muted" role="status">
                    {busy
                      ? "Saving…"
                      : dirty
                        ? "Unsaved changes"
                        : "All changes saved"}
                  </span>
                </div>
                <Tabs value={tab} onValueChange={setTab} className="gap-0">
                  <TabsList
                    className="w-full rounded-none bg-[#f8faf8] p-0 h-14 border-b border-border"
                    variant="line"
                  >
                    {[
                      { id: "about", name: "About you" },
                      { id: "story", name: "Your story" },
                      { id: "review", name: "Review" },
                    ].map((t, i) => (
                      <TabsTrigger
                        key={t.id}
                        value={t.id}
                        className="h-full rounded-none gap-2 text-sm"
                      >
                        <span className="text-xs opacity-60">0{i + 1}</span>
                        {t.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <fieldset disabled={busy} className="min-w-0">
                    <TabsContent value="about" className="form-content">
                      <div className="form-section">
                        <h3>A few introductions.</h3>
                        <p>
                          {mentor
                            ? "Help us understand where you can support hackers."
                            : "Start with the basics. All experience levels are welcome."}
                        </p>
                        <div className="field-row">
                          <div className="field">
                            <Label htmlFor="school">
                              {mentor ? "Organization" : "School"} *
                            </Label>
                            <Input
                              id="school"
                              maxLength={150}
                              value={answers.school}
                              onChange={(e) => change("school", e.target.value)}
                              placeholder={
                                mentor
                                  ? "Company, community, or independent"
                                  : "Your school or university"
                              }
                            />
                          </div>
                          <div className="field">
                            <Label htmlFor="field">
                              {mentor ? "Professional role" : "Field of study"}{" "}
                              *
                            </Label>
                            <Input
                              id="field"
                              maxLength={120}
                              value={answers.field}
                              onChange={(e) => change("field", e.target.value)}
                              placeholder={
                                mentor
                                  ? "e.g. Software engineer"
                                  : "e.g. Computer Science"
                              }
                            />
                          </div>
                        </div>
                        <div className="field">
                          <Label htmlFor="experience">
                            {mentor
                              ? "Mentoring experience"
                              : "Hackathon experience"}{" "}
                            *
                          </Label>
                          <Select
                            value={answers.experience}
                            onValueChange={(v) => change("experience", v)}
                          >
                            <SelectTrigger id="experience">
                              <SelectValue placeholder="Select your experience" />
                            </SelectTrigger>
                            <SelectContent>
                              {(mentor
                                ? ["Less than 1 year", "1–3 years", "4+ years"]
                                : [
                                    "First hackathon",
                                    "1–3 hackathons",
                                    "4+ hackathons",
                                  ]
                              ).map((v) => (
                                <SelectItem value={v} key={v}>
                                  {v}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="field">
                          <span className="field-label">
                            {mentor
                              ? "Where can you help?"
                              : "What are you interested in?"}{" "}
                            *
                          </span>
                          <small>Choose as many as you like.</small>
                          <div className="skill-chips">
                            {SKILLS.map((s) => (
                              <label className="skill-chip" key={s}>
                                <Checkbox
                                  checked={answers.skills.includes(s)}
                                  onCheckedChange={(v) =>
                                    change(
                                      "skills",
                                      v
                                        ? [...answers.skills, s]
                                        : answers.skills.filter((x) => x !== s),
                                    )
                                  }
                                />
                                {s}
                              </label>
                            ))}
                          </div>
                        </div>
                        {mentor && (
                          <div className="field">
                            <Label htmlFor="availability">
                              Availability during the event *
                            </Label>
                            <Select
                              value={answers.availability}
                              onValueChange={(v) => change("availability", v)}
                            >
                              <SelectTrigger id="availability">
                                <SelectValue placeholder="How much time can you share?" />
                              </SelectTrigger>
                              <SelectContent>
                                {["2–4 hours", "4–8 hours", "Full weekend"].map(
                                  (v) => (
                                    <SelectItem key={v} value={v}>
                                      {v}
                                    </SelectItem>
                                  ),
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                    <TabsContent value="story" className="form-content">
                      <div className="form-section">
                        <h3>More than a list of skills.</h3>
                        <p>
                          A specific example tells us more than a polished
                          pitch. Each answer needs 40–1,800 characters.
                        </p>
                        <div className="field">
                          <Label htmlFor="motivation">
                            {mentor
                              ? "Why do you want to mentor?"
                              : "What do you want to explore or build?"}{" "}
                            *
                          </Label>
                          <Textarea
                            id="motivation"
                            className="min-h-36 leading-relaxed"
                            maxLength={1800}
                            value={answers.motivation}
                            onChange={(e) =>
                              change("motivation", e.target.value)
                            }
                            placeholder={
                              mentor
                                ? "What do you enjoy about helping others learn?"
                                : "What are you curious about? What would you try with a weekend and a team?"
                            }
                          />
                          <small className="text-right">
                            {answers.motivation.length} / 1,800
                          </small>
                        </div>
                        <div className="field">
                          <Label htmlFor="contribution">
                            {mentor
                              ? "Tell us about a time you helped someone learn."
                              : "Tell us about something you tried, made, or helped improve."}{" "}
                            *
                          </Label>
                          <Textarea
                            id="contribution"
                            className="min-h-36 leading-relaxed"
                            maxLength={1800}
                            value={answers.contribution}
                            onChange={(e) =>
                              change("contribution", e.target.value)
                            }
                            placeholder={
                              mentor
                                ? "How did you help them work through the problem?"
                                : "It can be a personal project, a team effort, or a small experiment."
                            }
                          />
                          <small className="text-right">
                            {answers.contribution.length} / 1,800
                          </small>
                        </div>
                        <div className="field">
                          <Label htmlFor="portfolio">
                            Portfolio or project link{" "}
                            <span className="muted font-normal">
                              (optional)
                            </span>
                          </Label>
                          <Input
                            id="portfolio"
                            type="url"
                            maxLength={500}
                            value={answers.portfolio}
                            onChange={(e) =>
                              change("portfolio", e.target.value)
                            }
                            placeholder="https://"
                          />
                          <small>
                            Use a full https:// link to a project you’d like to
                            share.
                          </small>
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="review" className="form-content">
                      <div className="form-section">
                        <h3>One last look.</h3>
                        <p>
                          Make sure this feels like you. Submitted answers are
                          locked so every reviewer sees the same application.
                        </p>
                        <ApplicationAnswers
                          application={{ ...app!, answers }}
                        />
                        <label className="flex items-start gap-3 mt-7 text-sm leading-relaxed">
                          <Checkbox
                            className="mt-1"
                            checked={answers.consent}
                            onCheckedChange={(v) => change("consent", !!v)}
                          />
                          I confirm these answers are accurate and agree to
                          share them with the event organizers. *
                        </label>
                      </div>
                    </TabsContent>
                  </fieldset>
                  <div className="form-footer">
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => save()}
                    >
                      <Save />
                      {busy ? "Saving…" : "Save draft"}
                    </Button>
                    <div className="flex gap-2">
                      {tab !== "about" && (
                        <Button
                          variant="ghost"
                          disabled={busy}
                          aria-label="Previous step"
                          onClick={() =>
                            setTab(tab === "review" ? "story" : "about")
                          }
                        >
                          <ArrowLeft />
                        </Button>
                      )}
                      {tab === "review" ? (
                        <Button
                          disabled={busy}
                          onClick={() => {
                            const issues = validateSubmission(answers, type);
                            if (issues.length) setError(issues.join(" "));
                            else {
                              setError("");
                              setConfirm(true);
                            }
                          }}
                        >
                          Submit application
                          <Send />
                        </Button>
                      ) : (
                        <Button
                          disabled={busy}
                          onClick={() =>
                            setTab(tab === "about" ? "story" : "review")
                          }
                        >
                          Continue
                          <ArrowRight />
                        </Button>
                      )}
                    </div>
                  </div>
                </Tabs>
              </section>
            )}
          </div>
          <aside className="applicant-aside">
            <section className="panel help-card">
              <h3>{submitted ? "Application journey" : "Your progress"}</h3>
              {!submitted && (
                <>
                  <div className="flex justify-between text-sm mb-3">
                    <span className="muted">Ready to submit</span>
                    <strong>{percent}%</strong>
                  </div>
                  <Progress
                    value={percent}
                    aria-label="Application completion"
                    className="h-2"
                  />
                </>
              )}
              {submitted ? (
                <ol className="timeline mt-6">
                  {data.events.map((e) => (
                    <li key={e.id}>
                      <p>{e.message}</p>
                      <time>{formatDate(e.created_at)}</time>
                    </li>
                  ))}
                </ol>
              ) : (
                <ul className="step-list">
                  {["A few introductions", "Your story", "Review & submit"].map(
                    (s, i) => {
                      const done =
                        i === 0
                          ? !!answers.school && !!answers.experience
                          : i === 1
                            ? answers.motivation.length >= 40 &&
                              answers.contribution.length >= 40
                            : answers.consent;
                      return (
                        <li key={s}>
                          <span
                            className={"step-number " + (done ? "done" : "")}
                          >
                            {done ? <Check size={13} /> : i + 1}
                          </span>
                          {s}
                        </li>
                      );
                    },
                  )}
                </ul>
              )}
            </section>
            <section className="panel help-card bg-[#eef4e9]">
              <Lightbulb size={23} className="text-primary mb-4" />
              <h3>{mentor ? "Pass it forward." : "Start where you are."}</h3>
              <p>
                {mentor
                  ? "You don’t need to know every answer. Show us how you help someone find their next step."
                  : "Your first project counts. So does a small experiment that didn’t quite work. We’re interested in how you think and what you learned."}
              </p>
            </section>
            {!submitted && (
              <p className="text-xs muted px-2 leading-relaxed">
                Save your draft before leaving. You can return on any device
                using the same account.
                {demo ? " Demo accounts are tied to this browser." : ""}
              </p>
            )}
          </aside>
        </div>
      )}
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ready to send your application?</AlertDialogTitle>
            <AlertDialogDescription>
              Your answers will be shared with organizers and locked for review.
              You can follow your status from this page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ErrorBox message={error} />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void save(true);
              }}
            >
              {busy ? "Submitting…" : "Submit application"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Shell>
  );
}
