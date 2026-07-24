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
