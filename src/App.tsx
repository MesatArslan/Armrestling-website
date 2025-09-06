import { BrowserRouter as Router, Routes, Route, Outlet, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Players from './pages/Players';
import Tournaments from './pages/Tournaments';
import Matches from './pages/Matches';
import Scoring from './pages/Scoring';
import { SuperAdmin } from './pages/SuperAdmin';
import { Admin } from './pages/Admin';
import { User } from './pages/User';
import { AuthDebug } from './pages/AuthDebug';
import './i18n';
import Navbar from './components/UI/Navbar';
import ScrollToTop from './components/UI/ScrollToTop';
import { AuthProvider } from './contexts/AuthContext';
import { RouteGuard } from './components/auth/RouteGuard';

const Layout = () => {
  const location = useLocation();
  const isAdminPage = location.pathname === '/admin';
  const isUserPage = location.pathname === '/user';

  if (isAdminPage || isUserPage) {
    return (
      <div className="h-screen bg-gray-50 overflow-hidden">
        <Navbar />
        <div className="h-full pt-16">
          <Outlet />
        </div>
      </div>
    );
  }

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
          <Route path="/debug" element={<AuthDebug />} />
          
          {/* Super Admin Routes */}
          <Route 
            path="/superadmin" 
            element={
              <RouteGuard allowedRoles={['super_admin']}>
                <SuperAdmin />
              </RouteGuard>
            } 
          />
          
          {/* Routes with Layout (including Admin) */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route 
              path="admin" 
              element={
                <RouteGuard allowedRoles={['admin']}>
                  <Admin />
                </RouteGuard>
              } 
            />
            <Route 
              path="user" 
              element={
                <RouteGuard allowedRoles={['user']}>
                  <User />
                </RouteGuard>
              } 
            />
            <Route 
              path="players" 
              element={
                <RouteGuard allowedRoles={['user', 'admin']}>
                  <Players />
                </RouteGuard>
              } 
            />
            <Route 
              path="tournaments" 
              element={
                <RouteGuard allowedRoles={['user', 'admin']}>
                  <Tournaments />
                </RouteGuard>
              } 
            />
            <Route 
              path="matches" 
              element={
                <RouteGuard allowedRoles={['user', 'admin']}>
                  <Matches />
                </RouteGuard>
              } 
            />
            <Route 
              path="scoring" 
              element={
                <RouteGuard allowedRoles={['user', 'admin']}>
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
