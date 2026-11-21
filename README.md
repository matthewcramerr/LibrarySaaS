# Shelfmark

A SaaS focused on Librarian Collection Development. With another channel for Library Of Things Packaging, Processing, and Wholesaling.

## Live site

https://shelfmark.matthewcramerr.workers.dev — Cloudflare Workers + D1. The old GitHub Pages link forwards there.

## Run it

```bash
npm install
npm rebuild esbuild workerd   # only if npm skipped install scripts
npm run db:migrate:local      # create the local database (first time)
npm run dev:full              # app + API at http://localhost:8787
```

`npm run dev` still runs the front end alone (no API, so sign-in won't work).

## Deploy

```bash
npm run db:migrate   # apply new migrations to the live database
npm run deploy       # build and deploy the Worker
```

Deploys are manual for now (`wrangler` is logged in on the dev machine). To make someone an admin (sees every order and library):

```bash
npx wrangler d1 execute shelfmark --remote --command "UPDATE users SET is_admin = 1 WHERE email = 'you@example.com'"
```

## Backend

- `worker/index.ts` — the API: accounts, sessions, libraries, team invites, collection data, Library of Things orders, admin.
- `migrations/` — D1 schema.
- Passwords: PBKDF2-SHA256 (100k iterations, per-user salt). Sessions: random token in an HttpOnly, Secure, SameSite=Lax cookie; only its SHA-256 is stored. Login locks for 15 minutes after 8 failures.
- Every write must be same-origin JSON (CSRF guard). Every query is scoped to the signed-in user's library.
- One library per account. The first person creates the library (owner); staff join with a one-time invite link (7 days).

## What's in v0.1

**Collection development**
- **Discover:** search by title, author, ISBN or `subject:graphic novels`. Shows pub date, pre-pub tag, rating, NYT bestseller tag, and whether your library or system already has it.
- **Quick capture:** paste titles or ISBNs from a newsletter, or use the bookmarklet on any site (Kirkus, Edelweiss, email), and they land in the Maybe pile.
- **Ordering lists:** named lists ("Nonfiction October"), sorted by pub date, review score, popularity, bestseller or price.
- **Vendor pricing:** price per vendor = MSRP × your contract discount. Picks the cheapest vendor, which you can override. "Price shelf-ready" adds the vendor's processing fee, or your in-house processing cost for vendors that don't process.
- **Purchase tracking:** To buy → Ordered → In catalog. "Buy" opens the vendor, then asks if you ordered it.
- **Order all:** downloads one CSV per vendor (the CSV fallback from the notes) and marks the books ordered.
- **Budget builder:** "$400 of top-reviewed nonfiction for June 2027" fills a list up to the budget.
- **You might have missed:** every unbought book from a year's lists, for the December spend.
- **Holdings:** upload your library's and your system's catalog exports. Every book shows "Your library" and "System" checks (any edition counts).
- **Reviews and previews:** links to Kirkus, PW, LJ, Booklist, Edelweiss and NetGalley on every book.
- **Presses you follow:** small and regional presses as one-click searches.
- **Buy confirm:** after opening a vendor, "Ordered? Yes / Not yet".

**Library of Things ("Vistaprint for Library of Things"):** kit designer with live preview (case, shelf tag, contents card), themed catalog led by breakout and murder-mystery kits, color age badges, quantity pricing, bundles (12, 50, kids 5 and 10), and checkout with a tax-exempt certificate and a printable invoice (ships on payment).

**Pricing page:** Free / $35 per library / system plan, plus a system revenue calculator.

## Limits to know

- No email yet: no email verification, no password-reset email, no order notification email. Owners re-invite staff who forget passwords; check new orders on the Admin page. Adding an email provider (e.g. Resend) fixes all three.
- Billing isn't wired up: plans and seat counts are shown, not charged.
- Tax-exempt certificates: only the file name is recorded, not the file (needs R2 storage).
- Kit order totals come from the browser; invoices are reviewed before payment.
- Book data comes from Open Library (free, no key), with Google Books as the fallback. Neither gives reliable print list prices, so MSRP falls back to a default ($28) until a librarian enters it.
- Discounts are defaults. Each library enters its own contract terms.
- Card checkout isn't live; orders are invoice-only.
- Kit prices and bundle discounts are placeholders.
- Review/preview links are Google site searches, not direct integrations.

## Next

1. Email (verification, password reset, order alerts) and Stripe billing per library and per system.
2. Real price feeds: Ingram iPage / ipage API access, and list price from an ONIX or ISBNdb feed.
3. ILS integration (Koha, Polaris, Sierra, Evergreen) instead of a CSV upload.
4. Review sources: Kirkus / Booklist / LJ stars, Edelweiss and NetGalley pre-pub links, the NYT Books API.
5. Library of Things: real order intake + email, Stripe and invoices, real catalog photos, MARC file download.
6. AI-generated-book check, vendor back-order status, monthly release calendar.
