/**
 * Full, stored lesson content for the catalog.
 *
 * Every catalog lesson has real teaching prose and code here, keyed by course
 * slug in flat lesson order (module by module, top to bottom). The lesson page
 * loads this directly, so a lesson "just loads" complete content rather than
 * looping back to a list or regenerating. The AI tutor on the page is for going
 * deeper, not for filling a blank.
 *
 * Kept out of catalog.ts so the structural metadata there stays scannable.
 * catalog.ts stitches these bodies onto the matching lessons at module load.
 */

export type LessonContent = {
  body: string;
  quiz?: { prompt: string; choices: string[]; answer: number }[];
};

/** courseSlug -> content in flat lesson order. */
export const LESSON_CONTENT: Record<string, LessonContent[]> = {
  /* ==================================================== python-essentials == */
  "python-essentials": [
    {
      body: `Python runs your code through an **interpreter** — a program that reads your file top to bottom and executes each line as it goes. There is no separate "compile" step you have to run first, which is a big part of why Python feels quick to work in.

## Your first program

Create a file called \`hello.py\`:

\`\`\`python
print("Hello, DeveloperOS")
\`\`\`

Run it from a terminal:

\`\`\`bash
python hello.py
\`\`\`

\`print()\` is a **function** — a reusable action. The text in quotes is a **string**. The parentheses pass the string *to* the function so it knows what to show.

## What actually happens

1. Python reads \`hello.py\`.
2. It sees a call to \`print\` and hands it your string.
3. \`print\` writes that text to standard output — your terminal.

That's the whole loop: read a line, do what it says, move on. Everything else in this course is learning more things you can *say* on each line.

> Tip: run code constantly. The fastest way to learn Python is to change one thing, run it, and see what happens.`,
      quiz: [
        {
          prompt: "What does Python use to run your code?",
          choices: ["A compiler that produces an .exe first", "An interpreter that reads and runs each line", "The web browser"],
          answer: 1,
        },
      ],
    },
    {
      body: `A **variable** is a name that points at a value. You create one with \`=\`:

\`\`\`python
name = "Ada"
age = 36
is_engineer = True
\`\`\`

Python figures out the **type** for you from the value:

- \`"Ada"\` is a \`str\` (text)
- \`36\` is an \`int\` (whole number)
- \`3.14\` is a \`float\` (decimal)
- \`True\` / \`False\` are \`bool\` (yes/no)

## Inspecting values

\`\`\`python
print(type(age))     # <class 'int'>
print(age + 1)       # 37
print(name * 2)      # AdaAda
\`\`\`

Notice \`name * 2\` repeats the text — the same \`*\` means different things for numbers and strings. The **type** decides the behaviour.

## Names are labels, not boxes

When you write \`age = 36\`, you're attaching the label \`age\` to the value \`36\`. Reassigning just moves the label:

\`\`\`python
age = 36
age = age + 1   # the label now points at 37
\`\`\`

Use clear, lowercase names with underscores: \`user_count\`, not \`uc\` or \`UserCount\`.`,
      quiz: [
        {
          prompt: "What is the type of `3.14` in Python?",
          choices: ["int", "float", "str"],
          answer: 1,
        },
      ],
    },
    {
      body: `Text in Python is a \`str\`. You can slice it, join it, and drop values into it.

## f-strings (the modern way to format)

Put an \`f\` before the quotes and use \`{}\` to insert values:

\`\`\`python
name = "Ada"
score = 97
print(f"{name} scored {score}%")   # Ada scored 97%
\`\`\`

## Slicing

Strings are sequences, so you can take pieces by position (counting from 0):

\`\`\`python
word = "developer"
print(word[0])     # d   (first)
print(word[-1])    # r   (last)
print(word[0:3])   # dev (start up to, not including, 3)
\`\`\`

## Useful methods

\`\`\`python
"  hi  ".strip()        # "hi"      – trim whitespace
"loud".upper()           # "LOUD"
"a,b,c".split(",")       # ["a", "b", "c"]
"-".join(["2026","07"])  # "2026-07"
\`\`\`

Methods return **new** strings — the original is never changed, because strings are *immutable*. That immutability is why passing a string around is always safe.`,
      quiz: [
        {
          prompt: "What does `\"developer\"[-1]` return?",
          choices: ["'d'", "'r'", "an error"],
          answer: 1,
        },
      ],
    },
    {
      body: `Programs make decisions with \`if\`, \`elif\` and \`else\`:

\`\`\`python
score = 72

if score >= 90:
    grade = "A"
elif score >= 70:
    grade = "B"
else:
    grade = "C"

print(grade)   # B
\`\`\`

## Indentation *is* the syntax

Python has no curly braces. The **indentation** (4 spaces) is what marks the block belonging to each branch. Get it wrong and the meaning changes.

## Comparisons and booleans

\`\`\`python
x == y    # equal
x != y    # not equal
x < y     # less than
x >= y    # at least
\`\`\`

Combine conditions with \`and\`, \`or\`, \`not\`:

\`\`\`python
if age >= 18 and has_id:
    print("Allowed")
\`\`\`

Only the first branch whose condition is \`True\` runs; the rest are skipped. If none match and there's an \`else\`, that runs instead.`,
      quiz: [
        {
          prompt: "In Python, what marks the block of code inside an `if`?",
          choices: ["Curly braces { }", "Indentation", "A semicolon"],
          answer: 1,
        },
      ],
    },
    {
      body: `Loops repeat work. The \`for\` loop walks over a sequence:

\`\`\`python
for name in ["Ada", "Alan", "Grace"]:
    print(f"Hello, {name}")
\`\`\`

Use \`range()\` to loop a fixed number of times:

\`\`\`python
for i in range(3):
    print(i)     # 0, 1, 2
\`\`\`

## while loops

A \`while\` loop runs as long as its condition holds:

\`\`\`python
count = 3
while count > 0:
    print(count)
    count -= 1     # <- must move toward stopping
\`\`\`

Forget the line that changes \`count\` and you get an **infinite loop**. Every \`while\` needs something inside it that eventually makes the condition \`False\`.

## break and continue

\`\`\`python
for n in range(10):
    if n == 5:
        break        # stop the loop entirely
    if n % 2 == 0:
        continue     # skip to the next iteration
    print(n)         # 1, 3
\`\`\``,
      quiz: [
        {
          prompt: "What causes an infinite `while` loop?",
          choices: ["Using range()", "Nothing inside ever makes the condition False", "Too many print statements"],
          answer: 1,
        },
      ],
    },
    {
      body: `A **comprehension** builds a list (or dict/set) in one readable line. It replaces the common "make an empty list, loop, append" pattern.

## Before and after

\`\`\`python
# the long way
squares = []
for n in range(5):
    squares.append(n * n)

# the comprehension
squares = [n * n for n in range(5)]   # [0, 1, 4, 9, 16]
\`\`\`

## With a filter

Add \`if\` to keep only some items:

\`\`\`python
evens = [n for n in range(10) if n % 2 == 0]   # [0, 2, 4, 6, 8]
\`\`\`

## Dict comprehension

\`\`\`python
lengths = {word: len(word) for word in ["hi", "there"]}
# {"hi": 2, "there": 5}
\`\`\`

Reach for a comprehension when you're transforming or filtering a sequence into a new one. If the logic gets complicated, a plain loop is clearer — readability wins.`,
      quiz: [
        {
          prompt: "What does `[n for n in range(6) if n % 2]` produce?",
          choices: ["[0, 2, 4]", "[1, 3, 5]", "[0, 1, 2, 3, 4, 5]"],
          answer: 1,
        },
      ],
    },
    {
      body: `**Lists** and **tuples** both hold ordered sequences. The difference is one word: lists are *mutable*, tuples are *immutable*.

## Lists — when things change

\`\`\`python
tasks = ["write", "test"]
tasks.append("ship")      # ["write", "test", "ship"]
tasks[0] = "design"       # replace by index
tasks.remove("test")
print(len(tasks))          # 2
\`\`\`

## Tuples — when things shouldn't

\`\`\`python
point = (10, 20)
x, y = point               # unpacking
# point[0] = 5  ->  TypeError: tuples can't be changed
\`\`\`

## Which to reach for

- A collection you'll add to or edit → **list**.
- A fixed group of related values (a coordinate, a row) → **tuple**.

Because a tuple can't change, Python can treat it as a safe, hashable value — which is why tuples can be dictionary keys and lists cannot.`,
      quiz: [
        {
          prompt: "Which is immutable?",
          choices: ["list", "tuple", "both"],
          answer: 1,
        },
      ],
    },
    {
      body: `**Dictionaries** map keys to values. **Sets** hold unique values. Both look things up fast.

## Dictionaries

\`\`\`python
user = {"name": "Ada", "level": 12}
print(user["name"])           # Ada
user["xp"] = 4920             # add a key
print(user.get("email", "—")) # safe lookup with a default
for key, value in user.items():
    print(key, value)
\`\`\`

A dict lookup is near-instant no matter how many keys there are — that's the reason to use one instead of scanning a list.

## Sets

\`\`\`python
tags = {"python", "web", "python"}
print(tags)                   # {"python", "web"}  – duplicates gone
print("web" in tags)          # True  (fast membership test)
\`\`\`

Use a set to deduplicate, or to answer "is this in the collection?" quickly. Use a dict whenever you're associating one thing with another.`,
      quiz: [
        {
          prompt: "Why use a dict over a list for lookups?",
          choices: ["Dicts look up by key in near-constant time", "Dicts use less memory always", "Lists can't hold strings"],
          answer: 0,
        },
      ],
    },
    {
      body: `Real programs read and write files. Python's \`open()\` handles both.

## Writing and reading text

\`\`\`python
with open("notes.txt", "w") as f:
    f.write("first line\\n")

with open("notes.txt") as f:
    content = f.read()
print(content)
\`\`\`

The \`with\` block matters: it **closes the file for you**, even if an error happens midway. Always use it.

## JSON — structured data

Most real data is JSON. Python converts to and from it with the \`json\` module:

\`\`\`python
import json

data = {"name": "Ada", "level": 12}

with open("user.json", "w") as f:
    json.dump(data, f, indent=2)   # write

with open("user.json") as f:
    loaded = json.load(f)          # read back a dict
print(loaded["level"])             # 12
\`\`\`

This is exactly the skill your task-manager project needs: save tasks to a file, load them next time the program runs.`,
      quiz: [
        {
          prompt: "Why open files with a `with` block?",
          choices: ["It runs faster", "It closes the file automatically, even on error", "It's required for JSON only"],
          answer: 1,
        },
      ],
    },
    {
      body: `A **function** packages logic under a name so you can reuse it and test it.

\`\`\`python
def greet(name):
    return f"Hello, {name}"

message = greet("Ada")
print(message)          # Hello, Ada
\`\`\`

- \`def\` starts the definition.
- \`name\` is a **parameter** — a placeholder for whatever you pass in.
- \`return\` hands a value back to the caller.

## Defaults and multiple arguments

\`\`\`python
def power(base, exponent=2):
    return base ** exponent

power(5)        # 25  (exponent defaults to 2)
power(5, 3)     # 125
\`\`\`

## Return vs print

\`print\` shows something to a human. \`return\` gives a value back to the *program* so other code can use it. Functions you can build on almost always \`return\`.

Good functions do one thing, have a clear name, and don't secretly depend on the outside world.`,
      quiz: [
        {
          prompt: "What does `return` do that `print` doesn't?",
          choices: ["Shows text on screen", "Hands a value back to the calling code", "Nothing, they're the same"],
          answer: 1,
        },
      ],
    },
    {
      body: `As programs grow, you split them across files called **modules** and pull in code with \`import\`.

## The standard library

Python ships with a huge toolbox. Import what you need:

\`\`\`python
import math
print(math.sqrt(144))     # 12.0

from datetime import date
print(date.today())        # 2026-07-24

import random
print(random.choice(["a", "b", "c"]))
\`\`\`

## Your own modules

If you have \`tasks.py\` with a function \`load_tasks\`, use it from another file:

\`\`\`python
from tasks import load_tasks

items = load_tasks()
\`\`\`

## The main guard

Code you only want to run when the file is executed directly (not imported) goes under:

\`\`\`python
if __name__ == "__main__":
    main()
\`\`\`

This is why you'll see that line at the bottom of nearly every real Python program.`,
      quiz: [
        {
          prompt: "What does `if __name__ == \"__main__\":` protect?",
          choices: ["Code that should run only when the file is executed directly", "Secret passwords", "The import statement"],
          answer: 0,
        },
      ],
    },
    {
      body: `Things go wrong: a file is missing, a number won't parse. **Exceptions** are how Python reports that, and \`try\`/\`except\` is how you handle it.

\`\`\`python
try:
    age = int(input("Age: "))
except ValueError:
    print("That wasn't a number.")
\`\`\`

Only the code that can fail goes in \`try\`. Catch the **specific** error you expect — a bare \`except:\` hides bugs.

## The full shape

\`\`\`python
try:
    data = load_file()
except FileNotFoundError:
    data = []                 # sensible fallback
else:
    print("Loaded fine")      # runs if no error
finally:
    print("Done")             # always runs
\`\`\`

## Fail loud, then handle

Good code doesn't swallow every error silently. It handles the ones it can recover from and lets the rest surface, so real bugs don't hide. That balance — recover from the expected, surface the unexpected — is the whole craft of error handling.`,
      quiz: [
        {
          prompt: "Why avoid a bare `except:` that catches everything?",
          choices: ["It's slower", "It hides real bugs you didn't expect", "It's not valid Python"],
          answer: 1,
        },
      ],
    },
  ],

  /* ==================================================== docker-fundamentals = */
  "docker-fundamentals": [
    {
      body: `A **container** is a running instance of an **image** — a packaged filesystem plus the command to run. The magic: it runs the same on your laptop, a teammate's machine, and production, because everything it needs is inside the image.

## Image vs container vs layer

- **Image** — a read-only template (your app + its dependencies).
- **Container** — a running (or stopped) instance of an image.
- **Layer** — images are built in stacked layers; unchanged layers are cached and shared, which is why rebuilds are fast.

Think of the image as a class and the container as an object: one image, many containers.

\`\`\`bash
docker run hello-world   # pulls an image, runs it as a container
docker ps                # containers running now
docker ps -a             # including stopped ones
\`\`\`

Containers are isolated but lightweight — they share the host kernel, unlike a full virtual machine, so they start in milliseconds.`,
      quiz: [
        { prompt: "What's the difference between an image and a container?", choices: ["Nothing", "An image is the template; a container is a running instance of it", "A container is smaller than an image"], answer: 1 },
      ],
    },
    {
      body: `The Docker CLI is how you pull, run and inspect containers.

\`\`\`bash
docker pull nginx            # download an image
docker run -d -p 8080:80 nginx   # run detached, map host:container ports
docker ps                    # see it running
docker logs <id>             # read its output
docker exec -it <id> sh      # open a shell inside it
docker stop <id>             # stop it
\`\`\`

## Ports

\`-p 8080:80\` maps port 8080 on your machine to port 80 inside the container. Visit \`localhost:8080\` and you reach nginx. Without \`-p\`, the container's ports are unreachable from the host.

## Detached vs foreground

\`-d\` runs in the background. Drop it and the container's output streams to your terminal until you Ctrl-C. Use foreground while debugging, detached for services.`,
      quiz: [
        { prompt: "What does `-p 8080:80` do?", choices: ["Runs 80 containers", "Maps host port 8080 to container port 80", "Sets a password"], answer: 1 },
      ],
    },
    {
      body: `A **Dockerfile** is the recipe for building your own image.

\`\`\`dockerfile
FROM node:20-alpine        # base image
WORKDIR /app               # working directory inside the image
COPY package*.json ./      # copy dependency manifests first
RUN npm ci                 # install deps (this layer caches)
COPY . .                   # then copy the rest of the source
EXPOSE 3000
CMD ["node", "server.js"]  # the command a container runs
\`\`\`

Build and run it:

\`\`\`bash
docker build -t my-app .
docker run -p 3000:3000 my-app
\`\`\`

## Why copy package.json first?

Layers cache. Copying dependencies and installing them *before* copying your source means changing your code doesn't bust the (slow) dependency layer — only the fast final copy re-runs. Ordering your Dockerfile for cache is the single biggest build-speed win.`,
      quiz: [
        { prompt: "Why copy package.json before the rest of the source?", choices: ["It's required syntax", "So the dependency-install layer stays cached when only source changes", "To make the image bigger"], answer: 1 },
      ],
    },
    {
      body: `Containers are ephemeral — delete one and its filesystem is gone. **Volumes** and **bind mounts** keep data alive.

\`\`\`bash
# Named volume — Docker manages where it lives. Best for databases.
docker run -v mydata:/var/lib/postgresql/data postgres

# Bind mount — maps a host folder into the container. Best for dev.
docker run -v $(pwd):/app my-app
\`\`\`

## When to use which

- **Volume** — persistent app data (a database's files). Portable, managed by Docker.
- **Bind mount** — live-editing source during development, so code changes on your machine appear instantly in the container.

Without one of these, a database in a container loses everything the moment the container is removed — a classic first-week mistake.`,
      quiz: [
        { prompt: "What happens to a database's data with no volume?", choices: ["It's backed up automatically", "It's lost when the container is removed", "It moves to the host"], answer: 1 },
      ],
    },
    {
      body: `By default, containers on the same Docker **network** can reach each other by name.

\`\`\`bash
docker network create app-net
docker run -d --name db --network app-net postgres
docker run -d --name api --network app-net my-api
\`\`\`

Now the \`api\` container can connect to the database at the hostname \`db\` — Docker's built-in DNS resolves the container name. You do not hard-code IP addresses.

## Network drivers

- **bridge** (default) — containers on the same bridge network talk to each other; isolated from other networks.
- **host** — the container shares the host's network directly (no port mapping needed, less isolation).
- **none** — no networking at all.

For a multi-service app, put the services on one user-defined bridge network and let them find each other by name.`,
      quiz: [
        { prompt: "How does the `api` container reach the `db` container?", choices: ["By hard-coded IP", "By the container name `db`, via Docker's DNS on a shared network", "It can't"], answer: 1 },
      ],
    },
    {
      body: `**Docker Compose** defines a whole multi-container app in one YAML file, so \`docker compose up\` starts everything wired together.

\`\`\`yaml
services:
  web:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - db
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: secret
    volumes:
      - dbdata:/var/lib/postgresql/data
volumes:
  dbdata:
\`\`\`

\`\`\`bash
docker compose up -d     # build + start everything
docker compose logs -f   # tail all services
docker compose down      # stop and remove
\`\`\`

Compose puts every service on a shared network automatically, so \`web\` reaches the database at the hostname \`db\`. This is the file your project will ship — one command to run the whole stack.`,
      quiz: [
        { prompt: "What does `docker compose up` do?", choices: ["Builds one image", "Starts all services in the compose file, networked together", "Deletes containers"], answer: 1 },
      ],
    },
    {
      body: `A **registry** stores and shares images. Docker Hub is the public default; teams also run private ones.

\`\`\`bash
docker tag my-app username/my-app:1.0   # name it for the registry
docker login
docker push username/my-app:1.0         # upload
docker pull username/my-app:1.0         # anyone can now download
\`\`\`

## Tags

A tag is a version label: \`my-app:1.0\`, \`my-app:latest\`. Pushing \`:latest\` is convenient but avoid relying on it in production — pin a real version so a deploy is reproducible.

Registries are how images move between your machine, CI, and production. Your CI builds an image, pushes it to a registry, and the server pulls that exact image — no "works on my machine."`,
      quiz: [
        { prompt: "Why avoid relying on the `latest` tag in production?", choices: ["It's slower to pull", "It's not reproducible — it can change under you", "It costs money"], answer: 1 },
      ],
    },
    {
      body: `Compose is perfect for one machine. When you need to run containers across **many** machines with self-healing and scaling, that's **orchestration** — and the industry standard is **Kubernetes**.

## What Kubernetes adds

- **Scheduling** — decides which machine runs each container.
- **Self-healing** — restarts crashed containers, replaces dead nodes.
- **Scaling** — run 3 or 300 copies of a service on demand.
- **Rolling updates** — deploy a new version with zero downtime.

You describe the *desired state* ("I want 3 replicas of this image") and Kubernetes continuously makes reality match.

## Your path

You don't need Kubernetes to start. Master images, Compose, and registries first — that covers most real projects. Reach for Kubernetes when you're running services at scale across a cluster. The container skills you built here are exactly what it orchestrates.`,
      quiz: [
        { prompt: "What is Kubernetes for?", choices: ["Writing Dockerfiles", "Orchestrating containers across many machines with scaling and self-healing", "Replacing Git"], answer: 1 },
      ],
    },
  ],

  /* ======================================================= react-essentials = */
  "react-essentials": [
    {
      body: `React describes UI as **components** — functions that return markup written in **JSX**.

\`\`\`jsx
function Welcome() {
  return <h1>Hello, DeveloperOS</h1>;
}
\`\`\`

JSX looks like HTML but it's JavaScript. You embed expressions with \`{}\`:

\`\`\`jsx
function Greeting() {
  const name = "Ada";
  return <p>Hello, {name}</p>;
}
\`\`\`

## Rules

- Components are functions whose names start with a **capital letter**.
- A component returns **one** root element (wrap siblings in \`<>...</>\`).
- \`className\`, not \`class\` (it's JavaScript).

You build an app by composing small components into bigger ones. That composability is React's whole idea.`,
      quiz: [
        { prompt: "How do you embed a JavaScript value in JSX?", choices: ["With ${}", "With {} curly braces", "With <%= %>"], answer: 1 },
      ],
    },
    {
      body: `**Props** pass data from a parent component to a child — like function arguments.

\`\`\`jsx
function Avatar({ name, src }) {
  return <img src={src} alt={name} />;
}

function App() {
  return <Avatar name="Ada" src="/ada.png" />;
}
\`\`\`

Props are **read-only**: a child never modifies its props. Data flows one way, parent → child, which makes an app predictable.

## Composition with children

\`\`\`jsx
function Card({ children }) {
  return <div className="card">{children}</div>;
}

<Card><h2>Title</h2><p>Body</p></Card>
\`\`\`

\`children\` is the content you put between the tags. Composition — small pieces slotted into containers — is how you avoid copy-pasting layout.`,
      quiz: [
        { prompt: "Can a component change its own props?", choices: ["Yes, freely", "No — props are read-only; data flows parent to child", "Only with useState"], answer: 1 },
      ],
    },
    {
      body: `Render a list with \`.map()\`, and show things conditionally with normal JavaScript.

\`\`\`jsx
function TaskList({ tasks }) {
  return (
    <ul>
      {tasks.map((t) => (
        <li key={t.id}>{t.title}</li>
      ))}
    </ul>
  );
}
\`\`\`

## The key prop

Each item needs a stable, unique \`key\` so React can track which item is which across renders. Use an id — never the array index if the list can reorder.

## Conditional UI

\`\`\`jsx
{isLoading ? <Spinner /> : <List items={items} />}
{error && <p className="error">{error}</p>}
\`\`\`

\`&&\` renders the right side only when the left is truthy; the ternary picks between two branches.`,
      quiz: [
        { prompt: "Why does each list item need a `key`?", choices: ["For styling", "So React can track which item is which across renders", "It's optional decoration"], answer: 1 },
      ],
    },
    {
      body: `**State** is data that changes over time and drives what's on screen. \`useState\` gives a component its own state.

\`\`\`jsx
import { useState } from "react";

function Counter() {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount(count + 1)}>
      Clicked {count} times
    </button>
  );
}
\`\`\`

- \`count\` is the current value.
- \`setCount\` updates it **and** re-renders the component.

## Never mutate state directly

\`\`\`jsx
// wrong — React won't see the change
count = count + 1;
// right — always go through the setter
setCount(count + 1);
\`\`\`

Calling the setter is what tells React to re-render. Assigning to the variable does nothing visible.`,
      quiz: [
        { prompt: "How do you update state so the UI re-renders?", choices: ["Reassign the variable", "Call the setter from useState", "Reload the page"], answer: 1 },
      ],
    },
    {
      body: `\`useEffect\` runs **side effects** — things outside rendering, like fetching data, subscriptions, or timers.

\`\`\`jsx
import { useEffect, useState } from "react";

function Clock() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);   // cleanup
  }, []);                             // [] = run once on mount
  return <p>{new Date(now).toLocaleTimeString()}</p>;
}
\`\`\`

## The dependency array

- \`[]\` — run once, after the first render.
- \`[value]\` — re-run whenever \`value\` changes.
- omitted — run after **every** render (rarely what you want).

## Cleanup

Return a function to undo the effect (clear a timer, remove a listener). Skip it and you leak timers and subscriptions.`,
      quiz: [
        { prompt: "What does an empty dependency array `[]` mean?", choices: ["Run after every render", "Run once, after the first render", "Never run"], answer: 1 },
      ],
    },
    {
      body: `Two more hooks for specific jobs.

## useRef — a value that survives renders without causing one

\`\`\`jsx
const inputRef = useRef(null);
// ...
<input ref={inputRef} />
<button onClick={() => inputRef.current.focus()}>Focus</button>
\`\`\`

Use it to reach a DOM node, or to hold a mutable value you don't want to trigger re-renders.

## useReducer — structured state updates

When state logic gets complex, \`useReducer\` centralises it, Redux-style but built in:

\`\`\`jsx
function reducer(state, action) {
  switch (action.type) {
    case "inc": return { count: state.count + 1 };
    case "reset": return { count: 0 };
    default: return state;
  }
}
const [state, dispatch] = useReducer(reducer, { count: 0 });
dispatch({ type: "inc" });
\`\`\`

Reach for \`useReducer\` when several values change together or the next state depends on the last.`,
      quiz: [
        { prompt: "When is useReducer a better fit than useState?", choices: ["Always", "When state logic is complex or several values change together", "Never"], answer: 1 },
      ],
    },
    {
      body: `Passing props down many levels gets painful ("prop drilling"). **Context** shares a value with any component below, no drilling.

\`\`\`jsx
const ThemeContext = createContext("light");

function App() {
  return (
    <ThemeContext.Provider value="dark">
      <Toolbar />
    </ThemeContext.Provider>
  );
}

function Button() {
  const theme = useContext(ThemeContext);  // reads "dark"
  return <button className={theme}>Go</button>;
}
\`\`\`

## When to use it

Context is for **global-ish** state that many components need: the current user, theme, or locale. Don't reach for it for everything — for most state, local \`useState\` and passing props is simpler and faster. In 2026, apps often pair Context with a small store (Zustand) for larger shared state, and TanStack Query for server data.`,
      quiz: [
        { prompt: "What problem does Context solve?", choices: ["Slow rendering", "Passing a value deep without prop-drilling through every level", "Styling"], answer: 1 },
      ],
    },
    {
      body: `Real apps load data from an API. The pattern: fetch in an effect, store in state, handle loading and errors.

\`\`\`jsx
function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error) return <p>{error}</p>;
  return <ul>{users.map((u) => <li key={u.id}>{u.name}</li>)}</ul>;
}
\`\`\`

Always model **three** states: loading, error, and data. In production, a library like **TanStack Query** handles caching, refetching and dedup for you — but understanding the raw pattern first is what makes it click.`,
      quiz: [
        { prompt: "Which three states should data-fetching UI handle?", choices: ["Start, middle, end", "Loading, error, and data", "Only success"], answer: 1 },
      ],
    },
    {
      body: `React re-renders a component when its state or props change. Usually that's fine — but needless re-renders can slow a big app.

## Keys, first

Most "React is slow" problems are actually bad \`key\`s causing lists to rebuild. Fix keys before anything else.

## Memoisation, when measured

\`\`\`jsx
const Expensive = memo(function Expensive({ data }) { /* ... */ });

const sorted = useMemo(() => heavySort(items), [items]);
const onClick = useCallback(() => doThing(id), [id]);
\`\`\`

- \`memo\` — skip re-rendering a component if its props didn't change.
- \`useMemo\` — cache an expensive calculation.
- \`useCallback\` — keep a function identity stable between renders.

## The rule

Don't sprinkle these everywhere — they have a cost. **Measure** with the React DevTools profiler, find the actual slow render, then memoise that. Premature optimisation makes code harder to read for no gain.`,
      quiz: [
        { prompt: "What should you do before adding memoisation?", choices: ["Add it everywhere upfront", "Measure with the profiler and fix keys first", "Rewrite in another framework"], answer: 1 },
      ],
    },
  ],

  /* ==================================================== web-security-basics = */
  "web-security-basics": [
    {
      body: `Most breaches exploit a small set of well-known issues. The **OWASP Top 10** is the industry's list of them, and knowing it makes everything you build safer by default.

## The recurring themes

- **Broken access control** — users reaching data or actions they shouldn't.
- **Injection** — untrusted input treated as code (SQL, commands).
- **Cryptographic failures** — secrets and data left exposed.
- **Insecure design** — the flaw is in the plan, not the code.
- **Vulnerable dependencies** — a library you pulled in has a hole.

## The core mindset

Treat **all input as hostile** until proven otherwise, and **never trust the client**. The browser, the request, the URL — anything a user controls can be forged. Security is decided on the server. Every lesson here is an application of those two ideas.`,
      quiz: [
        { prompt: "What is the core security mindset?", choices: ["Trust the client to validate", "Treat all input as hostile and never trust the client", "Hide the source code"], answer: 1 },
      ],
    },
    {
      body: `**Injection** happens when untrusted input is treated as part of a command. The classic is **SQL injection**.

## The vulnerable pattern

\`\`\`js
// NEVER do this — the input becomes part of the query
db.query("SELECT * FROM users WHERE name = '" + name + "'");
// name = "'; DROP TABLE users; --"  →  disaster
\`\`\`

## The fix: parameterised queries

\`\`\`js
db.query("SELECT * FROM users WHERE name = $1", [name]);
\`\`\`

The database now treats \`name\` as **data**, never as SQL, no matter what characters it contains. The same idea applies to shell commands, LDAP, and any interpreter: separate the code from the data. Never build a query by string-concatenating user input — parameterise, always.`,
      quiz: [
        { prompt: "How do you prevent SQL injection?", choices: ["Escape quotes manually", "Use parameterised queries so input is data, not SQL", "Hide the database"], answer: 1 },
      ],
    },
    {
      body: `**Cross-site scripting (XSS)** is injection into the browser: attacker input becomes script that runs in another user's page, stealing sessions or acting as them.

## The vulnerable pattern

\`\`\`js
element.innerHTML = userComment;   // if the comment contains <script>, it runs
\`\`\`

## Defences

- **Escape output** — render user content as text, not HTML. Frameworks like React do this by default (\`{userComment}\` is safe; \`dangerouslySetInnerHTML\` is not).
- **Content Security Policy (CSP)** — an HTTP header that blocks inline and unknown scripts.
- **Never build HTML by concatenating user input.**

The rule mirrors SQL injection: keep user data as *data*. When you must render user HTML, sanitise it with a vetted library — don't roll your own.`,
      quiz: [
        { prompt: "Why is React's `{userComment}` safe but `dangerouslySetInnerHTML` risky?", choices: ["No difference", "The first escapes content as text; the second injects raw HTML that can run scripts", "The second is faster"], answer: 1 },
      ],
    },
    {
      body: `Authentication proves *who* a user is; sessions keep them logged in. Both are common attack targets.

## Store passwords correctly

Never store plaintext. Hash with a slow, salted algorithm built for passwords:

\`\`\`js
import bcrypt from "bcrypt";
const hash = await bcrypt.hash(password, 12);   // on signup
const ok = await bcrypt.compare(password, hash); // on login
\`\`\`

\`bcrypt\`/\`argon2\` are deliberately slow, which makes brute-forcing stolen hashes impractical. Never use plain SHA-256 for passwords — it's too fast.

## Sessions

- Put session tokens in **HttpOnly, Secure, SameSite** cookies so JavaScript can't read them and they only travel over HTTPS.
- Expire and rotate tokens; invalidate on logout.
- Add rate limiting on login to slow credential-stuffing.`,
      quiz: [
        { prompt: "Why hash passwords with bcrypt instead of SHA-256?", choices: ["SHA-256 is insecure math", "bcrypt is deliberately slow, making brute-force impractical", "bcrypt encrypts reversibly"], answer: 1 },
      ],
    },
    {
      body: `A few HTTP headers and TLS close whole categories of attack cheaply.

## Always HTTPS

Serve everything over TLS so traffic can't be read or tampered with in transit. Redirect HTTP → HTTPS and set **HSTS** so browsers refuse to downgrade:

\`\`\`
Strict-Transport-Security: max-age=63072000; includeSubDomains
\`\`\`

## Security headers

\`\`\`
Content-Security-Policy: default-src 'self'      # limit where scripts/styles load from
X-Content-Type-Options: nosniff                   # stop MIME sniffing
Referrer-Policy: strict-origin-when-cross-origin
\`\`\`

CSP is the heavyweight — a good policy makes XSS far harder to exploit even if a bug slips through. Set these once at the edge (your framework, proxy, or host) and every response is hardened.`,
      quiz: [
        { prompt: "What does HSTS do?", choices: ["Encrypts the database", "Tells browsers to always use HTTPS and refuse to downgrade", "Hashes passwords"], answer: 1 },
      ],
    },
    {
      body: `Your own code is only part of the attack surface — so are your **dependencies** and **secrets**.

## Dependencies

Most apps are mostly other people's code. A known vulnerability in a library is a hole in your app.

\`\`\`bash
npm audit            # list known vulnerabilities
npm audit fix        # patch what it safely can
\`\`\`

Keep dependencies updated, remove ones you don't use, and pin versions so a compromised update can't slip in silently.

## Secrets

- **Never commit secrets** (API keys, DB passwords) to Git — use environment variables and a \`.env\` file that is git-ignored.
- If a secret leaks, **rotate it** — removing it from a later commit doesn't help; it's in the history.
- Scan for accidentally committed secrets in CI.

Most real-world leaks aren't clever exploits — they're a key pushed to a public repo. Treating secrets and dependencies with the same care as your own code is what closes that gap.`,
      quiz: [
        { prompt: "A secret was committed to Git. What must you do?", choices: ["Delete it in a new commit and move on", "Rotate the secret — it's still in the history", "Nothing, Git hides old commits"], answer: 1 },
      ],
    },
  ],

  /* ===================================================== apis-and-databases = */
  "apis-and-databases": [
    {
      body: `Every web API speaks **HTTP**. A request has a **method**, a **path**, headers, and maybe a body; a response has a **status code** and a body.

## Methods map to intent

- **GET** — read (never changes anything).
- **POST** — create.
- **PUT/PATCH** — update (replace / partial).
- **DELETE** — remove.

## Status codes tell the caller what happened

- **2xx** success — 200 OK, 201 Created.
- **4xx** the caller's fault — 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found.
- **5xx** the server's fault — 500 Internal Server Error.

Returning the *right* code matters: a client should be able to tell "you sent bad data" (400) from "you're not logged in" (401) from "it broke on our end" (500) without reading the body.`,
      quiz: [
        { prompt: "Which status class means the caller sent something wrong?", choices: ["2xx", "4xx", "5xx"], answer: 1 },
      ],
    },
    {
      body: `REST models your app as **resources** — nouns — that you act on with HTTP methods.

## Name resources as plural nouns

\`\`\`
GET    /users          # list
POST   /users          # create
GET    /users/42       # read one
PATCH  /users/42       # update
DELETE /users/42       # delete
GET    /users/42/posts # a user's posts
\`\`\`

Avoid verbs in paths (\`/getUser\`, \`/createUser\`) — the method already carries the verb.

## Versioning

APIs change. Version them so old clients don't break:

\`\`\`
/v1/users
\`\`\`

Put the version in the path (simple, visible) and only make breaking changes in a new version. Designing clean, predictable URLs up front is what makes an API pleasant to consume for years.`,
      quiz: [
        { prompt: "Which is the better REST path?", choices: ["/getUser?id=42", "GET /users/42", "/user/fetch/42/now"], answer: 1 },
      ],
    },
    {
      body: `Never trust incoming data. **Validate at the edge** — reject bad requests before they touch your logic or database.

\`\`\`js
// with a schema validator (e.g. zod)
const CreateUser = z.object({
  email: z.string().email(),
  age: z.number().int().min(0).max(120),
});

app.post("/users", (req, res) => {
  const parsed = CreateUser.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  // parsed.data is now typed and safe
});
\`\`\`

## Why at the edge

If invalid data gets past the door, every layer downstream has to defend against it. Validating once, up front, means the rest of your code can assume the data is well-formed. Return a **400** with a helpful message so the caller can fix their request.`,
      quiz: [
        { prompt: "Where should you validate request data?", choices: ["Deep in the database layer", "At the edge, before it reaches your logic", "Never — trust the client"], answer: 1 },
      ],
    },
    {
      body: `A relational database stores data in **tables** of rows and columns. Good **schema design** avoids duplication through **normalisation**.

## Normalise: one fact, one place

Instead of repeating a user's name in every order row, store users once and **reference** them:

\`\`\`sql
CREATE TABLE users (
  id    SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL
);
CREATE TABLE orders (
  id       SERIAL PRIMARY KEY,
  user_id  INTEGER REFERENCES users(id),
  total    NUMERIC NOT NULL
);
\`\`\`

The \`user_id\` **foreign key** links an order to its user. Change the email in one place and every order reflects it — no drift.

## The trade-off

Normalisation keeps data consistent but spreads it across tables, so reads need joins (next lesson). Most apps normalise first and denormalise only where measured performance demands it.`,
      quiz: [
        { prompt: "What does normalisation prevent?", choices: ["Fast queries", "Duplicated data that can drift out of sync", "Foreign keys"], answer: 1 },
      ],
    },
    {
      body: `Data spread across tables is reassembled with **joins**.

\`\`\`sql
SELECT orders.id, orders.total, users.email
FROM orders
JOIN users ON users.id = orders.user_id
WHERE orders.total > 100;
\`\`\`

This answers "which orders over 100, and who placed them" by matching each order's \`user_id\` to a user row.

## Kinds of join

- **INNER JOIN** — only rows with a match on both sides.
- **LEFT JOIN** — all rows from the left table, with nulls where the right has no match (e.g. users who have no orders yet).

## Aggregation

\`\`\`sql
SELECT user_id, COUNT(*), SUM(total)
FROM orders
GROUP BY user_id;
\`\`\`

\`GROUP BY\` collapses rows into groups so you can count and sum per user. Joins plus aggregation answer almost any real question your data holds.`,
      quiz: [
        { prompt: "What does a LEFT JOIN include that an INNER JOIN doesn't?", choices: ["Nothing", "Left-table rows with no match on the right (as nulls)", "Only matches"], answer: 1 },
      ],
    },
    {
      body: `As tables grow, a query that scans every row gets slow. An **index** makes lookups fast.

## The problem and the fix

\`\`\`sql
SELECT * FROM users WHERE email = 'ada@x.com';
-- without an index: scans every row (slow at scale)

CREATE INDEX idx_users_email ON users(email);
-- now the database jumps straight to the row
\`\`\`

An index is like a book's index: instead of reading every page, you look up the term and go straight there.

## The trade-offs

- Index columns you **filter or join on** frequently.
- Indexes speed reads but **slow writes** slightly (each insert updates the index) and use space.
- Don't index everything — index what your slow queries actually need.

Use \`EXPLAIN\` to see whether a query uses an index or falls back to a full scan. This one skill turns a sluggish app into a fast one.`,
      quiz: [
        { prompt: "What does an index trade for faster reads?", choices: ["Nothing", "Slightly slower writes and extra space", "Data correctness"], answer: 1 },
      ],
    },
    {
      body: `**Authentication** answers "who is calling this API?" A common approach is token-based auth.

## The flow

1. User logs in with credentials → server verifies them (bcrypt compare).
2. Server issues a **token** (e.g. a signed JWT) the client stores.
3. Client sends it on each request: \`Authorization: Bearer <token>\`.
4. Server verifies the token's signature — no database hit needed to know who they are.

\`\`\`js
app.get("/me", requireAuth, (req, res) => {
  res.json({ id: req.user.id });   // requireAuth verified the token
});
\`\`\`

## Keep it safe

- Sign tokens with a strong secret; **verify** on every request.
- Give tokens a short expiry and support refresh.
- Send them only over HTTPS. Never put secrets in the token payload — it's readable, just tamper-proof.`,
      quiz: [
        { prompt: "What does a signed token let the server do without a DB hit?", choices: ["Store data", "Verify who the caller is from the token's signature", "Encrypt the database"], answer: 1 },
      ],
    },
    {
      body: `Authentication is *who you are*. **Authorization** is *what you're allowed to do* — and it's where "broken access control", the #1 web risk, lives.

## Check permission on every action

\`\`\`js
app.delete("/posts/:id", requireAuth, async (req, res) => {
  const post = await getPost(req.params.id);
  if (post.authorId !== req.user.id) {
    return res.status(403).json({ error: "Not yours" });
  }
  await deletePost(post.id);
});
\`\`\`

Being logged in is **not** permission to touch someone else's data. Check ownership (or role) server-side, for every request, every time.

## The classic bug

Hiding a delete button in the UI is not security — the endpoint is still there. Anyone can call \`DELETE /posts/5\` directly. Enforce authorization on the **server**; the UI is only a courtesy.`,
      quiz: [
        { prompt: "Is hiding a button in the UI enough to protect an action?", choices: ["Yes", "No — the endpoint must enforce authorization server-side", "Only for admins"], answer: 1 },
      ],
    },
    {
      body: `When the same data is read constantly, hitting the database every time is wasteful. A **cache** like **Redis** serves hot data from memory.

## The cache-aside pattern

\`\`\`js
async function getUser(id) {
  const cached = await redis.get("user:" + id);
  if (cached) return JSON.parse(cached);          // hit — fast

  const user = await db.query("... WHERE id = $1", [id]);  // miss
  await redis.set("user:" + id, JSON.stringify(user), "EX", 300); // cache 5 min
  return user;
}
\`\`\`

1. Look in the cache first.
2. On a miss, read the database and store the result with an expiry.

## The hard part: invalidation

When the underlying data changes, the cache is now **stale**. Either delete the cache key on update, or set a short expiry and accept brief staleness. Caching is the difference between a slow app and a fast one — but a wrong cache is worse than none, so be deliberate about invalidation.`,
      quiz: [
        { prompt: "In cache-aside, what happens on a cache miss?", choices: ["Return null", "Read the database, then store the result in the cache with an expiry", "Crash"], answer: 1 },
      ],
    },
  ],

  /* ===================================================== prompt-engineering = */
  "prompt-engineering": [
    {
      body: `An LLM reads and writes **tokens** — chunks of text (roughly ¾ of a word each). Everything about prompting flows from two facts:

1. The model only knows what's in its **context window** — the prompt you send plus what it's generated so far. It has no memory between separate calls.
2. The context window is **finite**. Very long prompts get expensive and can crowd out room for the answer.

## What this means in practice

- Put the important instructions where they won't get lost — clear and near the task.
- Don't assume the model "remembers" an earlier conversation unless you resend it.
- Trim irrelevant text; every token costs money and attention.

Understanding that the model is a function from *(context) → (next tokens)*, with nothing outside that context, is the mental model that makes everything else make sense.`,
      quiz: [
        { prompt: "What does a model know when answering?", choices: ["Everything you've ever asked it", "Only what's in the current context window", "The whole internet, live"], answer: 1 },
      ],
    },
    {
      body: `A good prompt is a clear **task**, not a vague wish. Ambiguity is the main cause of bad output.

## Weak vs strong

\`\`\`
Weak:   "Write about dogs."
Strong: "Write a 3-sentence summary of why border collies
         suit active households. Plain language, no jargon."
\`\`\`

The strong version fixes the **format** (3 sentences), the **angle** (active households), and the **tone** (plain).

## A reliable structure

- **Role/context** — who the model is acting as, what it's working with.
- **Task** — exactly what to do.
- **Constraints** — length, format, tone, what to avoid.
- **Input** — the material to work on, clearly delimited.

Spell out what you'd tell a smart new hire who can't ask follow-up questions. Precision in, quality out.`,
      quiz: [
        { prompt: "What's the main cause of poor LLM output?", choices: ["Model size", "Ambiguous, underspecified prompts", "Too many tokens"], answer: 1 },
      ],
    },
    {
      body: `**Few-shot** prompting teaches by example: show the model a couple of input→output pairs, and it follows the pattern.

\`\`\`
Classify the sentiment as positive, negative, or neutral.

Review: "Loved it, would buy again"  → positive
Review: "Broke after a day"           → negative
Review: "It's fine, does the job"     → neutral
Review: "Exceeded my expectations"    →
\`\`\`

The model completes the last line following your examples.

## When to use it

- The task is easier to **show** than to describe.
- You need a **specific format** the examples demonstrate.
- Zero-shot (no examples) gives inconsistent results.

Two to five well-chosen, diverse examples usually beat a long prose description. Make the examples cover the tricky/edge cases you care about — the model generalises from what you show it.`,
      quiz: [
        { prompt: "What is few-shot prompting?", choices: ["Using a small model", "Showing example input→output pairs so the model follows the pattern", "Asking many times"], answer: 1 },
      ],
    },
    {
      body: `To build software on an LLM, you need **machine-readable** output, not prose. Ask for JSON and specify the shape.

\`\`\`
Extract the person's details as JSON matching exactly:
{ "name": string, "age": number, "city": string }
Return ONLY the JSON, no commentary.

Text: "Ada, 36, lives in London."
\`\`\`

→ \`{ "name": "Ada", "age": 36, "city": "London" }\`

## Make it robust

- Give the **exact schema** and say "only JSON".
- Provide a value for **missing** fields ("use null if unknown") so the shape is stable.
- **Validate** the output in code (e.g. with a schema library) and retry on failure — models occasionally stray.

Many providers now offer a structured-output / JSON mode that guarantees valid JSON. Use it when available; validate regardless.`,
      quiz: [
        { prompt: "Why request structured JSON output?", choices: ["It's shorter", "So your code can reliably parse and use the result", "Models prefer it"], answer: 1 },
      ],
    },
    {
      body: `The **system prompt** sets persistent behaviour — the model's role, rules and tone — separate from each user message.

\`\`\`
System: You are a terse senior code reviewer. You point out
        bugs and security issues only. No praise, no restating
        the code. Use bullet points.

User:   [pastes a function]
\`\`\`

The system prompt applies to the whole conversation, so you don't repeat "be terse" in every message.

## Good system prompts

- Define the **persona** and its expertise.
- State **rules** ("never do X", "always format as Y").
- Set **boundaries** ("if asked outside your scope, say so").

Think of it as configuring the assistant once, up front. A strong system prompt is often the difference between a chatbot and a reliable tool — it's where you encode the behaviour your product depends on.`,
      quiz: [
        { prompt: "What is the system prompt for?", choices: ["The user's question", "Setting persistent role, rules and tone for the whole conversation", "Storing data"], answer: 1 },
      ],
    },
    {
      body: `Hard tasks fail as one giant prompt but succeed when **broken into steps**.

## Chaining

Instead of "read this contract and give me a risk report", chain:

1. **Extract** the key clauses as JSON.
2. **Assess** each clause's risk.
3. **Summarise** the assessment into a report.

Each step is a focused prompt whose output feeds the next. Smaller steps are more reliable and easier to debug — if the report is wrong, you can see which stage went off.

## Give the model room to think

For reasoning tasks, ask it to work step by step *before* the final answer:

\`\`\`
Think through the trade-offs, then give your recommendation.
\`\`\`

Letting the model reason in the open ("chain of thought") before concluding measurably improves accuracy on anything with multiple steps. Structure the work; don't demand a leap.`,
      quiz: [
        { prompt: "Why break a hard task into a chain of steps?", choices: ["It's cheaper always", "Each focused step is more reliable and debuggable", "Models can't do JSON otherwise"], answer: 1 },
      ],
    },
    {
      body: `You can't improve what you don't measure. An **eval** scores model outputs against expectations, so you know if a prompt change helped or hurt.

## A simple eval

Build a small set of test cases — input plus what a good answer looks like — and check each:

\`\`\`
Case: "Extract the total from: Subtotal 10, Tax 2"
Expect: total == 12

Case: "Extract the total from: no total mentioned"
Expect: total == null
\`\`\`

Run every case after a prompt change and count how many pass.

## What to check

- **Exact match** for structured tasks (does the JSON equal the expected?).
- **Contains / rules** for text (does it mention X, stay under N words?).
- **LLM-as-judge** for open-ended quality (a second model rates the answer against a rubric).

Even ten cases turn "it feels better" into "8/10 → 10/10." Evals are how prompt engineering becomes engineering.`,
      quiz: [
        { prompt: "What is an eval for?", choices: ["Making the model faster", "Scoring outputs against expectations so you know if a change helped", "Reducing tokens"], answer: 1 },
      ],
    },
    {
      body: `A **hallucination** is a confident, wrong answer — the model filling a gap with plausible fiction. You can't eliminate it, but you can sharply reduce it.

## Grounding

Give the model the facts to answer from, and tell it to stick to them:

\`\`\`
Answer ONLY from the context below. If the answer isn't there,
say "I don't know."

Context: [the real documents]
Question: ...
\`\`\`

This is the core of RAG (retrieval-augmented generation): retrieve real sources, then answer from them.

## Other levers

- **Allow "I don't know"** — models hallucinate partly because they're pushed to always answer.
- **Ask for citations** — "quote the sentence you used" makes fabrication visible.
- **Lower the temperature** for factual tasks so output is more deterministic.
- **Verify** critical facts in code against a source of truth.

Grounded, cited, and free to abstain — that combination is what makes an LLM feature trustworthy enough to ship.`,
      quiz: [
        { prompt: "What most reduces hallucination?", choices: ["A bigger model always", "Grounding: give real sources and let the model say 'I don't know'", "Longer prompts"], answer: 1 },
      ],
    },
  ],

  /* ============================================= machine-learning-foundations */
  "machine-learning-foundations": [
    {
      body: `Before modelling, you load and shape data. **NumPy** handles fast numeric arrays; **Pandas** handles labelled tables (DataFrames).

\`\`\`python
import pandas as pd

df = pd.read_csv("houses.csv")
df.head()                 # first rows
df.shape                  # (rows, columns)
df["price"].mean()        # a column's average
df[df["beds"] >= 3]       # filter rows
\`\`\`

## Why these tools

A DataFrame is a spreadsheet you can program: select columns, filter rows, group and aggregate — all vectorised, so it's fast even on millions of rows. NumPy underneath gives you array maths without slow Python loops:

\`\`\`python
import numpy as np
np.array([1, 2, 3]) * 2   # array([2, 4, 6])
\`\`\`

Almost every ML project starts and ends in Pandas. Getting comfortable selecting, filtering and summarising data is the foundation everything else sits on.`,
      quiz: [
        { prompt: "What is a Pandas DataFrame?", choices: ["A neural network", "A labelled, programmable table of data", "A plotting library"], answer: 1 },
      ],
    },
    {
      body: `**Exploratory data analysis (EDA)** is looking at your data before modelling — its shape, gaps and relationships. Skipping it is how you build a model on broken data.

\`\`\`python
df.describe()             # count, mean, min, max per column
df.isnull().sum()         # missing values per column
df["city"].value_counts() # category frequencies
df.corr()                 # linear correlations between columns
\`\`\`

## What you're looking for

- **Missing values** — how many, and why?
- **Outliers** — a house priced at 0, an age of 999.
- **Distributions** — is the target skewed? balanced?
- **Relationships** — which features move with the target?

Plot as you go (histograms, scatter plots). EDA turns a blind dataset into one you understand — and understanding the data is 80% of a good model. Surprises found here save you from a model that looks fine but is quietly wrong.`,
      quiz: [
        { prompt: "Why do EDA before modelling?", choices: ["It's required by law", "To understand the data and catch problems before they poison the model", "To make the model bigger"], answer: 1 },
      ],
    },
    {
      body: `Models want clean, numeric input. **Preprocessing** turns raw data into features a model can learn from.

## Common steps

\`\`\`python
# 1. Handle missing values
df["age"].fillna(df["age"].median(), inplace=True)

# 2. Encode categories as numbers
df = pd.get_dummies(df, columns=["city"])   # one-hot encoding

# 3. Scale numeric features to a common range
from sklearn.preprocessing import StandardScaler
X_scaled = StandardScaler().fit_transform(X)
\`\`\`

## Why each matters

- **Missing values** — most models can't handle blanks; fill or drop them deliberately.
- **Encoding** — "London"/"Paris" become numbers the model can use.
- **Scaling** — features on wildly different ranges (age 0–100 vs income 0–1,000,000) can distort distance- and gradient-based models.

Fit these transforms on the **training data only**, then apply to test data — otherwise you leak information about the test set into training.`,
      quiz: [
        { prompt: "Why scale numeric features?", choices: ["To save memory", "So features on very different ranges don't distort the model", "It's just convention"], answer: 1 },
      ],
    },
    {
      body: `The two workhorse models. **Linear regression** predicts a number; **logistic regression** predicts a probability/class.

\`\`\`python
from sklearn.linear_model import LinearRegression, LogisticRegression

# predict a house price (a number)
reg = LinearRegression().fit(X_train, y_price)
reg.predict(X_new)

# predict spam vs not-spam (a class)
clf = LogisticRegression().fit(X_train, y_spam)
clf.predict_proba(X_new)   # probability of each class
\`\`\`

## The idea

Linear regression fits a straight-line relationship: \`price ≈ w1·size + w2·beds + b\`. It learns the weights that best fit the training data.

Logistic regression runs that same weighted sum through a curve that squashes it to 0–1, giving a probability — then you threshold it into a class.

They're simple, fast, and interpretable (you can read the weights to see what mattered). Always try them first — a fancy model that can't beat logistic regression isn't earning its complexity.`,
      quiz: [
        { prompt: "What does logistic regression predict?", choices: ["A raw number", "A probability / class", "An image"], answer: 1 },
      ],
    },
    {
      body: `**Decision trees** split data with yes/no questions; **ensembles** combine many trees for accuracy.

## A tree

A tree asks questions to reach a prediction: "beds ≥ 3? → size ≥ 100? → predict high price." Easy to read, but a single deep tree tends to **overfit** — it memorises the training data.

## Ensembles fix that

\`\`\`python
from sklearn.ensemble import RandomForestClassifier
model = RandomForestClassifier(n_estimators=200).fit(X_train, y)
\`\`\`

- **Random forest** — many trees on random subsets; average their votes. Robust, little tuning.
- **Gradient boosting** (XGBoost, LightGBM) — trees built in sequence, each fixing the last one's errors. Often the top performer on tabular data.

Ensembles are the go-to for structured/tabular problems in 2026 — frequently beating neural nets there. Start with a random forest for a strong baseline, then try boosting if you need more.`,
      quiz: [
        { prompt: "Why use an ensemble instead of one deep decision tree?", choices: ["It's simpler", "Combining many trees reduces overfitting and improves accuracy", "Trees can't predict numbers"], answer: 1 },
      ],
    },
    {
      body: `Everything so far used **labels** (known answers). **Clustering** finds structure with *no* labels — grouping similar points.

\`\`\`python
from sklearn.cluster import KMeans
km = KMeans(n_clusters=3).fit(X)
km.labels_     # which cluster each point landed in
\`\`\`

## K-means, briefly

You pick **k** (how many groups). The algorithm places k centres, assigns each point to the nearest, moves the centres to the middle of their points, and repeats until stable.

## When it's useful

- **Customer segmentation** — group users by behaviour.
- **Anomaly detection** — points far from any cluster.
- **Exploration** — discover natural groupings you didn't know were there.

This is **unsupervised** learning: no target column, just "what natural groups exist?" Choosing k is the art — try a few and inspect whether the groups are meaningful.`,
      quiz: [
        { prompt: "What makes clustering 'unsupervised'?", choices: ["It's faster", "It finds structure with no labels / target column", "It uses more data"], answer: 1 },
      ],
    },
    {
      body: `A model that memorises the training data can look perfect and be useless. To measure **real** performance, test on data the model never saw.

\`\`\`python
from sklearn.model_selection import train_test_split, cross_val_score

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
model.fit(X_train, y_train)
model.score(X_test, y_test)     # honest estimate — unseen data
\`\`\`

## Cross-validation

A single split can be lucky. **k-fold cross-validation** splits the data k ways, trains and tests k times, and averages — a more stable estimate:

\`\`\`python
cross_val_score(model, X, y, cv=5).mean()
\`\`\`

## The cardinal rule

**Never let test data influence training** — not in fitting, not in preprocessing, not in picking features. The test set is a stand-in for the future; peek at it and your score becomes a lie. Guarding that boundary is the difference between a model that works in the demo and one that works in production.`,
      quiz: [
        { prompt: "Why evaluate on a held-out test set?", choices: ["It's faster", "To estimate performance on data the model hasn't seen", "To train longer"], answer: 1 },
      ],
    },
    {
      body: `Accuracy alone can mislead. The right **metric** depends on the problem.

## Classification

- **Accuracy** — % correct. Misleading on **imbalanced** data: a "always healthy" model is 99% accurate if 99% of patients are healthy, yet useless.
- **Precision** — of those flagged positive, how many really were? (Cost of false alarms.)
- **Recall** — of the real positives, how many did we catch? (Cost of misses.)
- **F1** — the balance of precision and recall.

For disease screening you want high **recall** (don't miss sick patients); for spam you may favour **precision** (don't junk real mail).

## Regression

- **MAE** — average absolute error, in the target's units.
- **RMSE** — like MAE but punishes big misses harder.

Pick the metric that matches the real-world cost of being wrong. Optimising the wrong metric produces a model that scores well and fails in practice.`,
      quiz: [
        { prompt: "Why can accuracy mislead on imbalanced data?", choices: ["It's hard to compute", "A model that ignores the rare class can still score very high", "It only works for regression"], answer: 1 },
      ],
    },
    {
      body: `**Overfitting** is the central problem in ML: a model that fits the training data too closely, capturing noise, and fails on new data.

## How to spot it

Training score high, test score low, with a big gap. The model memorised instead of learning the pattern.

## How to fight it

- **More data** — the best cure when available.
- **Simpler model** — fewer parameters, shallower trees.
- **Regularisation** — penalise complexity so the model prefers simpler fits:

\`\`\`python
from sklearn.linear_model import Ridge   # L2 regularisation
Ridge(alpha=1.0).fit(X_train, y_train)
\`\`\`

- **Early stopping / cross-validation** — stop before it memorises; validate honestly.

## The balance

The opposite failure is **underfitting** — too simple to capture the real pattern (both scores low). The goal is the middle: complex enough to learn the signal, simple enough to ignore the noise. Managing that trade-off is the craft of machine learning.`,
      quiz: [
        { prompt: "What is the sign of overfitting?", choices: ["Both scores low", "High training score but low test score", "The model is too simple"], answer: 1 },
      ],
    },
  ],

  /* ======================================================== build-with-llms = */
  "build-with-llms": [
    {
      body: `To let a model answer over *your* data, you first make that data searchable by **meaning**, not keywords. **Embeddings** turn text into vectors — lists of numbers where similar meanings sit close together.

\`\`\`python
emb = embed("How do I reset my password?")
# -> [0.12, -0.03, 0.88, ...]  (e.g. 1536 numbers)
\`\`\`

"Reset password" and "forgot my login" land near each other in this space even with no shared words, because they *mean* the same thing.

## Vector search

Store each document's embedding in a **vector database** (Pinecone, pgvector, etc.). To find relevant text, embed the question and retrieve the nearest vectors:

\`\`\`python
hits = vector_db.search(embed(question), top_k=5)
\`\`\`

This semantic search is the retrieval half of RAG — the technique that lets an LLM answer from a knowledge base it was never trained on.`,
      quiz: [
        { prompt: "What do embeddings let you search by?", choices: ["Exact keywords only", "Meaning — similar concepts sit close in vector space", "File size"], answer: 1 },
      ],
    },
    {
      body: `You can't embed a whole book as one vector — you'd retrieve too much, imprecisely. **Chunking** splits documents into passages before indexing.

## Getting chunk size right

- **Too big** — a chunk covers many topics; retrieval is vague and wastes context.
- **Too small** — a chunk loses the surrounding meaning.
- A few hundred tokens with slight **overlap** between chunks is a common sweet spot; overlap avoids cutting an idea in half at a boundary.

\`\`\`python
chunks = split(document, size=400, overlap=50)
for c in chunks:
    vector_db.add(embed(c), metadata={"source": doc.name})
\`\`\`

## Keep metadata

Store where each chunk came from (document, page, section). That lets you **cite sources** in the answer and filter retrieval ("only from this manual"). Good chunking and metadata do more for RAG quality than a fancier model does.`,
      quiz: [
        { prompt: "Why add overlap between chunks?", choices: ["To use more storage", "So an idea isn't split in half at a chunk boundary", "It's required by the model"], answer: 1 },
      ],
    },
    {
      body: `**RAG** (retrieval-augmented generation) is the loop that ties it together: retrieve relevant chunks, put them in the prompt, and have the model answer from them.

\`\`\`python
def answer(question):
    chunks = vector_db.search(embed(question), top_k=5)
    context = "\\n\\n".join(c.text for c in chunks)
    prompt = f"""Answer ONLY from the context. If it's not there, say you don't know.

Context:
{context}

Question: {question}"""
    return llm(prompt)
\`\`\`

## Why this beats fine-tuning for most cases

- **Fresh** — update the knowledge base and answers update instantly; no retraining.
- **Cited** — you know which chunks were used, so you can show sources.
- **Grounded** — the "answer only from context" instruction sharply cuts hallucination.

RAG is the backbone of most production AI assistants in 2026. Retrieve, augment, generate — that's the whole idea, and now you can build it.`,
      quiz: [
        { prompt: "What does RAG do?", choices: ["Retrains the model on your data", "Retrieves relevant context and has the model answer from it", "Compresses the model"], answer: 1 },
      ],
    },
    {
      body: `A chat model only talks. **Tools** (function calling) let it *act* — look something up, do maths, hit an API — by asking your code to run a function.

## You describe the tools

\`\`\`json
{
  "name": "get_weather",
  "description": "Get current weather for a city",
  "parameters": {
    "type": "object",
    "properties": { "city": { "type": "string" } },
    "required": ["city"]
  }
}
\`\`\`

## The model decides when to call one

Given "What's it like in Paris?", the model doesn't guess the weather — it returns a request to call \`get_weather({"city": "Paris"})\`. Your code runs the real function.

The model chooses *which* tool and *what arguments*; your code does the actual work. This is how assistants book meetings, query databases and browse — the LLM as a reasoning layer over real functions.`,
      quiz: [
        { prompt: "In tool/function calling, who runs the actual function?", choices: ["The model itself", "Your code — the model only requests the call with arguments", "The user"], answer: 1 },
      ],
    },
    {
      body: `Calling a tool is half the loop. You run it, then **feed the result back** so the model can use it in its answer.

## The round trip

1. Model → "call \`get_weather(city='Paris')\`".
2. Your code runs it → \`{"temp": 18, "sky": "cloudy"}\`.
3. You send that result **back** to the model as a tool message.
4. Model → "It's 18°C and cloudy in Paris."

\`\`\`python
while response.wants_tool_call:
    result = run_tool(response.tool, response.args)
    response = llm.continue_with(result)   # loop until it answers
\`\`\`

## Why the loop

The model may need **several** tools in sequence (look up a user, then their orders, then summarise). You keep running tools and returning results until it produces a final answer instead of another call. Getting this loop right — and capping it so it can't run forever — is the core of building an agent.`,
      quiz: [
        { prompt: "After running a tool, what do you do?", choices: ["Ignore the result", "Send the result back to the model so it can continue reasoning", "Restart the conversation"], answer: 1 },
      ],
    },
    {
      body: `An **agent** is an LLM in a loop, using tools to reach a goal on its own: **plan → act → observe → repeat**.

\`\`\`
Goal: "Find the cheapest flight next Friday and summarise options."

1. Plan  — I need to search flights.
2. Act   — call search_flights(date="Fri")
3. Observe — got 12 results
4. Plan  — sort by price, pick top 3
5. Act   — call get_details(...) for each
6. Observe — details in hand
7. Answer — here are the 3 cheapest...
\`\`\`

## What makes it an agent

It **decides its own next step** based on what it observes, rather than following a fixed script. That flexibility is powerful — and risky, which is the next lesson.

## Keep it bounded

Always cap the number of steps and the tools available. An unbounded agent can loop forever or run up cost. Start with tight limits and a small, safe toolset, then widen as you trust it.`,
      quiz: [
        { prompt: "What defines an agent versus a fixed script?", choices: ["It uses a bigger model", "It decides its own next step based on what it observes", "It never uses tools"], answer: 1 },
      ],
    },
    {
      body: `An autonomous system that can act needs **guardrails** so it stays safe, and **evals** so you know it works.

## Guardrails

- **Limit the tools** — give an agent only what it needs; a read-only agent can't delete anything.
- **Validate arguments** before running a tool ("is this a real user id?").
- **Cap steps and cost** — a hard ceiling on loop iterations and spend.
- **Human in the loop** for risky actions — confirm before it emails a customer or spends money.

## Evals for LLM systems

You can't unit-test a probabilistic system the old way. Build a suite of realistic cases and score outcomes:

- Does RAG retrieve the right chunk?
- Does the agent reach the goal within the step budget?
- **LLM-as-judge** — a second model rates answer quality against a rubric.

Run the suite on every prompt or model change. Guardrails keep it safe; evals keep it honest. Ship neither and you're flying blind.`,
      quiz: [
        { prompt: "Why give an agent only the tools it needs?", choices: ["To save memory", "So it can't take actions beyond its purpose — a safety guardrail", "Models prefer fewer tools"], answer: 1 },
      ],
    },
    {
      body: `Shipping an LLM feature is more than the prompt — it's **deployment** and **monitoring** in production.

## Deploy

- Keep API keys **server-side**; never expose them to the browser.
- **Stream** responses (server-sent events) so users see text as it generates instead of waiting.
- Enforce **rate limits and spend caps** — LLM calls cost money and a bug can run up a bill fast.

## Monitor

- **Log** prompts, responses, latency, token usage and cost per request.
- **Track quality** with your eval suite on real traffic samples.
- **Watch for drift** — a model update or changing user behaviour can quietly degrade answers.

\`\`\`
metrics: latency_p95, tokens_in/out, cost/day, eval_pass_rate, error_rate
\`\`\`

## The mindset

Treat the model like any external dependency: it can be slow, fail, or change. Handle errors, cap cost, measure quality continuously. That operational discipline is what separates a demo from a product people rely on — and it's exactly what the AI engineer role is paid for.`,
      quiz: [
        { prompt: "Where should LLM API keys live?", choices: ["In the browser for speed", "Server-side, never exposed to the client", "In the prompt"], answer: 1 },
      ],
    },
  ],
};

/** Generic fallback body for any lesson without authored content yet, built
 *  from the lesson's own metadata so it still reads as a real (if brief) lesson
 *  rather than a blank, and the AI tutor can take it deeper. */
export function fallbackBody(title: string, objective: string, course: string): string {
  return `## ${title}

This lesson is part of **${course}**.

**By the end you'll be able to:** ${objective}

---

Work through the idea below, then use **Ask AI to explain** for a worked example, a different angle, or the common mistakes — the tutor has this lesson's context.

- Start from what you already know and connect this to it.
- Try the smallest possible example yourself before moving on.
- If something doesn't click, ask the tutor to explain it a different way.

When you can do the objective above without looking it up, you're ready for the next lesson.`;
}
