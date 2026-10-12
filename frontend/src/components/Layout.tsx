import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './ErrorBoundary';

const MAIN_ID = 'main-content';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
    isActive ? 'bg-indigo-100 text-indigo-900' : 'text-slate-700 hover:bg-slate-100'
  }`;

export function Layout() {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <a
        href={`#${MAIN_ID}`}
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-indigo-700 focus:shadow-lg"
      >
        Skip to content
      </a>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="text-lg font-semibold text-slate-900">
            Study System
          </Link>
          <nav aria-label="Main">
            <ul className="flex items-center gap-1">
              <li>
                <NavLink to="/" end className={navLinkClass}>
                  Topics
                </NavLink>
              </li>
              <li>
                <NavLink to="/settings" className={navLinkClass}>
                  Settings
                </NavLink>
              </li>
            </ul>
          </nav>
        </div>
      </header>
      <main
        id={MAIN_ID}
        tabIndex={-1}
        className="mx-auto max-w-5xl px-4 py-6 focus:outline-none sm:px-6"
      >
        <ErrorBoundary resetKey={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
