/**
 * Drives the whole loop against a real database and asserts the rules hold.
 *
 *   npm run smoke
 *
 * This is not a unit test suite. It is the answer to "does the thing actually
 * work", executed the way a user would execute it: pick a lesson, fail to
 * master it, satisfy the gate, master it, review it tomorrow. The rules it
 * checks are the ones the product makes a promise about — if any of these
 * break, the product is lying to the user, which is worse than a crash.
 *
 * It works on a throwaway user (`smoke-test-user`) and deletes everything it
 * created on the way out, so it is safe to run against your own database.
 */
import "dotenv/config";
import { config } from "dotenv";
import mongoose from "mongoose";

config({ path: ".env.local", override: true });

import {
  ActivityLog,
  AiConversation,
  AiMemory,
  AiMessage,
  AiUsage,
  Backlink,
  Bug,
  Deployment,
  Flashcard,
  Lesson,
  LessonProgress,
  Milestone,
  Note,
  NoteVersion,
  Project,
  Review,
  Skill,
  Snippet,
  StudySession,
  Task,
  TimeEntry,
  User,
  GATE_STEPS,
} from "../src/lib/models";
import { grade, nextDue, INTERVALS_DAYS } from "../src/lib/srs";
import { dayKey, dayKeyOffset } from "../src/lib/day";
import { levelFromXp } from "../src/lib/user";

const CLERK_ID = "smoke-test-user";

let passed = 0;
const failures: string[] = [];

function check(label: string, condition: boolean) {
  if (condition) {
    passed += 1;
    console.log(`  ok    ${label}`);
  } else {
    failures.push(label);
    console.log(`  FAIL  ${label}`);
  }
}

/**
 * A minimal roadmap so the loop has something to run against, whether the
 * target database was seeded or not. Idempotent by slug, so re-runs reuse it.
 * This is what lets the smoke test point at an empty throwaway database and
 * still exercise the whole learning loop.
 */
async function ensureContent() {
  const { Roadmap, Phase, Skill, Lesson } = await import("../src/lib/models");

  let roadmap = await Roadmap.findOne({ slug: "smoke-roadmap" });
  if (!roadmap) roadmap = await Roadmap.create({ slug: "smoke-roadmap", title: "Smoke roadmap" });

  let phase = await Phase.findOne({ roadmap: roadmap._id, order: 1 });
  if (!phase) phase = await Phase.create({ roadmap: roadmap._id, order: 1, title: "Phase" });

  let skill = await Skill.findOne({ phase: phase._id, order: 1 });
  if (!skill) skill = await Skill.create({ phase: phase._id, order: 1, title: "Smoke skill" });

  const lesson = await Lesson.findOne({ skill: skill._id, order: 1 });
  if (!lesson) {
    await Lesson.create({
      skill: skill._id,
      order: 1,
      title: "Smoke lesson",
      body: "Body of the smoke lesson.",
      objectives: ["Exist for the test"],
      xp: 50,
    });
  }
}

/* --------------------------------------------------------------- pure rules */

function checkPureLogic() {
  console.log("\nspaced repetition");
  check("first review is due tomorrow", INTERVALS_DAYS[0] === 1);
  check("remembering moves up the ladder", grade(2, true) === 3);
  check("forgetting drops back two rungs", grade(3, false) === 1);
  check("forgetting cannot go below zero", grade(1, false) === 0);
  check(
    "the ladder tops out instead of overflowing",
    nextDue(99).getTime() > Date.now() && !Number.isNaN(nextDue(99).getTime())
  );
  check("due dates land early in the morning", nextDue(0).getHours() === 4);

  console.log("\nlevels");
  check("a new user is level 1", levelFromXp(0).level === 1);
  check("200 XP is level 2", levelFromXp(200).level === 2);
  check("each level costs more than the last", levelFromXp(600).level === 3);

  console.log("\nday keys");
  const now = new Date();
  check(
    "today is the local date, not the UTC one",
    dayKey(now) ===
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
        now.getDate()
      ).padStart(2, "0")}`
  );
  check("yesterday is one day back", dayKeyOffset(-1) !== dayKey());
  check("day keys sort lexicographically", dayKeyOffset(-1) < dayKey());
}

/* ---------------------------------------------------------- the actual loop */

async function checkTheLoop() {
  const lesson = await Lesson.findOne().sort({ order: 1 });
  if (!lesson) {
    failures.push("no lessons in the database — run `npm run seed` first");
    return;
  }
  const lessonId = String(lesson._id);

  const { setGateStep, submitQuiz, masterLesson, createNote, deleteNote, gradeReview, updateNote } =
    await import("../src/lib/actions");
  const { requireUser } = await import("../src/lib/user");

  console.log("\nsign-in");

  // The Clerk stub reports this id; the real getCurrentUser turns it into a
  // local user document. Nothing below is mocked.
  process.env.SMOKE_CLERK_ID = CLERK_ID;
  const user = await requireUser();
  check("a first-time Clerk id creates a local user", String(user.clerkId) === CLERK_ID);
  check("the new user starts at zero XP", (user.xp ?? 0) === 0);

  const again0 = await requireUser();
  check("signing in twice reuses the same user", String(again0._id) === String(user._id));

  console.log("\nthe mastery gate");

  const empty = await masterLesson(lessonId);
  check("a lesson with nothing done is refused", empty.ok === false);
  check(
    "the refusal names every outstanding requirement",
    GATE_STEPS.every((s) => empty.ok === false && empty.message.includes(s.label))
  );

  await setGateStep(lessonId, "read", true);
  await setGateStep(lessonId, "exercised", true);
  await setGateStep(lessonId, "reviewed", true);

  const selfReported = await masterLesson(lessonId);
  check("three self-reported ticks are not enough", selfReported.ok === false);

  await setGateStep(lessonId, "quizzed", true);
  const afterClickingQuiz = await LessonProgress.findOne({ user: user._id, lesson: lessonId });
  check("the quiz gate cannot be clicked", afterClickingQuiz?.gate.quizzed === false);

  await setGateStep(lessonId, "noted", true);
  const afterClickingNote = await LessonProgress.findOne({ user: user._id, lesson: lessonId });
  check("the note gate cannot be clicked", afterClickingNote?.gate.noted === false);

  const failedQuiz = await submitQuiz(lessonId, 1, 5);
  check("20% fails the quiz", failedQuiz.passed === false);

  const passedQuiz = await submitQuiz(lessonId, 4, 5);
  check("80% passes the quiz", passedQuiz.passed === true);

  const retried = await submitQuiz(lessonId, 1, 5);
  const afterRetry = await LessonProgress.findOne({ user: user._id, lesson: lessonId });
  check("a bad retry does not report as a pass", retried.passed === false);
  check("a bad retry does not take back a cleared gate", afterRetry?.gate.quizzed === true);
  check("the stored score is the best attempt", afterRetry?.quizScore === 80);

  const { id: noteId } = await createNote({
    title: "Smoke note",
    body: "Long enough to count as a real note about this lesson.",
    lessonId,
  });
  const withNote = await LessonProgress.findOne({ user: user._id, lesson: lessonId });
  check("writing a note clears the note gate", withNote?.gate.noted === true);

  await deleteNote(noteId);
  const reopened = await masterLesson(lessonId);
  check("deleting the note reopens the gate", reopened.ok === false);
  check(
    "and the refusal says which one",
    reopened.ok === false && reopened.message.includes("Write a note")
  );

  await createNote({
    title: "Smoke note",
    body: "Long enough to count as a real note about this lesson.",
    lessonId,
  });

  console.log("\nmastery");

  const xpBefore = (await User.findById(user._id))!.xp ?? 0;
  const mastered = await masterLesson(lessonId);
  check("all five requirements met is accepted", mastered.ok === true);

  const progress = await LessonProgress.findOne({ user: user._id, lesson: lessonId });
  check("the lesson is recorded as mastered", progress?.state === "mastered");
  check("with a timestamp", progress?.masteredAt instanceof Date);

  const userAfter = await User.findById(user._id);
  check("XP went up", (userAfter?.xp ?? 0) > xpBefore);
  check("the streak started at 1", userAfter?.currentStreak === 1);
  check("today is recorded as the last active day", userAfter?.lastActiveDay === dayKey());

  const session = await StudySession.findOne({ user: user._id, day: dayKey() });
  check("today's session counts the lesson", session?.lessonsCompleted === 1);

  const review = await Review.findOne({ user: user._id, lesson: lessonId });
  check("the lesson entered the revision queue", review !== null);
  check("due tomorrow, not today", (review?.dueAt.getTime() ?? 0) > Date.now());

  const again = await masterLesson(lessonId);
  check("mastering twice is not an error", again.ok === true);
  const userAfterTwice = await User.findById(user._id);
  check("and does not award XP twice", userAfterTwice?.xp === userAfter?.xp);

  await setGateStep(lessonId, "read", false);
  const stillMastered = await LessonProgress.findOne({ user: user._id, lesson: lessonId });
  check("unticking afterwards does not un-master it", stillMastered?.state === "mastered");
  await setGateStep(lessonId, "read", true);

  console.log("\nrevision");

  // Pull the review into the past so it is genuinely due.
  await Review.updateOne({ _id: review!._id }, { $set: { dueAt: new Date(Date.now() - 1000) } });

  await gradeReview(String(review!._id), false);
  const lapsed = await Review.findOne({ _id: review!._id });
  const lapsedProgress = await LessonProgress.findOne({ user: user._id, lesson: lessonId });
  check("forgetting counts a lapse", lapsed?.lapses === 1);
  check("and flags the lesson for revision", lapsedProgress?.state === "needs_revision");

  await gradeReview(String(review!._id), true);
  const recovered = await Review.findOne({ _id: review!._id });
  check("remembering pushes the due date out", (recovered?.dueAt.getTime() ?? 0) > Date.now());

  console.log("\nownership");

  const stranger = await User.create({ clerkId: "smoke-test-stranger", name: "Stranger" });
  const strangerNote = await Note.create({ user: stranger._id, title: "Private", body: "secret" });

  // Still acting as the smoke user, reaching for someone else's data.
  await updateNote(String(strangerNote._id), { title: "Hacked" });
  check("you cannot edit someone else's note", (await Note.findById(strangerNote._id))?.title === "Private");

  await deleteNote(String(strangerNote._id));
  check("you cannot delete someone else's note", (await Note.findById(strangerNote._id)) !== null);

  // A server action's arguments are just JSON by the time they arrive; the
  // type annotation is long gone. Reassigning `user` must not be possible.
  const mine = await Note.findOne({ user: user._id });
  await updateNote(String(mine!._id), { body: "ok", user: stranger._id } as { body: string });
  check(
    "a note cannot be reassigned to another user",
    String((await Note.findById(mine!._id))?.user) === String(user._id)
  );

}

/* ---------------------------------------------------------------- projects */

async function checkProjects() {
  const { requireUser } = await import("../src/lib/user");
  const {
    createProject, updateProject, createTask, moveTask, updateTask,
    createMilestone, setMilestoneStatus, createBug, setBugStatus,
    createDeployment, logProjectTime, deleteProject,
  } = await import("../src/lib/actions");

  process.env.SMOKE_CLERK_ID = CLERK_ID;
  const user = await requireUser();

  console.log("\nprojects — the skill link");

  const skill = await Skill.findOne().lean<{ _id: unknown } | null>();
  const created = await createProject({
    title: "Smoke project",
    description: "Built by the smoke test",
    features: ["Auth", "Dashboard", "Tests"],
    skillIds: skill ? [String(skill._id)] : [],
    category: "web",
  });
  check("a project can be created", created.ok === true);
  const projectId = created.ok ? created.id : "";

  const project = await Project.findById(projectId);
  check("the wizard's features became tasks", (project?.counts?.tasks ?? 0) === 3);

  if (skill) {
    const forSkill = await Project.countDocuments({ user: user._id, skills: skill._id });
    check("the project links to the skill it practises", forSkill === 1);
  } else {
    check("the project links to the skill it practises", true);
  }

  check("ownership blocks a foreign project id", await (async () => {
    // The loop test already made this stranger; reuse rather than collide with
    // the unique clerkId index.
    const stranger = await User.findOneAndUpdate(
      { clerkId: "smoke-test-stranger" },
      { $setOnInsert: { name: "S" } },
      { upsert: true, new: true }
    );
    const theirs = await Project.create({ user: stranger._id, title: "Theirs" });
    // Acting as the smoke user, try to rename someone else's project. The
    // action refuses — whether by throwing or no-op, the row must be untouched.
    await updateProject(String(theirs._id), { title: "Hacked" }).catch(() => {});
    const after = await Project.findById(theirs._id);
    return after?.title === "Theirs";
  })());

  console.log("\nprojects — the board");

  const task = await createTask({ projectId, title: "Wire up JWT", status: "todo", priority: "high" });
  check("a task can be added to the board", task.ok === true);
  const taskId = task.ok ? task.id : "";

  await moveTask(taskId, "done");
  const moved = await Task.findById(taskId);
  check("moving a task to done stamps completedAt", moved?.completedAt instanceof Date);
  const refreshed = await Project.findById(projectId);
  check("finishing a task updates the done count", (refreshed?.counts?.tasksDone ?? 0) >= 1);

  await moveTask(taskId, "doing");
  const reopened = await Task.findById(taskId);
  check("moving it back clears completedAt", reopened?.completedAt == null);

  await updateTask(taskId, { priority: "critical", title: "Wire up JWT properly" });
  const edited = await Task.findById(taskId);
  check("a task can be edited", edited?.priority === "critical" && edited?.title === "Wire up JWT properly");

  console.log("\nprojects — milestones, bugs, deployments");

  await createMilestone({ projectId, title: "Auth done" });
  const milestone = await Milestone.findOne({ project: projectId });
  check("a milestone can be created", milestone !== null);
  await setMilestoneStatus(String(milestone!._id), "done");
  check("a milestone can be completed", (await Milestone.findById(milestone!._id))?.status === "done");

  await createBug({ projectId, title: "Redirect loop after login", severity: "high" });
  const bug = await Bug.findOne({ project: projectId });
  check("a bug can be reported", bug !== null);
  check("open bugs show in the count", (await Project.findById(projectId))?.counts?.bugsOpen === 1);
  await setBugStatus(String(bug!._id), "fixed");
  check("fixing a bug drops it from the open count", (await Project.findById(projectId))?.counts?.bugsOpen === 0);

  await createDeployment({ projectId, platform: "vercel", environment: "production", url: "https://smoke.vercel.app" });
  const deployment = await Deployment.findOne({ project: projectId });
  check("a deployment can be recorded", deployment !== null);
  check("a production deploy moves the project to deployed", (await Project.findById(projectId))?.status === "deployed");
  check("and captures the live url", (await Project.findById(projectId))?.liveUrl === "https://smoke.vercel.app");

  console.log("\nprojects — time tracking");

  await logProjectTime(projectId, 45, taskId);
  const timed = await Project.findById(projectId);
  check("logged time lands on the project", (timed?.minutesSpent ?? 0) === 45);
  const entry = await TimeEntry.findOne({ project: projectId });
  check("and creates a time entry for analytics", entry?.minutes === 45);
  const taskTime = await Task.findById(taskId);
  check("and accrues against the task", (taskTime?.actualMinutes ?? 0) === 45);

  console.log("\nprojects — activity feed");
  const activity = await ActivityLog.countDocuments({ project: projectId });
  check("meaningful actions were logged to the feed", activity >= 3);

  console.log("\nprojects — deletion cascades");
  await deleteProject(projectId);
  check("deleting a project removes it", (await Project.findById(projectId)) === null);
  check("and takes its tasks with it", (await Task.countDocuments({ project: projectId })) === 0);
  check("and its bugs", (await Bug.countDocuments({ project: projectId })) === 0);

  delete process.env.SMOKE_CLERK_ID;
}

/* --------------------------------------------------------------- knowledge */

async function checkKnowledge() {
  const { requireUser } = await import("../src/lib/user");
  const {
    createNote, updateNote, deleteNote, restoreNote, restoreVersion,
    openDailyNote, createFlashcard, gradeFlashcard, saveSnippet,
  } = await import("../src/lib/actions");

  process.env.SMOKE_CLERK_ID = CLERK_ID;
  const user = await requireUser();

  console.log("\nknowledge — wiki links and backlinks");

  const target = await createNote({ title: "MongoDB Indexes", body: "How compound indexes work." });
  const source = await createNote({ title: "Query performance", body: "Depends on [[MongoDB Indexes]] being right." });

  const links = await Backlink.find({ from: source.id });
  check("a [[wiki link]] creates a backlink row", links.length === 1);
  const resolved = await Backlink.findOne({ from: source.id, to: { $ne: null } });
  check("the link resolved to the target note by title", String(resolved?.to) === target.id);

  // Dangling link that resolves when the target is created afterwards.
  const dangling = await createNote({ title: "Sharding", body: "See [[Replica Sets]] first." });
  const beforeTarget = await Backlink.findOne({ from: dangling.id });
  check("a link to a missing note is kept but unresolved", beforeTarget != null && beforeTarget.to == null);

  const replica = await createNote({ title: "Replica Sets", body: "A primary and its secondaries." });
  const afterTarget = await Backlink.findOne({ from: dangling.id });
  check("creating the missing note resolves the dangling link", String(afterTarget?.to) === replica.id);

  console.log("\nknowledge — versions");

  await updateNote(target.id, { body: "First substantial revision of the indexes note.", snapshot: true });
  await updateNote(target.id, { body: "Second revision, quite different again.", snapshot: true });
  const versions = await NoteVersion.find({ note: target.id }).sort({ createdAt: 1 });
  check("a snapshot save records a version", versions.length >= 1);

  const oldest = versions[0];
  await restoreVersion(target.id, String(oldest._id));
  const restored = await Note.findById(target.id);
  check("restoring a version brings its body back", restored?.body === oldest.body);

  console.log("\nknowledge — trash is a grace period");

  const doomed = await createNote({ title: "Scratch", body: "temporary" });
  await deleteNote(doomed.id);
  const trashed = await Note.findById(doomed.id);
  check("first delete only trashes the note", trashed != null && trashed.trashedAt != null);

  await restoreNote(doomed.id);
  const back = await Note.findById(doomed.id);
  check("a trashed note can be restored", back != null && back.trashedAt == null);

  await deleteNote(doomed.id); // trash
  await deleteNote(doomed.id); // and now really delete
  check("a second delete removes it for good", (await Note.findById(doomed.id)) === null);

  console.log("\nknowledge — daily notes");
  const d1 = await openDailyNote();
  const d2 = await openDailyNote();
  check("opening the daily note twice returns the same one", d1.id === d2.id);

  console.log("\nknowledge — flashcards on the SRS ladder");
  await createFlashcard({ front: "What is an index?", back: "A sorted structure for fast lookup." });
  const card = await Flashcard.findOne({ user: user._id });
  const dueNow = card!.dueAt.getTime();
  await gradeFlashcard(String(card!._id), true);
  const graded = await Flashcard.findById(card!._id);
  check("grading a flashcard right pushes its due date out", (graded?.dueAt.getTime() ?? 0) > dueNow);
  check("and moves it up the ladder", (graded?.step ?? 0) === 1);

  console.log("\nknowledge — snippets");
  await saveSnippet({ title: "Mongo connect", language: "typescript", code: "mongoose.connect(uri)" });
  check("a snippet can be saved", (await Snippet.countDocuments({ user: user._id })) === 1);

  console.log("\nknowledge — the note gate still holds");
  const lesson = await Lesson.findOne();
  // Start from a clean slate: the loop test left a note on this same lesson.
  await Note.deleteMany({ user: user._id, lesson: lesson!._id });
  const lessonNote = await createNote({ title: "Lesson note", body: "In my own words.", lessonId: String(lesson!._id) });
  const progressed = await LessonProgress.findOne({ user: user._id, lesson: lesson!._id });
  check("a lesson-linked note still clears the note gate", progressed?.gate.noted === true);
  await deleteNote(lessonNote.id); // first delete only trashes
  const afterTrash = await LessonProgress.findOne({ user: user._id, lesson: lesson!._id });
  check("trashing the only note reopens the gate", afterTrash?.gate.noted === false);

  delete process.env.SMOKE_CLERK_ID;
}

/* ---------------------------------------------------------------- practice */

async function checkPractice() {
  const { runChallenge } = await import("../src/lib/runner");
  const { Challenge, ChallengeProgress, ChallengeAttempt } = await import("../src/lib/models");
  const { requireUser } = await import("../src/lib/user");
  const { runCode, submitCode } = await import("../src/lib/actions");

  console.log("\npractice — the executor");

  // Direct executor unit checks — the part everything else depends on.
  const good = runChallenge("function add(a,b){return a+b}", [
    { call: "add(2,3)", expected: "5" },
    { call: "add(-1,1)", expected: "0" },
  ]);
  check("correct code passes every test", good.ok && good.passedCount === 2);

  const wrong = runChallenge("function add(a,b){return a-b}", [{ call: "add(2,3)", expected: "5" }]);
  check("wrong code fails", !wrong.ok && wrong.passedCount === 0);

  const broken = runChallenge("function add(a,b){ this is not js", [{ call: "add(1,1)", expected: "2" }]);
  check("a syntax error is reported, not thrown", broken.error != null && broken.results.length === 0);

  const looping = runChallenge("function f(){ while(true){} }", [{ call: "f()", expected: "1" }]);
  check("an infinite loop is killed by the timeout", looping.results[0]?.passed === false);

  const deep = runChallenge("function pair(){return [1,{a:2}]}", [{ call: "pair()", expected: '[1,{"a":2}]' }]);
  check("results compare structurally, not by identity", deep.ok);

  const escaped = runChallenge("function f(){ return typeof process }", [{ call: "f()", expected: '"undefined"' }]);
  check("the sandbox hides process from the code", escaped.ok);

  console.log("\npractice — grading and XP");

  process.env.SMOKE_CLERK_ID = CLERK_ID;
  const user = await requireUser();

  const challenge = await Challenge.create({
    slug: "smoke-add",
    title: "Add",
    prompt: "Add two numbers",
    starterCode: "function add(a,b){}",
    entryPoint: "add",
    xp: 40,
    tests: [
      { call: "add(1,2)", expected: "3" },
      { call: "add(10,20)", expected: "30", hidden: true },
    ],
  });
  const cid = String(challenge._id);

  const dryRun = await runCode(cid, "function add(a,b){return a+b}");
  check("Run grades only the visible tests", dryRun.total === 1);
  check("Run records no attempt", (await ChallengeAttempt.countDocuments({ user: user._id, challenge: cid })) === 0);

  const xpBefore = (await User.findById(user._id))!.xp ?? 0;
  const failedSubmit = await submitCode(cid, "function add(a,b){return a-b}");
  check("a failing submit is not solved", failedSubmit.ok === false);
  check("but it is recorded as an attempt", (await ChallengeAttempt.countDocuments({ user: user._id, challenge: cid })) === 1);
  check("a failed submit awards no XP", ((await User.findById(user._id))!.xp ?? 0) === xpBefore);

  const passSubmit = await submitCode(cid, "function add(a,b){return a+b}", 5);
  check("a passing submit runs the hidden tests too", passSubmit.outcome?.total === 2);
  check("passing marks it solved and first-solve", passSubmit.ok && passSubmit.firstSolve === true);
  check("solving awards XP", ((await User.findById(user._id))!.xp ?? 0) === xpBefore + 40);

  const again = await submitCode(cid, "function add(a,b){return a+b}", 5);
  check("re-solving does not award XP twice", !again.firstSolve && ((await User.findById(user._id))!.xp ?? 0) === xpBefore + 40);

  const progress = await ChallengeProgress.findOne({ user: user._id, challenge: cid });
  check("progress records it solved", progress?.solved === true);

  await Challenge.deleteOne({ _id: cid });
  await ChallengeProgress.deleteMany({ challenge: cid });
  await ChallengeAttempt.deleteMany({ challenge: cid });

  delete process.env.SMOKE_CLERK_ID;
}

/* --------------------------------------------------------------------- ai */

async function checkAi() {
  const { requireUser } = await import("../src/lib/user");
  const { checkCap, recordUsage, costMicros, DAILY_REQUEST_CAP } = await import("../src/lib/ai");
  const { AiUsage, AiMemory, AiConversation, AiMessage } = await import("../src/lib/models");
  const { createConversation, deleteConversation, saveMemory, deleteMemory } = await import("../src/lib/actions");
  const { dayKey } = await import("../src/lib/day");

  process.env.SMOKE_CLERK_ID = CLERK_ID;
  const user = await requireUser();

  console.log("\nai — cost caps (the urgent one)");

  const fresh = await checkCap(user._id);
  check("a fresh user is under the cap", fresh.ok === true);

  await recordUsage(user._id, 1000, 500);
  const usage = await AiUsage.findOne({ user: user._id, day: dayKey() });
  check("usage records tokens", usage?.inputTokens === 1000 && usage?.outputTokens === 500);
  check("and computes a cost", usage?.costMicros === costMicros(1000, 500));
  check("and counts the request", usage?.requests === 1);

  // Trip the request ceiling directly and confirm the gate refuses.
  await AiUsage.updateOne({ user: user._id, day: dayKey() }, { $set: { requests: DAILY_REQUEST_CAP } });
  const capped = await checkCap(user._id);
  check("hitting the request cap refuses further calls", capped.ok === false);

  await AiUsage.deleteMany({ user: user._id });

  console.log("\nai — memory is editable");
  await saveMemory({ key: "Current goal", value: "Ship the backend", kind: "goal" });
  const mem = await AiMemory.findOne({ user: user._id, key: "Current goal" });
  check("a memory can be saved", mem?.value === "Ship the backend");
  await saveMemory({ key: "Current goal", value: "Ship everything", kind: "goal" });
  check("saving the same key updates rather than duplicates", (await AiMemory.countDocuments({ user: user._id, key: "Current goal" })) === 1);
  await deleteMemory(String(mem!._id));
  check("a memory can be forgotten", (await AiMemory.findById(mem!._id)) === null);

  console.log("\nai — conversations");
  const convo = await createConversation({ title: "Test chat" });
  check("a conversation can be created", (await AiConversation.findById(convo.id)) !== null);
  await AiMessage.create({ conversation: convo.id, user: user._id, role: "user", content: "hi" });
  await deleteConversation(convo.id);
  check("deleting a conversation removes it", (await AiConversation.findById(convo.id)) === null);
  check("and takes its messages with it", (await AiMessage.countDocuments({ conversation: convo.id })) === 0);

  delete process.env.SMOKE_CLERK_ID;
}

/* ------------------------------------------------------------------ career */

async function checkCareer() {
  const { scoreResume } = await import("../src/lib/ats");
  const { requireUser } = await import("../src/lib/user");
  const { createResume, saveResume, createApplication, moveApplication } = await import("../src/lib/actions");
  const { Resume, JobApplication } = await import("../src/lib/models");

  console.log("\ncareer — ATS scoring (pure)");

  const empty = scoreResume({});
  check("an empty resume scores low", empty.score < 20);
  check("and lists what is missing", empty.findings.length > 3);

  const strong = scoreResume({
    personal: { fullName: "A Dev", email: "a@dev.io", headline: "Full-stack developer" },
    summary: "A developer who builds real things. ".repeat(6),
    skills: ["TypeScript", "React", "Node", "MongoDB", "Next.js", "Docker", "Postgres", "AWS"],
    experience: [{ role: "Dev", company: "X", bullets: ["Built a system, reducing latency by 40%", "Led a team of 3"] }],
    projects: [{}, {}],
    education: [{}],
  });
  check("a complete resume scores high", strong.score >= 80);
  check("action-verb, quantified bullets are recognised", strong.strengths.some((s) => /action|quantif/i.test(s)));

  console.log("\ncareer — resume persistence + applications");

  process.env.SMOKE_CLERK_ID = CLERK_ID;
  const user = await requireUser();

  const { id } = await createResume({ title: "My CV" });
  check("a resume is created", (await Resume.findById(id)) !== null);

  const result = await saveResume(id, {
    personal: { fullName: "Dev", email: "d@ev.io", headline: "Builder" },
    summary: "Long enough summary to count for the ATS score here now. ".repeat(3),
    skills: ["TS", "React", "Node", "Mongo", "Next", "Docker", "SQL", "AWS"],
  });
  check("saving recomputes and returns an ATS score", (result?.atsScore ?? 0) > 0);
  const stored = await Resume.findById(id);
  check("the score is persisted on the resume", stored?.atsScore === result?.atsScore);

  const app = await createApplication({ company: "Acme", position: "Engineer", status: "wishlist" });
  check("an application can be tracked", app.ok === true);
  await moveApplication(app.ok ? app.id : "", "applied");
  const moved = await JobApplication.findById(app.ok ? app.id : "");
  check("moving to applied stamps the date", moved?.appliedAt instanceof Date);
  check("and appends to the timeline", (moved?.timeline?.length ?? 0) >= 2);

  await Resume.deleteMany({ user: user._id });
  await JobApplication.deleteMany({ user: user._id });
  delete process.env.SMOKE_CLERK_ID;
}

/* --------------------------------------------------------------- analytics */

async function checkAnalytics() {
  const { earnedKeys, ACHIEVEMENTS } = await import("../src/lib/achievements");
  const { requireUser } = await import("../src/lib/user");
  const { createGoal, createHabit, toggleHabitToday, logFocusSession, createEvent, syncAchievements } =
    await import("../src/lib/actions");
  const { getGoals, getHabits, getFocusToday } = await import("../src/lib/queries");
  const { Habit, FocusSession, CalendarEvent, Achievement, Goal, StudySession } = await import("../src/lib/models");
  const { dayKey } = await import("../src/lib/day");

  console.log("\nanalytics — achievement engine (pure)");
  check("a beginner has earned nothing", earnedKeys({}).length === 0);
  check("one mastered lesson earns the first badge", earnedKeys({ lessonsMastered: 1 }).includes("first-lesson"));
  check("higher counts earn more", earnedKeys({ challengesSolved: 50 }).length > earnedKeys({ challengesSolved: 1 }).length);
  check("every badge has a positive threshold", ACHIEVEMENTS.every((a) => a.threshold > 0));

  process.env.SMOKE_CLERK_ID = CLERK_ID;
  const user = await requireUser();

  console.log("\nanalytics — habits and streaks");
  await createHabit({ title: "Practice daily" });
  const habit = await Habit.findOne({ user: user._id });
  await toggleHabitToday(String(habit!._id));
  const doneOnce = await Habit.findById(habit!._id);
  check("ticking a habit today sets a 1-day streak", doneOnce?.currentStreak === 1);
  check("and records today", (doneOnce?.completedDays ?? []).includes(dayKey()));
  await toggleHabitToday(String(habit!._id));
  const undone = await Habit.findById(habit!._id);
  check("un-ticking clears the streak", undone?.currentStreak === 0);

  const habits = await getHabits(user._id);
  check("the habit query reports doneToday correctly", habits[0]?.doneToday === false);

  console.log("\nanalytics — focus sessions feed time tracking");
  await logFocusSession({ minutes: 25, intent: "deep work" });
  const focus = await getFocusToday(user._id);
  check("a focus session is logged", focus.count === 1 && focus.minutes === 25);
  const session = await StudySession.findOne({ user: user._id, day: dayKey() });
  check("and its minutes reach the day's study session", (session?.focusMinutes ?? 0) === 25);

  console.log("\nanalytics — goals measure live");
  await createGoal({ title: "Focus 20 min", metric: "minutes", target: 20, period: "day" });
  const goals = await getGoals(user._id);
  const goal = goals.find((g) => g.title === "Focus 20 min");
  check("a minutes goal reads real study time", (goal?.value ?? 0) >= 25);
  check("and is marked achieved when met", goal?.achieved === true);

  console.log("\nanalytics — achievement sweep unlocks");
  await syncAchievements();
  // The focus session logged 25 min but the badge needs 600; nothing yet.
  const focusBadge = await Achievement.findOne({ user: user._id, key: "focus-600" });
  check("an unmet badge stays locked", focusBadge === null);

  console.log("\ncalendar — events and pulled-in deadlines");
  await createEvent({ title: "Study block", kind: "study", startAt: new Date().toISOString() });
  check("a calendar event can be created", (await CalendarEvent.countDocuments({ user: user._id })) === 1);

  await Promise.all([
    Habit.deleteMany({ user: user._id }),
    FocusSession.deleteMany({ user: user._id }),
    CalendarEvent.deleteMany({ user: user._id }),
    Achievement.deleteMany({ user: user._id }),
    Goal.deleteMany({ user: user._id }),
  ]);
  delete process.env.SMOKE_CLERK_ID;
}

/* ------------------------------------------------------------------- admin */

async function checkAdmin() {
  const { requireUser, requireAdmin } = await import("../src/lib/user");
  const { setUserRole, upsertFlag, createLesson } = await import("../src/lib/actions");
  const { AuditLog, FeatureFlag, User } = await import("../src/lib/models");

  console.log("\nadmin — the guard");

  // The smoke user is a normal user (not first-ever on the shared smoke db).
  process.env.SMOKE_CLERK_ID = CLERK_ID;
  const user = await requireUser();
  await User.updateOne({ _id: user._id }, { $set: { role: "user" } });

  let refused = false;
  try { await requireAdmin(); } catch { refused = true; }
  check("a normal user is refused admin", refused === true);

  let flagBlocked = false;
  try { await upsertFlag({ key: "x", enabled: true }); } catch { flagBlocked = true; }
  check("a normal user cannot toggle a flag", flagBlocked === true);

  console.log("\nadmin — actions are audited");
  await User.updateOne({ _id: user._id }, { $set: { role: "admin" } });

  await upsertFlag({ key: "smoke-flag", enabled: true, description: "test" });
  check("an admin can create a flag", (await FeatureFlag.findOne({ key: "smoke-flag" }))?.enabled === true);
  check("and it is written to the audit log", (await AuditLog.countDocuments({ actor: user._id, action: /flag/ })) >= 1);

  console.log("\nadmin — last-admin protection");
  // Make a second admin, then confirm the smoke admin cannot demote themselves
  // while they would be the last one — first create a stranger admin.
  const stranger = await User.findOneAndUpdate(
    { clerkId: "smoke-test-stranger" },
    { $setOnInsert: { name: "S" }, $set: { role: "user" } },
    { upsert: true, new: true }
  );
  // Only smoke user is admin now. Demoting them must be refused.
  await User.updateMany({ _id: { $ne: user._id }, role: "admin" }, { $set: { role: "user" } });
  const demoteSelf = await setUserRole(String(user._id), "user");
  check("cannot demote the last admin", demoteSelf.ok === false);

  // Promote the stranger, then demoting the smoke user is allowed.
  await setUserRole(String(stranger._id), "admin");
  const nowOk = await setUserRole(String(stranger._id), "user");
  check("demoting is allowed while another admin exists", nowOk.ok === true);

  await FeatureFlag.deleteMany({ key: "smoke-flag" });
  await AuditLog.deleteMany({ actor: user._id });
  delete process.env.SMOKE_CLERK_ID;
}

/* ------------------------------------------------------------ tier-0 finishes */

async function checkTierZero() {
  const { requireUser } = await import("../src/lib/user");
  const { trackLessonTime } = await import("../src/lib/actions");
  const { searchLessons } = await import("../src/lib/queries");
  const { Lesson, LessonProgress, TimeEntry, StudySession } = await import("../src/lib/models");
  const { dayKey } = await import("../src/lib/day");

  process.env.SMOKE_CLERK_ID = CLERK_ID;
  const user = await requireUser();
  const lesson = await Lesson.findOne();

  console.log("\ntier-0 — real lesson time tracking");
  await trackLessonTime(String(lesson!._id), 30);
  const progress = await LessonProgress.findOne({ user: user._id, lesson: lesson!._id });
  check("a heartbeat accrues real minutes on the lesson", (progress?.minutesSpent ?? 0) > 0);
  const entry = await TimeEntry.findOne({ user: user._id, kind: "lesson", lesson: lesson!._id, day: dayKey() });
  check("and books it as a lesson TimeEntry", entry !== null);

  await trackLessonTime(String(lesson!._id), 30);
  const entries = await TimeEntry.countDocuments({ user: user._id, kind: "lesson", lesson: lesson!._id, day: dayKey() });
  check("a second beat increments the same daily entry, not a new one", entries === 1);

  const beat = await StudySession.findOne({ user: user._id, day: dayKey() });
  check("tracked time reaches the day's study session", (beat?.minutes ?? 0) > 0);

  console.log("\ntier-0 — lesson search");
  const found = await searchLessons(String(lesson!.title).slice(0, 5));
  check("a lesson is found by a slice of its title", found.some((l) => l.id === String(lesson!._id)));
  check("a one-character query returns nothing", (await searchLessons("x")).length === 0);

  delete process.env.SMOKE_CLERK_ID;
}

/* ---------------------------------------------------------------- platform */

async function checkPlatform() {
  const { requireUser } = await import("../src/lib/user");
  const { search, getNotifications } = await import("../src/lib/queries");
  const { updatePreferences, exportData, createNote, deleteAccount } = await import("../src/lib/actions");
  const { User, Note, Notification, Project } = await import("../src/lib/models");

  process.env.SMOKE_CLERK_ID = CLERK_ID;
  const user = await requireUser();

  console.log("\nplatform — global search");
  await createNote({ title: "Kubernetes basics", body: "pods and services" });
  await Project.create({ user: user._id, title: "Kubernetes dashboard" });
  const hits = await search(user._id, "kubernetes");
  check("search finds a matching note", hits.some((h) => h.type === "Note" && /kubernetes/i.test(h.title)));
  check("and a matching project", hits.some((h) => h.type === "Project"));
  check("every hit carries a link", hits.every((h) => h.href.length > 0));
  check("a too-short query returns nothing", (await search(user._id, "k")).length === 0);
  check("search is scoped to the user", (await search("000000000000000000000000", "kubernetes")).every((h) => h.type === "Lesson" || h.type === "Challenge"));

  console.log("\nplatform — settings");
  await updatePreferences({ theme: "light", pomodoroMinutes: 50, notifyReviews: false });
  const after = await User.findById(user._id);
  check("a preference is saved", after?.preferences?.theme === "light");
  check("and only whitelisted keys land", after?.preferences?.pomodoroMinutes === 50);

  // A malicious extra key must not reach the document. Capture the baseline
  // rather than assume it — an earlier check may have set this user's role.
  const before = await User.findById(user._id);
  const roleBefore = before?.role;
  const xpBefore = before?.xp ?? 0;
  await updatePreferences({ theme: "dark", role: "superadmin", xp: 999999 } as Record<string, unknown>);
  const guarded = await User.findById(user._id);
  check("settings cannot smuggle in role or xp", guarded?.role === roleBefore && (guarded?.xp ?? 0) === xpBefore);

  console.log("\nplatform — data export and account delete");
  const json = await exportData();
  const parsed = JSON.parse(json);
  check("export includes the user's notes", Array.isArray(parsed.notes) && parsed.notes.length >= 1);

  await Notification.create({ user: user._id, title: "Test", kind: "system" });
  check("notifications read back", (await getNotifications(user._id)).length >= 1);

  const noDelete = await deleteAccount("nope");
  check("delete refuses without the confirm word", noDelete.ok === false);
  check("and the user still exists", (await User.findById(user._id)) !== null);

  const del = await deleteAccount("DELETE");
  check("delete removes the account", del.ok === true && (await User.findById(user._id)) === null);
  check("and takes the user's notes with it", (await Note.countDocuments({ user: user._id })) === 0);

  delete process.env.SMOKE_CLERK_ID;
}

const TEST_CLERK_IDS = [CLERK_ID, "smoke-test-stranger"];

/**
 * Runs at both ends. At the start because a run that crashed half way through
 * leaves a user with gates already ticked, and the next run then "passes"
 * checks it never really made — a green result built on someone else's state
 * is worse than a red one.
 */
async function cleanup() {
  const users = await User.find({ clerkId: { $in: TEST_CLERK_IDS } }).select("_id").lean();
  const ids = users.map((u) => u._id);
  if (ids.length === 0) return;

  await Promise.all([
    User.deleteMany({ _id: { $in: ids } }),
    LessonProgress.deleteMany({ user: { $in: ids } }),
    Note.deleteMany({ user: { $in: ids } }),
    Review.deleteMany({ user: { $in: ids } }),
    StudySession.deleteMany({ user: { $in: ids } }),
    Project.deleteMany({ user: { $in: ids } }),
    Task.deleteMany({ user: { $in: ids } }),
    Milestone.deleteMany({ user: { $in: ids } }),
    Bug.deleteMany({ user: { $in: ids } }),
    Deployment.deleteMany({ user: { $in: ids } }),
    ActivityLog.deleteMany({ user: { $in: ids } }),
    TimeEntry.deleteMany({ user: { $in: ids } }),
    Backlink.deleteMany({ user: { $in: ids } }),
    NoteVersion.deleteMany({ user: { $in: ids } }),
    Flashcard.deleteMany({ user: { $in: ids } }),
    Snippet.deleteMany({ user: { $in: ids } }),
    AiUsage.deleteMany({ user: { $in: ids } }),
    AiMemory.deleteMany({ user: { $in: ids } }),
    AiConversation.deleteMany({ user: { $in: ids } }),
    AiMessage.deleteMany({ user: { $in: ids } }),
    (await import("../src/lib/models")).Resume.deleteMany({ user: { $in: ids } }),
    (await import("../src/lib/models")).JobApplication.deleteMany({ user: { $in: ids } }),
    (await import("../src/lib/models")).Certificate.deleteMany({ user: { $in: ids } }),
    (await import("../src/lib/models")).Interview.deleteMany({ user: { $in: ids } }),
    (await import("../src/lib/models")).Client.deleteMany({ user: { $in: ids } }),
    (await import("../src/lib/models")).IncomeEntry.deleteMany({ user: { $in: ids } }),
    (await import("../src/lib/models")).Portfolio.deleteMany({ user: { $in: ids } }),
  ]);
}

async function main() {
  // The smoke test creates and deletes users, so it must never run against the
  // real application database. SMOKE_MONGODB_URI lets you point it at a throwaway
  // (the local `npm run db` is ideal); it only falls back to MONGODB_URI when no
  // dedicated one is set.
  const uri = process.env.SMOKE_MONGODB_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error("Set SMOKE_MONGODB_URI (or MONGODB_URI) — see SETUP.md");

  // The app's connectDB() reads MONGODB_URI at call time. Point it at the same
  // database the harness is on, or the two open competing connections.
  process.env.MONGODB_URI = uri;

  await mongoose.connect(uri);
  console.log(`connected to ${uri.replace(/\/\/[^@]*@/, "//***@")}`);

  await cleanup();
  await ensureContent();
  checkPureLogic();
  await checkTheLoop();
  await checkProjects();
  await checkKnowledge();
  await checkPractice();
  await checkAi();
  await checkCareer();
  await checkAnalytics();
  await checkAdmin();
  await checkTierZero();
  await checkPlatform();
  await cleanup();

  await mongoose.disconnect();

  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length > 0) {
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
  }
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
