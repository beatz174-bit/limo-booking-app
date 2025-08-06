import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/Auth/LoginPage';
import BookingPage from './pages/Booking/BookingPage';
import AdminDashboard from './pages/Admin/AdminDashboard';
import RideHistoryPage from './pages/Booking/RideHistoryPage';
import RegisterPage from "./pages/Auth/RegisterPage";
import { useAuth } from "./contexts/AuthContext"
// ... other imports

function App() {
  const { token, userRole } = useAuth(); // custom hook to get AuthContext

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected user routes */}
      <Route 
        path="/book" 
        element={ token ? <BookingPage /> : <Navigate to="/login" /> } 
      />
      <Route 
        path="/history" 
        element={ token ? <RideHistoryPage /> : <Navigate to="/login" /> } 
      />

      {/* Protected admin/driver route */}
      <Route 
        path="/admin" 
        element={
          token && userRole==="driver" 
          ? <AdminDashboard /> 
          : <Navigate to="/login" />
        } 
      />

      {/* Default/fallback route */}
      <Route path="*" element={<Navigate to={token ? "/book" : "/login"} />} />
    </Routes>
  );
}

export default App
