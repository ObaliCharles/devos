/**
 * Every collection in DeveloperOS, grouped by the module that owns it.
 *
 * This file is the barrel — import from `@/lib/models` and you get all of it,
 * which is what every query, action and page already does. The schemas live in
 * the domain files next to this one because sixty collections in one file is a
 * file nobody reads.
 *
 *   core.ts          User, StudySession, Notification, FileAsset, Resource,
 *                    SupportTicket, AuditLog, FeatureFlag
 *   content.ts       Roadmap → Phase → Skill → Topic → Lesson,
 *                    LessonProgress, Review, GATE_STEPS
 *   knowledge.ts     Note, NoteVersion, Backlink, NoteCollection, Snippet,
 *                    Flashcard
 *   projects.ts      Project, Task, Milestone, Bug, Deployment, ApiEndpoint,
 *                    SchemaDesign, ActivityLog
 *   practice.ts      Challenge, ChallengeAttempt, ChallengeProgress,
 *                    DailyChallenge
 *   ai.ts            AiConversation, AiMessage, AiMemory, AiPrompt, AiUsage
 *   career.ts        Resume, Portfolio, JobApplication, Interview,
 *                    Certificate, Client, Invoice, IncomeEntry,
 *                    NetworkContact, CareerGoal
 *   productivity.ts  TimeEntry, FocusSession, Goal, Habit, Achievement,
 *                    CalendarEvent
 *
 * Two rules that hold across all of them:
 *
 * 1. Every user-owned document has a `user` ref and an index that starts with
 *    it. Authorisation is a filter, and a filter without an index is a scan.
 * 2. Content (Roadmap → Lesson, Challenge, platform Resources and AiPrompts)
 *    is global unless it carries an `owner`. That is the seam multi-tenancy
 *    goes through — see DECISIONS 008.
 */

export * from "./core";
export * from "./content";
export * from "./knowledge";
export * from "./projects";
export * from "./practice";
export * from "./ai";
export * from "./career";
export * from "./productivity";
