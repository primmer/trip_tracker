import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { Trips } from './pages/Trips';
import { Layout } from './components/Layout';

export function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/trips" element={<Trips />} />
          <Route path="/trip/:tripId" element={<div>Trip Detail Placeholder</div>} />
        </Routes>
      </Layout>
    </Router>
  );
}


