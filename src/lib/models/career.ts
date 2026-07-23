import { Schema, model, models } from "mongoose";

/* ===========================================================================
   CAREER (Chapter 9) — learning → building → showcasing → hired.

   Portfolio and Resume both read from Project rather than storing their own
   copy of it. A portfolio that has drifted out of sync with the work it
   describes is worse than no portfolio.
   ======================================================================== */

const ResumeSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, default: "My resume" },
    template: {
      type: String,
      enum: ["professional", "modern", "minimal", "developer", "creative", "corporate"],
      default: "developer",
    },
    personal: {
      fullName: String,
      headline: String,
      email: String,
      phone: String,
      location: String,
      website: String,
      github: String,
      linkedin: String,
    },
    summary: String,
    skills: [String],
    experience: [
      new Schema(
        {
          company: String,
          role: String,
          start: String,
          end: String,
          current: { type: Boolean, default: false },
          location: String,
          bullets: [String],
        },
        { _id: false }
      ),
    ],
    education: [
      new Schema(
        { school: String, qualification: String, start: String, end: String, note: String },
        { _id: false }
      ),
    ],
    /** References into Projects — never a second copy of the project data. */
    projects: [{ type: Schema.Types.ObjectId, ref: "Project" }],
    certificates: [{ type: Schema.Types.ObjectId, ref: "Certificate" }],
    achievements: [String],
    languages: [String],

    /** Last computed by lib/ats.ts, with the findings that produced it. */
    atsScore: Number,
    atsFindings: [String],
    atsCheckedAt: Date,

    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);
ResumeSchema.index({ user: 1, updatedAt: -1 });

const PortfolioSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    published: { type: Boolean, default: false },
    /** Public URL segment. Unique across users once portfolios go public. */
    handle: { type: String, index: true, sparse: true },
    theme: {
      type: String,
      enum: ["minimal", "glass", "dark", "corporate", "creative", "terminal", "saas", "developer"],
      default: "minimal",
    },
    headline: String,
    bio: String,
    photoUrl: String,
    location: String,
    availableForWork: { type: Boolean, default: true },
    socials: {
      github: String,
      linkedin: String,
      x: String,
      website: String,
      email: String,
    },
    /** Which projects to show, in order. Empty means "all public ones". */
    featuredProjects: [{ type: Schema.Types.ObjectId, ref: "Project" }],
    sections: {
      about: { type: Boolean, default: true },
      skills: { type: Boolean, default: true },
      projects: { type: Boolean, default: true },
      experience: { type: Boolean, default: true },
      certificates: { type: Boolean, default: true },
      contact: { type: Boolean, default: true },
    },
    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const APPLICATION_STATUSES = [
  "wishlist",
  "preparing",
  "applied",
  "interview",
  "technical",
  "final",
  "offer",
  "accepted",
  "rejected",
] as const;

const JobApplicationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    company: { type: String, required: true },
    position: { type: String, required: true },
    status: { type: String, enum: APPLICATION_STATUSES, default: "wishlist" },
    source: String,
    jobUrl: String,
    location: String,
    remote: { type: Boolean, default: false },
    salaryMin: Number,
    salaryMax: Number,
    currency: { type: String, default: "USD" },
    appliedAt: Date,
    notes: String,
    contactName: String,
    contactEmail: String,
    resume: { type: Schema.Types.ObjectId, ref: "Resume" },
    /** Append-only history, so the funnel can be reconstructed. */
    timeline: [
      new Schema(
        { at: { type: Date, default: Date.now }, status: String, note: String },
        { _id: false }
      ),
    ],
  },
  { timestamps: true }
);
JobApplicationSchema.index({ user: 1, status: 1, updatedAt: -1 });

const InterviewSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    application: { type: Schema.Types.ObjectId, ref: "JobApplication", index: true },
    company: String,
    kind: {
      type: String,
      enum: ["screen", "technical", "coding", "system_design", "behavioural", "final", "mock"],
      default: "technical",
    },
    scheduledAt: Date,
    durationMinutes: Number,
    interviewer: String,
    questions: [String],
    notes: String,
    mistakes: String,
    feedback: String,
    score: Number,
    outcome: { type: String, enum: ["pending", "passed", "failed", "cancelled"], default: "pending" },
  },
  { timestamps: true }
);
InterviewSchema.index({ user: 1, scheduledAt: 1 });

const CertificateSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true },
    provider: String,
    issuedAt: Date,
    expiresAt: Date,
    credentialId: String,
    credentialUrl: String,
    imageUrl: String,
    skills: [{ type: Schema.Types.ObjectId, ref: "Skill" }],
  },
  { timestamps: true }
);

const ClientSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true },
    company: String,
    email: String,
    phone: String,
    website: String,
    notes: String,
    status: { type: String, enum: ["lead", "active", "paused", "past"], default: "lead" },
  },
  { timestamps: true }
);

const InvoiceSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    client: { type: Schema.Types.ObjectId, ref: "Client", index: true },
    project: { type: Schema.Types.ObjectId, ref: "Project" },
    number: String,
    items: [
      new Schema(
        { description: String, quantity: { type: Number, default: 1 }, rate: { type: Number, default: 0 } },
        { _id: false }
      ),
    ],
    currency: { type: String, default: "USD" },
    /** Stored in minor units to keep money out of floating point. */
    totalCents: { type: Number, default: 0 },
    status: { type: String, enum: ["draft", "sent", "paid", "overdue", "void"], default: "draft" },
    issuedAt: Date,
    dueAt: Date,
    paidAt: Date,
    notes: String,
  },
  { timestamps: true }
);
InvoiceSchema.index({ user: 1, status: 1, dueAt: 1 });

const IncomeEntrySchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    kind: {
      type: String,
      enum: ["salary", "freelance", "consulting", "passive", "other", "expense"],
      default: "freelance",
    },
    description: String,
    amountCents: { type: Number, default: 0 },
    currency: { type: String, default: "USD" },
    /** YYYY-MM-DD so monthly rollups are a prefix match. */
    day: { type: String, required: true },
    client: { type: Schema.Types.ObjectId, ref: "Client" },
    invoice: { type: Schema.Types.ObjectId, ref: "Invoice" },
  },
  { timestamps: true }
);
IncomeEntrySchema.index({ user: 1, day: -1 });

const NetworkContactSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true },
    role: String,
    company: String,
    kind: {
      type: String,
      enum: ["developer", "recruiter", "mentor", "founder", "student", "friend", "other"],
      default: "developer",
    },
    email: String,
    linkedin: String,
    github: String,
    notes: String,
    lastContactedAt: Date,
  },
  { timestamps: true }
);

const CareerGoalSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    horizon: { type: String, enum: ["month", "quarter", "year", "someday"], default: "quarter" },
    targetRole: String,
    targetCompany: String,
    targetSalary: Number,
    currency: { type: String, default: "USD" },
    missingSkills: [String],
    progress: { type: Number, default: 0 },
    dueAt: Date,
    achievedAt: Date,
  },
  { timestamps: true }
);

export const Resume = models.Resume ?? model("Resume", ResumeSchema);
export const Portfolio = models.Portfolio ?? model("Portfolio", PortfolioSchema);
export const JobApplication = models.JobApplication ?? model("JobApplication", JobApplicationSchema);
export const Interview = models.Interview ?? model("Interview", InterviewSchema);
export const Certificate = models.Certificate ?? model("Certificate", CertificateSchema);
export const Client = models.Client ?? model("Client", ClientSchema);
export const Invoice = models.Invoice ?? model("Invoice", InvoiceSchema);
export const IncomeEntry = models.IncomeEntry ?? model("IncomeEntry", IncomeEntrySchema);
export const NetworkContact = models.NetworkContact ?? model("NetworkContact", NetworkContactSchema);
export const CareerGoal = models.CareerGoal ?? model("CareerGoal", CareerGoalSchema);
