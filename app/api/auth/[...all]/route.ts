import { env } from "cloudflare:workers";
import { database } from "@/db";
import { authConfigured, createAuth } from "@/lib/auth";
export const dynamic = "force-dynamic";
async function handler(request: Request) {
  if (!authConfigured(env))
    return Response.json(
      { message: "Sign-in is being configured. Please try again later." },
      { status: 503 },
    );
  return createAuth(database(), env).handler(request);
}
export { handler as GET, handler as POST };
