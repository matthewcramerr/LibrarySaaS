import { Cover, Icon, coverByIsbn } from '../ui';

const DEMO = [
  { isbn: '9780385550369', title: 'James', author: 'Percival Everett', date: 'Mar 19', price: '16.79', vendor: 'Ingram', tag: 'NYT' },
  { isbn: '9780374602635', title: 'Intermezzo', author: 'Sally Rooney', date: 'Sep 24', price: '17.99', vendor: 'Ingram', tag: 'Pre-pub' },
  { isbn: '9781250178633', title: 'The Women', author: 'Kristin Hannah', date: 'Feb 6', price: '18.59', vendor: 'Amazon', tag: 'NYT' },
  { isbn: '9780593655030', title: 'The Anxious Generation', author: 'Jonathan Haidt', date: 'Mar 26', price: '18.00', vendor: 'Ingram', tag: '' },
];

const SHELF = ['9780385550369', '9780374602635', '9781250178633', '9780593655030', '9781649374172', '9780063204157', '9780593321201', '9780593798430'];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="kicker">For collection development librarians</p>
          <h1>
            Every book you might buy, <em>in one place.</em>
          </h1>
          <p className="lede">
            Save titles from any review site or newsletter. See what each vendor charges you, not the list price. Order a
            whole month in one click.
          </p>
          <div className="hero-ctas">
            <a href="#/app/discover" className="btn btn-dark btn-lg">Start free</a>
            <a href="#/pricing" className="btn btn-line btn-lg">Pricing for library systems</a>
          </div>
          <p className="fine">Free for one librarian. Library staff only.</p>
        </div>

        <div className="hero-demo" aria-hidden="true">
          <div className="demo-window">
            <div className="demo-bar">
              <span /><span /><span />
              <div className="demo-url">Fiction — December</div>
            </div>
            <div className="demo-head">
              <div>
                <div className="demo-title">Fiction — December</div>
                <div className="demo-meta">14 to buy · cheapest vendor picked</div>
              </div>
              <div className="demo-total">
                <span>$248.32</span>
                <button className="btn btn-dark btn-sm">Order all</button>
              </div>
            </div>
            {DEMO.map((b) => (
              <div key={b.isbn} className="demo-row">
                <Cover src={coverByIsbn(b.isbn)} title={b.title} author={b.author} size="sm" />
                <div className="demo-book">
                  <strong>{b.title}</strong>
                  <span>{b.author}</span>
                </div>
                <span className="demo-date">{b.date}</span>
                <span className={`demo-tag ${b.tag ? '' : 'hide'}`}>{b.tag}</span>
                <div className="demo-price">
                  <strong>${b.price}</strong>
                  <span>{b.vendor}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="logos">
        <span>Instead of juggling</span>
        <ul>
          <li>Kirkus</li>
          <li>Edelweiss</li>
          <li>NetGalley</li>
          <li>Ingram</li>
          <li>Amazon Business</li>
          <li>Your catalog</li>
        </ul>
      </section>

      <section className="problem">
        <div className="problem-text">
          <h2>Ordering shouldn't take nine tabs.</h2>
          <p>
            Reviews in one place. Wishlists in another. Vendor prices somewhere else. Then you check the catalog to see if
            you already own it. Shelfwise puts it on one screen, built around how you actually order: by genre, by month,
            against a budget.
          </p>
        </div>
        <div className="shelf" aria-hidden="true">
          {SHELF.map((i) => (
            <Cover key={i} src={coverByIsbn(i)} title=" " size="md" />
          ))}
        </div>
      </section>

      <section className="hub">
        <div>
          <p className="kicker">One place</p>
          <h2>Reviews, previews and vendors, linked to every book.</h2>
        </div>
        <ul>
          <li><strong>Reviews</strong><span>Kirkus, Publishers Weekly, Library Journal, Booklist</span></li>
          <li><strong>Previews</strong><span>Edelweiss and NetGalley, one click from your list</span></li>
          <li><strong>Vendors</strong><span>Your price at Ingram, Amazon and others, plus shelf-ready</span></li>
          <li><strong>Small presses</strong><span>Follow regional and independent presses you care about</span></li>
        </ul>
      </section>

      <section className="features">
        <article className="feature">
          <div className="feature-num">01</div>
          <h3>Capture from anywhere</h3>
          <p>Highlight titles in Outlook or on any site and click the Shelfwise button. They land in your maybe pile.</p>
        </article>
        <article className="feature">
          <div className="feature-num">02</div>
          <h3>Your real price</h3>
          <p>Prices use your vendor discounts and processing fees. The cheapest vendor is picked for you. Change it anytime.</p>
        </article>
        <article className="feature">
          <div className="feature-num">03</div>
          <h3>In your library? Your system?</h3>
          <p>Every book shows if your library or your system already has it, and if you've ordered it.</p>
        </article>
        <article className="feature">
          <div className="feature-num">04</div>
          <h3>Order in one click</h3>
          <p>One order file per vendor, and every book marked as ordered, so nothing gets bought twice.</p>
        </article>
      </section>

      <section className="spotlight">
        <div className="spotlight-copy">
          <p className="kicker">Budget builder</p>
          <h2>“Give me $400 of the best-reviewed nonfiction for June.”</h2>
          <p>
            Type a budget and a subject. Shelfwise fills the list with top-reviewed, popular titles you don't own yet, right
            up to the dollar. Save it as an ordering list and you're done.
          </p>
          <a href="#/app/budget" className="text-link">Try the budget builder <Icon name="arrow" size={14} /></a>
        </div>
        <div className="spotlight-card" aria-hidden="true">
          <div className="sc-row sc-in">
            <span>Budget</span><strong>$400</strong>
          </div>
          <div className="sc-row sc-in">
            <span>Subject</span><strong>Nonfiction</strong>
          </div>
          <div className="sc-row sc-in">
            <span>Publishing</span><strong>June 2027</strong>
          </div>
          <div className="sc-result">
            <span>21 books</span>
            <strong>$396.40</strong>
          </div>
        </div>
      </section>

      <section className="spotlight spotlight-alt">
        <div className="spotlight-card missed" aria-hidden="true">
          <div className="missed-head">You might have missed — 2026</div>
          {['The Wilderness', 'Intermezzo', 'Sunrise on the Reaping', 'Atmosphere', 'Buckeye'].map((t, i) => (
            <div key={t} className="missed-row">
              <span>{t}</span>
              <span>${(16.4 + i * 1.1).toFixed(2)}</span>
            </div>
          ))}
          <div className="missed-foot">38 books · $684.12 left in budget</div>
        </div>
        <div className="spotlight-copy">
          <p className="kicker">For the December spend</p>
          <h2>Every book you meant to buy this year.</h2>
          <p>
            When there's money left at the end of the year, Shelfwise lists every title you saved but never ordered, ranked by
            reviews. Spend it well in an afternoon.
          </p>
        </div>
      </section>

      <section className="lot-band">
        <div className="lot-inner">
          <div>
            <p className="kicker kicker-light">Library of Things</p>
            <h2>Kits that arrive ready to lend.</h2>
            <p>
              Breakout boxes, murder mysteries, STEM, yoga, tools and more, in durable branded cases with big age labels and a
              shelf tag. We pack it, add the MARC record, and ship. Pay by invoice, tax exempt.
            </p>
            <a href="#/things" className="btn btn-light btn-lg">Design a kit</a>
          </div>
          <ol className="lot-steps">
            <li><strong>Pick an item</strong><span>Or send us your own.</span></li>
            <li><strong>Brand the case</strong><span>Your logo, colors and loan rules.</span></li>
            <li><strong>Shelve it</strong><span>MARC record and shelf tag included.</span></li>
          </ol>
        </div>
      </section>

      <section className="systems">
        <h2>Built for library systems.</h2>
        <p>
          One system contract covers every member library. Each library gets three staff seats and its own lists. The
          system gets one bill, and every librarian gets hours back each month.
        </p>
        <div className="systems-stats">
          <div><strong>$35</strong><span>per library, per month</span></div>
          <div><strong>3</strong><span>staff seats included</span></div>
          <div><strong>1</strong><span>bill for the whole system</span></div>
        </div>
        <a href="#/pricing" className="btn btn-dark btn-lg">See pricing</a>
      </section>
    </>
  );
}
