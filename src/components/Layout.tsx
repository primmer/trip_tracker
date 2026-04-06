import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { checkAdminMode } from '../utils/admin';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isTripDetail = location.pathname.startsWith('/trip/');
  const [scrolled, setScrolled] = useState(false);
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    setAdmin(checkAdminMode());
  }, [location]);

  useEffect(() => {
    if (!isHome) return;

    const handleScroll = () => {
      setScrolled(window.scrollY > 100);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHome]);

  return (
    <div className={`min-h-screen flex flex-col ${isHome ? 'bg-gray-950' : 'bg-gray-950'}`}>
      <header
        className={`
          top-0 z-50 transition-all duration-300
          ${
            isHome
              ? `fixed w-full ${scrolled ? 'bg-gray-950/80 backdrop-blur-md' : 'bg-transparent'}`
              : 'sticky bg-gray-950 border-b border-gray-800'
          }
        `}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Link
                to="/"
                className={`text-2xl tracking-tight ${
                  isHome
                    ? 'font-light tracking-wider text-white/80 hover:text-white'
                    : 'font-bold text-white'
                } transition-colors duration-300`}
              >
                Trip Tracker
              </Link>
            </div>
            <nav className="flex space-x-8">
              <Link
                to="/trips"
                className={`px-3 py-2 text-sm font-medium transition-colors duration-300 ${
                  isHome ? 'text-white/60 hover:text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Trips
              </Link>
              {admin && (
                <Link
                  to="/admin"
                  className={`px-3 py-2 text-sm font-medium transition-colors duration-300 ${
                    isHome ? 'text-white/60 hover:text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Admin
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-grow">{children}</main>

      {!isTripDetail && (
        <footer
          className={`py-8 ${isHome ? 'bg-gray-950' : 'bg-gray-950 border-t border-gray-800'}`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} David Primmer
            <span className="mx-2">&middot;</span>
            <Link to="/about" className="hover:text-gray-300 transition-colors">
              About
            </Link>
          </div>
        </footer>
      )}
    </div>
  );
};
