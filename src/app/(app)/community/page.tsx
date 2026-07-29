import { redirect } from "next/navigation";

/**
 * Community is a section, not a page. There is no useful landing screen above
 * Discussions and Chat — one would just be a menu of two links, which is what
 * the sidebar already is.
 */
export default function CommunityIndex() {
  redirect("/community/discussions");
}
