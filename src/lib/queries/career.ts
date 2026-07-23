import { connectDB } from "../db";
import {
  Certificate,
  Client,
  IncomeEntry,
  Interview,
  JobApplication,
  Portfolio,
  Project,
  Resume,
} from "../models";

/**
 * Job readiness: one number the whole module points at. It is a weighted read
 * across the things a hiring manager actually looks at — resume quality (from
 * the ATS score), whether a portfolio is published, how many projects are
 * deployed, and certificates. Nothing here is invented; every input is a real
 * count of the user's own work.
 */
export async function getCareerReadiness(userId: unknown) {
  await connectDB();

  const [bestResume, portfolio, projects, deployedProjects, certs, apps] = await Promise.all([
    Resume.findOne({ user: userId }).sort({ atsScore: -1 }).select("atsScore").lean<{ atsScore?: number } | null>(),
    Portfolio.findOne({ user: userId }).select("published featuredProjects").lean<{ published?: boolean } | null>(),
    Project.countDocuments({ user: userId, archived: false }),
    Project.countDocuments({ user: userId, status: { $in: ["deployed", "complete"] } }),
    Certificate.countDocuments({ user: userId }),
    JobApplication.countDocuments({ user: userId }),
  ]);

  const resumeScore = bestResume?.atsScore ?? 0;
  const portfolioScore = portfolio?.published ? 100 : projects > 0 ? 40 : 0;
  const projectScore = Math.min(100, deployedProjects * 34);
  const certScore = Math.min(100, certs * 34);

  // Weights sum to 1. Resume and projects carry the most, as they should.
  const overall = Math.round(
    resumeScore * 0.35 + portfolioScore * 0.25 + projectScore * 0.3 + certScore * 0.1
  );

  const gaps: string[] = [];
  if (resumeScore < 70) gaps.push("Strengthen your resume");
  if (!portfolio?.published) gaps.push("Publish your portfolio");
  if (deployedProjects < 2) gaps.push("Deploy another project");
  if (certs === 0) gaps.push("Add a certificate");

  return {
    overall,
    resumeScore,
    portfolioScore,
    projectScore,
    certScore,
    ready: overall >= 70,
    gaps,
    counts: { projects, deployedProjects, certs, applications: apps },
  };
}

export async function getResumes(userId: unknown) {
  await connectDB();
  const rows = await Resume.find({ user: userId }).sort({ isDefault: -1, updatedAt: -1 }).lean();
  return rows.map((r) => ({
    id: String(r._id),
    title: String(r.title ?? "Resume"),
    template: String(r.template ?? "developer"),
    atsScore: Number(r.atsScore ?? 0),
    isDefault: Boolean(r.isDefault),
    updatedAt: new Date(r.updatedAt as Date).toISOString(),
  }));
}

export async function getResume(userId: unknown, id: string) {
  await connectDB();
  const r = await Resume.findOne({ _id: id, user: userId }).lean();
  if (!r) return null;
  return JSON.parse(JSON.stringify(r));
}

/** The portfolio plus the projects it can show. */
export async function getPortfolioData(userId: unknown) {
  await connectDB();
  const [portfolio, projects] = await Promise.all([
    Portfolio.findOne({ user: userId }).lean(),
    Project.find({ user: userId, archived: false })
      .sort({ pinned: -1, updatedAt: -1 })
      .select("title description status liveUrl repoUrl thumbnailUrl skills visibility")
      .lean(),
  ]);
  return {
    portfolio: portfolio ? JSON.parse(JSON.stringify(portfolio)) : null,
    projects: projects.map((p) => ({
      id: String(p._id),
      title: String(p.title),
      description: p.description as string | undefined,
      status: String(p.status ?? "planning"),
      liveUrl: p.liveUrl as string | undefined,
      repoUrl: p.repoUrl as string | undefined,
      visibility: String(p.visibility ?? "private"),
    })),
  };
}

export async function getApplications(userId: unknown) {
  await connectDB();
  const rows = await JobApplication.find({ user: userId }).sort({ updatedAt: -1 }).lean();
  return rows.map((a) => ({
    id: String(a._id),
    company: String(a.company),
    position: String(a.position),
    status: String(a.status ?? "wishlist"),
    location: a.location as string | undefined,
    jobUrl: a.jobUrl as string | undefined,
    salaryMin: a.salaryMin as number | undefined,
    salaryMax: a.salaryMax as number | undefined,
    notes: a.notes as string | undefined,
    appliedAt: a.appliedAt ? new Date(a.appliedAt as Date).toISOString() : undefined,
  }));
}

export async function getInterviews(userId: unknown) {
  await connectDB();
  const rows = await Interview.find({ user: userId }).sort({ scheduledAt: 1 }).lean();
  return rows.map((i) => ({
    id: String(i._id),
    company: String(i.company ?? ""),
    kind: String(i.kind ?? "technical"),
    scheduledAt: i.scheduledAt ? new Date(i.scheduledAt as Date).toISOString() : undefined,
    outcome: String(i.outcome ?? "pending"),
    notes: i.notes as string | undefined,
    feedback: i.feedback as string | undefined,
    questions: (i.questions ?? []) as string[],
  }));
}

export async function getCertificates(userId: unknown) {
  await connectDB();
  const rows = await Certificate.find({ user: userId }).sort({ issuedAt: -1 }).lean();
  return rows.map((c) => ({
    id: String(c._id),
    name: String(c.name),
    provider: c.provider as string | undefined,
    issuedAt: c.issuedAt ? new Date(c.issuedAt as Date).toISOString() : undefined,
    credentialUrl: c.credentialUrl as string | undefined,
    imageUrl: c.imageUrl as string | undefined,
  }));
}

export async function getFreelance(userId: unknown) {
  await connectDB();
  const [clients, income] = await Promise.all([
    Client.find({ user: userId }).sort({ updatedAt: -1 }).lean(),
    IncomeEntry.find({ user: userId }).sort({ day: -1 }).limit(50).lean(),
  ]);

  const totalCents = income.reduce((n, e) => n + (e.kind === "expense" ? -(e.amountCents ?? 0) : e.amountCents ?? 0), 0);

  return {
    clients: clients.map((c) => ({
      id: String(c._id),
      name: String(c.name),
      company: c.company as string | undefined,
      email: c.email as string | undefined,
      status: String(c.status ?? "lead"),
    })),
    income: income.map((e) => ({
      id: String(e._id),
      kind: String(e.kind ?? "freelance"),
      description: e.description as string | undefined,
      amount: (e.amountCents ?? 0) / 100,
      day: String(e.day),
    })),
    totalIncome: totalCents / 100,
  };
}
