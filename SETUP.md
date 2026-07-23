# Setup

About 15 minutes, most of it waiting for `npm install`. Two free accounts
needed: MongoDB Atlas and Clerk.

## 1. Node

You need Node 18.18 or newer.

```bash
node -v
```

## 2. Database

**Option A — the bundled local MongoDB (recommended; nothing to sign up for).**

```bash
npm install
npm run db
```

Leave it running in its own terminal. It downloads a real mongod on first run
(~80 MB, cached), serves it on `127.0.0.1:27017`, and keeps the data in
`.data/mongo` so it survives restarts. The default `MONGODB_URI` in
`.env.example` already points at it, so there is nothing to configure.

Use Atlas instead when you deploy — at that point it is one line in the
environment, and nothing in the app changes.

**Option B — MongoDB Atlas (free tier, works from anywhere).**

1. Create a free account at <https://www.mongodb.com/cloud/atlas>.
2. Create a free M0 cluster. Any region.
3. **Database Access** → add a user with a password. Write the password down.
4. **Network Access** → add IP address → *Allow access from anywhere*
   (`0.0.0.0/0`). Fine for development; tighten before production.
5. **Connect** → *Drivers* → copy the connection string. It looks like
   `mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/`.
6. Add the database name to the end: `.../developeros`.

**Option C — a MongoDB you installed yourself.** Run it and use
`mongodb://127.0.0.1:27017/developeros`. Do not also run `npm run db`; they
would fight over the port.

## 3. Auth

1. Sign up at <https://dashboard.clerk.com>.
2. Create an application. Enable Email and, if you want, Google and GitHub.
3. Open **API Keys** and copy the publishable key (`pk_test_…`) and the secret
   key (`sk_test_…`).

## 4. AI (optional)

Get a key from <https://console.anthropic.com>. Without it everything still
works — the tutor panel just returns a "not configured" message.

## 5. Environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```
MONGODB_URI=mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/developeros
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
ANTHROPIC_API_KEY=sk-ant-...
```

`.env.local` is gitignored. Keep it that way — a key committed once is in the
history forever.

## 6. Install, seed, run

```bash
npm install
npm run db      # terminal 1 — leave running (skip if you are using Atlas)
npm run seed    # terminal 2
npm run dev
```

Confirm the rules still hold at any point with:

```bash
npm run smoke
```

`npm run seed` wipes and reloads the roadmap content. It never touches user
progress or notes, so it is safe to re-run whenever you edit
`scripts/seed.ts`.

## 7. First run

1. Open <http://localhost:3000> and sign up.
2. You land on the dashboard with your first lesson queued.
3. Open it and work the gate: read, note, exercise, quiz, review.
4. Master it, and it appears in `/review` tomorrow.

## Deploying

Vercel is the shortest path.

```bash
npx vercel
```

Then add the same four environment variables in the Vercel project settings and
redeploy. Two things to remember:

- Atlas network access must allow Vercel's IPs — `0.0.0.0/0` is the pragmatic
  answer while you are the only user.
- Add your production domain in the Clerk dashboard, or sign-in will fail with
  a domain mismatch.

## Troubleshooting

**`MongooseServerSelectionError`** — Atlas is refusing the connection. Almost
always Network Access, or a password with unescaped special characters. If your
password contains `@`, `:`, `/` or `#`, URL-encode it.

**Clerk redirect loop** — check the sign-in and sign-up URLs in `.env.local`
match the routes in `src/app/`.

**Learning page says "No roadmap loaded"** — `npm run seed` did not run, or ran
against a different database than the app is using. Check `MONGODB_URI` ends
with `/developeros` in both cases.

**`npm run build` fails with "Missing publishableKey"** — Clerk needs its
publishable key at build time, not just at runtime. Make sure `.env.local`
exists before building, or pass the variables in your CI/hosting environment.
This is expected Clerk behaviour, not a bug in the app.

**AI panel says "not configured"** — `ANTHROPIC_API_KEY` is missing. Restart
the dev server after adding it; Next only reads env at startup.
