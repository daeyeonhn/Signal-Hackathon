import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "@/db/auth-schema";

export type AuthConfig = {
  AUTH_SECRET?: string;
  AUTH_BASE_URL?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
};
export function authConfigured(config: AuthConfig) {
  return !!config.AUTH_BASE_URL && (config.AUTH_SECRET?.length ?? 0) >= 32;
}
export function googleConfigured(config: AuthConfig) {
  return !!config.GOOGLE_CLIENT_ID && !!config.GOOGLE_CLIENT_SECRET;
}

// A factory keeps server secrets out of client bundles and supports isolated tests.
export function createAuth(db: D1Database, config: AuthConfig) {
  if (!authConfigured(config))
    throw new Error(
      "Set AUTH_BASE_URL and a strong AUTH_SECRET before enabling sign-in.",
    );
  const origin = new URL(config.AUTH_BASE_URL!).origin;
  return betterAuth({
    appName: "Signal",
    baseURL: origin,
    secret: config.AUTH_SECRET!,
    database: drizzleAdapter(drizzle(db, { schema }), {
      provider: "sqlite",
      schema,
      transaction: false,
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
    },
    // Never merge an unverified password account with another provider by email.
    account: { accountLinking: { enabled: false }, encryptOAuthTokens: true },
    socialProviders: googleConfigured(config)
      ? {
          google: {
            clientId: config.GOOGLE_CLIENT_ID!,
            clientSecret: config.GOOGLE_CLIENT_SECRET!,
            prompt: "select_account",
          },
        }
      : {},
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    trustedOrigins: [origin],
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 60,
      customRules: {
        "/sign-in/email": { window: 60, max: 8 },
        "/sign-up/email": { window: 60, max: 5 },
      },
    },
    advanced: {
      cookiePrefix: "signal",
      useSecureCookies: origin.startsWith("https:"),
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
    },
    telemetry: { enabled: false },
  });
}
