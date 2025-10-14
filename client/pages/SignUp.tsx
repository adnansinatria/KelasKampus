// Path: src/pages/SignUp.tsx

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Mail, Eye, EyeOff } from "lucide-react";
import { useGoogleLogin } from "@react-oauth/google";

export default function SignUp() {
  const navigate = useNavigate();

  // --- State Management ---
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  // --- Handlers & Validation ---
  const validatePassword = (pass: string) => {
    const errors: string[] = [];
    if (pass.length < 6) errors.push("Minimal 6 karakter.");
    if (!/\d/.test(pass)) errors.push("Harus mengandung angka.");
    if (!/[A-Z]/.test(pass)) errors.push("Harus ada huruf kapital.");
    return errors;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setPasswordErrors(newPassword ? validatePassword(newPassword) : []);
    setConfirmPasswordError(confirmPassword && newPassword !== confirmPassword ? "Password tidak cocok" : "");
  };
  
  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newConfirmPassword = e.target.value;
    setConfirmPassword(newConfirmPassword);
    setConfirmPasswordError(password !== newConfirmPassword ? "Password tidak cocok" : "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const currentPasswordErrors = validatePassword(password);
    if (currentPasswordErrors.length > 0) {
      setPasswordErrors(currentPasswordErrors);
      return;
    }
    if (password !== confirmPassword) {
      setConfirmPasswordError("Password tidak cocok");
      return;
    }

    setIsLoading(true);
    try {
      const payload = { 
        method: "signup-regular",
        email, 
        password, 
        nama_lengkap: name
      };

      // ====================================================================
      // PERUBAHAN: Menambahkan log untuk melihat data yang akan dikirim
      console.log("Mengirim data pendaftaran biasa:", payload);
      // ====================================================================

      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY!}`,
        },
        body: JSON.stringify(payload),
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Pendaftaran gagal");
      
      alert("Pendaftaran berhasil! Silakan periksa email Anda untuk konfirmasi, lalu login.");
      navigate("/signin");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Terjadi kesalahan saat pendaftaran");
    } finally {
      setIsLoading(false);
    }
  };

  // Logika untuk signup/login dengan Google
  const handleGoogleSuccess = async (codeResponse: any) => {
      console.log("Respons diterima dari Google OAuth:", codeResponse);
      setIsLoading(true);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/auth`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY!,
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY!}`,
            },
            body: JSON.stringify({ code: codeResponse.code, method: "google-login" }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || "Google Signin failed");
        
        const token = json?.data?.token;
        if(token) {
            localStorage.setItem('auth_token', token);
            navigate('/dashboard');
        } else {
            throw new Error("Login Google berhasil, tetapi token tidak ditemukan.");
        }
      } catch(err: any) {
        alert(err.message || "Gagal mendaftar dengan Google");
        setIsLoading(false);
      }
  };

  const signUpWithGoogle = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: (error) => console.error("Google Login Gagal:", error),
    flow: 'auth-code',
  });

  return (
    <div className="w-screen h-screen flex">
      {/* Bagian Kiri - Form */}
      {/* PERBAIKAN DESAIN: Mengganti lg:w-12 menjadi lg:w-1/2 */}
      <div className="w-full lg:w-1/2 flex flex-col justify-start px-8 lg:px-16 pt-6 pb-[100px] min-h-screen overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
            <div className="w-3 h-3 bg-white rounded-full"></div>
          </div>
          <span className="text-lg font-semibold text-black">KelasKampus</span>
        </div>

        {/* Heading */}
        <div className="mb-8 min-h-[66px] flex flex-col justify-center">
          <h1 className="text-4xl font-bold text-black mb-2">Selamat Datang</h1>
          <p className="text-gray-600">Daftar Sekarang untuk Mematangkan Persiapan SNBT</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          <div className="relative">
            <Input
              type="text" placeholder="Masukkan Nama" value={name} onChange={(e) => setName(e.target.value)} disabled={isLoading}
              className="h-12 rounded-lg border border-gray-300 pl-10 text-sm placeholder:text-gray-400" required
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
          </div>

          <div className="relative">
            <Input
              type="email" placeholder="Masukkan Email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading}
              className="h-12 rounded-lg border border-gray-300 pl-10 text-sm placeholder:text-gray-400" required
            />
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>

          <div>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"} placeholder="Masukkan Password" value={password} onChange={handlePasswordChange} disabled={isLoading}
                className={`h-12 rounded-lg border ${passwordErrors.length > 0 ? 'border-red-500' : 'border-gray-300'} pl-10 pr-10 text-sm placeholder:text-gray-400`} required
              />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}
              </div>
            </div>
            {passwordErrors.length > 0 && (
              <ul className="text-xs text-red-500 mt-1 pl-1 list-disc list-inside">
                {passwordErrors.map(error => <li key={error}>{error}</li>)}
              </ul>
            )}
          </div>
          
          <div>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"} placeholder="Konfirmasi Password" value={confirmPassword} onChange={handleConfirmPasswordChange} disabled={isLoading}
                className={`h-12 rounded-lg border ${confirmPasswordError ? 'border-red-500' : 'border-gray-300'} pl-10 pr-10 text-sm placeholder:text-gray-400`} required
              />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                {showConfirmPassword ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}
              </div>
            </div>
            {confirmPasswordError && <p className="text-xs text-red-500 mt-1 pl-1">{confirmPasswordError}</p>}
          </div>

          <Button type="submit" disabled={isLoading} className="w-full h-12 rounded-lg bg-blue-800 hover:bg-blue-900 text-white font-medium disabled:opacity-50">
            {isLoading ? "Memproses..." : "Daftar"}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div>
          <div className="relative flex justify-center text-sm"><span className="bg-white px-4 text-gray-500">atau</span></div>
        </div>

        <Button
          type="button"
          onClick={() => signUpWithGoogle()}
          disabled={isLoading}
          className="w-full h-12 rounded-lg bg-blue-200 hover:bg-blue-300 text-blue-800 font-medium flex items-center justify-center gap-3 disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
          </svg>
          Daftar dengan Akun Google
        </Button>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Sudah punya akun?{" "}
            <Link to="/signin" className="font-semibold text-blue-600 hover:underline">
              Masuk Sekarang
            </Link>
          </p>
        </div>
      </div>

      {/* Bagian Kanan - Gambar */}
      <div className="hidden lg:flex lg:w-1/2 h-screen items-center justify-end p-0 bg-white">
        <img src="https://api.builder.io/api/v1/image/assets/TEMP/47deff871a056c6d8b24f4af0e03461085f838ae?width=800" alt="Student studying" className="w-[80%] h-full object-cover"/>
      </div>
    </div>
  );
}