/**
 * The seed content for the Learn hub.
 *
 * This is the "intelligent OS" surface: curated roadmaps, a library of things
 * the Discover search can find, achievement definitions, and the shape of an
 * AI-generated curriculum. It is written here as strong, specific content so
 * the page reads like a real product rather than lorem ipsum, and so the
 * generator and search have real material to work with without a round trip.
 *
 * Everything is plain data, no JSX, so it can be imported by both server and
 * client components.
 */

export type Difficulty = "Beginner" | "Beginner friendly" | "Intermediate" | "Advanced";

export type Roadmap = {
  slug: string;
  title: string;
  /** A lucide icon name resolved on the client. */
  icon: string;
  /** A short accent, used for the icon tile tint. */
  accent: "primary" | "info" | "success" | "warning" | "danger";
  difficulty: Difficulty;
  lessons: number;
  projects: number;
  certificate: boolean;
  duration: string;
  blurb: string;
};

export const ROADMAPS: Roadmap[] = [
  {
    slug: "python-fullstack",
    title: "Python Fullstack",
    icon: "Code2",
    accent: "info",
    difficulty: "Beginner friendly",
    lessons: 11,
    projects: 6,
    certificate: true,
    duration: "3 months",
    blurb: "Go from your first line of Python to shipping a full-stack web application.",
  },
  {
    slug: "ai-engineering",
    title: "AI Engineering",
    icon: "BrainCircuit",
    accent: "primary",
    difficulty: "Intermediate",
    lessons: 20,
    projects: 15,
    certificate: true,
    duration: "6 months",
    blurb: "Design, build and deploy production AI systems on top of modern LLMs.",
  },
  {
    slug: "react-native",
    title: "React Native",
    icon: "Smartphone",
    accent: "info",
    difficulty: "Intermediate",
    lessons: 15,
    projects: 8,
    certificate: false,
    duration: "4 months",
    blurb: "Build production mobile apps for iOS and Android from a single codebase.",
  },
  {
    slug: "cloud-engineering",
    title: "Cloud Engineering",
    icon: "Cloud",
    accent: "info",
    difficulty: "Intermediate",
    lessons: 18,
    projects: 10,
    certificate: true,
    duration: "5 months",
    blurb: "Master infrastructure, containers and CI/CD to run software at scale.",
  },
  {
    slug: "cyber-security",
    title: "Cyber Security",
    icon: "ShieldCheck",
    accent: "success",
    difficulty: "Advanced",
    lessons: 13,
    projects: 7,
    certificate: true,
    duration: "5 months",
    blurb: "Learn offensive and defensive security, from threat modelling to hardening.",
  },
  {
    slug: "machine-learning",
    title: "Machine Learning",
    icon: "LineChart",
    accent: "warning",
    difficulty: "Advanced",
    lessons: 16,
    projects: 12,
    certificate: true,
    duration: "6 months",
    blurb: "Understand the maths and ship models that solve real prediction problems.",
  },
  {
    slug: "backend-engineering",
    title: "Backend Engineering",
    icon: "Server",
    accent: "primary",
    difficulty: "Intermediate",
    lessons: 17,
    projects: 9,
    certificate: true,
    duration: "5 months",
    blurb: "Design APIs, databases and services that stay fast and correct under load.",
  },
  {
    slug: "game-development",
    title: "Game Development",
    icon: "Gamepad2",
    accent: "danger",
    difficulty: "Intermediate",
    lessons: 14,
    projects: 8,
    certificate: false,
    duration: "4 months",
    blurb: "Ship playable 2D and 3D games with real engines, physics and game loops.",
  },
];

/* ---------------------------------------------------------- Discover library

   A flat, searchable index of everything the platform holds. The Discover
   search filters this by free text and by kind, and groups the hits into
   columns. Keeping it flat here keeps the search trivial and fast. */

export type DiscoverKind =
  | "Course"
  | "Project"
  | "Roadmap"
  | "Certification"
  | "Assessment";

export type DiscoverItem = {
  title: string;
  kind: DiscoverKind;
  level: string;
  /** Extra searchable keywords that need not appear in the title. */
  tags: string[];
};

export const DISCOVER: DiscoverItem[] = [
  // Docker
  { title: "Docker Fundamentals", kind: "Course", level: "Beginner", tags: ["docker", "containers", "devops"] },
  { title: "Docker for Developers", kind: "Course", level: "Intermediate", tags: ["docker", "compose", "devops"] },
  { title: "Docker Advanced", kind: "Course", level: "Advanced", tags: ["docker", "orchestration", "kubernetes"] },
  { title: "Build Docker Containers", kind: "Project", level: "Beginner", tags: ["docker", "containers"] },
  { title: "Microservices with Docker", kind: "Project", level: "Intermediate", tags: ["docker", "microservices"] },
  { title: "Deploy an App with Docker", kind: "Project", level: "Advanced", tags: ["docker", "deployment"] },
  { title: "Backend Engineering", kind: "Roadmap", level: "Includes Docker", tags: ["docker", "backend", "api"] },
  { title: "DevOps Engineering", kind: "Roadmap", level: "Includes Docker", tags: ["docker", "devops", "ci"] },
  { title: "Cloud Engineering", kind: "Roadmap", level: "Includes Docker", tags: ["docker", "cloud", "aws"] },
  { title: "Docker Associate", kind: "Certification", level: "Official certification", tags: ["docker"] },
  { title: "Docker Professional", kind: "Certification", level: "Official certification", tags: ["docker"] },
  { title: "Docker Expert", kind: "Certification", level: "Official certification", tags: ["docker"] },
  { title: "Docker Fundamentals Assessment", kind: "Assessment", level: "20 questions", tags: ["docker"] },

  // Python
  { title: "Python Essentials", kind: "Course", level: "Beginner", tags: ["python", "programming"] },
  { title: "Python for Data", kind: "Course", level: "Intermediate", tags: ["python", "pandas", "numpy", "data"] },
  { title: "Async Python", kind: "Course", level: "Advanced", tags: ["python", "asyncio", "concurrency"] },
  { title: "Build a CLI Task Manager", kind: "Project", level: "Beginner", tags: ["python", "cli"] },
  { title: "Build a REST API in Python", kind: "Project", level: "Intermediate", tags: ["python", "api", "fastapi"] },
  { title: "Python Fullstack", kind: "Roadmap", level: "Beginner friendly", tags: ["python", "web", "fullstack"] },
  { title: "Python Institute PCEP", kind: "Certification", level: "Official certification", tags: ["python"] },
  { title: "Python Fundamentals Assessment", kind: "Assessment", level: "25 questions", tags: ["python"] },

  // AI / ML
  { title: "Intro to Machine Learning", kind: "Course", level: "Intermediate", tags: ["ai", "ml", "machine learning"] },
  { title: "Prompt Engineering", kind: "Course", level: "Beginner", tags: ["ai", "llm", "prompts"] },
  { title: "Build with LLMs", kind: "Course", level: "Intermediate", tags: ["ai", "llm", "openai", "anthropic"] },
  { title: "Deep Learning Foundations", kind: "Course", level: "Advanced", tags: ["ai", "neural networks", "pytorch"] },
  { title: "Build an AI Chat Assistant", kind: "Project", level: "Intermediate", tags: ["ai", "llm", "chatbot"] },
  { title: "Train an Image Classifier", kind: "Project", level: "Advanced", tags: ["ai", "ml", "vision"] },
  { title: "AI Engineering", kind: "Roadmap", level: "Intermediate", tags: ["ai", "llm", "engineering"] },
  { title: "Machine Learning", kind: "Roadmap", level: "Advanced", tags: ["ml", "ai", "models"] },
  { title: "AI Fundamentals Assessment", kind: "Assessment", level: "30 questions", tags: ["ai", "ml"] },

  // React / frontend
  { title: "React Essentials", kind: "Course", level: "Beginner", tags: ["react", "frontend", "javascript"] },
  { title: "React Native", kind: "Course", level: "Intermediate", tags: ["react", "mobile", "native"] },
  { title: "Build a Mobile App", kind: "Project", level: "Intermediate", tags: ["react", "mobile", "native"] },
  { title: "React Native", kind: "Roadmap", level: "Intermediate", tags: ["react", "mobile"] },

  // Security
  { title: "Web Security Basics", kind: "Course", level: "Beginner", tags: ["security", "web", "owasp"] },
  { title: "Ethical Hacking", kind: "Course", level: "Advanced", tags: ["security", "pentest", "hacking"] },
  { title: "Harden a Web App", kind: "Project", level: "Intermediate", tags: ["security", "web"] },
  { title: "Cyber Security", kind: "Roadmap", level: "Advanced", tags: ["security", "cyber", "defense"] },
  { title: "Security+ Foundations", kind: "Certification", level: "Official certification", tags: ["security"] },
];

/* ------------------------------------------------------- AI curriculum shape

   The generator combines a role, a duration and preferences into a month-by-
   month plan. We keep a small library of role plans; the client picks the plan
   for the chosen role and trims or pads it to the requested duration. This is
   deterministic and instant, which is the right feel for a builder that should
   respond the moment you press generate. */

export type CurriculumMonth = {
  title: string;
  focus: string;
  project?: string;
};

export type RolePlan = {
  role: string;
  outcome: string;
  months: CurriculumMonth[];
};

export const ROLE_PLANS: RolePlan[] = [
  {
    role: "AI Engineer",
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
  const match =
    ROLE_PLANS.find((p) => g.includes(p.role.toLowerCase())) ??
    (g.includes("backend") ? ROLE_PLANS[1] : undefined) ??
    (g.includes("machine") || g.includes(" ml") ? ROLE_PLANS[2] : undefined) ??
    (g.includes("found") || g.includes("startup") ? ROLE_PLANS[3] : undefined);
  return match ?? ROLE_PLANS[0];
}

/* --------------------------------------------------------------- Achievements */

export type Achievement = {
  title: string;
  caption: string;
  icon: string;
  accent: "primary" | "info" | "success" | "warning" | "danger";
  earned: boolean;
};

export const ACHIEVEMENTS: Achievement[] = [
  { title: "First Project", caption: "Completed", icon: "Star", accent: "warning", earned: true },
  { title: "Python Master", caption: "Learn Python", icon: "Code2", accent: "info", earned: true },
  { title: "7 Days Streak", caption: "Keep going!", icon: "Flame", accent: "danger", earned: true },
  { title: "Fast Learner", caption: "10 lessons", icon: "Zap", accent: "primary", earned: true },
  { title: "AI Explorer", caption: "Try AI", icon: "Sparkles", accent: "primary", earned: false },
  { title: "Problem Solver", caption: "Solve 50 problems", icon: "Puzzle", accent: "info", earned: false },
  { title: "Early Bird", caption: "Morning learner", icon: "Sunrise", accent: "warning", earned: false },
  { title: "Consistent", caption: "30 days streak", icon: "CalendarCheck", accent: "success", earned: false },
];
