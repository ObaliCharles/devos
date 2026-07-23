/**
 * Stands in for `next/cache` when the smoke test runs.
 *
 * `revalidatePath` needs a live request context and throws without one. The
 * test is checking database rules, not cache invalidation, so it records the
 * calls instead — which at least proves the actions still make them.
 *
 * Wired in by `tsconfig.smoke.json`. Nothing in the app resolves to this file.
 */
export const revalidated: string[] = [];

export function revalidatePath(path: string, type?: string) {
  revalidated.push(type ? `${path} (${type})` : path);
}

export function revalidateTag(tag: string) {
  revalidated.push(`tag:${tag}`);
}
