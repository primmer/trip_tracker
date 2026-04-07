import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Home } from './pages/Home';
import { Trips } from './pages/Trips';
import { TripDetail } from './pages/TripDetail';
import { Admin } from './pages/Admin';
import { About } from './pages/About';
import { Layout } from './components/Layout';
import { ScrollToTop } from './components/ScrollToTop';
import { isAdmin } from './utils/admin';
import { logPageView } from './utils/analytics';

// Analytics tracker component
function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    const pageName =
      path === '/' ? 'Home' : path.replace(/\//g, '_').replace(/^_/, '').replace(/_/g, '_');
    logPageView(pageName, { path });
  }, [location]);

  return null;
}

export function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AnalyticsTracker />
      <ScrollToTop />
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/trips" element={<Trips />} />
          <Route path="/trip/:tripId" element={<TripDetail />} />
          <Route path="/about" element={<About />} />
          <Route path="/admin" element={isAdmin() ? <Admin /> : <Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}
