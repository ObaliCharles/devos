"use server";

import { findPeople } from "../queries/collaboration";
import { requireUser } from "../user";

/**
 * People search, exposed as an action so the invite box can call it from the
 * client without a route handler. Auth is still required — the user directory
 * is not public — and the projection is name, handle and avatar only.
 */
export async function findPeopleAction(query: string) {
  await requireUser();
  return findPeople(query);
}
