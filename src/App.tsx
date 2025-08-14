import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import Home from './pages/Home';
import Players from './pages/Players';
import Tournaments from './pages/Tournaments';
import Matches from './pages/Matches';
import Scoring from './pages/Scoring';
import './i18n';
import Navbar from './components/UI/Navbar';
import ScrollToTop from './components/UI/ScrollToTop';

const Layout = () => {
  return (
    <div className="min-h-screen bg-gray-50 w-screen">
      <Navbar />
      <ScrollToTop />
      <main className="w-screen pt-16">
        <Outlet />
      </main>
    </div>
  );
};

const App = () => {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="players" element={<Players />} />
          <Route path="tournaments" element={<Tournaments />} />
          <Route path="matches" element={<Matches />} />
          <Route path="scoring" element={<Scoring />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
