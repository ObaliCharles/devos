"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "../db";
import { scoreResume } from "../ats";
import {
  APPLICATION_STATUSES,
  Certificate,
  Client,
  IncomeEntry,
  Interview,
  JobApplication,
  Portfolio,
  Resume,
} from "../models";
import { requireUser } from "../user";
import { generateVerifyCode } from "../certificates";

/* ---------------------------------------------------------------- resumes */

export async function createResume(input: { title?: string }) {
  await connectDB();
  const user = await requireUser();
  const count = await Resume.countDocuments({ user: user._id });
  const resume = await Resume.create({
    user: user._id,
    title: input.title?.trim() || "My resume",
    isDefault: count === 0,
    personal: { fullName: user.name, email: user.email },
  });
  revalidatePath("/career/resume");
  return { id: String(resume._id) };
}

/**
 * The resume editor saves the whole document at once, it is one form, and a
 * per-field action would be a dozen round trips. The ATS score is recomputed
 * on every save so it never drifts from what is written.
 */
export async function saveResume(id: string, data: Record<string, unknown>) {
  await connectDB();
  const user = await requireUser();

  const resume = await Resume.findOne({ _id: id, user: user._id });
  if (!resume) return;

  // Whitelist the shape; never trust the client's object wholesale.
  if (typeof data.title === "string") resume.title = data.title;
  if (typeof data.template === "string") resume.template = data.template;
  if (typeof data.summary === "string") resume.summary = data.summary;
  if (data.personal && typeof data.personal === "object") resume.personal = data.personal;
  if (Array.isArray(data.skills)) resume.skills = data.skills as string[];
  if (Array.isArray(data.experience)) resume.experience = data.experience;
  if (Array.isArray(data.education)) resume.education = data.education;
  if (Array.isArray(data.projects)) resume.projects = data.projects;
  if (Array.isArray(data.achievements)) resume.achievements = data.achievements as string[];
  if (Array.isArray(data.languages)) resume.languages = data.languages as string[];

  const ats = scoreResume({
    summary: resume.summary,
    skills: resume.skills,
    experience: resume.experience,
    projects: resume.projects,
    education: resume.education,
    personal: resume.personal,
  });
  resume.atsScore = ats.score;
  resume.atsFindings = [...ats.findings, ...ats.strengths.map((s) => `✓ ${s}`)];
  resume.atsCheckedAt = new Date();

  await resume.save();
  revalidatePath(`/career/resume/${id}`);
  revalidatePath("/career");
  return { atsScore: ats.score, findings: ats.findings, strengths: ats.strengths };
}

export async function deleteResume(id: string) {
  await connectDB();
  const user = await requireUser();
  await Resume.deleteOne({ _id: id, user: user._id });
  revalidatePath("/career/resume");
}

/* -------------------------------------------------------------- portfolio */

export async function savePortfolio(data: Record<string, unknown>) {
  await connectDB();
  const user = await requireUser();

  const patch: Record<string, unknown> = {};
  for (const key of ["headline", "bio", "photoUrl", "location", "theme", "handle"] as const) {
    if (typeof data[key] === "string") patch[key] = data[key];
  }
  if (typeof data.published === "boolean") patch.published = data.published;
  if (typeof data.availableForWork === "boolean") patch.availableForWork = data.availableForWork;
  if (data.socials && typeof data.socials === "object") patch.socials = data.socials;
  if (data.sections && typeof data.sections === "object") patch.sections = data.sections;
  if (Array.isArray(data.featuredProjects)) patch.featuredProjects = data.featuredProjects;

  await Portfolio.updateOne({ user: user._id }, { $set: patch }, { upsert: true });
  revalidatePath("/career/portfolio");
}

/* ------------------------------------------------------------ applications */

export async function createApplication(input: {
  company: string;
  position: string;
  status?: string;
  jobUrl?: string;
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  notes?: string;
}) {
  await connectDB();
  const user = await requireUser();
  if (!input.company?.trim() || !input.position?.trim()) return { ok: false as const };

  const status = (APPLICATION_STATUSES as readonly string[]).includes(input.status ?? "") ? input.status! : "wishlist";
  const app = await JobApplication.create({
    user: user._id,
    company: input.company.trim(),
    position: input.position.trim(),
    status,
    jobUrl: input.jobUrl?.trim(),
    location: input.location?.trim(),
    salaryMin: input.salaryMin,
    salaryMax: input.salaryMax,
    notes: input.notes?.trim(),
    appliedAt: status === "applied" ? new Date() : undefined,
    timeline: [{ at: new Date(), status, note: "Added" }],
  });
  revalidatePath("/career/applications");
  return { ok: true as const, id: String(app._id) };
}

export async function moveApplication(id: string, status: string) {
  await connectDB();
  const user = await requireUser();
  if (!(APPLICATION_STATUSES as readonly string[]).includes(status)) return;

  const app = await JobApplication.findOne({ _id: id, user: user._id });
  if (!app) return;
  app.status = status;
  if (status === "applied" && !app.appliedAt) app.appliedAt = new Date();
  app.timeline.push({ at: new Date(), status, note: "" });
  await app.save();
  revalidatePath("/career/applications");
}

export async function deleteApplication(id: string) {
  await connectDB();
  const user = await requireUser();
  await JobApplication.deleteOne({ _id: id, user: user._id });
  revalidatePath("/career/applications");
}

/* -------------------------------------------------------------- interviews */

export async function createInterview(input: {
  company: string;
  kind?: string;
  scheduledAt?: string;
  applicationId?: string;
  notes?: string;
}) {
  await connectDB();
  const user = await requireUser();
  if (!input.company?.trim()) return;
  await Interview.create({
    user: user._id,
    company: input.company.trim(),
    kind: input.kind ?? "technical",
    scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
    application: input.applicationId || undefined,
    notes: input.notes?.trim(),
  });
  revalidatePath("/career/interviews");
}

export async function updateInterview(id: string, data: { outcome?: string; feedback?: string; questions?: string[]; notes?: string; score?: number }) {
  await connectDB();
  const user = await requireUser();
  const patch: Record<string, unknown> = {};
  if (typeof data.outcome === "string") patch.outcome = data.outcome;
  if (typeof data.feedback === "string") patch.feedback = data.feedback;
  if (typeof data.notes === "string") patch.notes = data.notes;
  if (typeof data.score === "number") patch.score = data.score;
  if (Array.isArray(data.questions)) patch.questions = data.questions;
  await Interview.updateOne({ _id: id, user: user._id }, { $set: patch });
  revalidatePath("/career/interviews");
}

export async function deleteInterview(id: string) {
  await connectDB();
  const user = await requireUser();
  await Interview.deleteOne({ _id: id, user: user._id });
  revalidatePath("/career/interviews");
}

/* ------------------------------------------------------------ certificates */

/**
 * Records a certificate the user earned somewhere else. No verify code: we did
 * not issue it, so we cannot vouch for it, and minting a DeveloperOS code for
 * an AWS certification would be forging a credential.
 */
export async function createCertificate(input: {
  name: string;
  provider?: string;
  issuedAt?: string;
  credentialUrl?: string;
  imageUrl?: string;
}) {
  await connectDB();
  const user = await requireUser();
  if (!input.name?.trim()) return;
  await Certificate.create({
    user: user._id,
    name: input.name.trim(),
    provider: input.provider?.trim(),
    issuedAt: input.issuedAt ? new Date(input.issuedAt) : undefined,
    credentialUrl: input.credentialUrl?.trim(),
    imageUrl: input.imageUrl?.trim(),
    issuedBy: "external",
  });
  revalidatePath("/career/certificates");
}

/**
 * Issues a DeveloperOS certificate for a completed course. This is the only
 * path that mints a verify code, because it is the only one where we are the
 * issuer and can actually stand behind the claim.
 *
 * Idempotent by course: finishing the same course twice does not produce two
 * certificates with two different codes, which would make both look forged.
 * The unique index on verifyCode is the real guard — the retry loop below only
 * handles the astronomically unlikely collision so that a duplicate key error
 * never surfaces to the learner as "something went wrong".
 */
export async function issueCourseCertificate(courseSlug: string, courseTitle: string) {
  await connectDB();
  const user = await requireUser();

  const existing = await Certificate.findOne({
    user: user._id,
    courseSlug,
    issuedBy: "developeros",
  }).lean<{ verifyCode?: string } | null>();
  if (existing) return { ok: true as const, code: existing.verifyCode };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const code = generateVerifyCode();
      await Certificate.create({
        user: user._id,
        name: courseTitle,
        provider: "DeveloperOS",
        issuedAt: new Date(),
        issuedBy: "developeros",
        courseSlug,
        verifyCode: code,
        recipientName: user.name || "A DeveloperOS learner",
      });
      revalidatePath("/career/certificates");
      return { ok: true as const, code };
    } catch (err) {
      // 11000 is a duplicate key: another code won the race. Anything else is
      // a real failure and should not be retried silently.
      if ((err as { code?: number }).code !== 11000) throw err;
    }
  }
  return { ok: false as const, error: "Could not issue a certificate. Please try again." };
}

export async function deleteCertificate(id: string) {
  await connectDB();
  const user = await requireUser();
  await Certificate.deleteOne({ _id: id, user: user._id });
  revalidatePath("/career/certificates");
}

/* ------------------------------------------------------- freelance & income */

export async function createClient(input: { name: string; company?: string; email?: string; status?: string }) {
  await connectDB();
  const user = await requireUser();
  if (!input.name?.trim()) return;
  await Client.create({
    user: user._id,
    name: input.name.trim(),
    company: input.company?.trim(),
    email: input.email?.trim(),
    status: input.status ?? "lead",
  });
  revalidatePath("/career/freelance");
}

export async function deleteClient(id: string) {
  await connectDB();
  const user = await requireUser();
  await Client.deleteOne({ _id: id, user: user._id });
  revalidatePath("/career/freelance");
}

export async function createIncome(input: { kind?: string; description?: string; amount: number; day: string; clientId?: string }) {
  await connectDB();
  const user = await requireUser();
  if (!input.amount || !input.day) return;
  await IncomeEntry.create({
    user: user._id,
    kind: input.kind ?? "freelance",
    description: input.description?.trim(),
    amountCents: Math.round(input.amount * 100),
    day: input.day,
    client: input.clientId || undefined,
  });
  revalidatePath("/career/freelance");
}

export async function deleteIncome(id: string) {
  await connectDB();
  const user = await requireUser();
  await IncomeEntry.deleteOne({ _id: id, user: user._id });
  revalidatePath("/career/freelance");
}
