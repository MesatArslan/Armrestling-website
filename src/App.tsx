import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import Home from './pages/Home';
import Players from './pages/Players';
import Tournaments from './pages/Tournaments';
import Matches from './pages/Matches';
import Scoring from './pages/Scoring';
import { Login } from './pages/Login';
import { SuperAdmin } from './pages/SuperAdmin';
import { Admin } from './pages/Admin';
import './i18n';
import Navbar from './components/UI/Navbar';
import ScrollToTop from './components/UI/ScrollToTop';
import { AuthProvider } from './contexts/AuthContext';
import { RouteGuard } from './components/auth/RouteGuard';

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
    <AuthProvider>
      <Router basename={import.meta.env.BASE_URL}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          
          {/* Super Admin Routes */}
          <Route 
            path="/superadmin" 
            element={
              <RouteGuard allowedRoles={['super_admin']}>
                <SuperAdmin />
              </RouteGuard>
            } 
          />
          
          {/* Admin Routes */}
          <Route 
            path="/admin" 
            element={
              <RouteGuard allowedRoles={['admin']}>
                <Admin />
              </RouteGuard>
            } 
          />
          
          {/* User Routes with Layout */}
          <Route path="/" element={<Layout />}>
            <Route 
              index 
              element={
                <RouteGuard allowedRoles={['user']}>
                  <Home />
                </RouteGuard>
              } 
            />
            <Route 
              path="players" 
              element={
                <RouteGuard allowedRoles={['user']}>
                  <Players />
                </RouteGuard>
              } 
            />
            <Route 
              path="tournaments" 
              element={
                <RouteGuard allowedRoles={['user']}>
                  <Tournaments />
                </RouteGuard>
              } 
            />
            <Route 
              path="matches" 
              element={
                <RouteGuard allowedRoles={['user']}>
                  <Matches />
                </RouteGuard>
              } 
            />
            <Route 
              path="scoring" 
              element={
                <RouteGuard allowedRoles={['user']}>
                  <Scoring />
                </RouteGuard>
              } 
            />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
