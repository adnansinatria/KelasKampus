// client/pages/TryoutRecommendations.tsx

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trophy, TrendingUp, TrendingDown, Target, AlertTriangle, CheckCircle2, School, Users, ChartBar, Home } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import toast from 'react-hot-toast';

// ... (Interface ProdiWithKampus & RecommendationData TETAP SAMA) ...
interface ProdiWithKampus {
  id: number;
  nama_prodi: string;
  passing_grade_histories: string;
  keketatan: string;
  daya_tampung: number;
  peminat_tahun_lalu: number;
  kampus: { id: number; nama_kampus: string; };
}

interface RecommendationData {
  userScore: number;
  targetKampus: string;
  targetProdi: string;
  targetData: ProdiWithKampus | null;
  isQualified: boolean;
  scoreDifference: number;
  recommendation: string;
  alternatives: ProdiWithKampus[];
}

export default function TryoutRecommendations() {
  const { tryoutId } = useParams<{ tryoutId: string }>();
  const navigate = useNavigate();
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<RecommendationData | null>(null);
  const [tryoutName, setTryoutName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCurrentUser();
    fetchRecommendations();
  }, [tryoutId]);

  const fetchCurrentUser = async () => {
    // ... (SAMA) ...
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: userData } = await supabase.from('users').select('user_id, nama_lengkap, username, photo_profile').eq('auth_id', session.user.id).single();
        setCurrentUser(userData);
      }
    } catch (err) { console.error('Error fetching user:', err); }
  };

  const fetchRecommendations = async () => {
    try {
      setIsLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Not authenticated');

      const { data: userData } = await supabase.from('users').select('user_id').eq('auth_id', session.user.id).single();
      if (!userData) throw new Error('User not found');

      const { data: tryout } = await supabase.from('tryouts').select('nama_tryout').eq('id', tryoutId).single();
      if (tryout) setTryoutName(tryout.nama_tryout);

      const { data: userTarget } = await supabase.from('user_targets').select('kampus_name, prodi_name').eq('tryout_id', tryoutId).eq('user_id', userData.user_id).single();
      if (!userTarget) throw new Error('Target kampus belum dipilih');

      // ✅ Fetch sesi yang SUDAH SELESAI
      const { data: sessionData } = await supabase
        .from('tryout_sessions')
        .select('id, irt_theta, percentage_score')
        .eq('tryout_id', tryoutId)
        .eq('user_id', userData.user_id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false }) // Ambil yang terbaru
        .limit(1)
        .single();

      // ✅ VALIDASI AKSES: Jika nilai belum keluar, lempar balik ke Waiting Room
      if (!sessionData || sessionData.irt_theta === null) {
        console.warn('⚠️ Nilai belum keluar, redirecting...');
        toast('Hasil sedang dinilai, mohon tunggu sebentar.', { icon: '⏳' });
        // Redirect ke halaman result (yang punya fitur auto-refresh)
        navigate(`/tryout/${tryoutId}/result?session=${sessionData?.id}`);
        return;
      }

      // ✅ FIX SKOR 1000: Gunakan IRT Theta dari server
      // Kita perlu konversi Theta (-3 s.d +3) ke skala UTBK (0-1000) agar kompatibel dengan passing grade
      // Rumus konversi standar: Mean 500, SD 100
      // Score = 500 + (theta * 100)
      const theta = sessionData.irt_theta;
      let utbkScore = 500 + (theta * 100);
      utbkScore = Math.max(0, Math.min(1000, Math.round(utbkScore))); // Clamp 0-1000

      console.log('🎯 Theta:', theta, 'Converted Score:', utbkScore);

      // Gunakan utbkScore untuk logika selanjutnya
      const userScore = utbkScore; 

      // ... (Sisa logika fetch kampus/prodi SAMA PERSIS dengan sebelumnya) ...
      // Copy-paste dari file lama mulai dari "Fetch target kampus data"
      // HANYA GANTI variabel di atas.
      
      const { data: targetKampusData } = await supabase.from('kampus').select('id, nama_kampus').eq('nama_kampus', userTarget.kampus_name).single();
      if (!targetKampusData) throw new Error('Target kampus tidak ditemukan');

      const { data: targetProdiData, error: targetError } = await supabase.from('program_studi').select('*').eq('kampus_id', targetKampusData.id).eq('nama_prodi', userTarget.prodi_name).single();
      if (targetError || !targetProdiData) throw new Error('Target prodi tidak ditemukan');

      const targetProdiWithKampus: ProdiWithKampus = {
        id: targetProdiData.id,
        nama_prodi: targetProdiData.nama_prodi,
        passing_grade_histories: targetProdiData.passing_grade_histories,
        keketatan: targetProdiData.keketatan || 'Sedang',
        daya_tampung: targetProdiData.daya_tampung || 100,
        peminat_tahun_lalu: targetProdiData.peminat_tahun_lalu || 1000,
        kampus: { id: targetKampusData.id, nama_kampus: targetKampusData.nama_kampus }
      };

      const { data: allKampus } = await supabase.from('kampus').select('id, nama_kampus');
      const kampusMap = new Map(allKampus?.map(k => [k.id, k.nama_kampus]) || []);

      const { data: alternativesData } = await supabase.from('program_studi').select('*').order('passing_grade_histories', { ascending: false }).limit(20);

      const filteredAlternatives: ProdiWithKampus[] = alternativesData
        ?.filter(alt => {
          const pgMin = parseFloat(alt.passing_grade_histories || '0');
          return userScore >= pgMin && !(alt.kampus_id === targetKampusData.id && alt.nama_prodi === userTarget.prodi_name);
        })
        .map(alt => ({
          id: alt.id,
          nama_prodi: alt.nama_prodi,
          passing_grade_histories: alt.passing_grade_histories,
          keketatan: alt.keketatan || 'Sedang',
          daya_tampung: alt.daya_tampung || 100,
          peminat_tahun_lalu: alt.peminat_tahun_lalu || 1000,
          kampus: { id: alt.kampus_id, nama_kampus: kampusMap.get(alt.kampus_id) || 'Unknown' }
        }))
        .slice(0, 4) || [];

      const recoData = generateRecommendation(userScore, userTarget.kampus_name, userTarget.prodi_name, targetProdiWithKampus, filteredAlternatives);
      setRecommendations(recoData);

    } catch (error: any) {
      console.error('❌ Error fetching recommendations:', error);
      toast.error(error.message || 'Gagal memuat rekomendasi');
    } finally {
      setIsLoading(false);
    }
  };

  // ❌ HAPUS FUNGSI calculateScore LAMA (Sudah diganti logika server)

  const generateRecommendation = (
    userScore: number,
    targetKampus: string,
    targetProdi: string,
    targetData: ProdiWithKampus | null,
    alternatives: ProdiWithKampus[]
  ): RecommendationData => {
    // ... (SAMA) ...
    const passingGradeMin = targetData ? parseFloat(targetData.passing_grade_histories) : 0;
    const isQualified = userScore >= passingGradeMin;
    const scoreDifference = userScore - passingGradeMin;

    let recommendation = '';
    if (!targetData) {
      recommendation = 'Data passing grade untuk kampus ini belum tersedia.';
    } else if (isQualified) {
      if (scoreDifference >= 50) recommendation = `Selamat! Skor Anda ${scoreDifference.toFixed(0)} poin di atas passing grade. Peluang diterima sangat besar! 🎉`;
      else if (scoreDifference >= 20) recommendation = `Bagus! Skor Anda ${scoreDifference.toFixed(0)} poin di atas passing grade. Pertahankan performa ini!`;
      else recommendation = `Skor Anda sudah memenuhi syarat, namun hanya ${scoreDifference.toFixed(0)} poin di atas passing grade. Tingkatkan lagi untuk lebih aman.`;
    } else {
      const gap = Math.abs(scoreDifference);
      recommendation = `Skor Anda masih ${gap.toFixed(0)} poin di bawah passing grade. Fokus belajar intensif untuk meningkatkan skor!`;
    }

    return { userScore, targetKampus, targetProdi, targetData, isQualified, scoreDifference, recommendation, alternatives };
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#295782]"></div></div>;

  if (!recommendations) return null; // Should redirect before this

  // ... (RETURN JSX SAMA PERSIS DENGAN SEBELUMNYA) ...
  // Silakan copy-paste bagian return JSX dari file sebelumnya
  const { userScore, targetKampus, targetProdi, targetData, isQualified, scoreDifference, recommendation, alternatives } = recommendations;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e6f3ff] via-[#f8fbff] to-white">
      <Header userName={currentUser?.username || currentUser?.nama_lengkap || 'User'} userPhoto={currentUser?.photo_profile} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => navigate(`/tryout/${tryoutId}/result`)} className="flex items-center gap-2 text-[#62748e] hover:text-[#295782] mb-6 transition-colors"><ArrowLeft className="w-4 h-4" /><span className="text-sm font-medium">Kembali ke Hasil</span></button>
        <div className="mb-8"><h1 className="text-3xl font-bold text-[#1d293d] mb-2">Rekomendasi Kampus & Prodi</h1><p className="text-[#62748e]">{tryoutName}</p></div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-r from-[#295782] to-[#1e4060] rounded-2xl shadow-lg p-6 text-white"><div className="flex items-center gap-3 mb-4"><Trophy className="w-8 h-8" /><h3 className="text-lg font-semibold">Skor UTBK Anda</h3></div><div className="text-5xl font-bold mb-2">{userScore}</div><p className="text-sm opacity-80">Dari 1000 poin maksimal (Estimasi IRT)</p></div>
          <div className="bg-white rounded-2xl shadow-sm p-6 border-2 border-[#295782]"><div className="flex items-center gap-3 mb-4"><School className="w-8 h-8 text-[#295782]" /><h3 className="text-lg font-semibold text-[#1d293d]">Target Kampus</h3></div><div className="text-2xl font-bold text-[#295782] mb-1">{targetKampus}</div><div className="text-lg text-[#62748e]">{targetProdi}</div></div>
        </div>

        {targetData && (
          <div className={`rounded-2xl shadow-lg p-6 mb-8 ${isQualified ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300' : 'bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300'}`}>
            <div className="flex items-start gap-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 ${isQualified ? 'bg-green-500' : 'bg-orange-500'}`}>{isQualified ? <CheckCircle2 className="w-8 h-8 text-white" /> : <AlertTriangle className="w-8 h-8 text-white" />}</div>
              <div className="flex-1">
                <h3 className={`text-2xl font-bold mb-2 ${isQualified ? 'text-green-800' : 'text-orange-800'}`}>{isQualified ? 'Selamat! Anda Memenuhi Syarat' : 'Belum Memenuhi Syarat'}</h3>
                <p className={`text-lg mb-4 ${isQualified ? 'text-green-700' : 'text-orange-700'}`}>{recommendation}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white bg-opacity-50 rounded-xl p-4">
                  <div><p className="text-xs text-gray-600 mb-1">Passing Grade</p><p className="text-2xl font-bold text-[#1d293d]">{parseFloat(targetData.passing_grade_histories).toFixed(0)}</p></div>
                  <div><p className="text-xs text-gray-600 mb-1">Selisih Skor</p><div className="flex items-center gap-2">{scoreDifference >= 0 ? <TrendingUp className="w-5 h-5 text-green-600" /> : <TrendingDown className="w-5 h-5 text-red-600" />}<p className={`text-2xl font-bold ${scoreDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>{scoreDifference > 0 ? '+' : ''}{scoreDifference.toFixed(0)}</p></div></div>
                  <div><p className="text-xs text-gray-600 mb-1">Tingkat Keketatan</p><p className="text-lg font-bold text-[#1d293d]">{targetData.keketatan}</p></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Alternative & Action Plan sections (Same as before) */}
        {/* Copy paste sisa JSX dari file lama */}
         {alternatives.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
            <div className="flex items-center gap-3 mb-6"><Target className="w-6 h-6 text-[#295782]" /><h3 className="text-xl font-bold text-[#1d293d]">Pilihan Alternatif</h3></div>
            <div className="space-y-4">
              {alternatives.map((alt, index) => {
                const altPG = parseFloat(alt.passing_grade_histories);
                const selisih = userScore - altPG;
                return (
                  <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 hover:shadow-md transition-all">
                    <div className="flex-1"><h4 className="font-bold text-[#295782] text-lg">{alt.kampus.nama_kampus}</h4><p className="text-gray-700">{alt.nama_prodi}</p><div className="flex items-center gap-4 mt-2 text-sm"><span className="text-gray-600">Passing Grade: <strong className="text-[#295782]">{altPG.toFixed(0)}</strong></span><span className={`font-semibold ${alt.keketatan === 'Sangat Ketat' ? 'text-red-600' : alt.keketatan === 'Ketat' ? 'text-orange-600' : alt.keketatan === 'Sedang' ? 'text-yellow-600' : 'text-green-600'}`}>• {alt.keketatan}</span></div></div>
                    <div className="text-right"><div className="text-2xl font-bold text-green-600">+{selisih.toFixed(0)}</div><p className="text-xs text-gray-500">poin di atas</p></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl p-6 mb-8">
          <h3 className="text-xl font-bold text-purple-800 mb-4">Rencana Aksi</h3>
          <div className="space-y-3">
             <div className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" /><p className="text-gray-700">Pertahankan performa dengan tryout rutin</p></div>
             <div className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" /><p className="text-gray-700">Pelajari soal-soal UTBK tahun sebelumnya</p></div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button onClick={() => navigate('/tryout')} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border-2 border-[#295782] text-[#295782] rounded-xl font-semibold hover:bg-blue-50 transition-colors"><Target className="w-5 h-5" />Coba Tryout Lain</button>
          <button onClick={() => navigate('/dashboard')} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#295782] text-white rounded-xl font-semibold hover:bg-[#1e3f5f] transition-colors shadow-md"><Home className="w-5 h-5" />Kembali ke Dashboard</button>
        </div>
      </div>
    </div>
  );
}