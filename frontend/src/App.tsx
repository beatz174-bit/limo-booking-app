// Main application component setting up routes.
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '@/pages/Auth/LoginPage';
import BookingWizardPage from '@/pages/Booking/BookingWizardPage';
import AdminDashboard from '@/pages/Admin/AdminDashboard';
import DriverDashboard from '@/pages/Driver/DriverDashboard';
import TrackingPage from '@/pages/TrackingPage';

import RideHistoryPage from '@/pages/Booking/RideHistoryPage';
import RideDetailsPage from '@/pages/Booking/RideDetailsPage';
import RegisterPage from "@/pages/Auth/RegisterPage";
import ProfilePage from '@/pages/Profile/ProfilePage';
import { useAuth } from "@/contexts/AuthContext";
import NavBar from '@/components/NavBar';
import CircularProgress from "@mui/material/CircularProgress";
import PageNotFound from '@/pages/PageNotFound';
import DevNotes from '@/components/DevNotes';
import { useDevFeatures } from '@/contexts/DevFeaturesContext';

function App() {
  const { accessToken, loading, userID } = useAuth(); // custom hook to get AuthContext
  const { enabled: devEnabled } = useDevFeatures();

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
        element={ accessToken ? <BookingWizardPage /> : <Navigate to="/login" /> }
      />
      <Route
        path="/history"
        element={ accessToken ? <RideHistoryPage /> : <Navigate to="/login" /> }
      />
      <Route
        path="/history/:id"
        element={ accessToken ? <RideDetailsPage /> : <Navigate to="/login" /> }
      />
      <Route
        path="/me"
        element={ accessToken ? <ProfilePage /> : <Navigate to="/login" /> }
      />

      {/* Protected admin/driver route */}
      <Route
        path="/admin"
        element={ accessToken && userID == '1' ? <AdminDashboard /> : <Navigate to="/login" /> }
      />
      <Route
        path="/driver"
        element={ accessToken ? <DriverDashboard /> : <Navigate to="/login" /> }
      />
      <Route path="/t/:code" element={<TrackingPage />} />


      {devEnabled && <Route path="/devnotes" element={<DevNotes />} />}

      {/* Default/fallback route */}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </>
  );
}

export default App;
