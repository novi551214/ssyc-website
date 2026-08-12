# Somerset Shia Youth Collective (SSYC) — Website

A full-stack community website: static HTML/CSS/JS frontend + Node.js/Express
backend + MongoDB, with Stripe & PayPal (sandbox) payments, Mailchimp
newsletter sync, RSVP collection, a contact form, and a simple admin
dashboard.

---

## 1. Project structure

```
ssyc/
├── client/                 # Static frontend (served by Express, or host separately)
│   ├── index.html, about.html, events.html, support.html, contact.html
│   ├── admin-login.html, admin-dashboard.html
│   ├── support-success.html, support-cancel.html
│   ├── css/style.css
│   └── js/ (main.js, countdown.js, rsvp.js, contact.js, support.js)
├── server/
│   ├── server.js            # Express entrypoint
│   ├── config/               # db.js, paypalClient.js, seedAdmin.js
│   ├── controllers/          # business logic for each feature
│   ├── middleware/           # requireAuth.js
│   ├── models/                # RSVP, Subscriber, Transaction, Admin (Mongoose)
│   └── routes/                 # Express routers
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## 2. Local setup

```bash
# 1. Install dependencies
npm install

# 2. Create your real .env file from the template
cp .env.example .env
# then open .env and fill in real values (see "API keys" below)

# 3. Make sure MongoDB is running locally, OR use a free MongoDB Atlas cluster
#    and paste its connection string into MONGODB_URI in .env

# 4. Create the admin account defined by ADMIN_EMAIL / ADMIN_PASSWORD in .env
npm run seed:admin

# 5. Start the server (serves both the API and the static frontend)
npm run dev
# Visit http://localhost:5000
```

The Express server serves the `client/` folder directly, so you do **not**
need a separate frontend server for local development — everything runs on
one port.

## 3. API keys you need to fill in (`.env`)

| Variable | Where to get it |
|---|---|
| `MONGODB_URI` | [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) free tier, or local MongoDB |
| `SESSION_SECRET` | Any long random string (e.g. `openssl rand -hex 32`) |
| `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` | [Stripe Dashboard → Developers → API keys](https://dashboard.stripe.com/test/apikeys) (use **test mode** keys) |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers → Webhooks → your endpoint → "Signing secret" |
| `STRIPE_PRICE_FRIEND/SUPPORTER/PATRON` | Stripe Dashboard → Product catalog → create 3 recurring monthly Prices ($10/$25/$50), copy each Price ID |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` | [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/applications/sandbox) → your sandbox app |
| `MAILCHIMP_API_KEY` / `MAILCHIMP_SERVER_PREFIX` / `MAILCHIMP_AUDIENCE_ID` | Mailchimp → Account → Extras → API keys, and Audience → Settings |
| `SMTP_*` | Any SMTP provider (Gmail App Password, SendGrid, Mailgun, etc.) for the contact form |

Until real keys are added, the site still runs: Stripe/PayPal/Mailchimp
calls fail gracefully with a friendly error message instead of crashing the
server, so you can test the rest of the site immediately.

### Testing Stripe payments (test mode)
Use Stripe's test card `4242 4242 4242 4242`, any future expiry date, any
CVC, and any ZIP. See [Stripe test cards](https://docs.stripe.com/testing).

### Testing PayPal payments (sandbox)
Log in with a [PayPal sandbox buyer account](https://developer.paypal.com/dashboard/accounts)
when the PayPal button opens.

### Webhook testing locally
```bash
stripe listen --forward-to localhost:5000/api/support/webhook
```
Copy the `whsec_...` value it prints into `STRIPE_WEBHOOK_SECRET` in `.env`.

## 4. Push this repo to GitHub

This project is already a git repo with an initial commit. To push it to your
own GitHub account:

```bash
# 1. Create a new empty repository on GitHub (no README/license/.gitignore —
#    this project already has them). e.g. https://github.com/new

# 2. From inside this project folder:
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```

If GitHub asks for a password, use a
[Personal Access Token](https://github.com/settings/tokens) instead (GitHub
no longer accepts account passwords over HTTPS git). Or use SSH:
`git remote add origin git@github.com:<your-username>/<your-repo-name>.git`.

## 5. Deployment

This repo includes ready-to-use config files:
- **`render.yaml`** — a Render Blueprint for the backend (or the whole app).
- **`netlify.toml`** — Netlify config for the static frontend, with an API
  proxy rule pointing at your Render backend.

### Option A — Single deployment on Render (simplest)
Since Express already serves the static frontend, you can deploy this
**entire repo as one service** to Render.com or Railway:

**Render.com (using the included Blueprint)**
1. Push this repo to GitHub (see section 4 above).
2. Render Dashboard → New → Blueprint → connect your repo. Render reads
   `render.yaml` automatically and creates the web service.
3. Fill in the environment variables Render prompts for (all the `sync: false`
   ones in `render.yaml`) with your real Stripe/PayPal/Mailchimp/Mongo values
   — set `CLIENT_URL` to your Render URL, e.g. `https://ssyc-website.onrender.com`.
4. Deploy. Then run the admin seed once via Render's Shell tab: `npm run seed:admin`.

**Render.com (manual, without the Blueprint)**
1. Render Dashboard → New → Web Service → connect your repo.
2. Build command: `npm install`
3. Start command: `npm start`
4. Add all `.env` variables under the "Environment" tab.
5. Deploy, then run `npm run seed:admin` from the Shell tab.

**Railway**
1. Railway Dashboard → New Project → Deploy from GitHub repo.
2. Railway auto-detects Node — set the same environment variables as above.
3. Add a MongoDB plugin, or keep using Atlas.
4. Deploy, then run `npm run seed:admin` from Railway's shell.

### Option B — Split frontend/backend (Netlify + Render, using the included configs)
If you'd rather host the frontend on Netlify and the backend on Render:

1. Deploy `server/` to Render as above (backend only needs the `server/`
   folder + `package.json`).
2. Netlify Dashboard → Add new site → Import an existing project → connect
   your GitHub repo. Netlify reads `netlify.toml` automatically and deploys
   the `client/` folder as a static site — no manual build settings needed.
3. Open `netlify.toml` and replace `REPLACE-WITH-YOUR-RENDER-URL` with your
   actual Render backend URL, commit, and push — this makes `/api/*` calls
   from the frontend proxy through to your backend automatically.
4. On the backend (Render), set `CLIENT_URL` to your Netlify URL (needed for
   CORS and for Stripe's success/cancel redirect URLs).

### Stripe/PayPal webhook URL in production
After deploying, update your Stripe webhook endpoint (Dashboard → Developers
→ Webhooks) to point at:
```
https://<your-backend-domain>/api/support/webhook
```

## 6. Admin dashboard

Visit `/admin-login.html`, log in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD`
you set in `.env` (after running `npm run seed:admin`), and you'll see all
RSVPs, newsletter subscribers, and donation/subscription records.

## 7. Notes & next steps

- Replace every `TODO:` comment in the code with real values (WhatsApp
  invite link, Stripe/PayPal/Mailchimp keys, PayPal Plan IDs for
  subscriptions).
- The Friday event countdown assumes an 8:00 PM Maghrib estimate — adjust
  `FRIDAY_HOUR`/`FRIDAY_MINUTE` in `client/js/countdown.js` seasonally, or
  wire it up to a prayer-times API for accuracy.
- Consider adding CAPTCHA (e.g. hCaptcha) to the RSVP/contact/newsletter
  forms before going fully public, to cut down on spam.
- Consider moving `SESSION_SECRET`-based sessions to a persistent store
  (e.g. `connect-mongo`) if you deploy with multiple server instances.
# ssyc-website
