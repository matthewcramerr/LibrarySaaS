import { useState } from 'react';
import { Icon } from '../ui';

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    per: 'For one librarian',
    cta: 'Start free',
    items: ['Search and quick capture', 'Maybe pile and 3 lists', 'Save-from-any-site button', 'Library of Things ordering'],
  },
  {
    name: 'Library',
    price: '$35',
    per: 'per library / month',
    cta: 'Start free trial',
    hot: true,
    items: ['3 staff seats (+$5 per extra seat)', 'Unlimited ordering lists', 'Vendor price comparison', 'Budget builder', 'You might have missed', 'Catalog duplicate check'],
  },
  {
    name: 'Library system',
    price: 'Custom',
    per: 'One bill for every member library',
    cta: 'Book a demo',
    items: ['Everything in Library, for every member', 'Live system catalog connection', 'Catalog and vendor setup', 'Staff demo and training', 'Free Library of Things shipping', 'Start with a 5-library pilot'],
  },
];

const FAQ = [
  ['Do you replace our vendor accounts?', 'No. You keep ordering from Ingram, Amazon or anyone else. We show what each one charges you and make the order file.'],
  ['Where do prices come from?', 'You enter your contract discount and processing fees once. Every price is worked out from those.'],
  ['Can our system buy for all members?', 'Yes. The system signs once and pays one bill. Each library gets its own seats and lists. You can start with a pilot of five libraries.'],
  ['Can we pay by invoice?', 'Yes. We send an invoice your municipality can pay by check. Tax-exempt certificates are kept on file.'],
  ['Who can sign up?', 'Library staff only. Shelfmark is built for collection development, not for readers.'],
];

export default function Pricing() {
  const [libs, setLibs] = useState(24);
  const rate = 35;
  return (
    <div className="pricing">
      <header className="pricing-head">
        <p className="kicker">Pricing</p>
        <h1>Start free. Pay per library.</h1>
        <p className="lede">One price per library, three seats included. Systems get one bill for every member, plus a one-time setup fee.</p>
      </header>

      <div className="plans">
        {PLANS.map((p) => (
          <article key={p.name} className={`plan ${p.hot ? 'plan-hot' : ''}`}>
            {p.hot && <div className="plan-flag">Most libraries</div>}
            <h2>{p.name}</h2>
            <div className="plan-price">{p.price}</div>
            <div className="plan-per">{p.per}</div>
            <a href="#/signup" className={`btn btn-block ${p.hot ? 'btn-dark' : 'btn-line'}`}>{p.cta}</a>
            <ul>{p.items.map((i) => <li key={i}><Icon name="check" size={14} /> {i}</li>)}</ul>
          </article>
        ))}
      </div>

      <section className="calc">
        <div>
          <h2>What a system pays</h2>
          <p>Move the slider to match your member libraries.</p>
        </div>
        <div className="calc-body">
          <label>
            <span>{libs} member libraries</span>
            <input type="range" min={3} max={60} value={libs} onChange={(e) => setLibs(Number(e.target.value))} />
          </label>
          <div className="calc-out">
            <div><strong>${(libs * rate).toLocaleString()}</strong><span>per month</span></div>
            <div><strong>{libs * 3}</strong><span>staff seats</span></div>
            <div><strong>${(libs * rate * 12).toLocaleString()}</strong><span>per year</span></div>
          </div>
        </div>
      </section>

      <section className="faq">
        <h2>Questions</h2>
        {FAQ.map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </section>
    </div>
  );
}
