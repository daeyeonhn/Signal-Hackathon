import { type Application } from "@/lib/types";
export function ApplicationAnswers({
  application: a,
}: {
  application: Application;
}) {
  const v = a.answers,
    mentor = a.type === "mentor";
  return (
    <div>
      <div className="grid grid-cols-2 gap-6 py-5 border-b border-border">
        <div>
          <p className="text-xs muted mb-2">
            {mentor ? "ORGANIZATION" : "SCHOOL"}
          </p>
          <p className="text-sm font-medium">{v.school || "—"}</p>
        </div>
        <div>
          <p className="text-xs muted mb-2">
            {mentor ? "ROLE" : "FIELD OF STUDY"}
          </p>
          <p className="text-sm font-medium">{v.field || "—"}</p>
        </div>
        <div>
          <p className="text-xs muted mb-2">EXPERIENCE</p>
          <p className="text-sm font-medium">{v.experience || "—"}</p>
        </div>
        {mentor && (
          <div>
            <p className="text-xs muted mb-2">AVAILABILITY</p>
            <p className="text-sm font-medium">{v.availability || "—"}</p>
          </div>
        )}
      </div>
      <div className="review-answer">
        <h3>{mentor ? "Areas of expertise" : "Interests & skills"}</h3>
        <div className="flex flex-wrap gap-2">
          {v.skills.map((s) => (
            <span className="text-xs px-2 py-1 rounded bg-secondary" key={s}>
              {s}
            </span>
          ))}
        </div>
      </div>
      <div className="review-answer">
        <h3>
          {mentor
            ? "Why do you want to mentor?"
            : "What do you want to explore or build?"}
        </h3>
        <p>{v.motivation || "No answer yet."}</p>
      </div>
      <div className="review-answer">
        <h3>
          {mentor
            ? "Tell us about a time you helped someone learn."
            : "Tell us about something you tried, made, or helped improve."}
        </h3>
        <p>{v.contribution || "No answer yet."}</p>
      </div>
      {v.portfolio && (
        <div className="review-answer">
          <h3>Portfolio or project</h3>
          <a
            href={v.portfolio}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm underline text-primary break-all"
          >
            {v.portfolio}
          </a>
        </div>
      )}
    </div>
  );
}
