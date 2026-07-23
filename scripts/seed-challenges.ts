/**
 * Real coding challenges for the Practice Centre. Loaded by `npm run seed`
 * alongside the roadmap. Each ships with a starter, hints, and both visible and
 * hidden tests — the hidden ones are why Submit cannot be gamed by hard-coding
 * the examples.
 *
 * All JavaScript, because that is what lib/runner.ts executes. The `call`
 * strings are evaluated against the learner's code, and `expected` is JSON.
 */

export type ChallengeSeed = {
  slug: string;
  title: string;
  category: string;
  technology: string[];
  difficulty: "easy" | "medium" | "hard";
  prompt: string;
  starterCode: string;
  entryPoint: string;
  hints: string[];
  xp: number;
  estimatedMinutes: number;
  tests: { call: string; expected: string; hidden?: boolean; label?: string }[];
};

export const CHALLENGES: ChallengeSeed[] = [
  {
    slug: "two-sum",
    title: "Two Sum",
    category: "algorithms",
    technology: ["arrays", "hash map"],
    difficulty: "easy",
    xp: 30,
    estimatedMinutes: 15,
    prompt: `Given an array of integers \`nums\` and a target, return the **indices** of the two numbers that add up to the target. Exactly one solution exists, and you may not use the same element twice.

\`\`\`
twoSum([2, 7, 11, 15], 9)  // [0, 1]  — because 2 + 7 = 9
\`\`\`

Return the indices in ascending order.`,
    starterCode: `function twoSum(nums, target) {
  // your code here
}`,
    entryPoint: "twoSum",
    hints: [
      "A nested loop works and is O(n²). Can you do it in one pass?",
      "As you walk the array, remember each value you have seen and the index it was at.",
      "For each number, the one you need is target - number. Have you seen it already?",
    ],
    tests: [
      { call: "twoSum([2,7,11,15], 9)", expected: "[0,1]", label: "basic case" },
      { call: "twoSum([3,2,4], 6)", expected: "[1,2]", label: "not the first element" },
      { call: "twoSum([3,3], 6)", expected: "[0,1]", label: "repeated value" },
      { call: "twoSum([-1,-2,-3,-4,-5], -8)", expected: "[2,4]", hidden: true },
      { call: "twoSum([0,4,3,0], 0)", expected: "[0,3]", hidden: true },
    ],
  },
  {
    slug: "reverse-string",
    title: "Reverse a String",
    category: "algorithms",
    technology: ["strings"],
    difficulty: "easy",
    xp: 20,
    estimatedMinutes: 10,
    prompt: `Return the reverse of the string \`s\`.

\`\`\`
reverse("hello")  // "olleh"
\`\`\``,
    starterCode: `function reverse(s) {
  // your code here
}`,
    entryPoint: "reverse",
    hints: ["A string can become an array of characters.", "Arrays know how to reverse themselves.", "Then join it back together."],
    tests: [
      { call: 'reverse("hello")', expected: '"olleh"', label: "word" },
      { call: 'reverse("")', expected: '""', label: "empty string" },
      { call: 'reverse("a")', expected: '"a"', label: "single character" },
      { call: 'reverse("racecar")', expected: '"racecar"', hidden: true },
      { call: 'reverse("DeveloperOS")', expected: '"SOrepoleveD"', hidden: true },
    ],
  },
  {
    slug: "fizzbuzz",
    title: "FizzBuzz",
    category: "algorithms",
    technology: ["loops", "modulo"],
    difficulty: "easy",
    xp: 20,
    estimatedMinutes: 10,
    prompt: `Return an array from 1 to \`n\`. Replace multiples of 3 with "Fizz", multiples of 5 with "Buzz", and multiples of both with "FizzBuzz".

\`\`\`
fizzbuzz(5)  // [1, 2, "Fizz", 4, "Buzz"]
\`\`\``,
    starterCode: `function fizzbuzz(n) {
  // your code here
}`,
    entryPoint: "fizzbuzz",
    hints: ["Check divisibility with the % operator.", "Test for 15 (or 3 and 5 together) before testing 3 or 5 alone.", "Push either the number or the word into a result array."],
    tests: [
      { call: "fizzbuzz(5)", expected: '[1,2,"Fizz",4,"Buzz"]', label: "up to 5" },
      { call: "fizzbuzz(3)", expected: '[1,2,"Fizz"]', label: "up to 3" },
      { call: "fizzbuzz(15).slice(-1)", expected: '["FizzBuzz"]', hidden: true },
      { call: "fizzbuzz(1)", expected: "[1]", hidden: true },
    ],
  },
  {
    slug: "valid-parentheses",
    title: "Valid Parentheses",
    category: "algorithms",
    technology: ["stack", "strings"],
    difficulty: "medium",
    xp: 40,
    estimatedMinutes: 20,
    prompt: `Given a string of \`()\`, \`[]\` and \`{}\`, return \`true\` if every bracket is closed by the matching type in the right order.

\`\`\`
isValid("()[]{}")   // true
isValid("(]")       // false
isValid("([)]")     // false
\`\`\``,
    starterCode: `function isValid(s) {
  // your code here
}`,
    entryPoint: "isValid",
    hints: [
      "A stack is the classic tool here.",
      "Push opening brackets. On a closing bracket, the top of the stack must be its match.",
      "If the stack is not empty at the end, something never closed.",
    ],
    tests: [
      { call: 'isValid("()[]{}")', expected: "true", label: "all matched" },
      { call: 'isValid("(]")', expected: "false", label: "wrong type" },
      { call: 'isValid("([)]")', expected: "false", label: "wrong order" },
      { call: 'isValid("{[]}")', expected: "true", label: "nested" },
      { call: 'isValid("")', expected: "true", hidden: true },
      { call: 'isValid("(")', expected: "false", hidden: true },
      { call: 'isValid("]")', expected: "false", hidden: true },
    ],
  },
  {
    slug: "group-anagrams",
    title: "Group Anagrams",
    category: "algorithms",
    technology: ["hash map", "strings", "sorting"],
    difficulty: "medium",
    xp: 50,
    estimatedMinutes: 25,
    prompt: `Group the words that are anagrams of each other. To keep the answer deterministic: **sort the words within each group alphabetically, and sort the groups by their first word.**

\`\`\`
groupAnagrams(["eat","tea","tan","ate","nat","bat"])
// [["ate","eat","tea"], ["bat"], ["nat","tan"]]
\`\`\``,
    starterCode: `function groupAnagrams(words) {
  // your code here
}`,
    entryPoint: "groupAnagrams",
    hints: [
      "Two words are anagrams if their sorted letters are identical.",
      "Use the sorted letters as a map key; collect words under it.",
      "At the end, sort each group's words, then sort the groups by their first word.",
    ],
    tests: [
      {
        call: 'groupAnagrams(["eat","tea","tan","ate","nat","bat"])',
        expected: '[["ate","eat","tea"],["bat"],["nat","tan"]]',
        label: "classic",
      },
      { call: 'groupAnagrams([""])', expected: '[[""]]', label: "one empty" },
      { call: 'groupAnagrams(["a"])', expected: '[["a"]]', label: "single" },
      {
        call: 'groupAnagrams(["abc","cba","xyz"])',
        expected: '[["abc","cba"],["xyz"]]',
        hidden: true,
      },
    ],
  },
  {
    slug: "merge-intervals",
    title: "Merge Intervals",
    category: "algorithms",
    technology: ["sorting", "intervals"],
    difficulty: "medium",
    xp: 50,
    estimatedMinutes: 25,
    prompt: `Given an array of intervals \`[start, end]\`, merge every overlapping pair and return the result sorted by start. Two intervals overlap when one starts at or before the other ends.

\`\`\`
mergeIntervals([[1,3],[2,6],[8,10],[15,18]])
// [[1,6],[8,10],[15,18]]
\`\`\``,
    starterCode: `function mergeIntervals(intervals) {
  // your code here
}`,
    entryPoint: "mergeIntervals",
    hints: [
      "Sort the intervals by their start first — then overlaps are always adjacent.",
      "Walk the sorted list, keeping the current merged interval.",
      "If the next start is <= the current end, extend the end to the max of the two. Otherwise, start a new interval.",
    ],
    tests: [
      { call: "mergeIntervals([[1,3],[2,6],[8,10],[15,18]])", expected: "[[1,6],[8,10],[15,18]]", label: "classic" },
      { call: "mergeIntervals([[1,4],[4,5]])", expected: "[[1,5]]", label: "touching" },
      { call: "mergeIntervals([[1,4],[2,3]])", expected: "[[1,4]]", label: "contained" },
      { call: "mergeIntervals([[1,4]])", expected: "[[1,4]]", label: "single" },
      { call: "mergeIntervals([[1,4],[0,4]])", expected: "[[0,4]]", hidden: true },
      { call: "mergeIntervals([[1,4],[5,6]])", expected: "[[1,4],[5,6]]", hidden: true },
    ],
  },
];
