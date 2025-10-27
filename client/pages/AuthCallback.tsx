import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log("🔄 Processing callback...");

        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (session) {
          console.log("✅ Session found:", session);

          // Check if user exists
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role, user_id')
            .eq('auth_id', session.user.id)
            .single();

          if (userError && userError.code === 'PGRST116') {
            // User not found, create new
            console.log("📝 Creating new user...");

            const { error: insertError } = await supabase
              .from('users')
              .insert({
                auth_id: session.user.id,
                email: session.user.email,
                nama_lengkap: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
                role: 'siswa',
                photo_profile: session.user.user_metadata?.avatar_url || null
              });

            if (insertError) throw insertError;

            navigate('/dashboard', { replace: true });
          } else if (userData) {
            // User exists
            const role = userData.role || 'siswa';

            if (role === 'admin') {
              navigate('/admin', { replace: true });
            } else {
              navigate('/dashboard', { replace: true });
            }
          }
        } else {
          console.log("❌ No session");
          navigate('/signin', { replace: true });
        }
      } catch (error: any) {
        console.error("❌ Callback error:", error);
        alert("Login gagal: " + error.message);
        navigate('/signin', { replace: true });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#E6F3FF] via-[#F0F7FF] to-[#F8FBFF]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#295782] mx-auto mb-4"></div>
        <p className="text-[#295782] font-medium">Memproses login...</p>
      </div>
    </div>
  );
}
