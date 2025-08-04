import { Navigate, useRoutes } from "react-router-dom";
import RequireSetup from './components/RequireSetup';
import AppLayout from './layouts/AppLayout';
import SetupPage from './pages/SetupPage';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import BookingPage from './pages/BookingPage';
import ConfirmationPage from './pages/ConfirmationPage';
import HistoryPage from './pages/HistoryPage';
import AdminDashboard from './pages/AdminDashboard';
import RequireAuth from './components/RequireAuth'; // your existing component
import { useAuth } from "./AuthContext";

export default function AppRoutes() {
  const { setupRequired } = useAuth();

  const routing = useRoutes([
       {
      element: <AppLayout />, // 🔥 always wrap all routes in AppLayout
      children: [
    {
      element: <RequireSetup />, // Setup guard
      children: [
        { path: "/setup", element: <SetupPage /> },
        { path: "/login", element: <LoginPage /> },
      ],
    },
    {
      // element: <AppLayout />, // Layout wrapper
      children: [
        {
          // Root index route logic:
          index: true,
          element: setupRequired
            ? <Navigate to="/setup" replace />
            : <HomePage />,
        },
        { element: <RequireAuth />, children: [
            { path: "book", element: <BookingPage /> },
            { path: "confirmation", element: <ConfirmationPage /> },
            { path: "history", element: <HistoryPage /> },
            { path: "admin", element: <AdminDashboard /> },
        ]},
        { path: "*", element: <Navigate to="/" replace /> },
      ],
    },
  ],
},
]);

  return routing;
}