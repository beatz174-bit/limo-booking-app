// Main application component setting up routes.
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
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
import SetupPage from "@/pages/Setup/SetupPage";
import { useAuth, RequireAuth, RequireAdmin } from "@/contexts/AuthContext";
import NavBar from "@/components/NavBar";
import PageNotFound from "@/pages/PageNotFound";
import DevNotes from "@/components/DevNotes";
import { useDevFeatures } from "@/contexts/DevFeaturesContext";
import { useBackendReady } from "@/contexts/BackendReadyContext";
import HomePage from "@/pages/Dashboard/HomePage";
import LoadingScreen from "@/components/LoadingScreen";

function App() {
  const { accessToken, loading } = useAuth(); // custom hook to get AuthContext
  const { enabled: devEnabled } = useDevFeatures();
  const { ready, needsSetup } = useBackendReady();
  const location = useLocation();

  if (loading || !ready) {
    return <LoadingScreen />;
  }

  if (needsSetup && location.pathname !== "/setup") {
    return <Navigate to="/setup" replace />;
  }

  return (
    <>
    {accessToken && <NavBar />}
    <Routes>
      <Route path="/" element={<RequireAuth><HomePage /></RequireAuth>} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={!accessToken ? <RegisterPage /> : <Navigate to="/" />} />
      <Route path="/setup" element={<SetupPage />} />

      {/* Protected user routes */}
      <Route path="/book" element={<RequireAuth><BookingWizardPage /></RequireAuth>} />
      <Route path="/history" element={<RequireAuth><RideHistoryPage /></RequireAuth>} />
      <Route path="/history/:id" element={<RequireAuth><RideDetailsPage /></RequireAuth>} />
      <Route path="/me" element={<RequireAuth><ProfilePage /></RequireAuth>} />

      {/* Protected admin-only routes */}
      <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
      <Route path="/driver" element={<RequireAdmin><DriverDashboard /></RequireAdmin>} />
      <Route path="/driver/availability" element={<RequireAdmin><AvailabilityPage /></RequireAdmin>} />
      <Route path="/t/:code" element={<TrackingPage />} />

      {devEnabled && <Route path="/devnotes" element={<DevNotes />} />}

      {/* Default/fallback route */}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </>
  );
}

export default App;
