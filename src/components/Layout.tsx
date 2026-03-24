import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    if (isHome) {
      window.addEventListener('scroll', handleScroll);
      handleScroll();
    } else {
      setIsScrolled(true);
    }

    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHome]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col font-sans selection:bg-blue-500/30">
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? 'bg-gray-900/90 backdrop-blur-md border-b border-gray-800 h-16' 
            : 'bg-transparent h-20'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex justify-between items-center h-full">
            <div className="flex items-center">
              <Link to="/" className="text-2xl font-bold text-white tracking-tight hover:text-blue-400 transition-colors">
                Trip Tracker
              </Link>
            </div>
            <nav className="flex space-x-2 sm:space-x-8">
              <Link
                to="/"
                className="text-gray-400 hover:text-white px-4 py-2 text-sm font-medium transition-colors min-h-[44px] flex items-center"
              >
                Home
              </Link>
              <Link
                to="/trips"
                className="text-gray-400 hover:text-white px-4 py-2 text-sm font-medium transition-colors min-h-[44px] flex items-center"
              >
                Trips
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-grow pt-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="bg-gray-950 border-t border-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
          <div className="mb-4 text-gray-400 font-bold tracking-widest uppercase text-xs">Bike Trip Tracker</div>
          <p>&copy; {new Date().getFullYear()} — Built for visual storytelling.</p>
        </div>
      </footer>
    </div>
  );
};


