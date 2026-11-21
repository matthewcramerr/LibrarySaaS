# Shelfmark

A SaaS focused on Librarian Collection Development. With another channel for Library Of Things Packaging, Processing, and Wholesaling.

## Run it

```bash
npm install
npm rebuild esbuild   # only if npm skipped install scripts
npm run dev           # http://localhost:5173
npm run build         # static site in dist/ (works on any static host)
```

## Live site

https://matthewcramerr.github.io/shelfmark/ (deploys on every push to `main`).

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

- Data is saved in the browser (localStorage). Settings has backup and restore. There are no accounts or multi-user access yet.
- Book data comes from Open Library (free, no key), with Google Books as the fallback. Neither gives reliable print list prices, so MSRP falls back to a default ($28) until a librarian enters it.
- Discounts are defaults. Each library enters its own contract terms.
- Library of Things orders and invoices only save in the browser. Nothing is sent and card checkout isn't live.
- Kit prices and bundle discounts are placeholders.
- Review/preview links are Google site searches, not direct integrations.

## Next

1. Accounts + database (library → users, shared lists), with Stripe billing per library and per system.
2. Real price feeds: Ingram iPage / ipage API access, and list price from an ONIX or ISBNdb feed.
3. ILS integration (Koha, Polaris, Sierra, Evergreen) instead of a CSV upload.
4. Review sources: Kirkus / Booklist / LJ stars, Edelweiss and NetGalley pre-pub links, the NYT Books API.
5. Library of Things: real order intake + email, Stripe and invoices, real catalog photos, MARC file download.
6. AI-generated-book check, vendor back-order status, monthly release calendar.
