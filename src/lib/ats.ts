/**
 * A deterministic ATS (applicant tracking system) score for a resume.
 *
 * This does not call the model. An ATS check is a set of mechanical rules —
 * are the sections present, is there enough substance, are bullet points action
 * verbs and numbers rather than prose — and rules are cheaper, faster, and more
 * honest to run in code than to ask an LLM to guess at. The AI resume assistant
 * (Chapter 8/9) is the thing that *rewrites*; this is the thing that *measures*.
 *
 * The score is out of 100, with the findings that produced it, so the number is
 * never mysterious.
 */

type ResumeInput = {
  summary?: string;
  skills?: string[];
  experience?: { role?: string; company?: string; bullets?: string[] }[];
  projects?: unknown[];
  education?: unknown[];
  personal?: { fullName?: string; email?: string; headline?: string };
};

const ACTION_VERBS = [
  "built", "led", "shipped", "designed", "created", "improved", "reduced",
  "increased", "launched", "automated", "migrated", "implemented", "developed",
  "architected", "optimised", "optimized", "delivered", "owned", "scaled",
];

export type AtsResult = { score: number; findings: string[]; strengths: string[] };

export function scoreResume(resume: ResumeInput): AtsResult {
  const findings: string[] = [];
  const strengths: string[] = [];
  let score = 0;

  // Contact (15) — an ATS that cannot find your name or email drops you.
  if (resume.personal?.fullName?.trim()) score += 5;
  else findings.push("Add your full name.");
  if (resume.personal?.email?.trim()) score += 5;
  else findings.push("Add a contact email.");
  if (resume.personal?.headline?.trim()) { score += 5; strengths.push("Clear headline"); }
  else findings.push("A one-line headline helps a recruiter place you in three seconds.");

  // Summary (15).
  const summary = resume.summary?.trim() ?? "";
  if (summary.length >= 120) { score += 15; strengths.push("Substantial summary"); }
  else if (summary.length > 0) { score += 8; findings.push("Your summary is short — aim for two or three sentences."); }
  else findings.push("Add a professional summary.");

  // Skills (20) — the section ATS keyword-matches hardest.
  const skills = resume.skills ?? [];
  if (skills.length >= 8) { score += 20; strengths.push(`${skills.length} skills listed`); }
  else if (skills.length >= 4) { score += 12; findings.push("List a few more skills — 8 or more matches most job descriptions."); }
  else if (skills.length > 0) { score += 6; findings.push("Very few skills listed; ATS keyword-matching will miss you."); }
  else findings.push("Add a skills section — this is what ATS keyword-matches against.");

  // Experience (25), rewarding quantified action-verb bullets.
  const experience = resume.experience ?? [];
  if (experience.length > 0) {
    score += 8;
    const allBullets = experience.flatMap((e) => e.bullets ?? []).filter((b) => b.trim());
    if (allBullets.length >= 3) score += 6;
    const actionBullets = allBullets.filter((b) => ACTION_VERBS.some((v) => b.toLowerCase().trimStart().startsWith(v)));
    const quantified = allBullets.filter((b) => /\d/.test(b));
    if (actionBullets.length >= Math.max(1, allBullets.length / 2)) { score += 6; strengths.push("Bullets start with action verbs"); }
    else findings.push("Start bullet points with action verbs — 'Built', 'Reduced', 'Led'.");
    if (quantified.length >= 1) { score += 5; strengths.push("Quantified impact"); }
    else findings.push("Quantify at least one bullet — a number is worth a paragraph.");
  } else {
    findings.push("Add work experience, or projects if you are early-career.");
  }

  // Projects & education (25) — projects carry early-career resumes.
  const projects = resume.projects ?? [];
  if (projects.length >= 2) { score += 15; strengths.push(`${projects.length} projects shown`); }
  else if (projects.length === 1) { score += 8; findings.push("Add a second project — one can look like a fluke."); }
  else findings.push("Link at least one project. This is where DeveloperOS has an edge — your projects are already here.");

  if ((resume.education ?? []).length > 0) score += 10;
  else findings.push("Add education, a bootcamp, or a certification.");

  return { score: Math.min(100, score), findings, strengths };
}
