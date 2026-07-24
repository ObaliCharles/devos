/**
 * Presentation metadata and AI-builder seed content for the Learn hub.
 *
 * The hub's substance, roadmaps, lessons, activity, achievements, search hits,
 * all comes from the database via `@/lib/queries`. This module only holds two
 * things the database does not:
 *
 *   1. ROADMAP_META, a lookup that gives a real roadmap an icon, tint and a
 *      human-readable difficulty/duration so the cards look considered. Keyed
 *      by title, with a default so an unknown path still renders well.
 *   2. ROLE_PLANS, example curricula the AI builder pre-fills its form and
 *      preview with before it calls the real generator. They are examples, not
 *      the product, the actual path is written and persisted server-side.
 *
 * Everything is plain data (no JSX), so it imports anywhere.
 */

export type Difficulty = "Beginner" | "Beginner friendly" | "Intermediate" | "Advanced";
export type Accent = "primary" | "info" | "success" | "warning" | "danger";

export type RoadmapMeta = {
  icon: string;
  accent: Accent;
  difficulty: Difficulty;
  duration: string;
};

/** Icon + tint + difficulty for the real roadmaps, matched by title. Titles
 *  that aren't listed fall back to `_default`, so nothing ever renders bare. */
export const ROADMAP_META: Record<string, RoadmapMeta> = {
  _default: { icon: "Sparkles", accent: "primary", difficulty: "Beginner friendly", duration: "3–6 months" },

  "Python Fullstack": { icon: "Code2", accent: "info", difficulty: "Beginner friendly", duration: "3 months" },
  "AI Engineering": { icon: "BrainCircuit", accent: "primary", difficulty: "Intermediate", duration: "6 months" },
  "AI Engineer": { icon: "BrainCircuit", accent: "primary", difficulty: "Intermediate", duration: "6 months" },
  "React Native": { icon: "Smartphone", accent: "info", difficulty: "Intermediate", duration: "4 months" },
  "Cloud Engineering": { icon: "Cloud", accent: "info", difficulty: "Intermediate", duration: "5 months" },
  "Cyber Security": { icon: "ShieldCheck", accent: "success", difficulty: "Advanced", duration: "5 months" },
  "Machine Learning": { icon: "LineChart", accent: "warning", difficulty: "Advanced", duration: "6 months" },
  "Backend Engineering": { icon: "Server", accent: "primary", difficulty: "Intermediate", duration: "5 months" },
  "Game Development": { icon: "Gamepad2", accent: "danger", difficulty: "Intermediate", duration: "4 months" },
  "Fullstack Engineer": { icon: "Code2", accent: "info", difficulty: "Intermediate", duration: "5 months" },
  "Data Science": { icon: "LineChart", accent: "warning", difficulty: "Intermediate", duration: "5 months" },
  "DevOps Engineering": { icon: "Cloud", accent: "info", difficulty: "Intermediate", duration: "5 months" },
};

/* --------------------------------------------------------- Discover fallback

   The real Discover search hits /api/search (lessons, projects, notes,
   challenges, snippets the user actually has). For terms a fresh account has no
   data for yet, this curated index keeps the section useful rather than empty,
   pointing at the roadmaps and the pages that create the real thing. Real
   results always take precedence; this only fills gaps. */

export type DiscoverKind = "Course" | "Project" | "Roadmap" | "Certification" | "Assessment";

export type DiscoverItem = {
  title: string;
  kind: DiscoverKind;
  level: string;
  href: string;
  tags: string[];
};

export const DISCOVER_FALLBACK: DiscoverItem[] = [
  // Docker — courses link to real catalog course pages, never back to the list.
  { title: "Docker Fundamentals", kind: "Course", level: "Beginner", href: "/learning/course/docker-fundamentals", tags: ["docker", "containers", "devops"] },
  { title: "Dockerized Web App", kind: "Project", level: "Intermediate", href: "/projects/new", tags: ["docker", "containers"] },
  { title: "Cloud Engineering", kind: "Roadmap", level: "Includes Docker", href: "/dashboard", tags: ["docker", "cloud", "aws"] },
  { title: "Docker Certified Associate", kind: "Certification", level: "Official certification", href: "/career/certificates", tags: ["docker"] },
  { title: "Docker Fundamentals Quiz", kind: "Assessment", level: "Practice quiz", href: "/practice", tags: ["docker"] },

  // Python
  { title: "Python Essentials", kind: "Course", level: "Beginner", href: "/learning/course/python-essentials", tags: ["python", "programming"] },
  { title: "CLI Task Manager", kind: "Project", level: "Beginner", href: "/projects/new", tags: ["python", "cli"] },
  { title: "Python Fullstack", kind: "Roadmap", level: "Beginner friendly", href: "/dashboard", tags: ["python", "web", "fullstack"] },
  { title: "PCEP — Python Entry", kind: "Certification", level: "Official certification", href: "/career/certificates", tags: ["python"] },

  // AI / ML
  { title: "Prompt Engineering", kind: "Course", level: "Beginner", href: "/learning/course/prompt-engineering", tags: ["ai", "llm", "prompts"] },
  { title: "Building with LLMs", kind: "Course", level: "Intermediate", href: "/learning/course/build-with-llms", tags: ["ai", "llm", "rag"] },
  { title: "Machine Learning Foundations", kind: "Course", level: "Intermediate", href: "/learning/course/machine-learning-foundations", tags: ["ml", "ai"] },
  { title: "AI Chat Assistant", kind: "Project", level: "Intermediate", href: "/projects/new", tags: ["ai", "llm", "chatbot"] },
  { title: "AI Engineering", kind: "Roadmap", level: "Intermediate", href: "/dashboard", tags: ["ai", "llm", "engineering"] },

  // Backend / APIs
  { title: "APIs & Databases", kind: "Course", level: "Intermediate", href: "/learning/course/apis-and-databases", tags: ["backend", "api", "sql"] },
  { title: "REST API Service", kind: "Project", level: "Intermediate", href: "/projects/new", tags: ["backend", "api"] },
  { title: "Backend Engineering", kind: "Roadmap", level: "Intermediate", href: "/dashboard", tags: ["backend", "api"] },

  // React / frontend
  { title: "React Essentials", kind: "Course", level: "Beginner", href: "/learning/course/react-essentials", tags: ["react", "frontend", "javascript"] },
  { title: "React Dashboard", kind: "Project", level: "Intermediate", href: "/projects/new", tags: ["react", "mobile", "native"] },
  { title: "React Native", kind: "Roadmap", level: "Intermediate", href: "/dashboard", tags: ["react", "mobile"] },

  // Security
  { title: "Web Security Basics", kind: "Course", level: "Beginner", href: "/learning/course/web-security-basics", tags: ["security", "web", "owasp"] },
  { title: "Harden a Web App", kind: "Project", level: "Intermediate", href: "/projects/new", tags: ["security", "web"] },
  { title: "Cyber Security", kind: "Roadmap", level: "Advanced", href: "/dashboard", tags: ["security", "cyber", "defense"] },
];

/* ------------------------------------------------------- AI curriculum shape

   The builder pre-fills its preview from these example plans while you tweak the
   form. Pressing Generate does not use them, it sends topic/goal/level to the
   real generator, which writes a full phase → skill → lesson → quiz tree and
   makes it your active path. */

export type CurriculumMonth = { title: string; focus: string; project?: string };
export type RolePlan = { role: string; topic: string; outcome: string; months: CurriculumMonth[] };

export const ROLE_PLANS: RolePlan[] = [
  {
    role: "AI Engineer",
    topic: "AI engineering with Python and large language models",
    outcome: "Build and ship a production-ready AI application.",
    months: [
      { title: "Foundations", focus: "Python essentials, Git & GitHub, Linux fundamentals", project: "Build your first CLI application" },
      { title: "Problem Solving", focus: "Algorithms, data structures", project: "Build a Task Manager" },
      { title: "Machine Learning", focus: "NumPy, Pandas, classical ML", project: "Train your first model" },
      { title: "Deep Learning", focus: "Neural networks, CNNs, RNNs", project: "Build an image classifier" },
      { title: "Large Language Models", focus: "Prompt engineering, LLMs, fine-tuning", project: "Build a RAG assistant" },
      { title: "Final Project", focus: "Deployment, evals, monitoring", project: "Build your own AI application" },
    ],
  },
  {
    role: "Backend Developer",
    topic: "backend engineering with APIs, databases and services",
    outcome: "Design and deploy a scalable backend service.",
    months: [
      { title: "Foundations", focus: "A backend language, Git & GitHub, HTTP", project: "Build a JSON API" },
      { title: "Databases", focus: "SQL, schema design, indexing", project: "Model a real domain" },
      { title: "APIs & Auth", focus: "REST, validation, authentication", project: "Build a secured API" },
      { title: "Systems", focus: "Caching, queues, background jobs", project: "Add async processing" },
      { title: "Scale", focus: "Testing, observability, performance", project: "Load-test and harden" },
      { title: "Final Project", focus: "Containers, CI/CD, deployment", project: "Ship a production service" },
    ],
  },
  {
    role: "Machine Learning Engineer",
    topic: "machine learning engineering with Python and PyTorch",
    outcome: "Ship a model that solves a real prediction problem.",
    months: [
      { title: "Maths & Python", focus: "Linear algebra, statistics, NumPy", project: "Explore a dataset" },
      { title: "Classical ML", focus: "Regression, trees, evaluation", project: "Build a predictor" },
      { title: "Deep Learning", focus: "PyTorch, training loops", project: "Train a neural net" },
      { title: "Data & Features", focus: "Pipelines, feature engineering", project: "Build a feature store" },
      { title: "MLOps", focus: "Experiments, versioning, serving", project: "Serve a model as an API" },
      { title: "Final Project", focus: "Monitoring, retraining, drift", project: "Ship an end-to-end ML product" },
    ],
  },
  {
    role: "Startup Founder",
    topic: "building and launching a technical product from scratch",
    outcome: "Take an idea from zero to a launched, technical product.",
    months: [
      { title: "Validate", focus: "Problem discovery, user interviews", project: "Write a one-page spec" },
      { title: "Prototype", focus: "No-code and rapid frontend", project: "Build a clickable prototype" },
      { title: "Build the MVP", focus: "Web app fundamentals, data", project: "Ship a working MVP" },
      { title: "Payments & Auth", focus: "Accounts, billing, security", project: "Add sign-up and payments" },
      { title: "Launch", focus: "Deployment, analytics, feedback", project: "Launch to first users" },
      { title: "Grow", focus: "Iteration, metrics, retention", project: "Ship your growth loop" },
    ],
  },
];

/** Match a free-text goal like "I want to become an AI engineer" to a plan. */
export function planForGoal(goal: string): RolePlan {
  const g = goal.toLowerCase();
  return (
    ROLE_PLANS.find((p) => g.includes(p.role.toLowerCase())) ??
    (g.includes("backend") ? ROLE_PLANS[1] : undefined) ??
    (g.includes("machine") || g.includes(" ml") ? ROLE_PLANS[2] : undefined) ??
    (g.includes("found") || g.includes("startup") ? ROLE_PLANS[3] : undefined) ??
    ROLE_PLANS[0]
  );
}
