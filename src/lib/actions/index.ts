/**
 * Every mutation in the app, grouped by module. Import from `@/lib/actions`.
 *
 * This barrel is a plain re-export and deliberately carries no "use server"
 * directive: that belongs in each module file where the actions are actually
 * defined, and a "use server" file is not allowed to `export *`. The functions
 * stay server actions because their own files mark them.
 *
 * The rules from ARCHITECTURE.md, restated because they are what keeps this
 * safe as the surface grows:
 *
 * 1. Every action starts with `const user = await requireUser()` and scopes
 *    every write to `user._id`. There is no other path to a user id.
 * 2. Never spread caller input into `$set`. Arguments arrive as JSON and the
 *    TypeScript annotation is gone by then, whitelist the fields you mean, or
 *    a caller will set `user` and take someone else's row.
 * 3. Anything the product promises is enforced here, not in the component.
 *    The client disables the button as a courtesy; the server refuses as a
 *    rule.
 */

export * from "./learning";
export * from "./knowledge";
export * from "./projects";
export * from "./practice";
export * from "./ai";
export * from "./career";
export * from "./productivity";
export * from "./admin";
export * from "./platform";
