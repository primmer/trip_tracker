import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { Trips } from './pages/Trips';
import { TripDetail } from './pages/TripDetail';
import { Admin } from './pages/Admin';
import { Layout } from './components/Layout';

export function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/trips" element={<Trips />} />
          <Route path="/trip/:tripId" element={<TripDetail />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </Layout>
    </Router>
  );
}


