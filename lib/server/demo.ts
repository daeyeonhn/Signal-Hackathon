import { BLANK_ANSWERS } from "@/lib/types";
import { json, token, sha256, rateLimit, HttpError } from "./http";

export async function startDemo(request: Request, db: D1Database) {
  const now = Math.floor(Date.now() / 1000),
    cookie = token(),
    workspace = crypto.randomUUID();
  await rateLimit(
    db,
    "demo:" +
      (await sha256(request.headers.get("cf-connecting-ip") ?? "local")),
    10,
    60,
  );
  // Demo records expire together, with foreign keys removing their dependent rows.
  await db.batch([
    db
      .prepare("DELETE FROM workspaces WHERE kind='demo' AND expires_at < ?")
      .bind(now),
    db.prepare("DELETE FROM rate_limits WHERE expires_at < ?").bind(now),
  ]);
  const count = await db
    .prepare("SELECT COUNT(*) n FROM workspaces WHERE kind='demo'")
    .first<{ n: number }>();
  if ((count?.n ?? 0) >= 2000)
    throw new HttpError(503, "The demo is busy. Please try again later.");
  const expires = now + 3 * 86400,
    date = new Date().toISOString();
  const p = (external: string) => workspace + ":" + external;
  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        "INSERT INTO workspaces (id,kind,expires_at) VALUES (?,'demo',?)",
      )
      .bind(workspace, expires),
    db
      .prepare(
        "INSERT INTO demo_sessions (token_hash,workspace_id,expires_at) VALUES (?,?,?)",
      )
      .bind(await sha256(cookie), workspace, expires),
  ];
  const people = [
    ["organizer", "Alex Morgan", "alex@example.com", "organizer"],
    ["reviewer-a", "Sam Rivera", "sam@example.com", "organizer"],
    ["reviewer-b", "Jordan Park", "jordan@example.com", "organizer"],
    ["hacker", "Jamie Chen", "jamie@example.com", "hacker"],
    ["mentor", "Taylor Kim", "taylor@example.com", "mentor"],
    ["a1", "Maya Patel", "maya@example.com", "hacker"],
    ["a2", "Ethan Brooks", "ethan@example.com", "hacker"],
    ["a3", "Sofia Garcia", "sofia@example.com", "mentor"],
    ["a4", "Noah Williams", "noah@example.com", "hacker"],
    ["a5", "Priya Shah", "priya@example.com", "mentor"],
    ["a6", "Oliver Lee", "oliver@example.com", "hacker"],
    ["a7", "Amara Okafor", "amara@example.com", "hacker"],
    ["a8", "Lucas Martin", "lucas@example.com", "mentor"],
  ];
  for (const [external, name, email, role] of people)
    statements.push(
      db
        .prepare(
          "INSERT INTO profiles (id,workspace_id,external_id,name,email,role,created_at) VALUES (?,?,?,?,?,?,?)",
        )
        .bind(p(external), workspace, external, name, email, role, date),
    );
  const samples = [
    {
      who: "hacker",
      status: "draft",
      school: "UC Berkeley",
      skills: ["Robotics", "Web development"],
      scores: [],
    },
    {
      who: "mentor",
      status: "draft",
      school: "Independent developer",
      skills: ["Machine learning", "Data"],
      scores: [],
    },
    {
      who: "a1",
      status: "in_review",
      school: "UC Berkeley",
      skills: ["Robotics", "Hardware"],
      scores: [
        [5, 4, 5],
        [2, 3, 3],
      ],
    },
    {
      who: "a2",
      status: "submitted",
      school: "San José State",
      skills: ["Web development", "Design"],
      scores: [],
    },
    {
      who: "a3",
      status: "accepted",
      school: "Community Lab",
      skills: ["Machine learning", "Data"],
      scores: [[5, 5, 4]],
    },
    {
      who: "a4",
      status: "in_review",
      school: "UC Davis",
      skills: ["Mobile", "Product"],
      scores: [
        [4, 3, 4],
        [4, 4, 4],
      ],
    },
    {
      who: "a5",
      status: "submitted",
      school: "Open Source Collective",
      skills: ["Web development", "Product"],
      scores: [],
    },
    {
      who: "a6",
      status: "waitlisted",
      school: "De Anza College",
      skills: ["Design", "Web development"],
      scores: [[3, 3, 4]],
    },
    {
      who: "a7",
      status: "in_review",
      school: "Stanford University",
      skills: ["Data", "Machine learning"],
      scores: [
        [5, 5, 4],
        [2, 3, 4],
      ],
    },
    {
      who: "a8",
      status: "rejected",
      school: "Independent developer",
      skills: ["Hardware", "Robotics"],
      scores: [[2, 2, 3]],
    },
  ];
  for (let i = 0; i < samples.length; i++) {
    const item = samples[i],
      isMentor = people.find((v) => v[0] === item.who)?.[3] === "mentor";
    const app = crypto.randomUUID(),
      submitted = item.status !== "draft",
      when = new Date(Date.now() - (i + 1) * 3600000).toISOString();
    const final = ["accepted", "waitlisted", "rejected"].includes(item.status);
    const answers = {
      ...BLANK_ANSWERS,
      school: item.school,
      field: isMentor ? "Software engineer" : "Computer Science",
      experience: isMentor ? "1–3 years" : "First hackathon",
      skills: item.skills,
      motivation: isMentor
        ? "I enjoy helping people turn a confusing technical problem into a series of small experiments. I would like to make building feel approachable for first-time hackers."
        : "I want to build something useful with people who approach problems differently. I have been experimenting with a small sensor project and would love to connect it to a thoughtful, accessible interface.",
      contribution: isMentor
        ? "I host informal debugging sessions for newer developers. I ask them to explain their assumptions and help them design a smaller test, so they leave with a method they can use again."
        : "When our team got stuck on an unreliable prototype, I added simple logs and compared a few runs with a teammate. We found the problem together, documented the fix, and shared it so the next team could start further ahead.",
      availability: isMentor ? "4–8 hours" : "",
      consent: submitted,
    };
    const note = final
      ? "Thank you for sharing your work and interests with us. This is a sample decision in your demo workspace."
      : "";
    statements.push(
      db
        .prepare(
          `INSERT INTO applications
      (id,workspace_id,owner_id,type,status,answers_json,version,created_at,updated_at,submitted_at,decision_at,decision_note)
      VALUES (?,?,?,?,?,?,0,?,?,?,?,?)`,
        )
        .bind(
          app,
          workspace,
          p(item.who),
          isMentor ? "mentor" : "hacker",
          item.status,
          JSON.stringify(answers),
          when,
          when,
          submitted ? when : null,
          final ? when : null,
          note,
        ),
    );
    if (submitted)
      statements.push(
        db
          .prepare(
            "INSERT INTO events (id,application_id,kind,message,created_at) VALUES (?,?,'submitted','Application submitted.',?)",
          )
          .bind(crypto.randomUUID(), app, when),
      );
    for (let j = 0; j < item.scores.length; j++) {
      const [a, b, c] = item.scores[j];
      statements.push(
        db
          .prepare(
            "INSERT INTO reviews (id,application_id,reviewer_id,curiosity,craft,collaboration,notes,updated_at) VALUES (?,?,?,?,?,?,?,?)",
          )
          .bind(
            crypto.randomUUID(),
            app,
            p(j === 0 ? "reviewer-a" : "reviewer-b"),
            a,
            b,
            c,
            j === 0
              ? "Strong evidence of initiative and a clear interest in supporting others."
              : "The motivation is promising; I would like more detail about their individual contribution.",
            when,
          ),
      );
    }
    if (final)
      statements.push(
        db
          .prepare(
            "INSERT INTO events (id,application_id,kind,message,created_at) VALUES (?,?,'decision',?,?)",
          )
          .bind(crypto.randomUUID(), app, note, when),
      );
  }
  await db.batch(statements);
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return json({ ok: true }, 201, {
    "Set-Cookie":
      "signal_demo=" +
      cookie +
      "; Path=/; HttpOnly; SameSite=Lax; Max-Age=259200" +
      secure,
  });
}
