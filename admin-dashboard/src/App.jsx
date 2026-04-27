import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import NeedsPage from './pages/NeedsPage';
import MapPage from './pages/MapPage';
import VolunteersPage from './pages/VolunteersPage';
import BroadcastPage from './pages/BroadcastPage';
import OCRPage from './pages/OCRPage';
import MatchingPage from './pages/MatchingPage';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
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
      <BrowserRouter basename="/admin">
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
