"use client";
import { useEffect, useState } from "react";
import { ScanEye, CheckCircle2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
import { api, formatDate } from "@/lib/client";
import {
  RUBRIC,
  STATUSES,
  type ApplicationDetail,
  type Review,
} from "@/lib/types";
import { ErrorBox, Loading, StatusBadge } from "./common";
import { ApplicationAnswers } from "./answers";
type Scores = { curiosity: number; craft: number; collaboration: number };
export function ReviewPanel({
  id,
  base,
  onClose,
  onSaved,
}: {
  id: string | null;
  base: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [data, setData] = useState<ApplicationDetail | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false);
  const [scores, setScores] = useState<Scores>({
      curiosity: 0,
      craft: 0,
      collaboration: 0,
    }),
    [notes, setNotes] = useState("");
  const [decision, setDecision] = useState("accepted"),
    [note, setNote] = useState(""),
    [confirm, setConfirm] = useState(false),
    [closeConfirm, setCloseConfirm] = useState(false);
  const [tab, setTab] = useState("application");
  const own = data?.reviews.find((r) => r.reviewer_id === data.reviewerId);
  function receive(d: ApplicationDetail) {
    setData(d);
    const r = d.reviews.find((v) => v.reviewer_id === d.reviewerId);
    setScores({
      curiosity: r?.curiosity ?? 0,
      craft: r?.craft ?? 0,
      collaboration: r?.collaboration ?? 0,
    });
    setNotes(r?.notes ?? "");
    setNote(d.application.decision_note);
    setDirty(false);
  }
  useEffect(() => {
    if (!id) return;
    setData(null);
    setError("");
    setTab("application");
    setDirty(false);
    const c = new AbortController();
    api<ApplicationDetail>(base + "/organizer/applications/" + id, {
      signal: c.signal,
    })
      .then(receive)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => c.abort();
  }, [id, base]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function review() {
    setBusy(true);
    setError("");
    try {
      const d = await api<ApplicationDetail>(
        base + "/organizer/applications/" + id + "/review",
        {
          method: "POST",
          body: JSON.stringify({
            ...scores,
            notes,
            expectedUpdatedAt: own?.updated_at ?? null,
          }),
        },
      );
      receive(d);
      onSaved();
      toast.success("Review saved.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function decide() {
    if (!data) return;
    setBusy(true);
    setError("");
    try {
      const d = await api<ApplicationDetail>(
        base + "/organizer/applications/" + id + "/decision",
        {
          method: "POST",
          body: JSON.stringify({
            status: decision,
            note,
            version: data.application.version,
          }),
        },
      );
      receive(d);
      onSaved();
      setConfirm(false);
      toast.success("Decision published to the applicant’s portal.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const pending =
    data && ["submitted", "in_review"].includes(data.application.status);
  const total = scores.curiosity + scores.craft + scores.collaboration;
  return (
    <>
      <Sheet
        open={!!id}
        onOpenChange={(open) => {
          if (!open) {
            if (busy) return;
            if (dirty) setCloseConfirm(true);
            else onClose();
          }
        }}
      >
        <SheetContent className="w-full sm:max-w-[660px] p-0 gap-0 overflow-y-auto">
          <SheetHeader className="px-7 py-6 border-b border-border pr-14">
            <SheetDescription className="eyebrow text-primary">
              {data?.application.type ?? "APPLICANT"} APPLICATION
            </SheetDescription>
            <SheetTitle className="text-2xl mt-1">
              {data?.application.name ?? "Application details"}
            </SheetTitle>
            {data && (
              <div className="flex flex-wrap gap-3 items-center mt-2">
                <span className="text-sm muted break-all">
                  {data.application.email}
                </span>
                <StatusBadge status={data.application.status} />
              </div>
            )}
          </SheetHeader>
          <div className="px-7">
            <ErrorBox message={error} />
          </div>
          {!data ? (
            <div className="p-7">{!error && <Loading />}</div>
          ) : (
            <>
              {data.application.needs_second_look && (
                <div className="mx-7 mt-5 second-callout">
                  <ScanEye className="shrink-0 text-primary" size={21} />
                  <div>
                    <h3>A second perspective could help.</h3>
                    <p>
                      Reviewer totals differ by {data.application.score_spread}{" "}
                      points. Read the reasoning before deciding.
                    </p>
                  </div>
                </div>
              )}
              <Tabs value={tab} onValueChange={setTab} className="gap-0">
                <TabsList
                  variant="line"
                  className="mx-7 h-14 border-b border-border rounded-none justify-start w-auto"
                >
                  <TabsTrigger value="application" className="px-4 h-full">
                    Application
                  </TabsTrigger>
                  <TabsTrigger value="review" className="px-4 h-full">
                    Review & decide
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="px-4 h-full">
                    Activity
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="application" className="px-7 pb-7">
                  {data.application.status === "draft" ? (
                    <p className="muted text-sm leading-relaxed py-8">
                      This applicant is still working on their draft. Their
                      answers become available after submission.
                    </p>
                  ) : (
                    <>
                      <ApplicationAnswers application={data.application} />
                      <Button
                        className="mt-6 h-11 w-full"
                        onClick={() => setTab("review")}
                      >
                        {own ? "Open your review" : "Review this application"}
                      </Button>
                    </>
                  )}
                </TabsContent>
                <TabsContent value="review" className="px-7 pb-8">
                  <fieldset disabled={busy || !pending} className="min-w-0">
                    <div className="flex justify-between items-center pt-6">
                      <h2 className="text-lg font-semibold">
                        {own ? "Your review" : "Add your perspective"}
                      </h2>
                      <span className="text-xl font-semibold text-primary">
                        {total || "—"}
                        <span className="text-sm muted font-normal"> / 15</span>
                      </span>
                    </div>
                    <p className="text-sm muted leading-relaxed mt-2">
                      Score each criterion from 1 (limited evidence) to 5
                      (compelling evidence). Consider the applicant’s experience
                      level.
                    </p>
                    {RUBRIC.map((r) => (
                      <div key={r.key} className="rubric-row">
                        <h3>{r.title}</h3>
                        <p>{r.description}</p>
                        <RadioGroup
                          aria-label={r.title}
                          value={scores[r.key] ? String(scores[r.key]) : ""}
                          onValueChange={(v) => {
                            setScores((s) => ({ ...s, [r.key]: Number(v) }));
                            setDirty(true);
                          }}
                          className="rating"
                        >
                          {[1, 2, 3, 4, 5].map((n) => (
                            <label key={n}>
                              <RadioGroupItem
                                value={String(n)}
                                aria-label={r.title + ": " + n}
                              />
                              <span>{n}</span>
                            </label>
                          ))}
                        </RadioGroup>
                      </div>
                    ))}
                    <div className="field">
                      <Label htmlFor="review-notes">
                        Your reasoning{" "}
                        <span className="font-normal muted">
                          (organizers only)
                        </span>
                      </Label>
                      <Textarea
                        id="review-notes"
                        value={notes}
                        onChange={(e) => {
                          setNotes(e.target.value);
                          setDirty(true);
                        }}
                        maxLength={2000}
                        className="min-h-28"
                        placeholder="What stood out? What would you want another reviewer to consider?"
                      />
                    </div>
                    <Button
                      className="mt-5 w-full h-11"
                      disabled={
                        busy ||
                        !pending ||
                        !scores.curiosity ||
                        !scores.craft ||
                        !scores.collaboration ||
                        notes.trim().length < 15
                      }
                      onClick={review}
                    >
                      <Save />
                      {busy
                        ? "Saving…"
                        : own
                          ? "Update your review"
                          : "Save review"}
                    </Button>
                  </fieldset>
                  {!pending && (
                    <p className="text-sm muted leading-relaxed mt-4">
                      {data.application.status === "draft"
                        ? "Grading becomes available after submission."
                        : "A decision has been made. Reviews are locked to preserve the record."}
                    </p>
                  )}
                  <div className="mt-8">
                    <h3 className="font-semibold text-base">
                      Reviewer perspectives{" "}
                      <span className="muted font-normal">
                        ({data.reviews.length})
                      </span>
                    </h3>
                    {data.reviews.length ? (
                      data.reviews.map((r: Review) => (
                        <div className="review-card" key={r.id}>
                          <div className="review-card-header">
                            <strong>
                              {r.reviewer_id === data.reviewerId
                                ? "You"
                                : r.reviewer_name}
                            </strong>
                            <strong className="text-primary">
                              {r.total} / 15
                            </strong>
                          </div>
                          <p>{r.notes}</p>
                          <div className="text-xs muted mt-3">
                            {r.curiosity} curiosity · {r.craft} initiative ·{" "}
                            {r.collaboration} community
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm muted my-4">
                        No reviews yet. Yours can be the first.
                      </p>
                    )}
                  </div>
                  {data.application.status !== "draft" && (
                    <section className="mt-8 pt-7 border-t border-border">
                      <div className="flex gap-2 items-center">
                        <CheckCircle2 size={19} className="text-primary" />
                        <h3 className="text-lg font-semibold">
                          Publish a decision
                        </h3>
                      </div>
                      <p className="text-sm muted leading-relaxed mt-2">
                        A decision is visible immediately in the applicant’s
                        portal. Add a note they can understand.
                      </p>
                      <div className="field">
                        <Label htmlFor="decision">Decision</Label>
                        <Select
                          value={decision}
                          onValueChange={setDecision}
                          disabled={busy || !data.reviews.length}
                        >
                          <SelectTrigger id="decision">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="accepted">Accept</SelectItem>
                            <SelectItem value="waitlisted">Waitlist</SelectItem>
                            <SelectItem value="rejected">
                              Not selected
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="field">
                        <Label htmlFor="decision-note">Note to applicant</Label>
                        <Textarea
                          id="decision-note"
                          maxLength={1000}
                          value={note}
                          disabled={busy || !data.reviews.length}
                          onChange={(e) => {
                            setNote(e.target.value);
                            setDirty(true);
                          }}
                          placeholder="Thank you for applying…"
                        />
                      </div>
                      <Button
                        variant="outline"
                        className="mt-5 w-full h-11"
                        disabled={
                          busy ||
                          !data.reviews.length ||
                          note.trim().length < 10
                        }
                        onClick={() => setConfirm(true)}
                      >
                        Publish decision
                      </Button>
                      {!data.reviews.length && (
                        <p className="text-xs muted mt-3">
                          Save at least one review to enable a decision.
                        </p>
                      )}
                    </section>
                  )}
                </TabsContent>
                <TabsContent value="activity" className="p-7">
                  <h3 className="font-semibold mb-6">Application history</h3>
                  <ol className="timeline">
                    {data.events.map((e) => (
                      <li key={e.id}>
                        <p>{e.message}</p>
                        <time>{formatDate(e.created_at)}</time>
                      </li>
                    ))}
                  </ol>
                  {!data.events.length && (
                    <p className="text-sm muted">No activity yet.</p>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish this decision?</AlertDialogTitle>
            <AlertDialogDescription>
              {data?.application.name} will see “
              {STATUSES[decision as keyof typeof STATUSES]}” and your note in
              their portal. This also removes the application from pending
              review queues.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ErrorBox message={error} />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Go back</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void decide();
              }}
            >
              {busy ? "Publishing…" : "Publish decision"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={closeConfirm} onOpenChange={setCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave your unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Your unsaved review or decision note will be discarded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setDirty(false);
                setCloseConfirm(false);
                onClose();
              }}
            >
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
