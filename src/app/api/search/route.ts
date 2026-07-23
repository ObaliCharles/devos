import { requireUser } from "@/lib/user";
import { search } from "@/lib/queries";

export const runtime = "nodejs";

/** Backs the CTRL+K palette. Scoped to the signed-in user for their own data. */
export async function GET(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return Response.json({ hits: [] }, { status: 401 });
  }
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const hits = await search(user._id, q);
  return Response.json({ hits });
}
