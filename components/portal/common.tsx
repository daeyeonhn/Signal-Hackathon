"use client";
import {
  Radio,
  LogOut,
  FileText,
  Layers3,
  ScanEye,
  Users,
  ArrowLeftRight,
  FlaskConical,
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { STATUSES, type Status, type Profile } from "@/lib/types";
export function Brand() {
  return (
    <span className="brand">
      <span className="brand-icon">
        <Radio size={23} />
      </span>
      signal<span className="text-[#c2f477]">.</span>
    </span>
  );
}
export function StatusBadge({ status }: { status: Status }) {
  return <span className={"status status-" + status}>{STATUSES[status]}</span>;
}
export function ErrorBox({ message }: { message: string }) {
  return message ? (
    <div className="error-box" role="alert">
      {message}
    </div>
  ) : null;
}
export function Loading() {
  return (
    <div className="space-y-5" aria-label="Loading">
      <Skeleton className="h-12 w-60" />
      <Skeleton className="h-36 w-full" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}
export function Blank({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
export function Gate({
  message,
  href = "/sign-in?next=%2Fapplicant",
}: {
  message: string;
  href?: string;
}) {
  return (
    <main id="main-content" className="panel auth-required">
      <Radio className="mx-auto mb-5 text-primary" size={35} />
      <h1 className="text-2xl font-semibold">
        Let’s get you to the right place.
      </h1>
      <p>{message}</p>
      <Button asChild>
        <a href={href} target="_top">
          Continue
        </a>
      </Button>
      <a href="/" className="block mt-5 text-sm underline">
        Back to welcome
      </a>
    </main>
  );
}
export function Shell({
  children,
  demo,
  mode,
  profile,
  view,
  onView,
}: {
  children: React.ReactNode;
  demo: boolean;
  mode: "applicant" | "organizer";
  profile?: Profile;
  view?: string;
  onView?: (v: string) => void;
}) {
  const base = demo ? "/demo" : "";
  const initials = (profile?.name || "Your account")
    .split(" ")
    .slice(0, 2)
    .map((x) => x[0])
    .join("");
  const items =
    mode === "organizer"
      ? [
          { id: "all", label: "Applications", icon: Layers3 },
          { id: "second", label: "Second look", icon: ScanEye },
          { id: "team", label: "Review team", icon: Users },
        ]
      : [{ id: "application", label: "My application", icon: FileText }];
  return (
    <SidebarProvider
      style={{ "--sidebar-width": "238px" } as React.CSSProperties}
    >
      <Sidebar className="border-r-0">
        <SidebarHeader className="px-6 pt-8 pb-7">
          <a href="/" aria-label="Signal home">
            <Brand />
          </a>
          <div className="mt-7 rounded-lg border border-sidebar-border p-3">
            <div className="text-sm font-semibold text-white">
              Signal Hackathon
            </div>
            <div className="text-xs mt-1 text-[#9fb4a7]">
              Fall 2026 · Application portal
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="px-4">
            <SidebarGroupLabel className="eyebrow text-[#96ad9d]">
              {mode === "organizer" ? "Workspace" : "Applicant portal"}
            </SidebarGroupLabel>
            <SidebarMenu className="mt-2">
              {items.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    className="h-11 px-3 text-sm"
                    isActive={(view ?? "application") === item.id}
                    onClick={() => onView?.(item.id)}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                    {item.id === "second" && (
                      <span className="ml-auto text-[11px] text-[#c2f477]">
                        NEW
                      </span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-5">
          <div className="border-t border-sidebar-border pt-5">
            <p className="text-sm text-[#9fb4a7] leading-relaxed mb-5">
              A little curiosity.
              <br />A lot of possibility.
            </p>
            {demo ? (
              <a
                className="flex gap-2 items-center text-sm text-[#d1e1d7] mb-5"
                href={
                  base + (mode === "organizer" ? "/applicant" : "/organizer")
                }
              >
                <ArrowLeftRight size={15} />
                Switch to {mode === "organizer" ? "applicant" : "organizer"}
              </a>
            ) : (
              <a
                className="flex gap-2 text-sm mb-5"
                href="/sign-out"
                target="_top"
              >
                <LogOut size={15} />
                Sign out
              </a>
            )}
            <div className="flex gap-3 items-center">
              <div className="avatar bg-[#2a4c37] text-[#c2f477]">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm text-white truncate">
                  {profile?.name || "Your workspace"}
                </p>
                <p className="text-xs mt-1 text-[#9fb4a7] capitalize">{mode}</p>
              </div>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0 bg-background">
        <header className="workspace-top">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="md:hidden" />
            <span className="text-sm muted">
              Signal Hackathon <span className="px-2 text-[#bdc9c1]">/</span>
              <span className="text-foreground">
                {mode === "organizer" ? "Organizer" : "Applicant"}
              </span>
            </span>
          </div>
          <span className="eyebrow hidden sm:block text-muted-foreground">
            FALL 2026
          </span>
        </header>
        {demo && (
          <div className="demo-banner">
            <span className="flex items-center gap-2">
              <FlaskConical size={16} />
              Demo workspace · Sample data, saved for 3 days
            </span>
            <a
              href={base + (mode === "organizer" ? "/applicant" : "/organizer")}
            >
              Try the {mode === "organizer" ? "applicant" : "organizer"} view
            </a>
          </div>
        )}
        <main id="main-content" className="workspace-main">
          {children}
        </main>
        <footer className="px-6 pb-6 text-xs text-muted-foreground">
          Signal Hackathon · Fall 2026
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
