"use client";
import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient();

// Only these product destinations can be used after signing in.
export function safeNext(value: string | null | undefined) {
  if (value === "/organizer") return value;
  if (value === "/applicant?type=mentor") return value;
  if (value === "/applicant?type=hacker") return value;
  return "/applicant";
}
