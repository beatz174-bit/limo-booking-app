// Main application component setting up routes.
import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "@/pages/Auth/LoginPage";
import BookingWizardPage from "@/pages/Booking/BookingWizardPage";
import AdminDashboard from "@/pages/Admin/AdminDashboard";
import DriverDashboard from "@/pages/Driver/DriverDashboard";
import AvailabilityPage from "@/pages/Driver/AvailabilityPage";
import TrackingPage from "@/pages/TrackingPage";
import RideHistoryPage from "@/pages/Booking/RideHistoryPage";
import RideDetailsPage from "@/pages/Booking/RideDetailsPage";
import RegisterPage from "@/pages/Auth/RegisterPage";
import ProfilePage from "@/pages/Profile/ProfilePage";
import { useAuth, RequireAuth, RequireRole } from "@/contexts/AuthContext";
import NavBar from "@/components/NavBar";
import CircularProgress from "@mui/material/CircularProgress";
import PageNotFound from "@/pages/PageNotFound";
import DevNotes from "@/components/DevNotes";
import { useDevFeatures } from "@/contexts/DevFeaturesContext";
import HomePage from "@/pages/Dashboard/HomePage";

function App() {
  const { accessToken, loading } = useAuth(); // custom hook to get AuthContext
  const { enabled: devEnabled } = useDevFeatures();

  if (loading) {
    return <CircularProgress size="large" title='Loading' />; // or <Spin />, <Skeleton />, or a splash screen
  }

  return (
    <>
    {accessToken && <NavBar />}
    <Routes>
      <Route path="/" element={<RequireAuth><HomePage /></RequireAuth>} />
      <Route path="/login" element={!accessToken ? <LoginPage /> : <Navigate to="/" />} />
      <Route path="/register" element={!accessToken ? <RegisterPage /> : <Navigate to="/" />} />

      {/* Protected user routes */}
      <Route path="/book" element={<RequireAuth><BookingWizardPage /></RequireAuth>} />
      <Route path="/history" element={<RequireAuth><RideHistoryPage /></RequireAuth>} />
      <Route path="/history/:id" element={<RequireAuth><RideDetailsPage /></RequireAuth>} />
      <Route path="/me" element={<RequireAuth><ProfilePage /></RequireAuth>} />

      {/* Protected admin/driver route */}
      <Route path="/admin" element={<RequireRole role="admin"><AdminDashboard /></RequireRole>} />
      <Route path="/driver" element={<RequireRole role="driver"><DriverDashboard /></RequireRole>} />
      <Route path="/driver/availability" element={<RequireRole role="driver"><AvailabilityPage /></RequireRole>} />
      <Route path="/t/:code" element={<TrackingPage />} />

      {devEnabled && <Route path="/devnotes" element={<DevNotes />} />}

      {/* Default/fallback route */}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </>
  );
}

export default App;
