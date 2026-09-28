import { useState, type FormEvent } from 'react'
import { ArrowRight, MapPin, Search } from 'lucide-react'

const services = [
  'Junk Removal',
  'Moving',
  'Estate Cleanout',
  'Light Hauling',
  'Yard Cleanup',
  'Demolition Debris',
]

export default function App() {
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [service, setService] = useState('Junk Removal')
  const [searched, setSearched] = useState(false)

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSearched(true)
  }

  return (
    <>
      <style>{`
        :root {
          font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: #172b3b;
          background: #f4f7f8;
          font-synthesis: none;
          text-rendering: optimizeLegibility;
        }
        * { box-sizing: border-box; }
        body { margin: 0; min-width: 320px; }
        button, input, select { font: inherit; }
        button { cursor: pointer; }
        .site { min-height: 100vh; }
        .nav {
          height: 74px; padding: 0 max(24px, calc((100vw - 1160px) / 2));
          display: flex; align-items: center; justify-content: space-between;
          background: #102b46; color: white;
        }
        .brand { font-size: 17px; font-weight: 750; letter-spacing: .02em; }
        .brand-mark { color: #6ce0bd; margin-right: 9px; }
        .nav-right { display: flex; align-items: center; gap: 28px; }
        .nav a { color: #e0eaf0; text-decoration: none; font-size: 14px; }
        .nav a:hover { color: #6ce0bd; }
        .nav-button {
          border: 1px solid #628097; border-radius: 8px; color: white;
          background: transparent; padding: 8px 12px;
        }
        .hero {
          background: #102b46; color: white;
          padding: 82px 24px 112px;
          position: relative; overflow: hidden;
        }
        .hero-inner { max-width: 1060px; margin: auto; position: relative; }
        .eyebrow {
          color: #6ce0bd; font-size: 12px; font-weight: 750;
          letter-spacing: .14em; text-transform: uppercase;
        }
        h1 {
          max-width: 720px; margin: 15px 0 16px;
          font-size: clamp(38px, 6vw, 66px); line-height: 1.04;
          letter-spacing: -.045em;
        }
        .hero-copy { max-width: 590px; color: #c6d5df; font-size: 18px; line-height: 1.65; }
        .search-card {
          max-width: 1000px; margin: -47px auto 0; position: relative;
          background: white; border: 1px solid #dbe4e9; border-radius: 14px;
          padding: 19px; box-shadow: 0 16px 38px #102b4617;
        }
        .search-form { display: grid; grid-template-columns: 1fr 1.2fr 1.5fr auto; gap: 12px; }
        .field { min-width: 0; display: flex; flex-direction: column; gap: 7px; }
        .field label { color: #54697a; font-size: 12px; font-weight: 700; }
        .control {
          width: 100%; height: 48px; border: 1px solid #d7e0e6; border-radius: 8px;
          padding: 0 12px; color: #20384b; background: white; outline: none;
        }
        .control:focus { border-color: #0e806b; box-shadow: 0 0 0 3px #0e806b1a; }
        .search-button {
          align-self: end; height: 48px; border: 0; border-radius: 8px;
          background: #0e806b; color: white; padding: 0 20px;
          display: inline-flex; align-items: center; justify-content: center; gap: 9px;
          font-weight: 700;
        }
        .search-button:hover { background: #096b59; }
        .content { max-width: 1060px; margin: 58px auto; padding: 0 24px; }
        .section-head { display: flex; align-items: end; justify-content: space-between; gap: 20px; }
        .section-head h2 { margin: 0; font-size: 25px; color: #102b46; letter-spacing: -.02em; }
        .section-head p { margin: 7px 0 0; color: #657889; }
        .service-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 13px; margin-top: 20px;
        }
        .service-card {
          min-height: 86px; display: flex; align-items: center; justify-content: space-between;
          gap: 12px; padding: 18px; background: white; border: 1px solid #dce5e9;
          border-radius: 11px; color: #173750; text-align: left; font-weight: 700;
          transition: border-color .15s, transform .15s;
        }
        .service-card:hover { border-color: #0e806b; transform: translateY(-2px); }
        .service-card.active { border-color: #0e806b; background: #f0fbf7; }
        .service-icon {
          width: 38px; height: 38px; display: grid; place-items: center;
          border-radius: 10px; color: #0e806b; background: #e2f7ef; flex: none;
        }
        .service-name { flex: 1; }
        .arrow { color: #748899; }
        .preview {
          margin-top: 48px; padding: 23px; border-radius: 12px;
          background: #eaf0f3; border: 1px solid #dce5e9;
        }
        .preview h3 { margin: 0 0 8px; color: #102b46; }
        .preview p { margin: 0; color: #566d7e; line-height: 1.6; }
        .preview-tag {
          display: inline-block; margin-bottom: 12px; padding: 5px 9px;
          border-radius: 20px; background: #d9f3e9; color: #08705d;
          font-size: 12px; font-weight: 700;
        }
        .footer {
          padding: 26px 24px; color: #bdccd6; background: #102b46;
          text-align: center; font-size: 13px;
        }
        @media (max-width: 760px) {
          .nav { height: 64px; padding: 0 18px; }
          .nav-right { gap: 14px; }
          .nav a { display: none; }
          .hero { padding: 60px 20px 86px; }
          .hero-copy { font-size: 16px; }
          .search-card { margin: -38px 14px 0; padding: 15px; }
          .search-form { grid-template-columns: 1fr 1fr; }
          .field.service-field { grid-column: 1 / -1; }
          .search-button { grid-column: 1 / -1; width: 100%; }
          .content { margin: 43px auto; padding: 0 18px; }
          .service-grid { grid-template-columns: 1fr 1fr; gap: 9px; }
          .service-card { min-height: 76px; padding: 12px; font-size: 14px; }
          .service-icon { width: 32px; height: 32px; }
        }
        @media (max-width: 420px) {
          .service-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="site">
        <header className="nav">
          <div className="brand"><span className="brand-mark">◆</span>LOCAL SERVICES</div>
          <nav className="nav-right" aria-label="Main navigation">
            <a href="#services">Services</a>
            <a href="#how-it-works">How it works</a>
            <button className="nav-button" type="button">US / Canada</button>
          </nav>
        </header>

        <section className="hero">
          <div className="hero-inner">
            <div className="eyebrow">United States · Canada</div>
            <h1>Find local services near you.</h1>
            <p className="hero-copy">
              Search by service and location to find local businesses in your area.
            </p>
          </div>
        </section>

        <section className="search-card" aria-label="Search local services">
          <form className="search-form" onSubmit={handleSearch}>
            <div className="field">
              <label htmlFor="country">COUNTRY</label>
              <select
                id="country"
                className="control"
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                required
              >
                <option value="">Choose</option>
                <option value="US">United States</option>
                <option value="CA">Canada</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="city">CITY</label>
              <input
                id="city"
                className="control"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="Enter a city"
                required
              />
            </div>
            <div className="field service-field">
              <label htmlFor="service">SERVICE</label>
              <select
                id="service"
                className="control"
                value={service}
                onChange={(event) => setService(event.target.value)}
              >
                {services.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
            <button className="search-button" type="submit">
              <Search size={18} /> Search
            </button>
          </form>
        </section>

        <main className="content">
          <section id="services">
            <div className="section-head">
              <div>
                <h2>Browse popular services</h2>
                <p>Choose a service to start exploring local listings.</p>
              </div>
            </div>
            <div className="service-grid">
              {services.map((item) => (
                <button
                  className={`service-card ${service === item ? 'active' : ''}`}
                  key={item}
                  type="button"
                  onClick={() => setService(item)}
                >
                  <span className="service-icon"><MapPin size={19} /></span>
                  <span className="service-name">{item}</span>
                  <ArrowRight className="arrow" size={17} />
                </button>
              ))}
            </div>
          </section>

          <section id="how-it-works" className="preview" aria-live="polite">
            <span className="preview-tag">
              {searched ? 'SEARCH PREVIEW' : 'FRONT-END PROTOTYPE'}
            </span>
            <h3>
              {searched
                ? `${service} in ${city}${country ? `, ${country}` : ''}`
                : 'Listings will appear here after the database is connected.'}
            </h3>
            <p>
              {searched
                ? 'This preview uses no merchant records yet. The real listings will be connected in a later project step.'
                : 'This page is using sample interface content only. No merchant data is being collected or displayed yet.'}
            </p>
          </section>
        </main>

        <footer className="footer">
          Local services directory · United States and Canada
        </footer>
      </div>
    </>
  )
}
