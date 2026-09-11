"use client";
import { useEffect, useState } from "react";
import {
  Search,
  ScanEye,
  ArrowUpRight,
  Users,
  Clock3,
  CheckCircle2,
  Layers3,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import { toast } from "sonner";
import { Shell, Loading, ErrorBox, Blank, StatusBadge, Gate } from "./common";
import { ReviewPanel } from "./review-panel";
import { api, ApiError, formatDate } from "@/lib/client";
import { STATUSES, type Application, type Profile } from "@/lib/types";
type Listing = {
  applications: Application[];
  total: number;
  page: number;
  stats: {
    total: number;
    pending: number;
    accepted: number;
    secondLook: number;
  };
};
export function Organizer({ demo = false }: { demo?: boolean }) {
  const [profile, setProfile] = useState<Profile | undefined>(),
    [data, setData] = useState<Listing | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const [view, setView] = useState("all"),
    [q, setQ] = useState(""),
    [query, setQuery] = useState(""),
    [type, setType] = useState("all"),
    [status, setStatus] = useState("all"),
    [page, setPage] = useState(1),
    [revision, setRevision] = useState(0);
  const [id, setId] = useState<string | null>(null),
    [denied, setDenied] = useState(false),
    [unauth, setUnauth] = useState(false),
    [code, setCode] = useState(""),
    [busy, setBusy] = useState(false);
  const [members, setMembers] = useState<Profile[]>([]),
    [accountId, setAccountId] = useState("");
  const base = demo ? "/api/demo" : "/api";
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(q);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);
  useEffect(() => {
    api<{ profile: Profile }>(base + (demo ? "/organizer/me" : "/me"))
      .then((v) => setProfile(v.profile))
      .catch(() => {});
  }, [base]);
  useEffect(() => {
    const c = new AbortController();
    setError("");
    setLoading(true);
    const params = new URLSearchParams({
      q: query,
      type,
      status,
      page: String(page),
      second: view === "second" ? "1" : "0",
    });
    const req =
      view === "team"
        ? api<{ members: Profile[] }>(base + "/organizer/team", {
            signal: c.signal,
          }).then((v) => setMembers(v.members))
        : api<Listing>(base + "/organizer/applications?" + params, {
            signal: c.signal,
          }).then(setData);
    req
      .catch((e) => {
        if (e.name === "AbortError") return;
        setError(e.message);
        if (e instanceof ApiError) {
          setDenied(e.status === 403);
          setUnauth(e.status === 401);
        }
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [base, query, type, status, page, view, revision]);
  function navigate(v: string) {
    setView(v);
    setPage(1);
    setQ("");
    setQuery("");
    setType("all");
    setStatus("all");
  }
  async function claim(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/organizer/claim", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      window.location.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(base + "/organizer/team", {
        method: "POST",
        body: JSON.stringify({ accountId: accountId.trim() }),
      });
      setAccountId("");
      setRevision((v) => v + 1);
      toast.success("Organizer access granted.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (unauth)
    return (
      <Gate message={error} href={demo ? "/" : "/sign-in?next=%2Forganizer"} />
    );
  if (denied)
    return (
      <main id="main-content" className="panel auth-required text-left">
        <ShieldCheck size={30} className="text-primary mb-5" />
        <h1 className="text-2xl font-semibold">Organizer access</h1>
        <p>
          Your account needs an invitation from an existing organizer. Ask them
          to add your account ID on the Review team page.
        </p>
        {profile && (
          <div className="mb-6">
            <Label htmlFor="account-id">Your account ID</Label>
            <Input
              id="account-id"
              readOnly
              value={profile.id}
              className="mt-2 text-xs"
              onFocus={(e) => e.target.select()}
            />
            <p className="!text-xs !mt-2">
              Share this with an organizer you know.
            </p>
          </div>
        )}
        <div className="border-t border-border pt-6">
          <h2 className="text-base font-semibold">
            Setting up the first organizer?
          </h2>
          <p className="!text-sm !mt-2">
            Enter the one-time setup code supplied with this project.
          </p>
          <form onSubmit={claim}>
            <Label htmlFor="setup-code">Setup code</Label>
            <Input
              id="setup-code"
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              className="my-3"
              autoComplete="off"
            />
            <Button disabled={busy}>
              {busy ? "Checking…" : "Claim organizer access"}
            </Button>
          </form>
          <ErrorBox
            message={error === "Organizer access is required." ? "" : error}
          />
          <a className="block text-sm underline mt-6" href="/">
            Back to welcome
          </a>
        </div>
      </main>
    );
  const stats = data?.stats;
  return (
    <Shell
      demo={demo}
      mode="organizer"
      profile={profile}
      view={view}
      onView={navigate}
    >
      <div className="workspace-heading">
        <div>
          <div className="eyebrow text-primary">ORGANIZER WORKSPACE</div>
          <h1>
            {view === "team"
              ? "Good reviews take a team."
              : view === "second"
                ? "Worth another look."
                : "Meet your next wave of builders."}
          </h1>
          <p>
            {view === "team"
              ? "Give trusted organizers access to review and grade applications."
              : view === "second"
                ? "Different perspectives, surfaced before a decision is made."
                : "Thoughtful applications deserve thoughtful decisions."}
          </p>
        </div>
        <Button
          variant="outline"
          className="bg-white h-10"
          onClick={() => setRevision((v) => v + 1)}
          disabled={loading}
        >
          <RefreshCw size={15} />
          Refresh
        </Button>
      </div>
      <ErrorBox message={error} />
      {view === "team" ? (
        <section className="panel">
          <div className="panel-title">
            <h2>Review team</h2>
            <span className="text-sm muted">{members.length} organizers</span>
          </div>
          {loading ? (
            <div className="p-6">
              <Loading />
            </div>
          ) : (
            <div className="p-6">
              {members.map((m, i) => (
                <div
                  key={i}
                  className="flex gap-3 items-center py-4 border-b border-border"
                >
                  <div className="avatar">
                    {m.name
                      .split(" ")
                      .map((v) => v[0])
                      .join("")}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{m.name || m.email}</p>
                    <p className="text-sm muted mt-1">{m.email}</p>
                  </div>
                  <span className="ml-auto text-sm text-primary">
                    Organizer
                  </span>
                </div>
              ))}
              {demo ? (
                <p className="text-sm muted leading-relaxed mt-5">
                  These sample organizers have already left reviews. Use your
                  own reviewer account to add another perspective. Team access
                  changes are available in the live portal.
                </p>
              ) : (
                <form onSubmit={add} className="max-w-lg mt-6">
                  <Label htmlFor="team-account">
                    Add organizer by account ID
                  </Label>
                  <p className="text-sm muted leading-relaxed mt-2 mb-4">
                    They must sign in once using Organizer sign-in, without
                    creating an applicant account. Ask them to share the account
                    ID shown there.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      id="team-account"
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      required
                      placeholder="user_…"
                    />
                    <Button disabled={busy}>Grant access</Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </section>
      ) : (
        <>
          <div className="stat-grid">
            {[
              {
                label: "All applications",
                value: stats?.total,
                icon: Layers3,
                note: "Hacker & mentor accounts",
              },
              {
                label: "Awaiting a decision",
                value: stats?.pending,
                icon: Clock3,
                note: "Submitted or in review",
              },
              {
                label: "Accepted",
                value: stats?.accepted,
                icon: CheckCircle2,
                note: "Ready for what’s next",
              },
              {
                label: "Need a second look",
                value: stats?.secondLook,
                icon: ScanEye,
                note: "Reviewer scores differ by 4+",
              },
            ].map((s, i) => (
              <div
                className={"panel stat " + (i === 3 ? "stat-highlight" : "")}
                key={s.label}
              >
                <div className="stat-label">
                  {s.label}
                  <s.icon size={16} />
                </div>
                <div className="stat-value">{s.value ?? "—"}</div>
                <div className="stat-note">{s.note}</div>
              </div>
            ))}
          </div>
          {view === "second" ? (
            <div className="second-callout">
              <ScanEye className="text-primary shrink-0" size={24} />
              <div>
                <h3>Disagreement is a reason to pause.</h3>
                <p>
                  This queue includes pending applications with at least two
                  reviews and a spread of 4 or more points out of 15. Read the
                  reasoning, add a perspective, then make a human decision.
                </p>
              </div>
            </div>
          ) : (
            !!stats?.secondLook && (
              <div className="second-callout">
                <ScanEye className="text-primary shrink-0" size={23} />
                <div className="flex-1">
                  <h3>
                    {stats.secondLook} applications could use another
                    perspective.
                  </h3>
                  <p>
                    Reviewer scores differ. Take a closer look before deciding.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  className="text-primary"
                  onClick={() => navigate("second")}
                >
                  View queue
                  <ArrowUpRight />
                </Button>
              </div>
            )
          )}
          <section className="panel">
            <div className="panel-title">
              <h2>
                {view === "second" ? "Second-look queue" : "Applications"}{" "}
                <span className="text-sm font-normal muted ml-2">
                  {data?.total ?? 0}
                </span>
              </h2>
              <span className="text-xs muted hidden sm:block">
                Every application, in one place
              </span>
            </div>
            <div className="filterbar">
              <div className="searchbox">
                <Search />
                <Input
                  aria-label="Search applicants"
                  placeholder="Search name, email, or application ID…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="h-10 bg-white"
                />
              </div>
              <Select
                value={type}
                onValueChange={(v) => {
                  setType(v);
                  setPage(1);
                }}
              >
                <SelectTrigger
                  className="h-10 bg-white min-w-34"
                  aria-label="Filter account type"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="hacker">Hackers</SelectItem>
                  <SelectItem value="mentor">Mentors</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={status}
                onValueChange={(v) => {
                  setStatus(v);
                  setPage(1);
                }}
              >
                <SelectTrigger
                  className="h-10 bg-white min-w-36"
                  aria-label="Filter status"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {Object.entries(STATUSES).map(([id, label]) => (
                    <SelectItem key={id} value={id}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {loading && !data ? (
              <div className="p-6">
                <Loading />
              </div>
            ) : (
              <div
                aria-busy={loading}
                className={loading ? "opacity-60 transition-opacity" : ""}
              >
                <Table className="app-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Applicant</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Avg. score</TableHead>
                      <TableHead>Reviews</TableHead>
                      <TableHead>Received</TableHead>
                      <TableHead>
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.applications.map((a) => (
                      <TableRow key={a.id} className="hover:bg-[#f7faf7]">
                        <TableCell>
                          <div className="table-name">
                            <div className="avatar">
                              {a.name
                                .split(" ")
                                .slice(0, 2)
                                .map((v) => v[0])
                                .join("")}
                            </div>
                            <div>
                              <strong>{a.name}</strong>
                              <p>{a.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{a.type}</TableCell>
                        <TableCell>
                          <StatusBadge status={a.status} />
                        </TableCell>
                        <TableCell>
                          {a.average_score === null ? (
                            <span className="muted">—</span>
                          ) : (
                            <>
                              <span className="font-medium">
                                {a.average_score.toFixed(1)}
                                <span className="muted font-normal text-xs">
                                  {" "}
                                  / 15
                                </span>
                              </span>
                              <div className="score-bar">
                                <span
                                  style={{
                                    width: (a.average_score / 15) * 100 + "%",
                                  }}
                                />
                              </div>
                            </>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {a.review_count}
                            <span>
                              {a.needs_second_look && (
                                <ScanEye
                                  size={16}
                                  className="text-[#927128]"
                                  aria-label="Needs a second look"
                                />
                              )}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="muted whitespace-nowrap">
                          {formatDate(a.submitted_at ?? a.created_at)}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={"Review " + a.name}
                            onClick={() => setId(a.id)}
                          >
                            <ArrowUpRight size={16} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {!data?.applications.length && !error && (
                  <Blank
                    title={
                      view === "second"
                        ? "No applications need a second look."
                        : "No applications found."
                    }
                    description={
                      query || type !== "all" || status !== "all"
                        ? "Try changing your search or filters."
                        : "Applications will appear here as applicants create their accounts."
                    }
                  />
                )}
              </div>
            )}
            <div className="border-t border-border px-6 py-4 flex justify-between items-center gap-4">
              <p className="text-xs muted">
                {data?.total ? Math.min((page - 1) * 12 + 1, data.total) : 0}–
                {Math.min(page * 12, data?.total ?? 0)} of {data?.total ?? 0}{" "}
                applications
              </p>
              <Pagination className="mx-0 w-auto">
                <PaginationContent>
                  <PaginationItem>
                    <Button
                      aria-label="Previous page"
                      size="icon"
                      variant="outline"
                      disabled={page <= 1 || loading}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ArrowLeft />
                    </Button>
                  </PaginationItem>
                  <PaginationItem>
                    <span className="text-sm px-3">{page}</span>
                  </PaginationItem>
                  <PaginationItem>
                    <Button
                      aria-label="Next page"
                      size="icon"
                      variant="outline"
                      disabled={page * 12 >= (data?.total ?? 0) || loading}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ArrowRight />
                    </Button>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </section>
          <p className="mt-5 text-xs muted flex items-center gap-2">
            <ShieldCheck size={14} />
            Reviews stay private. Applicants see their status and your decision
            note.
          </p>
        </>
      )}
      <ReviewPanel
        id={id}
        base={base}
        onClose={() => setId(null)}
        onSaved={() => setRevision((v) => v + 1)}
      />
    </Shell>
  );
}
