const cell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  return [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n');
}

export function download(name: string, text: string, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Pull every ISBN-10/13 out of a catalog export (any CSV or text). */
export function extractIsbns(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(/(?:97[89][\d-]{10,14}|\b\d{9}[\dXx]\b)/g)) {
    const d = m[0].replace(/-/g, '').toUpperCase();
    if (d.length === 13 || d.length === 10) out.add(d);
  }
  return [...out];
}

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
