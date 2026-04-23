import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import NeedsPage from './pages/NeedsPage';
import MapPage from './pages/MapPage';
import VolunteersPage from './pages/VolunteersPage';
import BroadcastPage from './pages/BroadcastPage';
import OCRPage from './pages/OCRPage';
import MatchingPage from './pages/MatchingPage';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<DashboardPage />} />
        <Route path="needs" element={<NeedsPage />} />
        <Route path="map" element={<MapPage />} />
        <Route path="volunteers" element={<VolunteersPage />} />
        <Route path="broadcast" element={<BroadcastPage />} />
        <Route path="ocr" element={<OCRPage />} />
        <Route path="matching/:needId?" element={<MatchingPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
