# Supabase setup (required for signup/login)

This app expects **Supabase Auth** + the DB schema defined in [DATABASE_SCHEMA.md](DOCS/DATABASE_SCHEMA.md).

## 1) Configure env vars (fixes browser signup/login hanging)

Create a `.env.local` in the project root:

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

Notes:
- Use the **Anon public key** from Supabase: **Project Settings → API**.
- Avoid hardcoding keys in code.

## 2) Apply the database schema

In Supabase: **SQL Editor → New query**, then copy the SQL commands from:

- [DATABASE_SCHEMA.md](DOCS/DATABASE_SCHEMA.md)

**Important**: 
Apply the **Triggers** listed in the documentation. These ensure that when a user signs up, their profiles in the `users` and `students` tables are created automatically and atomically. This fixes the registration latency issues.

## 3) What signup should create

When setup correctly:
- `auth.users` row is created by Supabase.
- `public.users` row is created automatically via the `handle_new_user` trigger.
- `public.students` row is created automatically for student roles via the same trigger.

## 4) Troubleshooting Latency

If applying for clearance takes a long time:
- Ensure you have the `trigger_create_clearance_status` trigger installed.
- Check the `clearanceService.js` file to ensure it's not trying to call non-existent services. (The core latency bug has been fixed by optimizing notification logic).

## 5) Quick local run

```
npm install
npm run dev
```

Then open `http://localhost:3000`.
