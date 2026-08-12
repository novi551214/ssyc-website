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

## 4. Deployment

### Option A — Single deployment (simplest)
Since Express already serves the static frontend, you can deploy this
**entire repo as one service** to Render.com or Railway:

**Render.com**
1. Push this repo to GitHub.
2. Render Dashboard → New → Web Service → connect your repo.
3. Build command: `npm install`
4. Start command: `npm start`
5. Add all `.env` variables under the "Environment" tab (use your real
   Stripe/PayPal/Mailchimp/Mongo values — set `CLIENT_URL` to your Render
   URL, e.g. `https://ssyc.onrender.com`).
6. Deploy. Then run the admin seed once via Render's Shell tab: `npm run seed:admin`.

**Railway**
1. Railway Dashboard → New Project → Deploy from GitHub repo.
2. Railway auto-detects Node — set the same environment variables as above.
3. Add a MongoDB plugin, or keep using Atlas.
4. Deploy, then run `npm run seed:admin` from Railway's shell.

### Option B — Split frontend/backend
If you'd rather host the frontend on Vercel/Netlify and the backend
separately on Render/Railway:

1. Deploy `server/` to Render/Railway as above (backend only needs the
   `server/` folder + `package.json`).
2. Deploy the `client/` folder to Vercel or Netlify as a static site.
3. In `.env` on the backend, set `CLIENT_URL` to your Vercel/Netlify URL
   (needed for CORS and for Stripe's success/cancel redirect URLs).
4. In every `client/js/*.js` file, `API_BASE` currently defaults to
   `window.location.origin`. If frontend and backend are on different
   domains, change `API_BASE` in `client/js/main.js`, `support.js`,
   `rsvp.js`, and `contact.js` to your backend's full URL instead, e.g.
   `const API_BASE = 'https://ssyc-api.onrender.com';`

### Stripe/PayPal webhook URL in production
After deploying, update your Stripe webhook endpoint (Dashboard → Developers
→ Webhooks) to point at:
```
https://<your-backend-domain>/api/support/webhook
```

## 5. Admin dashboard

Visit `/admin-login.html`, log in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD`
you set in `.env` (after running `npm run seed:admin`), and you'll see all
RSVPs, newsletter subscribers, and donation/subscription records.

## 6. Notes & next steps

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
