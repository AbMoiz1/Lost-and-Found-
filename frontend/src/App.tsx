import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ReportItem from './pages/ReportItem';
import Search from './pages/Search';
import ItemDetail from './pages/ItemDetail';
import MyItems from './pages/MyItems';
import MyClaims from './pages/MyClaims';
import AdminDashboard from './pages/AdminDashboard';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    // Initialize auth state on app startup
    initializeAuth();
  }, [initializeAuth]);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            
            {/* Protected routes - require authentication */}
            <Route path="items/lost/new" element={
              <ProtectedRoute>
                <ReportItem />
              </ProtectedRoute>
            } />
            <Route path="items/found/new" element={
              <ProtectedRoute>
                <ReportItem />
              </ProtectedRoute>
            } />
            <Route path="my-items" element={
              <ProtectedRoute>
                <MyItems />
              </ProtectedRoute>
            } />
            <Route path="my-claims" element={
              <ProtectedRoute>
                <MyClaims />
              </ProtectedRoute>
            } />
            
            {/* Admin routes - require admin role */}
            <Route path="admin" element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } />
            
            {/* Public routes */}
            <Route path="items/:id" element={<ItemDetail />} />
            <Route path="search" element={<Search />} />
          </Route>
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;