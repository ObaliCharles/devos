import vm from "node:vm";

/**
 * Runs a learner's JavaScript solution against a challenge's test cases.
 *
 * The decision the BACKLOG said to make before starting: this executes in
 * Node's built-in `vm` with a wall-clock timeout, not Judge0 and not a
 * container. What that buys, and what it does not:
 *
 *   + Real execution. The code actually runs and is actually graded, the
 *     `exercised` gate's weakness (self-reported) does not exist here.
 *   + `timeout` interrupts synchronous runaway code, which is what these
 *     challenges are: pure functions over inputs. `while(true){}` is killed.
 *   - `vm` is isolation, not a security sandbox. A determined attacker can
 *     escape it. That is acceptable for a single-user tool and is NOT
 *     acceptable the moment this is multi-tenant, at which point this function
 *     is the one thing that must move to Judge0 or a gVisor/Firecracker box.
 *     This boundary is deliberately the only place code execution happens, so
 *     that swap is one file. See DECISIONS.
 *
 * Only JavaScript runs. TypeScript challenges would need transpilation first;
 * that is a later addition, noted in the model's language enum.
 */

const TIME_LIMIT_MS = 2000;

export type TestResult = {
  label: string;
  call: string;
  expected: string;
  got: string;
  passed: boolean;
  hidden: boolean;
};

export type RunOutcome = {
  ok: boolean;
  results: TestResult[];
  passedCount: number;
  total: number;
  error?: string;
  runtimeMs: number;
  logs: string[];
};

type TestCase = { call: string; expected: string; hidden?: boolean; label?: string };

/** Structural equality, so `[1,2]` equals `[1,2]` and `{a:1}` equals `{a:1}`. */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a && b && typeof a === "object") {
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const ka = Object.keys(a as object);
    const kb = Object.keys(b as object);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  }
  return false;
}

function show(value: unknown): string {
  if (value === undefined) return "undefined";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function runChallenge(code: string, tests: TestCase[]): RunOutcome {
  const started = Date.now();
  const logs: string[] = [];

  // A deliberately bare context: no require, no process, no global timers, no
  // network. `console.log` is captured so the learner can debug, and JSON is
  // provided because the expectations are JSON. Everything else is absent.
  const sandbox: Record<string, unknown> = {
    console: {
      log: (...args: unknown[]) => logs.push(args.map((a) => (typeof a === "string" ? a : show(a))).join(" ")),
    },
    JSON,
    Math,
    Object,
    Array,
    String,
    Number,
    Boolean,
    Map,
    Set,
    Symbol,
    Date,
    RegExp,
    isNaN,
    parseInt,
    parseFloat,
  };

  let context: vm.Context;
  try {
    context = vm.createContext(sandbox);
    // Define the solution once; each test then evaluates its call expression
    // against it. A syntax error here fails the whole run, which is correct.
    vm.runInContext(code, context, { timeout: TIME_LIMIT_MS });
  } catch (err) {
    return {
      ok: false,
      results: [],
      passedCount: 0,
      total: tests.length,
      error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      runtimeMs: Date.now() - started,
      logs,
    };
  }

  const results: TestResult[] = [];
  for (const test of tests) {
    const expected = safeParse(test.expected);
    try {
      const got = vm.runInContext(test.call, context, { timeout: TIME_LIMIT_MS });
      results.push({
        label: test.label ?? test.call,
        call: test.call,
        expected: show(expected),
        got: show(got),
        passed: deepEqual(got, expected),
        hidden: Boolean(test.hidden),
      });
    } catch (err) {
      results.push({
        label: test.label ?? test.call,
        call: test.call,
        expected: show(expected),
        got: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
        passed: false,
        hidden: Boolean(test.hidden),
      });
    }
  }

  const passedCount = results.filter((r) => r.passed).length;
  return {
    ok: passedCount === tests.length && tests.length > 0,
    results,
    passedCount,
    total: tests.length,
    runtimeMs: Date.now() - started,
    logs,
  };
}

function safeParse(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    return json;
  }
}
