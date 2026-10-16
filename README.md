# ezPark

Event-day driveway parking. Drivers reserve a neighbor's driveway near the stadium or arena; Hosts list their driveway in about a minute and get paid out.

## Run locally

Requires Node 20+ (installed via nvm).

```bash
npm install            # also generates the Prisma client
cp .env.example .env   # then set AUTH_SECRET: openssl rand -base64 32
npx prisma migrate dev # creates prisma/dev.db
npm run dev            # http://localhost:3000
```

Useful scripts:

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run db:migrate` | Apply schema changes and regenerate the Prisma client |
| `npm run db:studio` | Browse the local database |
| `npm run lint` / `npm run typecheck` | Static checks |

In development, emails (password resets) are printed to the terminal running `npm run dev` instead of being sent.

## Stack

Next.js (App Router, Cache Components) · TypeScript · Tailwind CSS with CSS-variable design tokens (`src/app/globals.css`) · Prisma + SQLite · Auth.js (email/password).

## Pre-launch checklist

Things deliberately skipped for the MVP pilot that must be done before a public launch:

- [ ] **Email:** switch `sendEmail()` in `src/lib/email.ts` to a real provider (e.g. Resend) and set `APP_URL` to the production URL.
- [ ] **Email verification:** require users to verify their email address before booking or listing.
- [ ] **Terms:** have a lawyer review `src/app/terms/page.tsx` (currently a placeholder v1), then bump `TERMS_VERSION`.
- [ ] **Login rate limiting:** throttle repeated failed logins and password-reset requests.
- [ ] **Database:** move from SQLite to Postgres.
