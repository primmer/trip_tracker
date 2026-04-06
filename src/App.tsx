import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { Trips } from './pages/Trips';
import { TripDetail } from './pages/TripDetail';
import { Admin } from './pages/Admin';
import { About } from './pages/About';
import { Layout } from './components/Layout';
import { ScrollToTop } from './components/ScrollToTop';
import { isAdmin } from './utils/admin';

export function App() {
  return (
    <Router>
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
