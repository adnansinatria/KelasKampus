import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log("🔄 Memproses callback login...");
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) throw error;
        if (!session) {
          navigate('/signin', { replace: true });
          return;
        }

        const { user } = session;

        // 1. Cek apakah user sudah ada di tabel public.users
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('auth_id', user.id)
          .single();

        // 2. Jika USER BARU (error PGRST116 berarti data tidak ditemukan)
        if (userError && userError.code === 'PGRST116') {
          console.log("📝 User baru terdeteksi, mendaftarkan ke database...");
          
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              auth_id: user.id,
              email: user.email,
              nama_lengkap: user.user_metadata?.full_name || user.user_metadata?.nama_lengkap || user.email?.split('@')[0],
              role: 'siswa',
              photo_profile: user.user_metadata?.avatar_url || null
            });

          if (insertError) {
            console.error("❌ Gagal mendaftarkan user baru:", insertError);
            throw insertError;
          }
        }

        // 3. Set token manual untuk mendukung logic Dashboard lama
        localStorage.setItem("auth_token", session.access_token);

        // 4. Redirect berdasarkan role (ambil role terbaru)
        const role = userData?.role || 'siswa';
        navigate(role === 'admin' ? '/admin' : '/dashboard', { replace: true });

      } catch (err) {
        console.error("❌ Callback error:", err);
        navigate('/signin', { replace: true });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#EFF6FB]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#295782] mx-auto mb-4"></div>
        <p className="text-[#295782]">Menyiapkan akun Anda...</p>
      </div>
    </div>
  );
}
