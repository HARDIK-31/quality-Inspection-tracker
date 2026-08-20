import { NavLink, Outlet, useLocation } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/cn';

const NAV_ITEMS = [
  { to: '/', label: 'Inspections', icon: ListIcon, end: true },
  { to: '/summary', label: 'Summary', icon: ChartIcon, end: false },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 bg-slate-900 text-white">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">Quality Inspection</p>
            <p className="truncate text-xs text-slate-400">
              {user ? user.displayName : 'Shop-floor tracker'}
            </p>
          </div>
          {user && (
            <button
              type="button"
              onClick={logout}
              className="-mr-2 inline-flex min-h-11 shrink-0 items-center rounded-lg px-3 text-xs font-semibold text-slate-300 hover:bg-slate-800"
            >
              Sign out
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 pt-4 pb-28">
        <Outlet />
      </main>

      <nav
        aria-label="Main"
        className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur"
      >
        <div className="mx-auto flex max-w-lg">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => {
            const active = end ? location.pathname === to : location.pathname.startsWith(to);
            return (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={cn(
                  'flex flex-1 flex-col items-center gap-0.5 px-2 pt-2 pb-1 text-xs font-medium',
                  active ? 'text-slate-900' : 'text-slate-500',
                )}
              >
                <Icon active={active} />
                {label}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function ListIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.7}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M8 6h12M8 12h12M8 18h12M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
    </svg>
  );
}

function ChartIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}
