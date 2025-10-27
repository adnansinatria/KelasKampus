// src/components/ProtectedRoute.tsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'siswa';
}

const decodeToken = (jwt: string) => {
  try { return JSON.parse(atob(jwt.split('.')[1])); } catch (e) { return null; }
};

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuth();
  }, [requiredRole]);

  const checkAuth = async () => {
    try {
      // Check Supabase Auth session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Fallback: Check custom JWT
        const token = localStorage.getItem("auth_token");
        
        if (!token) {
          navigate("/signin", { replace: true });
          return;
        }

        const payload = decodeToken(token);
        if (!payload) {
          localStorage.removeItem("auth_token");
          navigate("/signin", { replace: true });
          return;
        }

        // Check role for custom JWT users (Google OAuth / old users)
        if (requiredRole && payload.role !== requiredRole) {
          console.warn(`⚠️ Access denied: Required ${requiredRole}, user has ${payload.role}`);
          
          // Redirect to correct dashboard
          const redirectPath = payload.role === 'admin' ? '/admin' : '/dashboard';
          navigate(redirectPath, { replace: true });
          return;
        }

        console.log(`✅ Access granted for ${payload.role}`);
        setIsAuthorized(true);

      } else {
        // Supabase Auth user
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) {
          navigate("/signin", { replace: true });
          return;
        }

        // Get user role from public.users
        const { data: userData } = await supabase
          .from("users")
          .select("role")
          .eq("auth_id", authUser.id)
          .single();

        const userRole = userData?.role || 'siswa';

        // Check role
        if (requiredRole && userRole !== requiredRole) {
          console.warn(`⚠️ Access denied: Required ${requiredRole}, user has ${userRole}`);
          
          // Redirect to correct dashboard
          const redirectPath = userRole === 'admin' ? '/admin' : '/dashboard';
          navigate(redirectPath, { replace: true });
          return;
        }

        console.log(`✅ Access granted for ${userRole}`);
        setIsAuthorized(true);
      }

    } catch (error) {
      console.error("❌ Auth check error:", error);
      navigate("/signin", { replace: true });
    }
  };

  // Loading state
  if (isAuthorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F8FBFF] to-[#EFF6FF]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#295782] mx-auto mb-4"></div>
          <p className="text-[#64748B]">Memeriksa akses...</p>
        </div>
      </div>
    );
  }

  // Authorized - render children
  return <>{children}</>;
}
