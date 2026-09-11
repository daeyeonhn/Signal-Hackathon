import { env } from "cloudflare:workers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { database } from "@/db";
import { authConfigured, createAuth } from "@/lib/auth";

export async function getIdentity(requestHeaders?: Headers) {
  if (!authConfigured(env)) return null;
  const session = await createAuth(database(), env).api.getSession({
    headers: requestHeaders ?? (await headers()),
  });
  return session?.user ?? null;
}
export async function requireIdentity(next: string) {
  const user = await getIdentity();
  if (!user) redirect("/sign-in?next=" + encodeURIComponent(next));
  return user;
}
