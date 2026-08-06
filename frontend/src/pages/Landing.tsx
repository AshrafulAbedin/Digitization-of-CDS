import { Link, useNavigate } from 'react-router-dom';

const modules = [
  { to: '/pos', title: 'Cashier POS', desc: 'Process orders quickly.', icon: '🧾' },
  { to: '/kitchen', title: 'Kitchen Display', desc: 'Track and manage active batches.', icon: '👨‍🍳' },
  { to: '/inventory', title: 'Inventory', desc: 'Monitor stock and purchases.', icon: '📦' },
  { to: '/analytics', title: 'Owner Analytics', desc: 'View sales and waste reports.', icon: '📈' },
];

export function Landing() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-full flex-col">
      <header className="flex h-[72px] items-center justify-between border-b border-[#e7e2da] bg-white px-8">
        <span className="text-2xl font-bold text-ink">OvenFresh CDS</span>
        <div className="flex items-center gap-2">
          <Link
            to="/tokens"
            className="rounded-lg px-4 py-2 font-medium text-body hover:bg-black/5"
          >
            Token board
          </Link>
          <button className="rounded-lg border border-[#d9d4cc] px-4 py-2 font-medium text-body hover:border-ink">
            Login
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <h1 className="max-w-3xl text-center text-5xl leading-tight font-bold text-ink">
          Streamlined Cafeteria Operations
        </h1>
        <p className="mt-4 max-w-xl text-center text-body">
          Fast point-of-sale, real-time kitchen tracking, and smart inventory management for IUT CDS.
        </p>
        <button
          onClick={() => navigate('/pos')}
          className="mt-8 h-14 rounded-lg bg-ink px-8 font-bold tracking-[0.5px] text-white uppercase transition-colors hover:bg-black"
        >
          Open POS Terminal
        </button>

        <div className="mt-16 grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((m) => (
            <Link
              key={m.to}
              to={m.to}
              className="group rounded-lg border border-[#e7e2da] bg-white p-5 transition-colors hover:bg-gold/8"
            >
              <div className="text-2xl" aria-hidden>
                {m.icon}
              </div>
              <div className="mt-3 text-lg font-semibold text-ink group-hover:underline">
                {m.title}
              </div>
              <div className="mt-1 text-sm text-label">{m.desc}</div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
