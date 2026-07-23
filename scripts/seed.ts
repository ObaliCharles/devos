/**
 * Loads the starter roadmap. Safe to re-run: it wipes content collections
 * (Roadmap/Phase/Skill/Lesson) but never touches user progress or notes.
 *
 *   npm run seed
 */
import "dotenv/config";
import mongoose from "mongoose";
import { config } from "dotenv";
import { Challenge, Lesson, Phase, Roadmap, Skill } from "../src/lib/models";
import { CHALLENGES } from "./seed-challenges";

config({ path: ".env.local", override: true });

type LessonSeed = {
  title: string;
  objectives: string[];
  estimatedMinutes: number;
  body: string;
  exercise: { brief: string; acceptance: string[] };
  quiz: { prompt: string; choices: string[]; answerIndex: number; explanation: string }[];
  xp?: number;
};

type SkillSeed = {
  title: string;
  why: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedHours: number;
  lessons: LessonSeed[];
};

type PhaseSeed = {
  title: string;
  subtitle: string;
  summary: string;
  estimatedWeeks: number;
  skills: SkillSeed[];
};

const PHASES: PhaseSeed[] = [
  {
    title: "Foundation",
    subtitle: "The language and the tooling, properly",
    summary: "Everything after this assumes you can write Python without looking things up, and that your work is in version control.",
    estimatedWeeks: 10,
    skills: [
      {
        title: "Python essentials",
        why: "The language you will write most of your backend in. Get past syntax and into how Python actually thinks about data.",
        difficulty: "beginner",
        estimatedHours: 30,
        lessons: [
          {
            title: "Values, names and the REPL",
            estimatedMinutes: 35,
            objectives: [
              "Explain the difference between a name and the value it points to",
              "Predict when two names share one object",
              "Use the REPL to answer your own questions instead of guessing",
            ],
            body: `Most beginner Python bugs come from one misunderstanding: people think a variable is a box that holds a value. It isn't. A name is a *label* stuck onto an object that lives somewhere in memory.

\`\`\`python
a = [1, 2, 3]
b = a
b.append(4)
print(a)   # [1, 2, 3, 4]
\`\`\`

There is one list here, not two. \`b = a\` did not copy anything — it stuck a second label on the same object. This is why \`a\` changed.

Compare that with:

\`\`\`python
x = 5
y = x
y = 6
print(x)   # 5
\`\`\`

Nothing surprising, because integers are **immutable**. \`y = 6\` didn't modify the 5; it pointed \`y\` at a different object entirely.

## The rule worth memorising

Types split into two camps:

| Mutable | Immutable |
|---|---|
| \`list\`, \`dict\`, \`set\` | \`int\`, \`float\`, \`str\`, \`tuple\`, \`bool\` |

Rebinding a name (\`x = ...\`) always just moves the label. Mutating an object (\`.append()\`, \`d[k] = v\`) changes the thing every label points at.

## Check it yourself

\`id()\` gives you the object's identity. \`is\` compares identity; \`==\` compares value.

\`\`\`python
a = [1, 2]
b = [1, 2]
a == b   # True  — same contents
a is b   # False — different objects
\`\`\`

## Use the REPL

Open a terminal and type \`python3\`. You now have a place to test any of this in three seconds rather than believing what you half-remember. Every time you are unsure what an expression does, that is a REPL question, not a Google question.`,
            exercise: {
              brief: "Write a function `add_item(item, basket=[])` that appends to the basket and returns it. Call it three times without passing a basket. Explain, in a comment, why the output is what it is — then fix the function so each call starts empty.",
              acceptance: [
                "You can state out loud why the default argument is shared between calls",
                "The fixed version uses `None` as the default and creates a new list inside",
                "You verified both versions in the REPL rather than assuming",
              ],
            },
            quiz: [
              {
                prompt: "After `a = [1, 2]; b = a; b.append(3)`, what is `a`?",
                choices: ["[1, 2]", "[1, 2, 3]", "[3]", "It raises an error"],
                answerIndex: 1,
                explanation: "`b = a` binds a second name to the same list object, so mutating through `b` is visible through `a`.",
              },
              {
                prompt: "Which of these is immutable?",
                choices: ["list", "dict", "tuple", "set"],
                answerIndex: 2,
                explanation: "Tuples cannot be changed after creation. Lists, dicts and sets can.",
              },
              {
                prompt: "`a == b` is True but `a is b` is False. What does that tell you?",
                choices: [
                  "They are the same object",
                  "They have equal contents but are different objects",
                  "One of them is None",
                  "Nothing — the two operators mean the same thing",
                ],
                answerIndex: 1,
                explanation: "`==` compares value; `is` compares identity. Equal contents, separate objects.",
              },
            ],
          },
          {
            title: "Functions, arguments and return values",
            estimatedMinutes: 40,
            objectives: [
              "Write functions that do one thing and return a value",
              "Use keyword arguments and defaults without the mutable-default trap",
              "Read a traceback and find the line that actually matters",
            ],
            body: `A function is the smallest unit of reuse you have. The habit worth forming early: **a function should do one thing, and it should return rather than print.**

\`\`\`python
# Hard to reuse — it only knows how to talk to a terminal.
def show_total(items):
    print(sum(i["price"] for i in items))

# Reusable — the caller decides what to do with the number.
def total(items):
    return sum(i["price"] for i in items)
\`\`\`

Once \`total\` returns, you can print it, store it, put it in an API response, or test it. The first version can only ever be printed.

## Arguments

\`\`\`python
def invoice(amount, *, currency="UGX", tax_rate=0.18):
    return amount * (1 + tax_rate), currency
\`\`\`

The bare \`*\` forces everything after it to be passed by keyword. At the call site that turns \`invoice(50000, "USD", 0.1)\` — which nobody can read — into \`invoice(50000, currency="USD", tax_rate=0.1)\`.

## The mutable default trap

\`\`\`python
def add(item, basket=[]):   # evaluated ONCE, at definition time
    basket.append(item)
    return basket
\`\`\`

Every call without a basket shares the same list. The fix is always the same:

\`\`\`python
def add(item, basket=None):
    if basket is None:
        basket = []
    basket.append(item)
    return basket
\`\`\`

## Reading tracebacks

Python prints the call stack oldest-first, so **the last line is the actual error** and the line above it is where it happened in your code. Read a traceback from the bottom up and you will find the problem in seconds instead of minutes.`,
            exercise: {
              brief: "Write `split_bill(total, people, *, tip_rate=0.0)` that returns the amount each person owes, rounded to 2 decimal places. Raise a `ValueError` with a useful message when `people` is zero or negative.",
              acceptance: [
                "`split_bill(30000, 4)` returns 7500.0",
                "`split_bill(30000, 4, tip_rate=0.1)` returns 8250.0",
                "`split_bill(30000, 0)` raises ValueError with a message that says what was wrong",
                "The function returns a value — it does not print",
              ],
            },
            quiz: [
              {
                prompt: "Why is `def f(x, items=[])` risky?",
                choices: [
                  "Lists cannot be default arguments",
                  "The default list is created once and shared across all calls",
                  "It is slower than using None",
                  "It only works in Python 2",
                ],
                answerIndex: 1,
                explanation: "Defaults are evaluated at definition time, so every call that omits the argument mutates the same list.",
              },
              {
                prompt: "In a traceback, where is the error message itself?",
                choices: ["The first line", "The last line", "The middle", "In a separate log file"],
                answerIndex: 1,
                explanation: "Python prints the stack oldest-first and the exception last. Read from the bottom up.",
              },
              {
                prompt: "What does the bare `*` do in `def f(a, *, b=1)`?",
                choices: [
                  "Makes b optional",
                  "Collects extra positional arguments",
                  "Forces b to be passed as a keyword argument",
                  "Nothing — it is decorative",
                ],
                answerIndex: 2,
                explanation: "Everything after a bare `*` is keyword-only, which makes call sites readable.",
              },
            ],
          },
          {
            title: "Lists, dicts and comprehensions",
            estimatedMinutes: 35,
            objectives: [
              "Choose between a list and a dict based on how you will look things up",
              "Write a comprehension that stays readable",
              "Know when a loop is the better choice",
            ],
            body: `Choosing the wrong container is the most common cause of slow code written by competent people.

- **List** — ordered, you iterate it. Finding an item by value is O(n): Python checks every element.
- **Dict** — you look things up by key. That lookup is O(1) no matter how big the dict gets.

\`\`\`python
# 10,000 users, checking membership in a loop.
if user_id in user_id_list:    # scans up to 10,000 entries, every time
if user_id in user_id_set:     # one hash lookup
\`\`\`

If you find yourself writing \`for x in things: if x.id == wanted\`, you probably wanted a dict keyed by id.

## Comprehensions

\`\`\`python
names = [u["name"] for u in users if u["active"]]
by_id = {u["id"]: u for u in users}
\`\`\`

Read them left to right: *what I want*, *where it comes from*, *which ones*. That order is the reason they are easier to scan than the equivalent loop.

## When not to use one

A comprehension is for **building a collection**. The moment it grows a second condition, a nested loop, and a ternary, it has stopped being clearer than a loop:

\`\`\`python
# Don't.
result = [transform(x) if x.ok else fallback(x) for group in data for x in group if x.visible]
\`\`\`

Write the loop. Readability is a feature.

## Grouping

The pattern you will use constantly:

\`\`\`python
from collections import defaultdict

by_phase = defaultdict(list)
for lesson in lessons:
    by_phase[lesson["phase"]].append(lesson)
\`\`\``,
            exercise: {
              brief: "Given a list of dicts with `name`, `skill` and `hours`, produce (1) a dict mapping skill -> total hours, and (2) a list of names for anyone with more than 10 hours. Use a comprehension where it stays readable and a loop where it doesn't.",
              acceptance: [
                "The totals are correct for a skill that appears more than once",
                "Neither piece of code scans the list more times than it needs to",
                "You can explain why you chose a dict for one and a list for the other",
              ],
            },
            quiz: [
              {
                prompt: "What is the cost of `x in my_list` for a list of n items?",
                choices: ["O(1)", "O(log n)", "O(n)", "O(n²)"],
                answerIndex: 2,
                explanation: "Lists are scanned linearly. Sets and dict keys are hashed, giving O(1) average lookup.",
              },
              {
                prompt: "Which is the better container for 'look up a user by id'?",
                choices: ["list of users", "dict keyed by id", "tuple of users", "string of ids"],
                answerIndex: 1,
                explanation: "A dict gives constant-time lookup by key, which is exactly the access pattern.",
              },
            ],
          },
        ],
      },
      {
        title: "Git and GitHub",
        why: "Version control is not admin work. It is how you undo mistakes, work on two things at once, and prove what you have built.",
        difficulty: "beginner",
        estimatedHours: 12,
        lessons: [
          {
            title: "Commits that mean something",
            estimatedMinutes: 30,
            objectives: [
              "Stage deliberately instead of committing everything",
              "Write a commit message a stranger can use",
              "Undo the three mistakes everyone makes",
            ],
            body: `A commit is a save point you may need to read a year from now, possibly during an incident. Treat it as communication, not bookkeeping.

## Stage deliberately

\`git add .\` is how unrelated changes end up in one commit. Use \`git add -p\` and Git will walk you through each hunk and ask whether it belongs. This single habit improves your history more than anything else.

## Message shape

\`\`\`
Fix double-charge when payment retries

Stripe sends webhook events at least once, so a retry was creating
a second invoice. Key the insert on the event id instead.
\`\`\`

Subject line: imperative mood, under ~50 characters, says *what changed*. Body: says *why*. The diff already shows how — you never need to repeat that.

## The three undos

| Situation | Command |
|---|---|
| Wrong message on the last commit | \`git commit --amend\` |
| Committed too early, want the changes back | \`git reset --soft HEAD~1\` |
| Need to throw away uncommitted work in one file | \`git restore <file>\` |

\`--soft\` keeps your changes staged. \`--hard\` deletes them. Learn the difference before you need it at midnight.

## Never commit

\`.env\`, credentials, \`node_modules\`, build output. Add them to \`.gitignore\` **before** the first commit — once a secret is in history, removing it means rewriting every commit after it.`,
            exercise: {
              brief: "Take a project you already have. Make two unrelated changes, then use `git add -p` to commit them separately with proper messages. Then amend the second message.",
              acceptance: [
                "`git log --oneline` shows two commits, each describing one change",
                "Neither commit contains files unrelated to its message",
                "You amended a message without creating an extra commit",
              ],
            },
            quiz: [
              {
                prompt: "You committed too early and want the changes back as staged edits. Which command?",
                choices: ["git reset --hard HEAD~1", "git reset --soft HEAD~1", "git revert HEAD", "git clean -fd"],
                answerIndex: 1,
                explanation: "`--soft` moves the branch pointer back but leaves your changes staged. `--hard` would discard them.",
              },
              {
                prompt: "What belongs in the body of a commit message?",
                choices: ["How the code works", "Why the change was needed", "The list of files touched", "The ticket number only"],
                answerIndex: 1,
                explanation: "The diff shows what and how. Only you know why, so that is the part worth writing down.",
              },
            ],
          },
          {
            title: "Branches and merge conflicts",
            estimatedMinutes: 35,
            objectives: [
              "Work on two things at once without them colliding",
              "Resolve a conflict by reading it rather than guessing",
              "Decide between merge and rebase for your own work",
            ],
            body: `A branch is a movable pointer to a commit. Creating one is nearly free, which is why the right number of branches is "one per thing you are working on".

\`\`\`bash
git switch -c feat/jwt-auth     # create and move onto it
git switch main                 # go back, your work is safe on the branch
\`\`\`

## Conflicts are not errors

Git stops when two branches changed the same lines and it cannot know which you want. It marks the file:

\`\`\`
<<<<<<< HEAD
expires_in = 3600
=======
expires_in = 900
>>>>>>> feat/jwt-auth
\`\`\`

Above the \`=======\` is what is on your current branch. Below is what is coming in. You delete the markers and leave the code you actually want — which is sometimes neither of them.

Then:

\`\`\`bash
git add <file>
git commit
\`\`\`

## Merge or rebase

- **Merge** keeps the true history, including the fact that two lines of work existed. Safe. Use it for anything already pushed and shared.
- **Rebase** replays your commits on top of the target branch, producing a straight line. Tidier. Only do it to commits nobody else has pulled.

The rule that keeps you out of trouble: *rebase your own unpushed work, merge everything else.*`,
            exercise: {
              brief: "Deliberately create a conflict: branch off, change one line, go back to main, change the same line differently, then merge. Resolve it.",
              acceptance: [
                "You created the conflict on purpose and were not surprised by it",
                "You resolved it by editing the file, not by deleting the branch",
                "You can explain which side of the markers is which",
              ],
            },
            quiz: [
              {
                prompt: "In a conflict, what sits above the `=======` line?",
                choices: [
                  "The incoming branch's version",
                  "The version on your current branch",
                  "The common ancestor",
                  "The oldest commit",
                ],
                answerIndex: 1,
                explanation: "Above is HEAD — where you are now. Below is what you are merging in.",
              },
              {
                prompt: "When is rebasing a bad idea?",
                choices: [
                  "On commits you have already pushed and others may have pulled",
                  "On your own local feature branch",
                  "Any time you have more than one commit",
                  "When the branch is up to date",
                ],
                answerIndex: 0,
                explanation: "Rebasing rewrites commit hashes. Doing that to shared history forces everyone else to reconcile.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    title: "Backend development",
    subtitle: "APIs and the data behind them",
    summary: "Where the Python you learned turns into something another program can call.",
    estimatedWeeks: 14,
    skills: [
      {
        title: "FastAPI",
        why: "A modern Python web framework where types do double duty as validation and documentation. What you will build most of your services in.",
        difficulty: "intermediate",
        estimatedHours: 40,
        lessons: [
          {
            title: "Your first endpoint",
            estimatedMinutes: 40,
            objectives: [
              "Run a FastAPI app locally and hit it",
              "Explain what the path operation decorator actually does",
              "Use the generated docs as a testing tool",
            ],
            body: `\`\`\`python
# main.py
from fastapi import FastAPI

app = FastAPI()

@app.get("/health")
def health():
    return {"status": "ok"}
\`\`\`

\`\`\`bash
pip install "fastapi[standard]"
fastapi dev main.py
\`\`\`

Open \`http://127.0.0.1:8000/docs\`. That interactive documentation was not written by anyone — FastAPI generated it from your function signature. This is the whole idea of the framework: **the types you write are the contract**.

## What the decorator does

\`@app.get("/health")\` registers your function in a routing table against the method and path. When a request arrives, FastAPI matches it, calls your function, and serialises whatever you returned to JSON.

## Path and query parameters

\`\`\`python
@app.get("/users/{user_id}")
def get_user(user_id: int, verbose: bool = False):
    ...
\`\`\`

\`user_id\` appears in the path, so it is a path parameter. \`verbose\` does not, so it becomes a query parameter — \`/users/7?verbose=true\`. The \`int\` annotation is not a hint: send \`/users/abc\` and you get a 422 with a precise error, before your function runs.

## Status codes

Returning a dict gives you 200. When that is wrong, say so:

\`\`\`python
from fastapi import HTTPException

@app.get("/users/{user_id}")
def get_user(user_id: int):
    user = find(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user
\`\`\``,
            exercise: {
              brief: "Build a two-endpoint API: `GET /health` returning a status, and `GET /convert?amount=&rate=` returning the converted amount. Return 400 when the rate is not positive.",
              acceptance: [
                "Both endpoints appear in /docs with correct types",
                "Passing a non-numeric amount produces a 422 automatically",
                "A rate of zero produces a 400 with a message that says what to do about it",
              ],
            },
            quiz: [
              {
                prompt: "A parameter in the function signature that does NOT appear in the path becomes what?",
                choices: ["A header", "A query parameter", "A body field", "An error"],
                answerIndex: 1,
                explanation: "FastAPI infers location from the path template: named in the path means path param, otherwise query.",
              },
              {
                prompt: "What status does FastAPI return when a value fails type validation?",
                choices: ["400", "404", "422", "500"],
                answerIndex: 2,
                explanation: "422 Unprocessable Entity, with a body describing exactly which field failed and why.",
              },
              {
                prompt: "Where does the /docs page come from?",
                choices: [
                  "You write it by hand",
                  "It is generated from your type annotations",
                  "It is fetched from the FastAPI website",
                  "A separate plugin",
                ],
                answerIndex: 1,
                explanation: "FastAPI builds an OpenAPI schema from your signatures and renders it. Wrong annotations produce wrong docs.",
              },
            ],
          },
          {
            title: "Pydantic models and validation",
            estimatedMinutes: 45,
            objectives: [
              "Define request and response models",
              "Keep internal fields out of API responses",
              "Validate business rules, not just types",
            ],
            body: `Type annotations handle *shape*. Pydantic models handle *meaning*.

\`\`\`python
from pydantic import BaseModel, EmailStr, Field

class UserCreate(BaseModel):
    email: EmailStr
    name: str = Field(min_length=2, max_length=80)
    age: int = Field(ge=13, le=120)
\`\`\`

Use it as a parameter and FastAPI reads the request body into it:

\`\`\`python
@app.post("/users", status_code=201)
def create_user(payload: UserCreate):
    return save(payload)
\`\`\`

Anything malformed is rejected with a 422 before your code runs. You never write \`if not email: return error\` again.

## Separate the models

This is the mistake worth avoiding early — one model doing input and output:

\`\`\`python
class UserCreate(BaseModel):     # what the client sends
    email: EmailStr
    password: str

class UserOut(BaseModel):        # what you send back
    id: int
    email: EmailStr
\`\`\`

\`\`\`python
@app.post("/users", response_model=UserOut, status_code=201)
def create_user(payload: UserCreate):
    ...
\`\`\`

\`response_model\` filters the response. Even if your function returns the whole database row, the password hash cannot leak, because it is not on \`UserOut\`. That is a security control, not a formatting preference.

## Rules beyond types

\`\`\`python
from pydantic import field_validator

class Booking(BaseModel):
    start: datetime
    end: datetime

    @field_validator("end")
    @classmethod
    def end_after_start(cls, v, info):
        if "start" in info.data and v <= info.data["start"]:
            raise ValueError("end must be after start")
        return v
\`\`\``,
            exercise: {
              brief: "Model a `POST /bookings` endpoint. Input takes a room name, start and end datetimes, and guest count. Output must not include the internal `created_by` field. Reject bookings shorter than 30 minutes.",
              acceptance: [
                "Separate input and output models exist",
                "`created_by` is stored but never appears in any response",
                "A 25-minute booking is rejected with a message naming the rule",
              ],
            },
            quiz: [
              {
                prompt: "What does `response_model` protect you from?",
                choices: [
                  "Slow responses",
                  "Accidentally returning fields the client should not see",
                  "Invalid request bodies",
                  "Database errors",
                ],
                answerIndex: 1,
                explanation: "The response is filtered to the model's fields, so internal columns cannot leak even if you return the whole row.",
              },
              {
                prompt: "Why use separate models for input and output?",
                choices: [
                  "FastAPI requires it",
                  "They genuinely differ — clients send passwords, responses return ids",
                  "It is faster",
                  "To reduce the number of files",
                ],
                answerIndex: 1,
                explanation: "What a client may send and what you may return are different contracts. One model forces you to compromise both.",
              },
            ],
          },
          {
            title: "Dependency injection with Depends",
            estimatedMinutes: 45,
            objectives: [
              "Share setup and teardown across endpoints",
              "Write an auth dependency once and reuse it",
              "Swap real dependencies for fakes in tests",
            ],
            body: `\`Depends\` is FastAPI's answer to "this endpoint needs a database session / the current user / a config object".

\`\`\`python
from fastapi import Depends

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/users")
def list_users(db = Depends(get_db)):
    return db.query(User).all()
\`\`\`

The \`yield\` matters: everything before it runs before your endpoint, everything after runs once the response is sent. That is how you guarantee the session closes even when the endpoint raises.

## Dependencies compose

\`\`\`python
def current_user(token: str = Depends(oauth2_scheme), db = Depends(get_db)):
    user = decode_and_load(token, db)
    if user is None:
        raise HTTPException(401, "Not authenticated")
    return user

def admin_only(user = Depends(current_user)):
    if user.role != "admin":
        raise HTTPException(403, "Admins only")
    return user
\`\`\`

\`admin_only\` depends on \`current_user\`, which depends on \`get_db\`. FastAPI resolves the whole chain and caches each dependency per request, so \`get_db\` runs once even though two things asked for it.

Applying it is now one line:

\`\`\`python
@app.delete("/users/{user_id}")
def delete_user(user_id: int, admin = Depends(admin_only)):
    ...
\`\`\`

## Why this matters for testing

\`\`\`python
app.dependency_overrides[get_db] = lambda: test_session
\`\`\`

Every endpoint now uses the test database, without touching endpoint code. Dependencies that are hard-coded inside functions cannot be swapped like this — which is the real argument for \`Depends\` over just calling \`SessionLocal()\` in the body.`,
            exercise: {
              brief: "Add an API-key dependency that reads an `X-API-Key` header, rejects missing or wrong keys with 401, and apply it to two endpoints. Then write one test that overrides it.",
              acceptance: [
                "The key check exists in exactly one place",
                "A request without the header gets 401, not 500",
                "The test overrides the dependency rather than sending a real key",
              ],
            },
            quiz: [
              {
                prompt: "In a `yield` dependency, when does the code after `yield` run?",
                choices: [
                  "Before the endpoint",
                  "After the response is sent",
                  "Only on error",
                  "It never runs",
                ],
                answerIndex: 1,
                explanation: "It is teardown — it runs after the response, including when the endpoint raised, which is what makes cleanup reliable.",
              },
              {
                prompt: "Two dependencies in one request both depend on `get_db`. How many times does `get_db` run?",
                choices: ["Once", "Twice", "Once per endpoint in the app", "It raises an error"],
                answerIndex: 0,
                explanation: "FastAPI caches dependency results within a single request, so the shared dependency resolves once.",
              },
              {
                prompt: "What is the main testing benefit of `Depends`?",
                choices: [
                  "Tests run faster",
                  "You can override dependencies without editing endpoint code",
                  "It removes the need for tests",
                  "It generates test data",
                ],
                answerIndex: 1,
                explanation: "`dependency_overrides` swaps the real thing for a fake at the app level, leaving endpoints untouched.",
              },
            ],
          },
        ],
      },
      {
        title: "PostgreSQL",
        why: "Where the data actually lives. Getting the schema right early saves more time than any framework choice you will make.",
        difficulty: "intermediate",
        estimatedHours: 30,
        lessons: [
          {
            title: "Tables, keys and constraints",
            estimatedMinutes: 40,
            objectives: [
              "Design a table where bad data is impossible, not just discouraged",
              "Use foreign keys to express real relationships",
              "Explain why NOT NULL is a feature",
            ],
            body: `The database is the last line of defence. Application code has bugs; constraints do not.

\`\`\`sql
CREATE TABLE users (
    id          BIGSERIAL PRIMARY KEY,
    email       TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE bookings (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    starts_at  TIMESTAMPTZ NOT NULL,
    ends_at    TIMESTAMPTZ NOT NULL,
    CONSTRAINT ends_after_start CHECK (ends_at > starts_at)
);
\`\`\`

Read what that buys you:

- **NOT NULL** — a booking without a start time cannot exist. No defensive \`if row.starts_at is None\` anywhere in your codebase.
- **UNIQUE** — two accounts on one email is impossible, even if two requests race.
- **REFERENCES** — a booking cannot point at a user who was never created.
- **ON DELETE CASCADE** — deleting a user takes their bookings with them, rather than leaving orphans.
- **CHECK** — the rule lives next to the data, so every client obeys it.

## TIMESTAMPTZ, always

\`TIMESTAMP\` throws the timezone away. \`TIMESTAMPTZ\` stores an actual moment. Use the second one and store UTC; convert at the edges. Fixing this later means reprocessing every row you have.

## Nullable means "unknown"

Only allow NULL when the absence is meaningful — \`deleted_at\` being NULL is genuinely "not deleted". Making a column nullable because you are not sure yet pushes the uncertainty into every query you will ever write against it.`,
            exercise: {
              brief: "Design the schema for the app you are building: at least three tables with foreign keys, appropriate NOT NULLs, one UNIQUE and one CHECK constraint. Then try to insert invalid data and watch it fail.",
              acceptance: [
                "Every column is NOT NULL unless you can say what NULL means there",
                "Deleting a parent row behaves the way you intended",
                "You attempted at least three invalid inserts and the database rejected all of them",
              ],
            },
            quiz: [
              {
                prompt: "Why prefer TIMESTAMPTZ over TIMESTAMP?",
                choices: [
                  "It uses less storage",
                  "It preserves the actual moment in time rather than a naive wall-clock reading",
                  "It sorts faster",
                  "TIMESTAMP is deprecated",
                ],
                answerIndex: 1,
                explanation: "TIMESTAMP has no timezone, so the same value means different moments depending on who reads it.",
              },
              {
                prompt: "What does ON DELETE CASCADE do?",
                choices: [
                  "Prevents deleting the parent row",
                  "Deletes child rows when the parent is deleted",
                  "Sets child references to NULL",
                  "Logs the deletion",
                ],
                answerIndex: 1,
                explanation: "The children go with the parent. The alternatives are RESTRICT (block it) and SET NULL.",
              },
            ],
          },
          {
            title: "Joins without fear",
            estimatedMinutes: 45,
            objectives: [
              "Choose between INNER and LEFT join by what you want to happen to missing rows",
              "Aggregate correctly with GROUP BY",
              "Recognise the N+1 query problem in your own code",
            ],
            body: `A join answers: *for each row here, which rows over there go with it?*

\`\`\`sql
SELECT u.name, b.starts_at
FROM users u
JOIN bookings b ON b.user_id = u.id;
\`\`\`

That is an INNER join. A user with no bookings does not appear at all. If you wanted every user regardless:

\`\`\`sql
SELECT u.name, b.starts_at
FROM users u
LEFT JOIN bookings b ON b.user_id = u.id;
\`\`\`

Now users with no bookings appear once with NULLs in the booking columns. **That is the entire difference, and it is the one thing to be deliberate about.**

## Counting

\`\`\`sql
SELECT u.name, COUNT(b.id) AS booking_count
FROM users u
LEFT JOIN bookings b ON b.user_id = u.id
GROUP BY u.id, u.name
ORDER BY booking_count DESC;
\`\`\`

\`COUNT(b.id)\` rather than \`COUNT(*)\`: with a LEFT JOIN, \`COUNT(*)\` counts the NULL row and reports 1 for a user with zero bookings. Counting a specific column ignores NULLs and gives you 0, which is the truth.

## N+1

\`\`\`python
users = db.query(User).all()          # 1 query
for u in users:
    print(len(u.bookings))            # 1 query each — 101 queries for 100 users
\`\`\`

One query becomes a hundred, and it only shows up once you have real data. Fix it by loading the relationship in the same round trip (\`joinedload\` / \`selectinload\` in SQLAlchemy) or by writing the aggregate as one SQL statement. Turn on query logging in development and you will spot these immediately.`,
            exercise: {
              brief: "Write three queries against your schema: every parent with its children, every parent including those with none, and a count per parent sorted descending. Then find one N+1 in your own code and fix it.",
              acceptance: [
                "You can say why each query uses INNER or LEFT",
                "The count query returns 0 rather than 1 for empty parents",
                "You confirmed the N+1 fix by counting queries before and after",
              ],
            },
            quiz: [
              {
                prompt: "A user has no bookings. With INNER JOIN, what happens to that user?",
                choices: ["Appears with NULLs", "Does not appear", "Appears twice", "Causes an error"],
                answerIndex: 1,
                explanation: "INNER JOIN only keeps rows with a match on both sides. LEFT JOIN keeps the left row and fills NULLs.",
              },
              {
                prompt: "Why `COUNT(b.id)` instead of `COUNT(*)` after a LEFT JOIN?",
                choices: [
                  "It is faster",
                  "COUNT(*) counts the NULL-filled row and reports 1 instead of 0",
                  "COUNT(*) is invalid with GROUP BY",
                  "There is no difference",
                ],
                answerIndex: 1,
                explanation: "COUNT of a column skips NULLs, which is what you want for 'how many children does this parent have'.",
              },
              {
                prompt: "What is the N+1 query problem?",
                choices: [
                  "A query that returns one row too many",
                  "Looping over results and firing one query per row",
                  "Joining more than one table",
                  "An off-by-one error in LIMIT",
                ],
                answerIndex: 1,
                explanation: "One query to get the list, then N more inside the loop. Invisible with test data, fatal with real data.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    title: "Interfaces",
    subtitle: "The part users actually touch",
    summary: "Locked until Foundation is 80% mastered. Backend-first is deliberate — you will build better interfaces once you know what is behind them.",
    estimatedWeeks: 12,
    skills: [
      {
        title: "React",
        why: "The component model that most frontend work now assumes. Learn the mental model before the ecosystem.",
        difficulty: "intermediate",
        estimatedHours: 35,
        lessons: [
          {
            title: "Components, props and state",
            estimatedMinutes: 40,
            objectives: [
              "Explain what re-rendering actually means",
              "Decide what belongs in state and what does not",
              "Lift state to the right place",
            ],
            body: `A component is a function that takes props and returns a description of UI. React calls it, compares the result with the last one, and updates only what changed.

\`\`\`jsx
function LessonCard({ title, minutes, onOpen }) {
  return (
    <button onClick={onOpen}>
      <h3>{title}</h3>
      <p>{minutes} min</p>
    </button>
  );
}
\`\`\`

Props flow down. The card does not know what opening a lesson means — it just calls what it was handed. That is what makes it reusable.

## What belongs in state

State is for values that change over time **and** cannot be computed from something you already have.

\`\`\`jsx
const [items, setItems] = useState([]);
const [query, setQuery] = useState("");

// Not state — derive it.
const visible = items.filter(i => i.title.includes(query));
\`\`\`

Storing \`visible\` in state means keeping it in sync with two other values by hand, which is where stale-UI bugs come from. If you can calculate it during render, calculate it.

## Lifting state

When two components need the same value, it moves up to their nearest common parent, and comes back down as props. Not "global state" — just up one level. Most apps need far less shared state than people assume.

## Re-rendering is not repainting

React re-running your function is cheap. It builds a new description, diffs it, and touches the DOM only where they differ. Do not reach for \`memo\` because a component "renders a lot" — reach for it when you have measured that it is slow.`,
            exercise: {
              brief: "Build a filterable list of lessons: a search input and a list below it. Keep the query in state and derive the filtered list. Then add a 'mastered only' toggle without adding a second copy of the list.",
              acceptance: [
                "Only the query and the toggle are in state",
                "The filtered list is computed during render, not stored",
                "Both filters work together without any syncing code",
              ],
            },
            quiz: [
              {
                prompt: "You can compute a value from existing state. Where should it live?",
                choices: ["In its own useState", "Computed during render", "In a ref", "In localStorage"],
                answerIndex: 1,
                explanation: "Derived values in state must be kept in sync manually, which is the usual source of stale UI.",
              },
              {
                prompt: "Two sibling components need the same value. What do you do?",
                choices: [
                  "Duplicate it in both",
                  "Lift it to their nearest common parent",
                  "Put it in a global store immediately",
                  "Use a ref",
                ],
                answerIndex: 1,
                explanation: "Lift to the closest shared ancestor. Reach for a global store only when 'closest' turns out to be the root.",
              },
            ],
          },
        ],
      },
    ],
  },
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set. Copy .env.example to .env.local first.");

  await mongoose.connect(uri);
  console.log("connected");

  await Promise.all([
    Roadmap.deleteMany({}),
    Phase.deleteMany({}),
    Skill.deleteMany({}),
    Lesson.deleteMany({}),
    Challenge.deleteMany({}),
  ]);
  console.log("cleared existing content (progress and notes untouched)");

  const roadmap = await Roadmap.create({
    slug: "project-z",
    title: "Project Z — Python-first full stack",
    summary:
      "Four phases from language fundamentals to production. Backend first, on purpose: you write better interfaces once you understand what is behind them.",
  });

  let lessonCount = 0;

  for (const [pi, phaseSeed] of PHASES.entries()) {
    const phase = await Phase.create({
      roadmap: roadmap._id,
      order: pi + 1,
      title: phaseSeed.title,
      subtitle: phaseSeed.subtitle,
      summary: phaseSeed.summary,
      estimatedWeeks: phaseSeed.estimatedWeeks,
    });

    for (const [si, skillSeed] of phaseSeed.skills.entries()) {
      const skill = await Skill.create({
        phase: phase._id,
        order: si + 1,
        title: skillSeed.title,
        why: skillSeed.why,
        difficulty: skillSeed.difficulty,
        estimatedHours: skillSeed.estimatedHours,
      });

      for (const [li, lessonSeed] of skillSeed.lessons.entries()) {
        await Lesson.create({
          skill: skill._id,
          order: li + 1,
          title: lessonSeed.title,
          objectives: lessonSeed.objectives,
          estimatedMinutes: lessonSeed.estimatedMinutes,
          body: lessonSeed.body,
          exercise: lessonSeed.exercise,
          quiz: lessonSeed.quiz,
          xp: lessonSeed.xp ?? 50,
        });
        lessonCount += 1;
      }
    }
  }

  for (const c of CHALLENGES) {
    await Challenge.create({
      slug: c.slug,
      title: c.title,
      category: c.category,
      technology: c.technology,
      difficulty: c.difficulty,
      prompt: c.prompt,
      language: "javascript",
      starterCode: c.starterCode,
      entryPoint: c.entryPoint,
      tests: c.tests,
      hints: c.hints,
      xp: c.xp,
      estimatedMinutes: c.estimatedMinutes,
    });
  }

  console.log(`seeded ${PHASES.length} phases, ${lessonCount} lessons, ${CHALLENGES.length} challenges`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
