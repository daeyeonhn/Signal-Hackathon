import { env } from "cloudflare:workers";
import { authConfigured, googleConfigured } from "@/lib/auth";
import { SignIn } from "@/components/portal/sign-in";
export const dynamic = "force-dynamic";
export default function Page() {
  return <SignIn ready={authConfigured(env)} google={googleConfigured(env)} />;
}
