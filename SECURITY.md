# Security

## Current status

This repository is an educational/community-site implementation, not a verified production payment system. Keep deployments in provider test or sandbox mode until an authorized SSYC representative reviews the organization content, payment accounts, privacy obligations, and operational ownership.

## Controls in this version

- Production startup rejects weak or placeholder session secrets and missing client origins.
- Browser origins are allowlisted; mutating cross-origin requests are rejected.
- Admin sessions are stored in MongoDB, rotated on login, sent in HTTP-only SameSite cookies, and expire after eight hours.
- Helmet enables a restrictive Content Security Policy; executable inline scripts were removed.
- Login, form, and payment-creation endpoints are rate-limited.
- Stripe events are signature-verified and transaction records are idempotent by provider reference.
- PayPal subscriptions are disabled because the previous callback trusted an unverified browser claim. One-time PayPal donations use server-created and server-captured orders.
- The prepublication check rejects common secret formats, environment/database/key files, oversized files, and unresolved public invite-link placeholders.

## Secrets and private data

Use `.env` only for local/deployment credentials. Never commit payment secrets, MongoDB credentials, SMTP passwords, Mailchimp keys, admin passwords, session secrets, form submissions, subscriber lists, or transaction data.

If a real credential was ever committed or shared, removing it from the current file is insufficient: revoke or rotate it at the provider and review Git history.

## Reporting

Do not open a public issue containing a credential, donor record, contact submission, or authentication detail. Contact the repository owner privately and rotate exposed credentials immediately.
