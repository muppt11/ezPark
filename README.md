# ezPark

Event-day driveway parking. Drivers reserve a neighbor's driveway near the stadium or arena; Hosts list their driveway in about a minute and get paid out (minus a 10% platform fee).

## Run locally

Requires Node 20+ (installed via nvm).

```bash
npm install            # also generates the Prisma client and copies the map worker
cp .env.example .env   # then set AUTH_SECRET: openssl rand -base64 32
npx prisma migrate dev # creates prisma/dev.db
npm run db:seed        # Austin venues + upcoming events (+ demo driveways in dev)
npm run dev            # http://localhost:3000
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run db:seed` | Seed venues/events; outside production also demo concerts (ACL, Bryson Tiller, Doja Cat — real artists, made-up dates) and demo driveways. Re-seeding replaces demo listings and their bookings. |
| `npm run db:migrate` | Apply schema changes |
| `npm run db:studio` | Browse the local database |
| `npm run sync:events` | Pull events from Ticketmaster (needs `TICKETMASTER_API_KEY`; see terms note below) |
| `npm run test:e2e` | Browser test of the whole core loop (needs `npm run dev` running) |
| `npm run lint` / `npm run typecheck` | Static checks |

`npm run test:e2e` uses your installed Google Chrome. `E2E_PHONE=1` runs it at phone size; `SHOTS_DIR=/tmp/shots` saves a screenshot per step.

In development, emails (password resets) are printed to the terminal running `npm run dev`.

## Test mode

Payments and payouts are **simulated** (`src/lib/payments.ts`): no money moves.

- Test card `4242 4242 4242 4242`, any future expiry, any CVC, any 5-digit ZIP → succeeds.
- `4000 0000 0000 0002` → declined.
- Host payout setup accepts the test bank details (routing `110000000`, account `000123456789`).

The account page's "Add a card" uses real Stripe SetupIntents once `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` are set; booking charges are still test mode until the live wiring below is done.

## How the core loop works

- **Host:** `/host/new` → address → nearby venue + events (warns past 1 mile) → photo, cars, price (flat / hourly / both), open hours → payout setup (first listing only) → live.
- **Driver:** `/find` (map + list, walk filter, sort by walk or total) → `/spots/[id]` (approximate area only) → `/book/[id]` (pay) → `/parking/[id]` (exact address, instructions and photo).
- **Privacy before payment:** search and listing pages never receive the exact address, instructions, coordinates or the driveway photo — only a fuzzed point and a "Near X St" label.
- **Capacity:** a booking only succeeds if fewer confirmed bookings overlap that window than the driveway's car count (checked inside the booking transaction).
- **Driver protection:** "Report a problem → spot blocked" refunds in full instantly and shows comparable driveways for the same event. Drivers can cancel for a full refund up to 24 hours before start.
- **Host strikes:** host cancellations refund the driver; 3 in 90 days pauses the host's listings.

## Stack

Next.js (App Router, Cache Components) · TypeScript · Tailwind CSS with CSS-variable design tokens (`src/app/globals.css`) · Prisma + SQLite · Auth.js (email/password) · MapLibre + OpenFreeMap tiles · OSRM walking routes · Nominatim geocoding.

## Pre-launch checklist

Deliberately skipped for the MVP pilot; must be done before a public launch:

- [ ] **Payments:** replace test mode in `src/lib/payments.ts` with Stripe PaymentIntents (destination charges, `application_fee_amount` = 10%), refunds, and Stripe Connect Express onboarding for hosts.
- [ ] **Damage deposit:** $100 manual-capture hold placed ~24h before the event, released after checkout; claims within 48h with admin review (not built yet).
- [ ] **Email:** switch `sendEmail()` in `src/lib/email.ts` to a real provider (e.g. Resend), set `APP_URL`, and **require email verification**.
- [ ] **Terms:** have a lawyer review `src/app/terms/page.tsx` (placeholder v1), then bump `TERMS_VERSION`.
- [ ] **Ticketmaster terms:** the API terms restrict deriving revenue from the API and limit storing event content to "reasonable periods". Get legal sign-off or a partner agreement before setting `TICKETMASTER_API_KEY` in production (limits: 5,000 calls/day, 5/second).
- [ ] **Photos:** move uploads from local `./uploads` to object storage (S3/R2). Make sure demo photos in `public/demo` are licensed or replaced.
- [ ] **Rate limiting:** the in-memory limiter only works on one server; use Redis/Upstash with multiple instances.
- [ ] **Geocoding/routing:** public Nominatim and OSRM servers are for light use; switch to a paid or self-hosted provider before real traffic.
- [ ] **Database:** move from SQLite to Postgres.
- [ ] **Admin:** `/admin` page for incidents and claims (users in `ADMIN_EMAILS`).
