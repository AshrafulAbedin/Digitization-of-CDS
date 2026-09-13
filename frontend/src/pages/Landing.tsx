import { Link } from 'react-router-dom';
import { Clock } from '../components/Clock';

const features = [
  { title: 'Cashier POS', path: '/pos', desc: 'Take student orders and manage tickets instantly.', icon: '🛒', tone: 'from-orange-300/70 to-transparent', accent: 'text-orange-600' },
  { title: 'Kitchen Display', path: '/kitchen', desc: 'Track incoming orders and fire them out hot.', icon: '🍳', tone: 'from-emerald-300/70 to-transparent', accent: 'text-emerald-700' },
  { title: 'Token Board', path: '/tokens', desc: 'Live queue status so students know when to grab their food.', icon: '🎟️', tone: 'from-emerald-300/70 to-transparent', accent: 'text-emerald-700' },
  { title: 'Inventory', path: '/inventory', desc: 'Monitor daily stock, vendors, and minimize waste.', icon: '📦', tone: 'from-amber-300/70 to-transparent', accent: 'text-amber-700' },
  { title: 'Analytics', path: '/analytics', desc: 'See top sellers, peak hours, and profit reports.', icon: '📈', tone: 'from-emerald-300/70 to-transparent', accent: 'text-emerald-700' },
];

export function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col">
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white p-2.5 rounded-2xl text-xl shadow-lg shadow-emerald-500/30 flex items-center justify-center">
            🍽️
          </div>
          <span className="font-display font-extrabold text-2xl tracking-tight text-ink">
            Oven<span className="text-emerald-600">Fresh</span>
          </span>
        </div>
        <Clock withDate />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 z-10 mt-8 mb-16">
        <div className="inline-block px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-sm mb-6 border border-emerald-300">
          🎓 Built for Campus Life
        </div>

        <h1 className="text-5xl md:text-7xl font-display font-extrabold text-center text-ink tracking-tight max-w-4xl leading-[1.05] mb-6">
          Craving something{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-600">
            delicious?
          </span>
        </h1>

        <p className="text-xl text-body text-center max-w-2xl mx-auto mb-10 font-medium">
          Skip the line. Order your favorite meals, snacks, and drinks in seconds.
          The smartest way to eat on campus.
        </p>

        <Link
          to="/pos"
          className="hero-float inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold text-lg shadow-xl shadow-orange-500/40 hover:scale-105 active:scale-95 transition-all"
        >
          Start an Order
          <span className="bg-white/25 rounded-full w-6 h-6 flex items-center justify-center text-sm">→</span>
        </Link>

        <div className="landing-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl w-full mt-24">
          {features.map((f) => (
            <Link
              key={f.path}
              to={f.path}
              className="lift-card group relative flex flex-col items-start overflow-hidden rounded-3xl border border-hairline bg-white/85 backdrop-blur-xl p-6 shadow-sm"
            >
              <div className={`lift-blob absolute -top-16 -right-16 h-40 w-40 rounded-full bg-gradient-to-br ${f.tone} blur-2xl`} />

              <div className="lift-icon relative z-10 mb-5 rounded-2xl bg-white border border-hairline p-4 text-3xl shadow-sm">
                {f.icon}
              </div>

              <h2 className="relative z-10 mb-3 font-display text-xl font-extrabold text-ink">
                <span className="lift-title">{f.title}</span>
              </h2>
              <p className="relative z-10 mb-6 text-sm leading-relaxed text-body font-medium">
                {f.desc}
              </p>

              <div className={`relative z-10 mt-auto flex items-center text-sm font-bold ${f.accent}`}>
                Open Module <span className="lift-arrow ml-2">→</span>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <footer className="w-full text-center py-8 text-label text-sm border-t border-hairline z-10 font-medium">
        <p>© {new Date().getFullYear()} OvenFresh CDS — Digitizing the campus canteen experience.</p>
      </footer>
    </div>
  );
}