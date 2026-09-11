import { z } from "zod";
import { SKILLS } from "./types";
export const applicantTypeSchema = z.enum(["hacker", "mentor"]);
export const answersSchema = z.object({
  school: z.string().trim().max(150),
  field: z.string().trim().max(120),
  experience: z.string().max(60),
  skills: z.array(z.string().refine((v) => SKILLS.includes(v))).max(8),
  motivation: z.string().trim().max(1800),
  contribution: z.string().trim().max(1800),
  portfolio: z
    .string()
    .trim()
    .max(500)
    .refine(
      (v) => !v || /^https:\/\/[^\s]+$/i.test(v),
      "Use a full https:// link.",
    ),
  availability: z.string().max(80),
  consent: z.boolean(),
});
export const applicationInput = z.object({
  answers: answersSchema,
  version: z.number().int().min(0),
});
export function validateSubmission(
  answers: z.infer<typeof answersSchema>,
  type: "hacker" | "mentor",
) {
  const issues: string[] = [];
  if (!answers.school)
    issues.push(
      type === "hacker" ? "Add your school." : "Add your organization.",
    );
  if (!answers.field)
    issues.push(
      type === "hacker"
        ? "Add your field of study."
        : "Add your professional role.",
    );
  const options =
    type === "hacker"
      ? ["First hackathon", "1–3 hackathons", "4+ hackathons"]
      : ["Less than 1 year", "1–3 years", "4+ years"];
  if (!options.includes(answers.experience))
    issues.push("Choose your experience level.");
  if (!answers.skills.length)
    issues.push("Choose at least one interest or skill.");
  if (answers.motivation.length < 40)
    issues.push("Write at least 40 characters about your motivation.");
  if (answers.contribution.length < 40)
    issues.push("Write at least 40 characters about your contribution.");
  if (
    type === "mentor" &&
    !["2–4 hours", "4–8 hours", "Full weekend"].includes(answers.availability)
  )
    issues.push("Choose your mentoring availability.");
  if (!answers.consent) issues.push("Confirm that your answers are accurate.");
  return issues;
}
export const reviewInput = z.object({
  curiosity: z.number().int().min(1).max(5),
  craft: z.number().int().min(1).max(5),
  collaboration: z.number().int().min(1).max(5),
  notes: z
    .string()
    .trim()
    .min(15, "Add at least 15 characters of reasoning.")
    .max(2000),
  expectedUpdatedAt: z.string().nullable(),
});
export const decisionInput = z.object({
  status: z.enum(["accepted", "waitlisted", "rejected"]),
  note: z.string().trim().min(10).max(1000),
  version: z.number().int().min(0),
});
