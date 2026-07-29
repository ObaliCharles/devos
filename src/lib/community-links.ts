/**
 * Where the community actually lives.
 *
 * Chat is Discord and discussion is GitHub Discussions — both places developers
 * are already signed in to, with notifications, search and moderation this app
 * would otherwise have to build and run. Keeping them here rather than inline in
 * the nav means one edit when an invite is regenerated, and one place to look
 * when a link stops working.
 */
export const COMMUNITY_LINKS = {
  discord: "https://discord.gg/hy6bF564M",
  discussions: "https://github.com/ObaliCharles/DeveloperOS/discussions",
} as const;

/** True for anything that leaves the app, so nav can render it as such. */
export function isExternal(href: string) {
  return /^https?:\/\//i.test(href);
}
