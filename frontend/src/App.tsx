import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '@/pages/Auth/LoginPage';
import BookingPage from '@/pages/Booking/BookingPage';
import AdminDashboard from '@/pages/Admin/AdminDashboard';
import RideHistoryPage from '@/pages/Booking/RideHistoryPage';
import RideDetailsPage from '@/pages/Booking/RideDetailsPage';
import RegisterPage from "@/pages/Auth/RegisterPage";
import { useAuth } from "@/contexts/AuthContext"
import NavBar from '@/components/NavBar';
import CircularProgress from "@mui/material/CircularProgress";
import PageNotFound from '@/pages/PageNotFound';

// ... other imports

function App() {
  const { accessToken, loading, user, userID } = useAuth(); // custom hook to get AuthContext
  
  if (loading) {
    return <CircularProgress size="large" title='Loading' />; // or <Spin />, <Skeleton />, or a splash screen
  }

  return (
    <>
    {accessToken && <NavBar />}
    <Routes>
      <Route path="/" element={ accessToken ? <Navigate to="/book" /> : <Navigate to="/login" /> } />
      <Route path="/login" element={ !accessToken ? <LoginPage />: <Navigate to="/book" />} />
      <Route path="/register" element={ !accessToken ? <RegisterPage /> : <Navigate to="/book" />} />

      {/* Protected user routes */}
      <Route 
        path="/book" 
        element={ accessToken ? <BookingPage /> : <Navigate to="/login" /> } 
      />
      <Route
        path="/history"
        element={ accessToken ? <RideHistoryPage /> : <Navigate to="/login" /> }
      />
      <Route
        path="/history/:id"
        element={ accessToken ? <RideDetailsPage /> : <Navigate to="/login" /> }
      />

      {/* Protected admin/driver route */}
      <Route 
        path="/admin" 
        element={ accessToken && userID == '1' ? <AdminDashboard /> : <Navigate to="/login" /> } 
      />

      {/* Default/fallback route */}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </>
  );
}

export default App
