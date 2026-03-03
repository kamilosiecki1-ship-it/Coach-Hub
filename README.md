# Coach Hub

AI-powered coaching management platform. Helps coaches manage clients, sessions, notes, and knowledge tools — with a built-in AI assistant (Mentor AI) powered by OpenAI.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Database | PostgreSQL via Supabase |
| ORM | Prisma |
| Auth | NextAuth.js v4 (credentials) |
| AI | OpenAI API |
| Email | Resend |
| UI | Tailwind CSS + shadcn/ui |
| Hosting | Vercel |

---

## Features

- **Client management** — profiles, stages, notes
- **Session tracking** — scheduling, status, rich notes (Tiptap editor)
- **Session offboarding** — structured post-session form with AI-generated summary
- **Mentor AI** — per-client chat assistant with full context awareness
- **Knowledge Hub** — library of coaching tools and frameworks
- **Admin panel** — user management, invite-only registration, role-based access
- **Email invitations & password reset** — via Resend

---

## Local Development

### Prerequisites

- Node.js 18+
- A Supabase project (free tier is sufficient)
- OpenAI API key
- Resend API key (optional — falls back to console log in dev)

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/coach-hub.git
cd coach-hub

# 2. Install dependencies
npm install

# 3. Copy env file and fill in values
cp .env.example .env

# 4. Push schema to your Supabase database
npx prisma db push

# 5. Seed the admin user
npm run db:seed

# 6. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Default admin credentials (set in seed):

| Variable | Default |
|----------|---------|
| `ADMIN_EMAIL` | `admin@coach.app` |
| `ADMIN_PASSWORD` | `admin123` |

Change these in `.env` before seeding for custom values.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in all values:

```env
# Supabase — pooler URL (runtime queries)
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Supabase — direct URL (migrations)
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"

# NextAuth (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=o4-mini

# Invitations & password reset
INVITE_TTL_DAYS=7
RESET_TOKEN_TTL_MINUTES=60

# Resend (email)
RESEND_API_KEY=re_...
EMAIL_FROM="Coach Hub <onboarding@resend.dev>"
```

---

## Deployment

### Deploy na Vercel + Supabase

1. **Utwórz projekt w Supabase** — [supabase.com](https://supabase.com)
   - Skopiuj `DATABASE_URL` i `DIRECT_URL` z zakładki **Connect → ORMs → Prisma**

2. **Wygeneruj `NEXTAUTH_SECRET`**:
   ```bash
   openssl rand -base64 32
   ```

3. **Utwórz projekt w Vercel** — [vercel.com](https://vercel.com)
   - Połącz z repozytorium GitHub

4. **Ustaw zmienne środowiskowe w Vercel** (Settings → Environment Variables):
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` (np. `https://twoja-domena.vercel.app`)
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL`
   - `INVITE_TTL_DAYS`
   - `RESET_TOKEN_TTL_MINUTES`
   - `RESEND_API_KEY`
   - `EMAIL_FROM`

5. **Ustaw Build Command w Vercel**:
   ```
   npx prisma migrate deploy && npm run build
   ```
   Lub w Settings → Build & Development Settings → Build Command.

6. **Deploy** — Vercel automatycznie zbuduje i wdroży aplikację przy każdym pushu do `main`.

7. **Seed bazy danych** (jednorazowo po pierwszym deploy):
   ```bash
   ADMIN_EMAIL=twoj@email.com ADMIN_PASSWORD=silnehaslo npm run db:seed
   ```
   Lub lokalnie, wskazując na produkcyjną bazę (zmień `.env` tymczasowo na produkcyjny `DATABASE_URL`).

---

## Security Notes

- `.env` is excluded from git via `.gitignore` — **never commit real secrets**
- Invite-only registration — only admins can create accounts
- All admin API routes verify role server-side (`requireAdmin()`)
- Passwords are hashed with bcrypt
- Password reset tokens are hashed (SHA-256) before storage
- RBAC guards: cannot demote last admin, cannot self-block, etc.

---

## Project Structure

```
coach-hub/
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── seed.ts             # Admin user seed
├── src/
│   ├── app/                # Next.js App Router pages & API routes
│   │   ├── api/            # Backend API routes
│   │   ├── admin/          # Admin panel pages
│   │   ├── klienci/        # Client management pages
│   │   ├── hub-wiedzy/     # Knowledge Hub pages
│   │   └── ...
│   ├── components/         # Shared UI components
│   └── lib/                # Utilities (prisma, auth, mailer, tokens, etc.)
├── .env.example            # Environment variable template
├── next.config.mjs
├── tailwind.config.ts
└── package.json
```
