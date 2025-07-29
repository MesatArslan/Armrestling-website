import { BrowserRouter as Router, Routes, Route, Link, Outlet } from 'react-router-dom';
import Home from './pages/Home';
import Players from './pages/Players';
import Tournaments from './pages/Tournaments';
import Matches from './pages/Matches';

const Navbar = () => {
  return (
    <nav className="bg-white shadow-sm w-full">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              WrestleMania Pro
            </Link>
          </div>
          <div className="flex items-center space-x-8">
            <Link to="/players" className="text-gray-600 hover:text-blue-600 transition-colors duration-200">
              Players
            </Link>
            <Link to="/tournaments" className="text-gray-600 hover:text-blue-600 transition-colors duration-200">
              Tournaments
            </Link>
            <Link to="/matches" className="text-gray-600 hover:text-blue-600 transition-colors duration-200">
              Matches
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

const Layout = () => {
  return (
    <div className="min-h-screen bg-gray-50 w-screen">
      <Navbar />
      <main className="w-screen">
        <Outlet />
      </main>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/players" element={<Players />} />
          <Route path="/tournaments" element={<Tournaments />} />
          <Route path="/matches" element={<Matches />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
