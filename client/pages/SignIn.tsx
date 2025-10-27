import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabase";

export default function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ✅ Email/Password Login
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log("🔐 Logging in:", email);

      // Login with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;

      if (!data.session) {
        throw new Error("Login gagal. Silakan coba lagi.");
      }

      console.log("✅ Login successful");

      // Query user data dari public.users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, nama_lengkap')
        .eq('auth_id', data.user.id)
        .single();

      let role = 'siswa'; // Default role

      if (userError) {
        console.warn("⚠️ User data not found, checking auth metadata...");
        role = data.user.user_metadata?.role || 'siswa';
      } else {
        role = userData.role;
      }

      console.log("👤 User role:", role);

      // Redirect based on role
      if (role === "admin") {
        console.log("→ Redirecting to /admin");
        navigate("/admin", { replace: true });
      } else {
        console.log("→ Redirecting to /dashboard");
        navigate("/dashboard", { replace: true });
      }

    } catch (err: any) {
      console.error("❌ Login Error:", err);
      
      let errorMessage = "Terjadi kesalahan saat login";
      
      if (err.message.includes("Invalid login credentials")) {
        errorMessage = "Email atau password salah";
      } else if (err.message.includes("Email not confirmed")) {
        errorMessage = "Email belum diverifikasi. Silakan cek inbox Anda.";
      } else {
        errorMessage = err.message;
      }
      
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Google OAuth Login (Supabase Native)
  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) throw error;

      console.log("✅ Google OAuth initiated");
      // Redirect akan otomatis dilakukan oleh Supabase
    } catch (error: any) {
      console.error("❌ Google Login Error:", error);
      alert("Login dengan Google gagal: " + error.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="w-screen h-screen flex">
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 lg:px-16">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
            <div className="w-3 h-3 bg-white rounded-full"></div>
          </div>
          <span className="text-lg font-semibold text-black">KelasKampus</span>
        </div>
        
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-black mb-2">Selamat Datang</h1>
          <p className="text-gray-600">Masuk untuk Mulai Persiapan SNBT Anda</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Input
              type="email"
              placeholder="Masukkan Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="h-12 rounded-lg border border-gray-300 pl-10 text-sm placeholder:text-gray-400"
              required
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"/>
              </svg>
            </div>
          </div>

          <div>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Masukkan Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="h-12 w-full rounded-lg border border-gray-300 pl-10 pr-10 text-sm placeholder:text-gray-400"
                required
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
              </div>
              <div
                className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5 text-gray-400" />
                ) : (
                  <Eye className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                className="w-4 h-4 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                disabled={isLoading}
              />
              <label htmlFor="remember" className="text-sm text-gray-700 cursor-pointer">
                Remember me
              </label>
            </div>
            <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">
              Forgot Password?
            </Link>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-lg bg-blue-800 hover:bg-blue-900 text-white font-medium disabled:opacity-50"
          >
            {isLoading ? "Memproses..." : "Masuk"}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-4 text-gray-500">atau</span>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full h-12 rounded-lg bg-blue-200 hover:bg-blue-300 text-blue-800 font-medium flex items-center justify-center gap-3 disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
          </svg>
          {isLoading ? "Memproses..." : "Masuk dengan Akun Google"}
        </Button>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Belum punya akun?{" "}
            <Link to="/signup" className="font-semibold text-blue-600 hover:underline">
              Daftar Sekarang
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 h-screen items-center justify-end p-0 bg-white">
        <img
          src="https://api.builder.io/api/v1/image/assets/TEMP/47deff871a056c6d8b24f4af0e03461085f838ae?width=800"
          alt="Student studying"
          className="w-[80%] h-full object-cover"
        />
      </div>
    </div>
  );
}
