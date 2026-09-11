export type ApplicantType = "hacker" | "mentor";
export type Status =
  | "draft"
  | "submitted"
  | "in_review"
  | "accepted"
  | "waitlisted"
  | "rejected";
export type Profile = {
  id: string;
  name: string;
  email: string;
  role: ApplicantType | "organizer" | "unassigned";
};
export type Answers = {
  school: string;
  field: string;
  experience: string;
  skills: string[];
  motivation: string;
  contribution: string;
  portfolio: string;
  availability: string;
  consent: boolean;
};
export type Application = {
  id: string;
  owner_id: string;
  type: ApplicantType;
  status: Status;
  answers: Answers;
  version: number;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  decision_at: string | null;
  decision_note: string;
  name: string;
  email: string;
  review_count: number;
  average_score: number | null;
  score_spread: number;
  needs_second_look: boolean;
};
export type Review = {
  id: string;
  reviewer_id: string;
  reviewer_name: string;
  curiosity: number;
  craft: number;
  collaboration: number;
  total: number;
  notes: string;
  updated_at: string;
};
export type HistoryEvent = {
  id: string;
  kind: string;
  message: string;
  created_at: string;
};
export type ApplicationDetail = {
  application: Application;
  reviews: Review[];
  events: HistoryEvent[];
  reviewerId: string;
};
export const STATUSES: Record<Status, string> = {
  draft: "Draft",
  submitted: "Submitted",
  in_review: "In review",
  accepted: "Accepted",
  waitlisted: "Waitlisted",
  rejected: "Not selected",
};
export const SKILLS = [
  "Web development",
  "Machine learning",
  "Design",
  "Robotics",
  "Mobile",
  "Data",
  "Hardware",
  "Product",
];
export const BLANK_ANSWERS: Answers = {
  school: "",
  field: "",
  experience: "",
  skills: [],
  motivation: "",
  contribution: "",
  portfolio: "",
  availability: "",
  consent: false,
};
export const RUBRIC = [
  {
    key: "curiosity",
    title: "Curiosity & purpose",
    description:
      "Specific motivation, willingness to learn, and thoughtful ideas.",
  },
  {
    key: "craft",
    title: "Initiative & craft",
    description:
      "Evidence of trying, making, or teaching. Judge initiative in context.",
  },
  {
    key: "collaboration",
    title: "Community contribution",
    description:
      "How they support others and contribute to a collaborative event.",
  },
] as const;
export function readiness(answers: Answers, type: ApplicantType): number {
  const checks = [
    answers.school.trim(),
    answers.field.trim(),
    answers.experience,
    answers.skills.length,
    answers.motivation.trim().length >= 40,
    answers.contribution.trim().length >= 40,
    answers.consent,
    type === "hacker" || answers.availability,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
