import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Suspense, lazy, useEffect } from "react";
import toast from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";
import { API_CONFIGURATION_ERROR } from "./constants";

const Login = lazy(() => import("./pages/Auth/Login"));
const Register = lazy(() => import("./pages/Auth/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard/Dashboard"));
const Finance = lazy(() => import("./pages/Finance/Finance"));
const Investments = lazy(() => import("./pages/Investments/Investments"));
const Habits = lazy(() => import("./pages/Habits/Habits"));
const Goals = lazy(() => import("./pages/Goals/Goals"));
const Analytics = lazy(() => import("./pages/Analytics/Analytics"));
const Advisor = lazy(() => import("./pages/Advisor/Advisor"));
const Admin = lazy(() => import("./pages/Advisor/Admin/Admin"));
const Account = lazy(() => import("./pages/Account/Account"));

const RouteLoader = () => (
  <div className="min-h-screen flex items-center justify-center muted-text text-sm">Loading...</div>
);

const App = () => {
  useEffect(() => {
    if (API_CONFIGURATION_ERROR) {
      toast.error(API_CONFIGURATION_ERROR, { duration: 7000 });
    }
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "var(--bg-elevated)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-light)",
              fontFamily: "DM Sans, sans-serif",
              fontSize: "14px",
              borderRadius: "12px",
            },
            success: {
              iconTheme: { primary: "#f59e0b", secondary: "#0e0d09" },
            },
            error: {
              iconTheme: { primary: "#f43f5e", secondary: "#0e0d09" },
            },
          }}
        />

        <Suspense fallback={<RouteLoader />}>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/finance" element={<Finance />} />
                <Route path="/investments" element={<Investments />} />
                <Route path="/habits" element={<Habits />} />
                <Route path="/goals" element={<Goals />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/advisor" element={<Advisor />} />
                <Route path="/account" element={<Account />} />
              </Route>
            </Route>

            {/* Admin only */}
            <Route element={<ProtectedRoute adminOnly />}>
              <Route element={<AppLayout />}>
                <Route path="/admin" element={<Admin />} />
              </Route>
            </Route>

            {/* 404 fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
        </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
