/**
 * The DeveloperOS course catalog.
 *
 * A researched, self-contained library of courses, each complete enough to
 * stand on its own: a real description, why it matters, what you build, and a
 * module → lesson outline with durations and difficulty. Curriculum structure
 * is grounded in current (2026) industry roadmaps rather than invented, so a
 * course page reads like a real syllabus.
 *
 * Full lesson content is stored (see catalog-lessons.ts) and stitched onto each
 * lesson at module load, so a lesson page just loads complete teaching content.
 * The "Ask AI to explain" tutor on the lesson page is for going deeper, not for
 * filling a blank. This module holds the structure; catalog-lessons.ts the depth.
 *
 * Plain data, no JSX, so it imports on server and client alike.
 *
 * Sources for curriculum structure:
 *  - AI Engineer / ML: roadmap.sh/ai-engineer, roadmap.sh/machine-learning
 *  - Backend: 2026 backend developer roadmaps (databases, APIs, auth, systems)
 *  - Docker/DevOps: Docker 101, DevOps roadmap (images→compose→networking)
 *  - React: React 2026 roadmap (core → hooks → state → data → performance)
 */

import { LESSON_CONTENT, fallbackBody } from "./catalog-lessons";
import { LESSON_CHALLENGES } from "./catalog-challenges";

export type Level = "Beginner" | "Intermediate" | "Advanced";
export type Accent = "primary" | "info" | "success" | "warning" | "danger";

/**
 * A hands-on task attached to a lesson.
 *
 * Levelled the way the 30 Days curricula this content is grounded in level
 * theirs, because the progression is the pedagogy and flattening it loses the
 * point: level 1 is recall you should be able to do immediately after reading,
 * level 2 makes you combine two ideas, level 3 is a small problem where the
 * approach is not handed to you.
 */
export type Challenge = {
  level: 1 | 2 | 3;
  prompt: string;
  /** A starting point, so nobody opens the editor to a blank page. */
  starter?: string;
  /** Revealed on request, never by default. */
  solution?: string;
  hint?: string;
};

export type Lesson = {
  title: string;
  minutes: number;
  /** A one-line objective, what you can do after it. */
  objective: string;
  /** Full markdown teaching content, stored so the lesson page just loads it.
   *  Authored in catalog-lessons.ts and stitched in at module load. */
  body?: string;
  /** A short knowledge-check for the lesson page. */
  quiz?: { prompt: string; choices: string[]; answer: number }[];
  /** Practice tasks, authored in catalog-challenges.ts and stitched in at
   *  module load exactly like bodies are. */
  challenges?: Challenge[];
};

export type Module = {
  title: string;
  summary: string;
  lessons: Lesson[];
};

export type Course = {
  slug: string;
  title: string;
  icon: string;
  /** A real technology brand mark key (python/react/docker/git/aws/...), shown
   *  in place of the generic icon where it exists. See TechLogo. */
  tech?: string;
  accent: Accent;
  level: Level;
  /** Discover/roadmap grouping. */
  track: string;
  /** Short one-liner for list rows. */
  tagline: string;
  /** Full description for the course page. */
  description: string;
  whyItMatters: string;
  youWillBuild: string;
  hours: number;
  modules: Module[];
  /** Free-text keywords for search. */
  tags: string[];
};

/** Derived: total lessons across a course's modules. */
export function lessonCount(course: Course): number {
  return course.modules.reduce((n, m) => n + m.lessons.length, 0);
}

/** A flat, ordered view of a course's lessons with their module context and a
 *  stable index, used by the lesson learning route for prev/next navigation. */
export type FlatLesson = Lesson & {
  index: number;
  moduleTitle: string;
  moduleIndex: number;
  lessonInModule: number;
};

export function flatLessons(course: Course): FlatLesson[] {
  const out: FlatLesson[] = [];
  course.modules.forEach((m, mi) => {
    m.lessons.forEach((l, li) => {
      out.push({
        ...l,
        index: out.length,
        moduleTitle: m.title,
        moduleIndex: mi,
        lessonInModule: li,
      });
    });
  });
  return out;
}

export function getLesson(course: Course, index: number): FlatLesson | undefined {
  return flatLessons(course)[index];
}

export const COURSES: Course[] = [
  /* ------------------------------------------------------------ Python ---- */
  {
    slug: "python-essentials",
    tech: "python",
    title: "Python Essentials",
    icon: "Code2",
    accent: "info",
    level: "Beginner",
    track: "Development",
    tagline: "The language of AI, data and the web — from zero.",
    description:
      "Start writing real Python from the first lesson. You cover the syntax, the data model, and the habits that carry into every later track, so this is the on-ramp whether you're heading for AI, backend or data.",
    whyItMatters:
      "Python is the dominant language for AI and data and a first-class choice for backend and automation. Almost every advanced path here assumes it.",
    youWillBuild: "A command-line task manager that reads and writes real files.",
    hours: 12,
    tags: ["python", "programming", "beginner", "cli", "scripting"],
    modules: [
      {
        title: "Getting started",
        summary: "Install Python, run your first program, and understand how code executes.",
        lessons: [
          { title: "How Python runs your code", minutes: 15, objective: "Explain the interpreter and run a script." },
          { title: "Variables and types", minutes: 25, objective: "Store and inspect numbers, strings and booleans." },
          { title: "Strings and formatting", minutes: 25, objective: "Slice, join and f-string your way through text." },
        ],
      },
      {
        title: "Control flow",
        summary: "Make decisions and repeat work.",
        lessons: [
          { title: "Conditionals", minutes: 20, objective: "Branch with if / elif / else." },
          { title: "Loops", minutes: 25, objective: "Iterate with for and while, and know when to stop." },
          { title: "Comprehensions", minutes: 20, objective: "Build lists and dicts in one expressive line." },
        ],
      },
      {
        title: "Data structures",
        summary: "The four collections you'll reach for daily.",
        lessons: [
          { title: "Lists and tuples", minutes: 25, objective: "Choose between mutable and fixed sequences." },
          { title: "Dictionaries and sets", minutes: 25, objective: "Look things up fast and dedupe." },
          { title: "Working with files", minutes: 30, objective: "Read and write text and JSON safely." },
        ],
      },
      {
        title: "Functions and structure",
        summary: "Package logic so it's reusable and testable.",
        lessons: [
          { title: "Defining functions", minutes: 25, objective: "Take arguments, return values, set defaults." },
          { title: "Modules and imports", minutes: 20, objective: "Split code across files and use the standard library." },
          { title: "Errors and exceptions", minutes: 25, objective: "Fail loudly, then handle it gracefully." },
        ],
      },
    ],
  },

  /* -------------------------------------------------------- JavaScript ---- */
  {
    slug: "javascript-essentials",
    tech: "javascript",
    title: "JavaScript Essentials",
    icon: "Code2",
    accent: "warning",
    level: "Beginner",
    track: "Development",
    tagline: "The only language that runs in every browser on earth.",
    description:
      "Fourteen lessons that take you from your first console.log to fetching real data and putting it on a page. The order follows the 30 Days Of JavaScript curriculum, so you meet the language the way it is actually taught rather than the way a framework tutorial assumes you already know it.",
    whyItMatters:
      "Every website runs JavaScript, and every front-end framework you will ever pick up is JavaScript underneath. Learning React before this is learning the abstraction before the thing it abstracts.",
    youWillBuild: "A live-search country browser that fetches real API data and remembers your list across refreshes.",
    hours: 14,
    tags: ["javascript", "js", "frontend", "web", "dom", "async", "beginner"],
    modules: [
      {
        title: "The language",
        summary: "How JavaScript runs, what a value is, and how to make a decision.",
        lessons: [
          { title: "How JavaScript runs", minutes: 20, objective: "Run a script in the browser and read the console." },
          { title: "Data types", minutes: 30, objective: "Tell the seven primitives apart and predict coercion." },
          { title: "Conditionals", minutes: 25, objective: "Branch with if, else if and switch — and know which to reach for." },
        ],
      },
      {
        title: "Collections and functions",
        summary: "The two things almost every program is made of.",
        lessons: [
          { title: "Arrays", minutes: 35, objective: "Build, slice, sort and search an ordered list." },
          { title: "Loops", minutes: 25, objective: "Repeat work with for, while and for...of." },
          { title: "Functions", minutes: 30, objective: "Write declarations, expressions and arrows, and know the difference." },
          { title: "Objects", minutes: 30, objective: "Model a thing with keys, values and methods." },
        ],
      },
      {
        title: "Modern JavaScript",
        summary: "The features that separate 2015 JavaScript from what people write now.",
        lessons: [
          { title: "Higher order functions", minutes: 35, objective: "Replace most of your loops with map, filter and reduce." },
          { title: "Destructuring and spread", minutes: 25, objective: "Pull values out and merge them back in without ceremony." },
          { title: "Classes", minutes: 30, objective: "Model related things with constructors, methods and inheritance." },
          { title: "Error handling", minutes: 25, objective: "Catch what you can fix and throw what you cannot." },
        ],
      },
      {
        title: "The browser",
        summary: "Fetching real data and putting it on a real page.",
        lessons: [
          { title: "Promises and async", minutes: 40, objective: "Fetch data without callback nesting, and handle it failing." },
          { title: "The DOM", minutes: 35, objective: "Select, create and update elements from JavaScript." },
          { title: "Web storage", minutes: 20, objective: "Persist state across a page refresh." },
        ],
      },
    ],
  },

  /* ------------------------------------------------------- Git & GitHub --- */
  {
    slug: "git-github",
    tech: "git",
    title: "Git & GitHub",
    icon: "GitBranch",
    accent: "danger",
    level: "Beginner",
    track: "Development",
    tagline: "Version control you can actually recover from.",
    description:
      "Most Git tutorials teach four commands and leave you stranded the first time something goes wrong. This one covers the model underneath — commits, branches, remotes — then spends real time on undoing, conflicts and reflog, because that is where the fear lives.",
    whyItMatters:
      "Git is the one tool you will use on every project for the rest of your career, and the only one where not understanding it can lose someone else's work. Every team assumes you know it and nobody teaches it.",
    youWillBuild: "A repository with a protected main branch, a CI workflow, and a history you are not embarrassed by.",
    hours: 9,
    tags: ["git", "github", "version control", "collaboration", "ci", "workflow"],
    modules: [
      {
        title: "The model",
        summary: "What Git is actually storing, and how a change gets into it.",
        lessons: [
          { title: "What version control actually is", minutes: 20, objective: "Explain commits, the index and the working tree." },
          { title: "Staging and committing", minutes: 35, objective: "Craft small, honest commits — and ignore what should never be tracked." },
          { title: "Reading history", minutes: 30, objective: "Find when a line changed and who changed it." },
        ],
      },
      {
        title: "Getting out of trouble",
        summary: "The lessons everyone wishes they had done before their first bad day.",
        lessons: [
          { title: "Undoing things", minutes: 40, objective: "Choose correctly between restore, reset and revert." },
          { title: "Branching and merging", minutes: 45, objective: "Work in parallel and resolve a conflict without panic." },
        ],
      },
      {
        title: "Working with GitHub",
        summary: "Everything that happens once the repository is not only yours.",
        lessons: [
          { title: "Remotes and GitHub", minutes: 35, objective: "Push, pull, fetch, and know why they differ." },
          { title: "Pull requests and review", minutes: 35, objective: "Open a PR people can actually review, and review one well." },
          { title: "Automating with Actions", minutes: 40, objective: "Run your tests on every push without asking anyone." },
          { title: "Working on a team", minutes: 30, objective: "Stash, cherry-pick and commit conventions that scale past one person." },
        ],
      },
    ],
  },

  /* --------------------------------------------------------------- AI ----- */
  {
    slug: "prompt-engineering",
    title: "Prompt Engineering",
    icon: "Sparkles",
    accent: "primary",
    level: "Beginner",
    track: "Data Science",
    tagline: "Get reliable, structured output from any LLM.",
    description:
      "Learn to steer large language models with intent: clear instructions, examples, structured output, and evaluation. The foundation for every LLM application you'll build later.",
    whyItMatters:
      "Prompting is the interface layer of modern AI products. Getting it right is the difference between a demo and something that ships.",
    youWillBuild: "A prompt library with tested templates and a small eval harness.",
    hours: 6,
    tags: ["ai", "llm", "prompts", "openai", "anthropic", "rag"],
    modules: [
      {
        title: "Foundations",
        summary: "How models read your instructions.",
        lessons: [
          { title: "Tokens, context and limits", minutes: 20, objective: "Reason about what the model can and can't see." },
          { title: "Instructions that work", minutes: 25, objective: "Write clear, unambiguous task prompts." },
          { title: "Few-shot examples", minutes: 20, objective: "Teach the model by demonstration." },
        ],
      },
      {
        title: "Structure and control",
        summary: "Make output predictable enough to build on.",
        lessons: [
          { title: "Structured output (JSON)", minutes: 25, objective: "Get machine-readable responses every time." },
          { title: "Roles and system prompts", minutes: 20, objective: "Set behaviour that persists across a chat." },
          { title: "Chaining and steps", minutes: 25, objective: "Break hard tasks into reliable smaller ones." },
        ],
      },
      {
        title: "Evaluating quality",
        summary: "Know when a prompt is good, not just when it feels good.",
        lessons: [
          { title: "Writing evals", minutes: 30, objective: "Score outputs against expected results." },
          { title: "Reducing hallucination", minutes: 25, objective: "Ground answers and cite sources." },
        ],
      },
    ],
  },
  {
    slug: "build-with-llms",
    title: "Building with LLMs",
    icon: "BrainCircuit",
    accent: "primary",
    level: "Intermediate",
    track: "Data Science",
    tagline: "RAG, tools and agents — real AI applications.",
    description:
      "Go from a single prompt to a real application: retrieval-augmented generation over your own data, tool/function calling, and simple agents. The core skills of an AI engineer in 2026.",
    whyItMatters:
      "Companies want engineers who can build, deploy and monitor LLM systems — RAG pipelines and agents are the day-to-day of the role.",
    youWillBuild: "A retrieval-augmented assistant that answers over a document set.",
    hours: 14,
    tags: ["ai", "llm", "rag", "agents", "embeddings", "vector"],
    modules: [
      {
        title: "Retrieval-augmented generation",
        summary: "Give a model your data without retraining it.",
        lessons: [
          { title: "Embeddings and vector search", minutes: 30, objective: "Turn text into searchable vectors." },
          { title: "Chunking and indexing", minutes: 25, objective: "Split documents so retrieval actually works." },
          { title: "Building the RAG loop", minutes: 35, objective: "Retrieve, augment, then generate." },
        ],
      },
      {
        title: "Tools and function calling",
        summary: "Let the model take actions, not just talk.",
        lessons: [
          { title: "Defining tools", minutes: 25, objective: "Describe functions the model can call." },
          { title: "Handling tool results", minutes: 25, objective: "Feed results back and continue reasoning." },
        ],
      },
      {
        title: "Agents and orchestration",
        summary: "Multi-step, goal-directed systems.",
        lessons: [
          { title: "The agent loop", minutes: 30, objective: "Plan, act, observe, repeat." },
          { title: "Guardrails and evals", minutes: 30, objective: "Keep an autonomous system safe and measurable." },
          { title: "Deploying and monitoring", minutes: 30, objective: "Ship it and watch it in production." },
        ],
      },
    ],
  },
  {
    slug: "machine-learning-foundations",
    title: "Machine Learning Foundations",
    icon: "LineChart",
    accent: "warning",
    level: "Intermediate",
    track: "Data Science",
    tagline: "The maths and models behind prediction.",
    description:
      "Understand how models actually learn: regression, classification, evaluation, and the pitfalls that trip up beginners. Hands-on with NumPy, Pandas and scikit-learn.",
    whyItMatters:
      "Before deep learning and LLMs, you need the fundamentals of learning from data — features, training, evaluation — or you'll ship models you can't trust.",
    youWillBuild: "A model that predicts a real outcome from a public dataset.",
    hours: 16,
    tags: ["ml", "ai", "numpy", "pandas", "scikit-learn", "data"],
    modules: [
      {
        title: "Working with data",
        summary: "Load, clean and explore before you model.",
        lessons: [
          { title: "NumPy and Pandas", minutes: 30, objective: "Manipulate arrays and tables efficiently." },
          { title: "Exploratory analysis", minutes: 30, objective: "See the shape of your data before modelling." },
          { title: "Features and preprocessing", minutes: 30, objective: "Turn raw data into model-ready inputs." },
        ],
      },
      {
        title: "Core models",
        summary: "Regression and classification, properly understood.",
        lessons: [
          { title: "Linear and logistic regression", minutes: 35, objective: "Fit and interpret the workhorses." },
          { title: "Trees and ensembles", minutes: 30, objective: "Use decision trees and random forests." },
          { title: "Clustering basics", minutes: 25, objective: "Find structure without labels." },
        ],
      },
      {
        title: "Evaluation",
        summary: "Know if your model is any good.",
        lessons: [
          { title: "Train/test and cross-validation", minutes: 30, objective: "Estimate real-world performance honestly." },
          { title: "Metrics that matter", minutes: 25, objective: "Pick the right score for the problem." },
          { title: "Overfitting and regularisation", minutes: 30, objective: "Spot and fix a model that memorised." },
        ],
      },
    ],
  },

  /* ----------------------------------------------------------- Backend ---- */
  {
    slug: "apis-and-databases",
    tech: "postgresql",
    title: "APIs & Databases",
    icon: "Server",
    accent: "primary",
    level: "Intermediate",
    track: "Development",
    tagline: "Design REST APIs and model real data.",
    description:
      "The backend core: design a clean REST API, model data in a relational database, and connect the two. Grounded in the 2026 backend essentials — data, security, and communication.",
    whyItMatters:
      "REST and relational databases are the industry standard backend stack. Nearly every service you'll build or maintain rests on them.",
    youWillBuild: "A secured REST API backed by PostgreSQL for a real domain.",
    hours: 18,
    tags: ["backend", "api", "rest", "sql", "postgres", "database"],
    modules: [
      {
        title: "REST fundamentals",
        summary: "Design resources the way the industry expects.",
        lessons: [
          { title: "HTTP and status codes", minutes: 25, objective: "Speak HTTP fluently." },
          { title: "Resource naming and versioning", minutes: 25, objective: "Design URLs that age well." },
          { title: "Request validation", minutes: 25, objective: "Reject bad input at the edge." },
        ],
      },
      {
        title: "Relational data",
        summary: "Model, query and speed up a database.",
        lessons: [
          { title: "Schema design and normalisation", minutes: 30, objective: "Model a domain without duplication." },
          { title: "Joins and queries", minutes: 30, objective: "Answer real questions across tables." },
          { title: "Indexing for performance", minutes: 30, objective: "Make slow queries fast." },
        ],
      },
      {
        title: "Auth and safety",
        summary: "Protect the data behind the API.",
        lessons: [
          { title: "Authentication and sessions", minutes: 30, objective: "Know who is calling your API." },
          { title: "Authorization", minutes: 25, objective: "Decide what they're allowed to do." },
          { title: "Caching with Redis", minutes: 25, objective: "Serve hot data without hitting the DB." },
        ],
      },
    ],
  },

  /* --------------------------------------------------------- Cloud/DevOps -- */
  {
    slug: "docker-fundamentals",
    tech: "docker",
    title: "Docker Fundamentals",
    icon: "Cloud",
    accent: "info",
    level: "Beginner",
    track: "Cloud",
    tagline: "Package any app to run the same everywhere.",
    description:
      "Containers, from the ground up: images, the Dockerfile, volumes, networking, and multi-container apps with Compose. The DevOps skill that unblocks every deployment path.",
    whyItMatters:
      "\"Works on my machine\" ends with containers. Docker is the baseline for modern deployment, CI/CD and cloud.",
    youWillBuild: "A multi-container app (web + database) running with Docker Compose.",
    hours: 8,
    tags: ["docker", "containers", "devops", "compose", "cloud"],
    modules: [
      {
        title: "Images and containers",
        summary: "The two ideas everything else builds on.",
        lessons: [
          { title: "What a container really is", minutes: 20, objective: "Explain images vs containers vs layers." },
          { title: "Running containers", minutes: 25, objective: "Pull, run, inspect and stop with the CLI." },
          { title: "Writing a Dockerfile", minutes: 30, objective: "Build a custom image for your app." },
        ],
      },
      {
        title: "Data and networking",
        summary: "Persist state and let containers talk.",
        lessons: [
          { title: "Volumes and bind mounts", minutes: 25, objective: "Keep data alive across restarts." },
          { title: "Container networking", minutes: 25, objective: "Connect containers with bridge networks." },
        ],
      },
      {
        title: "Compose and beyond",
        summary: "Orchestrate multiple containers as one app.",
        lessons: [
          { title: "Docker Compose", minutes: 30, objective: "Define a multi-service app in one file." },
          { title: "Registries and Docker Hub", minutes: 20, objective: "Push and pull images to share them." },
          { title: "A path to Kubernetes", minutes: 20, objective: "Know what orchestration comes next." },
        ],
      },
    ],
  },

  /* --------------------------------------------------------- Frontend ----- */
  {
    slug: "react-essentials",
    tech: "react",
    title: "React Essentials",
    icon: "Smartphone",
    accent: "info",
    level: "Beginner",
    track: "Development",
    tagline: "Build modern, interactive UIs the right way.",
    description:
      "Modern React from components to hooks to data fetching, following the 2026 path: core React, the essential hooks, state management, and talking to APIs — building projects as you go.",
    whyItMatters:
      "React is the most in-demand frontend library. A solid grip on components, hooks and state is the ticket into web and mobile roles.",
    youWillBuild: "A data-driven dashboard that fetches, displays and updates live data.",
    hours: 14,
    tags: ["react", "frontend", "javascript", "hooks", "ui"],
    modules: [
      {
        title: "Core React",
        summary: "Components, props and rendering.",
        lessons: [
          { title: "Components and JSX", minutes: 25, objective: "Describe UI as composable functions." },
          { title: "Props and composition", minutes: 25, objective: "Pass data down and compose pieces." },
          { title: "Lists and conditional UI", minutes: 20, objective: "Render collections and branches." },
        ],
      },
      {
        title: "Hooks",
        summary: "The backbone of every modern component.",
        lessons: [
          { title: "useState", minutes: 25, objective: "Hold and update local state." },
          { title: "useEffect", minutes: 30, objective: "Run side effects at the right time." },
          { title: "useRef and useReducer", minutes: 30, objective: "Reach for the right hook per problem." },
        ],
      },
      {
        title: "State and data",
        summary: "Beyond one component.",
        lessons: [
          { title: "Context and shared state", minutes: 25, objective: "Share state without prop-drilling." },
          { title: "Fetching data", minutes: 30, objective: "Load and cache API data in the UI." },
          { title: "Performance basics", minutes: 25, objective: "Avoid needless re-renders." },
        ],
      },
    ],
  },

  /* --------------------------------------------------------- Security ----- */
  {
    slug: "web-security-basics",
    title: "Web Security Basics",
    icon: "ShieldCheck",
    accent: "success",
    level: "Beginner",
    track: "Security",
    tagline: "Find and fix the vulnerabilities that matter.",
    description:
      "The security literacy every developer needs: the OWASP top risks, how attacks actually work, and how to defend against them — injection, auth flaws, XSS and more.",
    whyItMatters:
      "Most breaches exploit a handful of well-known issues. Knowing them makes everything you build safer by default.",
    youWillBuild: "A hardened version of a deliberately vulnerable web app.",
    hours: 10,
    tags: ["security", "web", "owasp", "xss", "injection"],
    modules: [
      {
        title: "Thinking like an attacker",
        summary: "Where apps break.",
        lessons: [
          { title: "The OWASP top risks", minutes: 25, objective: "Name the issues that cause most breaches." },
          { title: "Injection and SQLi", minutes: 30, objective: "Understand and stop injection attacks." },
          { title: "Cross-site scripting", minutes: 30, objective: "Prevent XSS in your output." },
        ],
      },
      {
        title: "Defending your app",
        summary: "Practical hardening.",
        lessons: [
          { title: "Auth and session safety", minutes: 30, objective: "Store secrets and sessions correctly." },
          { title: "Secure headers and HTTPS", minutes: 25, objective: "Lock down transport and the browser." },
          { title: "Dependencies and secrets", minutes: 25, objective: "Keep keys and packages from leaking." },
        ],
      },
    ],
  },
];

export function getCourse(slug: string): Course | undefined {
  return COURSES.find((c) => c.slug === slug);
}

/* --- Stitch stored lesson bodies onto the structure --------------------------
   Content lives in catalog-lessons.ts (keyed by course slug, in flat lesson
   order). We fold it onto the matching lessons once at module load, and fill
   any gap with a metadata-driven fallback body so every lesson always has real
   content to render, never a blank. */
for (const course of COURSES) {
  const content = LESSON_CONTENT[course.slug];
  const challenges = LESSON_CHALLENGES[course.slug];
  let i = 0;
  for (const mod of course.modules) {
    for (const lesson of mod.lessons) {
      const authored = content?.[i];
      lesson.body = authored?.body ?? fallbackBody(lesson.title, lesson.objective, course.title);
      if (authored?.quiz) lesson.quiz = authored.quiz;
      const tasks = challenges?.[i];
      if (tasks?.length) lesson.challenges = tasks;
      i += 1;
    }
  }
}

/** Total practice tasks in a course, for the course page's "what you get" row. */
export function challengeCount(course: Course): number {
  return course.modules.reduce(
    (n, m) => n + m.lessons.reduce((k, l) => k + (l.challenges?.length ?? 0), 0),
    0,
  );
}

/* ------------------------------------------------------------- Projects ---

   Hands-on builds. Each maps to the workspace's "new project" flow, so starting
   one leads to the real project builder rather than a dead card. */

export type CatalogProject = {
  slug: string;
  title: string;
  icon: string;
  accent: Accent;
  level: Level;
  track: string;
  tagline: string;
  outcome: string;
  hours: number;
  tags: string[];
};

export const PROJECTS: CatalogProject[] = [
  { slug: "cli-task-manager", title: "CLI Task Manager", icon: "Code2", accent: "info", level: "Beginner", track: "Development", tagline: "A command-line to-do app in Python.", outcome: "Persist tasks to disk and manage them from the terminal.", hours: 4, tags: ["python", "cli"] },
  { slug: "rest-api", title: "REST API Service", icon: "Server", accent: "primary", level: "Intermediate", track: "Development", tagline: "A secured JSON API over a database.", outcome: "Design, build and secure endpoints for a real domain.", hours: 8, tags: ["backend", "api", "sql"] },
  { slug: "ai-assistant", title: "AI Chat Assistant", icon: "BrainCircuit", accent: "primary", level: "Intermediate", track: "Data Science", tagline: "A RAG assistant over your own docs.", outcome: "Answer questions grounded in a document set.", hours: 10, tags: ["ai", "llm", "rag"] },
  { slug: "docker-compose-app", title: "Dockerized Web App", icon: "Cloud", accent: "info", level: "Intermediate", track: "Cloud", tagline: "Web + database with Docker Compose.", outcome: "Run a multi-container app anywhere with one command.", hours: 6, tags: ["docker", "devops"] },
  { slug: "react-dashboard", title: "React Dashboard", icon: "Smartphone", accent: "info", level: "Intermediate", track: "Development", tagline: "A live, data-driven UI.", outcome: "Fetch, display and update data in a modern UI.", hours: 8, tags: ["react", "frontend"] },
  { slug: "harden-web-app", title: "Harden a Web App", icon: "ShieldCheck", accent: "success", level: "Intermediate", track: "Security", tagline: "Fix a deliberately vulnerable app.", outcome: "Find and patch the OWASP top vulnerabilities.", hours: 6, tags: ["security", "web"] },
];

/* --------------------------------------------------------- Certifications --

   Real, recognised certifications the tracks prepare you for. Linking one goes
   to the career/certificates page where a user records what they've earned. */

export type CatalogCert = {
  slug: string;
  title: string;
  provider: string;
  icon: string;
  accent: Accent;
  track: string;
  tagline: string;
  tags: string[];
};

export const CERTIFICATIONS: CatalogCert[] = [
  { slug: "docker-associate", title: "Docker Certified Associate", provider: "Docker", icon: "Cloud", accent: "info", track: "Cloud", tagline: "Prove production container skills.", tags: ["docker", "devops"] },
  { slug: "aws-cloud-practitioner", title: "AWS Cloud Practitioner", provider: "Amazon", icon: "Cloud", accent: "warning", track: "Cloud", tagline: "Foundational cloud certification.", tags: ["aws", "cloud"] },
  { slug: "security-plus", title: "CompTIA Security+", provider: "CompTIA", icon: "ShieldCheck", accent: "success", track: "Security", tagline: "The baseline security credential.", tags: ["security"] },
  { slug: "pcep-python", title: "PCEP — Certified Python Entry", provider: "Python Institute", icon: "Code2", accent: "info", track: "Development", tagline: "Certify your Python fundamentals.", tags: ["python"] },
  { slug: "tensorflow-developer", title: "TensorFlow Developer", provider: "Google", icon: "BrainCircuit", accent: "primary", track: "Data Science", tagline: "Certify hands-on deep learning.", tags: ["ai", "ml"] },
];

/** The filter tracks shown as chips. "All" is implicit. */
export const TRACKS = ["Development", "Data Science", "Cloud", "Security"] as const;
