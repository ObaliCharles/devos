/**
 * Promote or demote a user by email.
 *
 *   npm run role -- obalijcharles@gmail.com admin
 *   npm run role -- someone@example.com user
 *
 * Role lives on the local User document, not on Clerk, so this is a database
 * write and nothing else — the person does not need to sign out and back in,
 * because `requireAdmin()` reads the document on every request.
 *
 * The account has to have signed in at least once for a document to exist:
 * `getCurrentUser()` creates it on first sight of a Clerk session. If there is
 * no match this prints every user it can see rather than failing silently, so
 * a typo in the address is obvious.
 */

import "dotenv/config";
import { config } from "dotenv";
import mongoose from "mongoose";

config({ path: ".env.local", override: true });

const ROLES = ["user", "admin"] as const;
type Role = (typeof ROLES)[number];

async function main() {
  const [email, roleArg = "admin"] = process.argv.slice(2);

  if (!email) {
    console.error("Usage: npm run role -- <email> [user|admin]");
    process.exit(1);
  }
  if (!ROLES.includes(roleArg as Role)) {
    console.error(`Role must be one of: ${ROLES.join(", ")}`);
    process.exit(1);
  }
  const role = roleArg as Role;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set. Check .env.local.");

  await mongoose.connect(uri);
  const users = mongoose.connection.db!.collection("users");

  // Case-insensitive exact match. Clerk stores the address as the person typed
  // it, so an account created as Obalijcharles@… would otherwise look missing.
  const rx = new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");

  const matches = await users.find({ email: rx }).toArray();

  if (matches.length === 0) {
    console.error(`No user with email ${email}.\n`);
    const all = await users
      .find({}, { projection: { email: 1, role: 1, name: 1 } })
      .toArray();
    if (all.length === 0) {
      console.error("The users collection is empty — sign in once to create it.");
    } else {
      console.error("Users currently in the database:");
      for (const u of all) {
        console.error(`  ${u.email ?? "(no email)"}  role=${u.role ?? "user"}  ${u.name ?? ""}`);
      }
    }
    await mongoose.disconnect();
    process.exit(1);
  }

  const res = await users.updateMany({ email: rx }, { $set: { role } });
  console.log(`Set role=${role} on ${res.modifiedCount} of ${matches.length} matching user(s):`);
  for (const u of await users.find({ email: rx }).toArray()) {
    console.log(`  ${u.email}  role=${u.role}  ${u.name ?? ""}`);
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
