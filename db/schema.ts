import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/sqlite-core";

// A visitor's demo and the live portal always use separate workspaces.
export const workspaces = sqliteTable(
  "workspaces",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    expiresAt: integer("expires_at"),
  },
  (t) => [check("workspace_kind", sql`${t.kind} IN ('live','demo')`)],
);
export const profiles = sqliteTable(
  "profiles",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    role: text("role").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("profiles_workspace_identity").on(t.workspaceId, t.externalId),
    check(
      "profile_role",
      sql`${t.role} IN ('unassigned','hacker','mentor','organizer')`,
    ),
  ],
);
export const applications = sqliteTable(
  "applications",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    ownerId: text("owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    status: text("status").notNull().default("draft"),
    answersJson: text("answers_json").notNull(),
    version: integer("version").notNull().default(0),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    submittedAt: text("submitted_at"),
    decisionAt: text("decision_at"),
    decisionNote: text("decision_note").notNull().default(""),
  },
  (t) => [
    uniqueIndex("applications_owner").on(t.ownerId),
    index("applications_workspace_status").on(
      t.workspaceId,
      t.status,
      t.createdAt,
    ),
    check("application_type", sql`${t.type} IN ('hacker','mentor')`),
    check(
      "application_status",
      sql`${t.status} IN ('draft','submitted','in_review','accepted','waitlisted','rejected')`,
    ),
  ],
);
export const reviews = sqliteTable(
  "reviews",
  {
    id: text("id").primaryKey(),
    applicationId: text("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    reviewerId: text("reviewer_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    curiosity: integer("curiosity").notNull(),
    craft: integer("craft").notNull(),
    collaboration: integer("collaboration").notNull(),
    notes: text("notes").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("reviews_application_reviewer").on(
      t.applicationId,
      t.reviewerId,
    ),
    check("curiosity_range", sql`${t.curiosity} BETWEEN 1 AND 5`),
    check("craft_range", sql`${t.craft} BETWEEN 1 AND 5`),
    check("collaboration_range", sql`${t.collaboration} BETWEEN 1 AND 5`),
  ],
);
export const events = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),
    applicationId: text("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    message: text("message").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("events_application").on(t.applicationId, t.createdAt)],
);
export const demoSessions = sqliteTable("demo_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at").notNull(),
});
export const rateLimits = sqliteTable("rate_limits", {
  id: text("id").primaryKey(),
  count: integer("count").notNull(),
  expiresAt: integer("expires_at").notNull(),
});
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
