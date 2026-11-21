import type { Saved, Settings, Vendor, Book } from './store';

export interface Quote {
  vendor: Vendor;
  price: number;
  processed: boolean; // arrives shelf-ready from the vendor
}

const round = (n: number) => Math.round(n * 100) / 100;
export const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export const msrpOf = (b: Partial<Saved>, s: Settings) => b.msrp ?? s.defaultMsrp;
export const msrpIsEstimate = (b: Partial<Saved>) => b.msrp == null;

/** Every vendor's price for this book, cheapest first. With pre-processing on,
 *  vendors that don't process books carry the in-house processing cost. */
export function quotes(b: Partial<Saved> & Book, s: Settings): Quote[] {
  const m = msrpOf(b, s);
  return s.vendors
    .map((v) => {
      const base = m * (1 - v.discount / 100);
      if (!s.preprocessing) return { vendor: v, price: round(base), processed: false };
      const processed = v.processingFee != null;
      return { vendor: v, price: round(base + (processed ? v.processingFee! : s.inHouseProcessing)), processed };
    })
    .sort((a, b) => a.price - b.price);
}

export function chosenQuote(b: Partial<Saved> & Book, s: Settings): Quote | undefined {
  const q = quotes(b, s);
  return q.find((x) => x.vendor.id === b.vendorId) ?? q[0];
}

export function vendorLink(v: Vendor, b: Book) {
  if (!v.url) return '';
  return v.url.replace('{isbn}', encodeURIComponent(b.isbn ?? b.title)).replace('{title}', encodeURIComponent(b.title));
}
