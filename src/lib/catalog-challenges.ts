import type { Challenge } from "./catalog";

/**
 * Practice tasks for the foundation courses.
 *
 * Keyed by course slug, in flat lesson order (module by module, top to
 * bottom) — the same convention LESSON_CONTENT uses, so the two files stay in
 * step. catalog.ts folds these onto the matching lessons at module load.
 *
 * The task sets for Python and JavaScript are modelled on Asabeneh Yetayeh's
 * 30 Days Of Python and 30 Days Of JavaScript (MIT), which are the reference
 * curricula for this material: same topics in the same order, and the same
 * three-level progression. Tasks are paraphrased and adapted to run inside the
 * lesson page rather than copied wholesale.
 *
 *   https://github.com/Asabeneh/30-Days-Of-Python
 *   https://github.com/Asabeneh/30-Days-Of-JavaScript
 *
 * The Git course is built on the workflows in the Pro Git book and GitHub's
 * own flow documentation.
 *
 * A note on level 3: not every lesson has one, and that is deliberate. Padding
 * a syntax lesson with an artificial "hard" task teaches nothing except that
 * the level labels are decorative.
 */

/** courseSlug -> challenges in flat lesson order. */
export const LESSON_CHALLENGES: Record<string, Challenge[][]> = {
  /* ==================================================== python-essentials == */
  "python-essentials": [
    /* 01 — How Python runs your code */
    [
      {
        level: 1,
        prompt:
          'Write a script that prints "Hello, DeveloperOS" and run it from a terminal with `python hello.py`.',
        starter: '# hello.py\n',
        solution: 'print("Hello, DeveloperOS")',
      },
      {
        level: 1,
        prompt:
          "Print your name, your age and your favourite language on three separate lines using three calls to `print()`.",
      },
      {
        level: 2,
        prompt:
          "Open the REPL with `python` (no filename) and work out what `2 ** 10`, `7 // 2` and `7 % 2` each give you. Then explain in one sentence how `//` differs from `/`.",
        hint: "`//` throws away the remainder rather than producing a decimal.",
      },
    ],

    /* 02 — Variables and types */
    [
      {
        level: 1,
        prompt:
          "Declare variables for your first name, last name, country and age. Print each one, then print the `type()` of each.",
        solution:
          'first_name = "Asabeneh"\nlast_name = "Yetayeh"\ncountry = "Finland"\nage = 250\n\nfor value in (first_name, last_name, country, age):\n    print(value, type(value))',
      },
      {
        level: 1,
        prompt:
          "Use `len()` on your first name and last name and compare them. Which is longer?",
      },
      {
        level: 2,
        prompt:
          "Declare `num_one = 5` and `num_two = 4`. Print their sum, difference, product, division and remainder — each on its own labelled line.",
      },
      {
        level: 2,
        prompt:
          "Ask the user for their base and height with `input()`, then print the area of the triangle. Remember `input()` always hands you a string.",
        starter:
          'base = input("Enter base: ")\nheight = input("Enter height: ")\n# convert, then calculate',
        hint: "Wrap each `input()` in `float()` before doing arithmetic.",
      },
      {
        level: 3,
        prompt:
          "Write a script that takes the three sides of a triangle as input and prints its perimeter, then use the same inputs to decide whether the triangle is valid (any two sides must sum to more than the third).",
      },
    ],

    /* 03 — Strings and formatting */
    [
      {
        level: 1,
        prompt:
          'Concatenate "Thirty", "Days", "Of" and "Python" into a single string with spaces between the words — first with `+`, then with an f-string.',
        solution:
          'parts = ["Thirty", "Days", "Of", "Python"]\nprint(" ".join(parts))',
      },
      {
        level: 1,
        prompt:
          "Take the string `Python for Everyone`. Print it in upper case, in lower case, with the words reversed, and with the first character of each word capitalised.",
      },
      {
        level: 2,
        prompt:
          'Given `sentence = "I am enjoying this challenge. I just wonder what is next."`, count how many times the word "I" appears, and find the index at which the word "challenge" starts.',
        hint: "`.count()` and `.index()` both take a substring.",
      },
      {
        level: 2,
        prompt:
          "Slice the string `Thirty Days Of Python` to produce `Thirty`, `Python`, and every second character of the whole string.",
      },
      {
        level: 3,
        prompt:
          "Write a function that takes a sentence and returns it with the words in reverse order but each word spelled correctly — `\"I love Python\"` becomes `\"Python love I\"`.",
        solution: 'def reverse_words(sentence):\n    return " ".join(sentence.split()[::-1])',
      },
    ],

    /* 04 — Conditionals */
    [
      {
        level: 1,
        prompt:
          "Ask the user for their age. If they are 18 or older, print that they can drive; otherwise print how many years they have left to wait.",
        solution:
          'age = int(input("Enter your age: "))\nif age >= 18:\n    print("You are old enough to drive.")\nelse:\n    print(f"You need {18 - age} more years.")',
      },
      {
        level: 1,
        prompt:
          "Compare two numbers entered by the user and print whether the first is greater than, less than, or equal to the second.",
      },
      {
        level: 2,
        prompt:
          "Write a grade calculator: 80–100 is an A, 70–89 a B, 60–69 a C, 50–59 a D, and 0–49 an F. Be careful about the order your branches run in.",
        hint: "The overlapping ranges in that spec are a deliberate trap — decide which branch should win and say why.",
      },
      {
        level: 2,
        prompt:
          "Given a month name as input, print which season it falls in: Autumn, Winter, Spring or Summer.",
      },
      {
        level: 3,
        prompt:
          "Take a list of fruits and ask the user to add one. If the fruit is already in the list, tell them so; otherwise add it and print the updated list.",
      },
    ],

    /* 05 — Loops */
    [
      {
        level: 1,
        prompt: "Use a `for` loop to print 0 to 10, then a `while` loop to do the same thing.",
        solution:
          "for i in range(11):\n    print(i)\n\ni = 0\nwhile i <= 10:\n    print(i)\n    i += 1",
      },
      {
        level: 1,
        prompt: "Print every even number from 0 to 100, and separately every odd number.",
      },
      {
        level: 2,
        prompt:
          "Use a loop to print the following pattern:\n```\n#\n##\n###\n####\n#####\n```",
      },
      {
        level: 2,
        prompt:
          "Loop through the numbers 0 to 100 and print only those divisible by both 3 and 5. Then sum them.",
      },
      {
        level: 3,
        prompt:
          "Write the multiplication table for a number the user enters, from 1 to 12, aligned in columns.",
        hint: "f-strings take a width: `f\"{value:>4}\"` right-aligns in four characters.",
      },
    ],

    /* 06 — Comprehensions */
    [
      {
        level: 1,
        prompt:
          "Turn `numbers = [1, 2, 3, 4, 5]` into a list of their squares using a list comprehension.",
        solution: "squares = [n ** 2 for n in numbers]",
      },
      {
        level: 1,
        prompt:
          'Use a comprehension to extract only the letters from `"Hello, World! 2026"`.',
      },
      {
        level: 2,
        prompt:
          "Given a list of country names, build a list of only those containing the word 'land'.",
      },
      {
        level: 2,
        prompt:
          "Flatten `[[1, 2], [3, 4], [5, 6]]` into `[1, 2, 3, 4, 5, 6]` with a single comprehension.",
        solution: "flat = [n for row in nested for n in row]",
      },
      {
        level: 3,
        prompt:
          "Given a list of `(name, score)` tuples, build a dictionary mapping name to a pass/fail string, where 50 is the pass mark. Do it in one dict comprehension.",
      },
    ],

    /* 07 — Lists and tuples */
    [
      {
        level: 1,
        prompt:
          "Declare `it_companies = ['Facebook', 'Google', 'Microsoft', 'Apple', 'IBM', 'Oracle', 'Amazon']`. Print the list, its length, and the first, middle and last company.",
        solution:
          "print(it_companies)\nprint(len(it_companies))\nprint(it_companies[0], it_companies[len(it_companies) // 2], it_companies[-1])",
      },
      {
        level: 1,
        prompt:
          "Add a company to the end of the list, insert one in the middle, then change one name to upper case (leave IBM alone).",
      },
      {
        level: 1,
        prompt:
          "Join the companies into a single string separated by `'#; '`, then check whether a given company exists in the list.",
      },
      {
        level: 2,
        prompt:
          "Sort the list, reverse it, then slice out the first three, the last three, and the middle company or companies.",
      },
      {
        level: 2,
        prompt:
          "Join `front_end = ['HTML', 'CSS', 'JS', 'React', 'Redux']` and `back_end = ['Node', 'Express', 'MongoDB']`, copy the result into `full_stack`, and insert 'Python' and 'SQL' after 'Redux'.",
      },
      {
        level: 3,
        prompt:
          "Given `ages = [19, 22, 19, 24, 20, 25, 26, 24, 25, 24]`: sort them, find the min and max, append both back onto the list, then find the median and the average. Finally compare `(min - average)` with `(max - average)` using `abs()`.",
        hint: "The median of an even-length list is the mean of the two middle values.",
      },
    ],

    /* 08 — Dictionaries and sets */
    [
      {
        level: 1,
        prompt:
          "Create a `dog` dictionary, then add `name`, `colour`, `breed`, `legs` and `age` keys to it one at a time.",
      },
      {
        level: 1,
        prompt:
          "Build a `student` dictionary with keys for first name, last name, gender, age, marital status, skills, country, city and address. Print the number of keys, the value of `skills` and its type, then add two more skills to it.",
        solution:
          'print(len(student))\nprint(student["skills"], type(student["skills"]))\nstudent["skills"].extend(["Python", "SQL"])',
      },
      {
        level: 2,
        prompt:
          "Get the dictionary's keys and values as lists, then delete one entry with `del` and another with `.pop()`. What is the difference between them?",
      },
      {
        level: 2,
        prompt:
          "Given `it_companies` as a set, add a company, add several at once, remove one, and explain the difference between `remove()` and `discard()`.",
        hint: "One of them raises `KeyError` on a missing element. Find out which by trying it.",
      },
      {
        level: 3,
        prompt:
          "Given two sets `A = {19, 22, 24, 20, 25, 26}` and `B = {19, 22, 20, 25, 26, 24, 28, 27}`, find their union, intersection, and whether A is a subset of B. Then use a set to count how many unique words are in a paragraph of your choosing.",
      },
    ],

    /* 09 — Working with files */
    [
      {
        level: 1,
        prompt:
          "Write a script that creates `notes.txt`, writes three lines to it, then reads the file back and prints it.",
        solution:
          'with open("notes.txt", "w") as f:\n    f.write("one\\ntwo\\nthree\\n")\n\nwith open("notes.txt") as f:\n    print(f.read())',
      },
      {
        level: 1,
        prompt:
          "Read a file line by line with a `for` loop and print each line with its line number.",
      },
      {
        level: 2,
        prompt:
          "Write a dictionary out as JSON with `json.dump()`, then read it back with `json.load()` and confirm you get the same data.",
        hint: "`json` is in the standard library — no install needed.",
      },
      {
        level: 2,
        prompt:
          "Open a file that does not exist and handle the `FileNotFoundError` so your program prints a helpful message instead of a traceback.",
      },
      {
        level: 3,
        prompt:
          "Read a text file, count how often each word appears, and write the ten most common words to a new file as JSON. Strip punctuation and ignore case.",
      },
    ],

    /* 10 — Defining functions */
    [
      {
        level: 1,
        prompt:
          "Write `add_two_numbers(a, b)` that returns their sum, then call it and print the result.",
        solution: "def add_two_numbers(a, b):\n    return a + b",
      },
      {
        level: 1,
        prompt:
          "Write `area_of_circle(r)` that returns the area, and `celsius_to_fahrenheit(c)` that converts a temperature.",
      },
      {
        level: 2,
        prompt:
          "Write a function that takes any number of arguments with `*args` and returns their sum. Then write one that takes `**kwargs` and prints each keyword and its value.",
      },
      {
        level: 2,
        prompt:
          "Write `add_item(lst, item)` that returns a *new* list with the item appended, leaving the original untouched. Prove it does not mutate the input.",
        hint: "Default arguments and in-place `.append()` are the two traps here.",
      },
      {
        level: 3,
        prompt:
          "Write `is_prime(n)`, then use it to print every prime below 100. Stop checking divisors once you pass the square root of `n` and explain why that is safe.",
      },
    ],

    /* 11 — Modules and imports */
    [
      {
        level: 1,
        prompt:
          "Create `my_module.py` with a `greet(name)` function, then import and call it from a second file.",
      },
      {
        level: 1,
        prompt:
          "Import the `math` module and use it to find the square root of 25, the value of pi, and 2 raised to the power of 8.",
      },
      {
        level: 2,
        prompt:
          "Use `from datetime import datetime` to print today's date in the format `26-07-2026, 14:05:33`, then print the timestamp.",
        hint: "`strftime` takes a format string. `%d-%m-%Y, %H:%M:%S`.",
      },
      {
        level: 2,
        prompt:
          "Use the `statistics` module to find the mean, median and standard deviation of a list of ages, then reimplement the mean yourself and check they agree.",
      },
      {
        level: 3,
        prompt:
          "Add `if __name__ == '__main__':` to a module so it can be both imported and run directly. Demonstrate both behaviours.",
      },
    ],

    /* 12 — Errors and exceptions */
    [
      {
        level: 1,
        prompt:
          "Trigger a `ZeroDivisionError`, a `TypeError` and a `NameError` on purpose, and read each traceback. What line does each one point at?",
      },
      {
        level: 1,
        prompt:
          "Wrap a division in `try` / `except ZeroDivisionError` so the program prints a message and keeps running.",
        solution:
          'try:\n    result = 10 / 0\nexcept ZeroDivisionError:\n    print("Cannot divide by zero.")',
      },
      {
        level: 2,
        prompt:
          "Ask the user for a number in a loop and keep asking until they give you one that converts cleanly with `int()`. Catch `ValueError`, not everything.",
        hint: "A bare `except:` will also swallow Ctrl-C. Always name the exception.",
      },
      {
        level: 2,
        prompt:
          "Use `try` / `except` / `else` / `finally` in one block and print something in each part, so you can see the order they run in.",
      },
      {
        level: 3,
        prompt:
          "Define your own exception class `InsufficientFundsError` and raise it from a `withdraw()` function when the balance is too low. Catch it at the call site and print the shortfall.",
      },
    ],
  ],

  /* ================================================ javascript-essentials == */
  "javascript-essentials": [
    /* 01 — How JavaScript runs */
    [
      {
        level: 1,
        prompt:
          'Write "Hello, DeveloperOS" to the console from an external `main.js` file linked with `<script src="main.js"></script>` just before the closing `</body>` tag.',
        solution: '// main.js\nconsole.log("Hello, DeveloperOS")',
      },
      {
        level: 1,
        prompt:
          "Declare a variable with `let`, one with `const`, and try to reassign each. Which one throws, and what does the error say?",
      },
      {
        level: 2,
        prompt:
          "Open the browser console and evaluate `0.1 + 0.2`. Explain the result in one sentence, then find a way to compare it to `0.3` that returns `true`.",
        hint: "Floating-point equality wants a tolerance, not `===`.",
      },
    ],

    /* 02 — Data types */
    [
      {
        level: 1,
        prompt:
          "Declare variables holding a string, a number, a boolean, `undefined` and `null`. Print the `typeof` each.",
        solution:
          'const items = ["text", 42, true, undefined, null]\nitems.forEach((v) => console.log(v, typeof v))',
      },
      {
        level: 1,
        prompt:
          "Declare `firstName`, `lastName`, `country`, `city`, `age` and `isMarried`, then print a sentence about yourself built with a template literal.",
      },
      {
        level: 2,
        prompt:
          "Work out what each of these gives you and why: `'10' + 1`, `'10' - 1`, `10 + true`, `[] + {}`. Then convert `'10'` to a number three different ways.",
        hint: "`+` is overloaded for strings; every other arithmetic operator coerces.",
      },
      {
        level: 3,
        prompt:
          "Write a function `describe(value)` that returns a correct type name for anything you pass it — including arrays and `null`, which `typeof` gets wrong.",
        hint: "`Object.prototype.toString.call(value)` is the reliable route.",
      },
    ],

    /* 03 — Conditionals */
    [
      {
        level: 1,
        prompt:
          "Prompt the user for a number and print whether it is even or odd.",
        solution:
          'const n = Number(prompt("Enter a number"))\nconsole.log(n % 2 === 0 ? "even" : "odd")',
      },
      {
        level: 1,
        prompt:
          "Write a grade checker with `if / else if / else`: 90–100 an A, 80–89 a B, 70–79 a C, 60–69 a D, below 60 an F.",
      },
      {
        level: 2,
        prompt:
          "Rewrite the season checker (`Autumn`, `Winter`, `Spring`, `Summer`) using a `switch` instead of `if`. Which reads better here, and why?",
      },
      {
        level: 2,
        prompt:
          "Given `const fruits = ['banana', 'orange', 'mango', 'lemon']`, prompt for a fruit and either report that it is already there or add it and print the new array.",
      },
      {
        level: 3,
        prompt:
          "List every falsy value in JavaScript, then write a function that returns `true` only for values that are falsy *but not* the number zero.",
      },
    ],

    /* 04 — Arrays */
    [
      {
        level: 1,
        prompt:
          "Declare `itCompanies` with Facebook, Google, Microsoft, Apple, IBM, Oracle and Amazon. Print the array, its length, and the first, middle and last company.",
        solution:
          "console.log(itCompanies)\nconsole.log(itCompanies.length)\nconsole.log(itCompanies[0], itCompanies[Math.floor(itCompanies.length / 2)], itCompanies.at(-1))",
      },
      {
        level: 1,
        prompt:
          "Print each company on its own line, then print them all upper-cased, one by one.",
      },
      {
        level: 1,
        prompt:
          'Print the array as a sentence: "Facebook, Google, Microsoft, Apple, IBM, Oracle and Amazon are big IT companies".',
        hint: "`slice`, `join` and one bit of string concatenation for the final 'and'.",
      },
      {
        level: 2,
        prompt:
          "Filter out the companies whose name contains more than one letter 'o' — without using `.filter()`.",
      },
      {
        level: 2,
        prompt:
          "Sort the array, reverse it, then slice out the first three, the last three, and the middle company or companies.",
      },
      {
        level: 3,
        prompt:
          "Given `ages = [19, 22, 19, 24, 20, 25, 26, 24, 25, 24]`: sort it, find min and max, calculate the median and the average, and find the range. Then compare `(min - average)` with `(max - average)` using `Math.abs()`.",
      },
    ],

    /* 05 — Loops */
    [
      {
        level: 1,
        prompt:
          "Print 0 to 10 with a `for` loop, then with a `while` loop, then with a `do...while` loop.",
      },
      {
        level: 1,
        prompt:
          "Use a loop to build the string `'#####'` five characters long, then print the growing triangle from one `#` to five.",
      },
      {
        level: 2,
        prompt:
          "Loop 0 to 100 and collect the numbers divisible by both 3 and 5 into an array, then print their sum.",
      },
      {
        level: 2,
        prompt:
          "Given an array of countries, use a loop to build a new array containing only those with more than five characters.",
      },
      {
        level: 3,
        prompt:
          "Write a loop that generates six random, unique numbers between 0 and 100 and stores them in an array. It must never contain a duplicate.",
        hint: "A `Set` is the shortest honest way to guarantee uniqueness.",
      },
    ],

    /* 06 — Functions */
    [
      {
        level: 1,
        prompt:
          "Write the same `addTwoNumbers` function three ways: as a function declaration, a function expression, and an arrow function.",
        solution:
          "function addTwoNumbers(a, b) { return a + b }\nconst addTwoNumbers2 = function (a, b) { return a + b }\nconst addTwoNumbers3 = (a, b) => a + b",
      },
      {
        level: 1,
        prompt:
          "Write `areaOfCircle(r)`, `convertCelsiusToFahrenheit(c)` and `calculateBMI(weight, height)` that also returns the BMI category as a string.",
      },
      {
        level: 2,
        prompt:
          "Write a function that takes any number of arguments using rest parameters and returns their sum.",
        solution: "const sum = (...numbers) => numbers.reduce((total, n) => total + n, 0)",
      },
      {
        level: 2,
        prompt:
          "Write `generateColors(type, count)` that returns an array of that many random hex or rgb colours, depending on the type you pass.",
      },
      {
        level: 3,
        prompt:
          "Write `shuffleArray(arr)` that returns a properly shuffled copy. Look up why the naive `sort(() => Math.random() - 0.5)` is biased, and avoid it.",
      },
    ],

    /* 07 — Objects */
    [
      {
        level: 1,
        prompt:
          "Create a `dog` object with `name`, `legs`, `colour`, `age` and a `bark()` method that returns 'woof woof'.",
        solution:
          'const dog = {\n  name: "Fido",\n  legs: 4,\n  colour: "brown",\n  age: 3,\n  bark() {\n    return "woof woof"\n  },\n}',
      },
      {
        level: 1,
        prompt:
          "Build a `personAccount` object with `firstName`, `lastName`, `incomes`, `expenses`, and methods `totalIncome()`, `totalExpense()` and `accountBalance()`.",
      },
      {
        level: 2,
        prompt:
          "Add `addIncome()` and `addExpense()` methods to `personAccount`, then use them and print the updated balance.",
      },
      {
        level: 2,
        prompt:
          "Use `Object.keys()`, `Object.values()` and `Object.entries()` on a `users` object and print what each returns.",
      },
      {
        level: 3,
        prompt:
          "Given a `users` object where each user has `skills` and `points`, find the user with the most skills, count how many have more than 50 points, and list everyone who knows MongoDB, Express, React and Node.",
      },
    ],

    /* 08 — Higher order functions */
    [
      {
        level: 1,
        prompt:
          "Use `forEach` to print every country in an array, then use `map` to return them all upper-cased.",
        solution: "const upper = countries.map((c) => c.toUpperCase())",
      },
      {
        level: 1,
        prompt:
          "Use `filter` to get every country containing the word 'land', then every country with exactly six characters.",
      },
      {
        level: 2,
        prompt:
          "Use `reduce` to sum an array of numbers, then use it again to concatenate an array of strings into one sentence.",
      },
      {
        level: 2,
        prompt:
          "Chain `filter` and `map` to take an array of products and return the names of only those under £50, formatted as strings.",
      },
      {
        level: 3,
        prompt:
          "Write `categorizeCountries()` that returns every country containing 'land', then a function that returns an object mapping each starting letter to how many countries begin with it.",
        hint: "`reduce` with an object accumulator is the idiomatic shape for a tally.",
      },
    ],

    /* 09 — Destructuring and spread */
    [
      {
        level: 1,
        prompt:
          "Destructure `const [a, b, c] = [1, 2, 3]` and swap two variables using array destructuring in a single line.",
        solution: "let x = 1, y = 2\n;[x, y] = [y, x]",
      },
      {
        level: 1,
        prompt:
          "Destructure a `user` object into `name`, `age` and `country`, giving `country` a default of 'Unknown'.",
      },
      {
        level: 2,
        prompt:
          "Use the rest pattern to pull the first two items off an array and collect the rest, then use spread to merge two objects where the second wins on conflicts.",
      },
      {
        level: 3,
        prompt:
          "Destructure directly in a function parameter list so `printUser({ name, age })` works, then make it handle being called with no argument at all.",
        hint: "A default of `= {}` on the parameter itself.",
      },
    ],

    /* 10 — Classes */
    [
      {
        level: 1,
        prompt:
          "Write an `Animal` class with a constructor taking `name`, `age`, `colour` and `legs`, plus a `getName()` method.",
      },
      {
        level: 1,
        prompt:
          "Create a `Dog` class that extends `Animal` and overrides a `makeSound()` method.",
        solution:
          'class Dog extends Animal {\n  constructor(name, age, colour, legs) {\n    super(name, age, colour, legs)\n  }\n  makeSound() {\n    return "woof woof"\n  }\n}',
      },
      {
        level: 2,
        prompt:
          "Add getters and setters to a `Person` class so `score` can be read but only written through a method that validates it is between 0 and 100.",
      },
      {
        level: 3,
        prompt:
          "Build a `Statistics` class over an array of ages with `count()`, `sum()`, `min()`, `max()`, `range()`, `mean()`, `median()`, `mode()`, `var()`, `std()` and a `describe()` that prints them all.",
      },
    ],

    /* 11 — Error handling */
    [
      {
        level: 1,
        prompt:
          "Wrap `JSON.parse()` on a deliberately malformed string in `try` / `catch` and print the error's `name` and `message`.",
        solution:
          'try {\n  JSON.parse("{ not json }")\n} catch (error) {\n  console.log(error.name, error.message)\n}',
      },
      {
        level: 1,
        prompt:
          "Trigger a `ReferenceError`, a `TypeError` and a `SyntaxError` on purpose and read each message.",
      },
      {
        level: 2,
        prompt:
          "Write a function that `throw`s a custom `Error` when given a negative number, and catch it at the call site.",
      },
      {
        level: 2,
        prompt:
          "Add a `finally` block and prove it runs whether or not the `try` throws.",
      },
      {
        level: 3,
        prompt:
          "Create a `ValidationError` class extending `Error`, throw it from a form validator, and catch it separately from other errors using `instanceof`.",
      },
    ],

    /* 12 — Promises and async */
    [
      {
        level: 1,
        prompt:
          "Use `fetch()` to get data from a public API and print the parsed JSON with `.then()`.",
        solution:
          'fetch("https://restcountries.com/v3.1/all")\n  .then((response) => response.json())\n  .then((data) => console.log(data.length))\n  .catch(console.error)',
      },
      {
        level: 1,
        prompt: "Rewrite that same request using `async` / `await` inside a function.",
      },
      {
        level: 2,
        prompt:
          "Add error handling to the async version with `try` / `catch`, and check `response.ok` — `fetch` does not reject on a 404.",
        hint: "This is the single most common `fetch` bug. A 404 is a successful HTTP round trip.",
      },
      {
        level: 2,
        prompt:
          "Use `Promise.all()` to fetch three URLs at once and print how much faster it is than awaiting them one at a time.",
      },
      {
        level: 3,
        prompt:
          "Fetch the countries API, then print the ten most populated countries and the total population of the whole dataset, sorted and formatted with thousands separators.",
      },
    ],

    /* 13 — The DOM */
    [
      {
        level: 1,
        prompt:
          "Select an element by id, by class and by CSS selector, and print each result. What is the difference between `querySelector` and `querySelectorAll`?",
      },
      {
        level: 1,
        prompt:
          "Change an element's text content, its style, and add a class to it — all from JavaScript.",
        solution:
          'const title = document.querySelector("#title")\ntitle.textContent = "Updated"\ntitle.style.color = "rebeccapurple"\ntitle.classList.add("is-active")',
      },
      {
        level: 2,
        prompt:
          "Create 100 `div` elements in a loop, give each the number as its text, and colour them green if the number is divisible by 3, yellow if by 5, and red otherwise.",
      },
      {
        level: 2,
        prompt:
          "Attach a click listener to a button that changes the page background colour to a new random colour on every click.",
      },
      {
        level: 3,
        prompt:
          "Build a small live-search box: as you type, filter a list of countries in the DOM and show the matching count. Debounce it so it does not re-render on every keystroke.",
      },
    ],

    /* 14 — Web storage */
    [
      {
        level: 1,
        prompt:
          "Store your name in `localStorage`, read it back, then remove it. Refresh the page between each step and watch it survive.",
        solution:
          'localStorage.setItem("name", "Josh")\nconsole.log(localStorage.getItem("name"))\nlocalStorage.removeItem("name")',
      },
      {
        level: 2,
        prompt:
          "Store an object in `localStorage`. It only holds strings, so work out what you need to do on the way in and on the way out.",
        hint: "`JSON.stringify` going in, `JSON.parse` coming out.",
      },
      {
        level: 3,
        prompt:
          "Build a to-do list that persists across refreshes. Adding, completing and deleting an item should all survive reloading the page.",
      },
    ],
  ],

  /* ============================================================ git-github == */
  "git-github": [
    /* 01 — What version control actually is */
    [
      {
        level: 1,
        prompt:
          "Run `git --version` and `git config --global --list`. Set your `user.name` and `user.email` if they are not already set.",
        solution:
          'git config --global user.name "Your Name"\ngit config --global user.email "you@example.com"',
      },
      {
        level: 1,
        prompt:
          "Create a new folder, run `git init` inside it, and run `git status`. What does Git tell you about the branch and about your files?",
      },
      {
        level: 2,
        prompt:
          "Look inside the `.git` directory with `ls -a .git`. Name three things you find there and say what you think each is for.",
        hint: "`HEAD`, `objects/` and `refs/` are the three that matter.",
      },
    ],

    /* 02 — Staging and committing */
    [
      {
        level: 1,
        prompt:
          "Create a `README.md`, stage it with `git add`, and commit it with a message. Then run `git log --oneline`.",
        solution:
          'echo "# My project" > README.md\ngit add README.md\ngit commit -m "Add README"\ngit log --oneline',
      },
      {
        level: 1,
        prompt:
          "Change the README, run `git status` and `git diff`. Then stage it and run `git diff` again — why is it now empty, and what shows the staged change?",
        hint: "`git diff --staged` is the answer to the second half.",
      },
      {
        level: 2,
        prompt:
          "Make three separate logical changes in one file, then commit them as three separate commits using `git add -p`.",
      },
      {
        level: 2,
        prompt:
          "Write a `.gitignore` that excludes `node_modules/`, `.env` and `*.log`. Prove it works by creating those files and running `git status`.",
      },
      {
        level: 3,
        prompt:
          "You committed a `.env` file by accident one commit ago. Remove it from the repository but keep it on disk, add it to `.gitignore`, and amend the history so it is gone. Explain why the secret in it should still be rotated.",
        hint: "`git rm --cached`, then `git commit --amend`. The secret is in the reflog and any clone.",
      },
    ],

    /* 03 — Reading history */
    [
      {
        level: 1,
        prompt:
          "Use `git log --oneline --graph --all` and describe the shape of your history in one sentence.",
      },
      {
        level: 1,
        prompt:
          "Find every commit that touched a specific file with `git log -- path/to/file`, then see exactly what one of them changed with `git show`.",
      },
      {
        level: 2,
        prompt:
          "Use `git blame` on a file to find who last changed a particular line and in which commit.",
      },
      {
        level: 3,
        prompt:
          "A bug appeared somewhere in the last twenty commits. Use `git bisect` to find the exact commit that introduced it.",
        solution:
          "git bisect start\ngit bisect bad\ngit bisect good HEAD~20\n# test, then mark each step\ngit bisect good   # or: git bisect bad\ngit bisect reset",
      },
    ],

    /* 04 — Undoing things */
    [
      {
        level: 1,
        prompt:
          "Modify a file, then throw the change away with `git restore`. Stage a file, then unstage it with `git restore --staged`.",
      },
      {
        level: 2,
        prompt:
          "Make a commit, then undo it three ways: `git reset --soft HEAD~1`, `git reset --mixed HEAD~1` and `git reset --hard HEAD~1`. Describe what happened to your working directory each time.",
        hint: "Soft keeps it staged, mixed keeps it in the working tree, hard destroys it.",
      },
      {
        level: 2,
        prompt:
          "Use `git revert` to undo a commit that has already been pushed. Why is this the correct tool here and `reset` is not?",
      },
      {
        level: 3,
        prompt:
          "Run `git reset --hard` and lose a commit on purpose. Now get it back using `git reflog`.",
      },
    ],

    /* 05 — Branching and merging */
    [
      {
        level: 1,
        prompt:
          "Create a branch with `git switch -c feature/login`, make a commit on it, then switch back to `main` and confirm your change is gone from the working tree.",
        solution: "git switch -c feature/login\n# ...edit, add, commit...\ngit switch main",
      },
      {
        level: 1,
        prompt:
          "Merge your feature branch into `main` with `git merge`, then delete the branch.",
      },
      {
        level: 2,
        prompt:
          "Deliberately create a merge conflict: change the same line on two branches, then merge. Resolve it by hand, and explain what the `<<<<<<<`, `=======` and `>>>>>>>` markers mean.",
      },
      {
        level: 2,
        prompt:
          "Compare `git merge` and `git rebase` on the same pair of branches. Draw the resulting history for each.",
      },
      {
        level: 3,
        prompt:
          "Use an interactive rebase to squash three messy commits into one with a clean message. Then explain the rule about never rebasing a branch someone else has pulled.",
        hint: "`git rebase -i HEAD~3`, then mark the last two as `squash`.",
      },
    ],

    /* 06 — Remotes and GitHub */
    [
      {
        level: 1,
        prompt:
          "Create an empty repository on GitHub, add it as a remote with `git remote add origin`, and push your `main` branch with `-u`.",
        solution: "git remote add origin git@github.com:you/repo.git\ngit push -u origin main",
      },
      {
        level: 1,
        prompt:
          "Clone a public repository, look at `git remote -v`, and explain what `origin` actually is.",
      },
      {
        level: 2,
        prompt:
          "Explain the difference between `git fetch` and `git pull` by running both and watching what changes. When would you deliberately choose `fetch`?",
      },
      {
        level: 2,
        prompt:
          "Set up SSH keys for GitHub and switch a repository from an HTTPS remote to an SSH one.",
      },
      {
        level: 3,
        prompt:
          "Someone pushed to `main` while you were working. Get their changes onto your branch without a merge commit, resolve any conflicts, and push.",
        hint: "`git pull --rebase` is the shape of the answer.",
      },
    ],

    /* 07 — Pull requests and review */
    [
      {
        level: 1,
        prompt:
          "Push a feature branch and open a pull request against `main`. Write a description that says what changed and why.",
      },
      {
        level: 1,
        prompt:
          'Link a pull request to an issue so that merging it closes the issue automatically. Which keywords does GitHub recognise?',
        hint: "`Closes #12`, `Fixes #12` and `Resolves #12` all work.",
      },
      {
        level: 2,
        prompt:
          "Fork a public repository, make a change on a branch, and open a pull request back to the original. What is different about a fork-based PR?",
      },
      {
        level: 2,
        prompt:
          "Leave a review on someone's pull request with a line comment, a suggested change, and a summary. Then apply the suggestion from the GitHub UI.",
      },
      {
        level: 3,
        prompt:
          "Set up a branch protection rule on `main` that requires a passing check and one approving review before merge. Then try to push directly and observe what happens.",
      },
    ],

    /* 08 — Automating with Actions */
    [
      {
        level: 1,
        prompt:
          "Add `.github/workflows/ci.yml` that runs on every push and prints 'Hello from CI'. Watch it run in the Actions tab.",
        starter:
          'name: CI\non: [push]\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo "Hello from CI"',
      },
      {
        level: 2,
        prompt:
          "Extend the workflow to check out the code, set up Node, install dependencies and run the test suite.",
      },
      {
        level: 2,
        prompt:
          "Make the workflow run only on pull requests targeting `main`, and add a status badge to your README.",
      },
      {
        level: 3,
        prompt:
          "Cache the dependency install so the workflow gets faster on repeat runs, and prove the cache is being hit by reading the run log.",
      },
    ],

    /* 09 — Working on a team */
    [
      {
        level: 1,
        prompt:
          "Write a `CONTRIBUTING.md` explaining your branch naming convention, commit message style and review process.",
      },
      {
        level: 2,
        prompt:
          "Adopt Conventional Commits for a week of work: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`. Then generate a changelog from your log.",
      },
      {
        level: 2,
        prompt:
          "Use `git stash` to park half-finished work, switch branches to fix something urgent, then come back and restore it.",
        solution: "git stash push -m 'wip: half-done form'\ngit switch main\n# ...fix, commit...\ngit switch -\ngit stash pop",
      },
      {
        level: 3,
        prompt:
          "A commit on `main` needs to go onto a release branch, but nothing else does. Use `git cherry-pick` to move exactly that one commit, and explain what happens to its SHA.",
      },
    ],
  ],
};
