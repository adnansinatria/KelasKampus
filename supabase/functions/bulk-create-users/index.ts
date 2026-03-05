// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: any) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // WAJIB PAKAI SERVICE ROLE KEY untuk bypass keamanan
    const supabaseAdmin = createClient(
      Deno.env.get('https://deyapfmewmrjvqopwhuh.supabase.co') ?? '',
      Deno.env.get('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRleWFwZm1ld21yanZxb3B3aHVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA4MDAxMSwiZXhwIjoyMDc0NjU2MDExfQ.AD-3IOA0DVey0GNwar0hXXSh3QZhALaQdrEUkdTv9_E') ?? '' 
    );
    
    // Menerima array data siswa dari Frontend Admin
    const { users } = await req.json(); 

    if (!users || !Array.isArray(users)) {
      throw new Error("Data users tidak valid");
    }

    const results = [];
    
    for (const u of users) {
      // 1. Buat Akun Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: u.email,
        password: 'Siswa123!',
        email_confirm: true,
        user_metadata: { 
          nama_lengkap: u.nama_lengkap,
          role: 'siswa'
        }
      });

      if (authError) {
        results.push({ email: u.email, status: 'error', message: authError.message });
        continue; 
      }

      // 2. Tunggu 1.5 detik agar trigger DB selesai membuat row di public.users
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 3. Ambil `user_id` asli dari tabel public.users berdasarkan `auth_id`
      const { data: publicUser, error: fetchError } = await supabaseAdmin
        .from('users')
        .select('user_id')
        .eq('auth_id', authData.user.id)
        .single();

      if (!publicUser || fetchError) {
        results.push({ email: u.email, status: 'warning', message: 'Akun login berhasil dibuat, tapi gagal sinkronisasi tabel users' });
        continue;
      }

      // 4. Suntikkan Token ke tabel `users`
      const { error: tokenError } = await supabaseAdmin
        .from('users')
        .update({ tokens: parseInt(u.tokens) || 1 })
        .eq('user_id', publicUser.user_id);

      // 5. Cek apakah row di tabel `siswa` sudah dibuat otomatis oleh trigger
      const { data: existingSiswa } = await supabaseAdmin
        .from('siswa')
        .select('user_id')
        .eq('user_id', publicUser.user_id)
        .maybeSingle();

      let siswaError = null;

      // 6. Masukkan / Update Asal Sekolah di tabel `siswa`
      if (existingSiswa) {
        const res = await supabaseAdmin
          .from('siswa')
          .update({ asal_sekolah: u.asal_sekolah || 'Sekolah Mitra' })
          .eq('user_id', publicUser.user_id);
        siswaError = res.error;
      } else {
        const res = await supabaseAdmin
          .from('siswa')
          .insert({ 
            user_id: publicUser.user_id, 
            asal_sekolah: u.asal_sekolah || 'Sekolah Mitra' 
          });
        siswaError = res.error;
      }

      // 7. Evaluasi Hasil Akhir
      if (tokenError || siswaError) {
        results.push({ email: u.email, status: 'warning', message: 'Akun terbuat tapi ada data yang gagal terisi (Token/Sekolah)' });
      } else {
        results.push({ email: u.email, status: 'success' });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});