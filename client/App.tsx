// src/main.tsx

import "./global.css";
import { Toaster as Toaster1 } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster } from "react-hot-toast";

import Index from "./pages/Index";
import ProtectedRoute from "./components/ProtectedRoute"; // ✅ IMPORT
import AuthCallback from "./pages/AuthCallback";

// Auth Pages
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";

import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import TryoutList from "./pages/TryoutList";
import TryoutStart from "./pages/TryoutStart";
import TryoutExam from "./pages/TryoutExam";

import AdminDashboard from "./pages/admin/adminDashboard";
import AdminUser from "./pages/admin/AdminUser";
import AdminTransaksi from "./pages/admin/adminPaketTransaksi";
import AdminTryout from "./pages/admin/adminTryout";
import AdminPengaturan from "./pages/admin/AdminPengaturan";
import AddTryoutPage from "./pages/admin/AddTryout";
import AddQuestionPage from "./pages/admin/AddQuestionPage";
import ViewTryout from "./pages/admin/ViewTryout";
import EditTryout from "./pages/admin/EditTryout";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const App = () => (
  <GoogleOAuthProvider clientId={googleClientId}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster1 />
        <Sonner />
        <Toaster position="top-right" />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* ✅ Student Dashboard (Protected - Siswa Only) */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute requiredRole="siswa">
                  <Dashboard />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/tryout" 
              element={
                <ProtectedRoute requiredRole="siswa">
                  <TryoutList />
                </ProtectedRoute>
              } 
            />

            <Route
              path="/tryout/:tryoutId/start"
              element={
                <ProtectedRoute>
                  <TryoutStart />
                </ProtectedRoute>
              }
            />

            <Route
              path="/tryout/:tryoutId/exam"
              element={
                <ProtectedRoute>
                  <TryoutExam />
                </ProtectedRoute>
              }
            />

            {/* ✅ Admin Routes (Protected - Admin Only) */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/admin-users" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminUser />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/admin-transaksi" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminTransaksi />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/admin-tryout" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminTryout />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/admin-tryout/new" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AddTryoutPage />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/admin-tryout/:tryoutId/:kategoriId/questions/new" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AddQuestionPage />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/admin-tryout/view/:id" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <ViewTryout />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/admin-tryout/edit/:id" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <EditTryout />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/admin-pengaturan" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminPengaturan />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/profile" 
              element={
                <ProtectedRoute requiredRole="siswa">
                  <Profile />
                </ProtectedRoute>
              } 
            />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </GoogleOAuthProvider>
);

const root = createRoot(document.getElementById("root")!);
root.render(<App />);

export default App;
