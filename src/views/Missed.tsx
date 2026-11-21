import { useState } from 'react';
import { actions, useStore } from '../store';
import { BookTable, totalCost } from '../BookTable';
import { money } from '../pricing';
import { popularity } from '../books';
import { PageHead } from '../ui';

export default function Missed() {
  const { books, settings } = useStore();
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(String(thisYear));
  const [made, setMade] = useState('');

  const missed = Object.values(books)
    .filter((b) => b.status === 'maybe' && b.pubDate?.startsWith(year))
    .sort((a, b) => popularity(b) - popularity(a));
  const years = [...new Set([String(thisYear), ...(Object.values(books).map((b) => b.pubDate?.slice(0, 4)).filter(Boolean) as string[])])].sort().reverse();

  return (
    <div className="page">
      <PageHead
        eyebrow="Year-end"
        title={<>You might have missed <select className="year-select" value={year} onChange={(e) => { setYear(e.target.value); setMade(''); }}>{years.map((y) => <option key={y}>{y}</option>)}</select></>}
        sub="Every book from this year that you saved but never ordered. Made for spending what’s left in December."
      >
        {made ? (
          <a href="#/app/lists" className="btn btn-line btn-lg">Open “{made}”</a>
        ) : (
          <button
            className="btn btn-dark btn-lg"
            disabled={!missed.length}
            onClick={() => {
              const name = `You might have missed ${year}`;
              actions.createList(name, missed.map((b) => b.id));
              setMade(name);
            }}
          >
            Save as ordering list
          </button>
        )}
      </PageHead>
      <div className="stats">
        <div><span>Books</span><strong>{missed.length}</strong></div>
        <div><span>Estimated spend</span><strong>{money(totalCost(missed, settings))}</strong></div>
      </div>
      <BookTable books={missed} empty={`No unordered ${year} books. You got them all.`} />
    </div>
  );
}
