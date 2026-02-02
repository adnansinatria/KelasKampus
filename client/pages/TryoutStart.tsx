import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Play, Clock, FileText, Calendar, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import toast from 'react-hot-toast';
import Header from '@/components/Header';
import SubtestList from '@/components/tryout/SubtestList';
import TargetSelectionModal from '@/components/tryout/TargetSelectionModal';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase'; // ✅ Import supabase
import { useTryoutData } from '@/hooks/useTryoutData';

export default function TryoutStart() {
  const { tryoutId } = useParams<{ tryoutId: string }>();
  const navigate = useNavigate();
  
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  
  const {
    tryout,
    groupedKategoris,
    progressData,
    currentUser,
    targetInfo,
    isLoading,
    refreshData
  } = useTryoutData(tryoutId!);

  useEffect(() => {
    if (!isLoading && !targetInfo) {
      setShowTargetModal(true);
    }
  }, [isLoading, targetInfo]);

  useEffect(() => {
    if (!isLoading && tryout) {
      refreshData();
    }
  }, []);

  // Di dalam components/pages/TryoutStart.tsx

  const handleStartTryout = async (kategoriKode?: string) => {
    if (!targetInfo) {
      toast.error('Pilih kampus dan jurusan terlebih dahulu!');
      setShowTargetModal(true);
      return;
    }

    try {
      setIsStarting(true);
      
      // 1. Cek apakah sudah ada session aktif (hasil beli token tadi)
      const { data: { user } } = await supabase.auth.getUser();
      
      // Cari session terakhir yang statusnya in_progress/purchased
      const { data: existingSession, error: sessionError } = await supabase
        .from('tryout_sessions')
        .select('id')
        .eq('tryout_id', tryoutId)
        .eq('user_id', currentUser?.user_id) // Pastikan currentUser sudah ada user_id
        .in('status', ['in_progress', 'purchased']) 
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      let sessionId = existingSession?.id;

      // 2. Jika Session ada (Skenario Normal Beli Pakai Token) -> UPDATE TARGETNYA
      if (sessionId) {
        console.log('✅ Menggunakan session yang sudah dibeli:', sessionId);
        
        // Update target kampus & jurusan ke session tersebut
        const { error: updateError } = await supabase
            .from('tryout_sessions')
            .update({
                target_kampus: targetInfo.kampusName,
                target_jurusan: targetInfo.prodiName,
                status: 'in_progress' 
            })
            .eq('id', sessionId);
            
        if (updateError) throw updateError;
        
      } else {
        console.log('⚠️ Session belum ada, membuat baru...');
        const sessionResponse = await api.createSession({
            tryout_id: tryoutId!,
            kategori_id: kategoriKode,
            target_kampus: targetInfo.kampusName,
            target_jurusan: targetInfo.prodiName,
        });
        sessionId = sessionResponse?.session_id;
      }

      if (!sessionId) throw new Error('Gagal mendapatkan Session ID');

      // 4. Navigasi ke Ujian
      const params = new URLSearchParams();
      params.set('session', sessionId);
      if (kategoriKode) params.set('kategori', kategoriKode);

      navigate(`/tryout/${tryoutId}/exam?${params.toString()}`);

    } catch (err: any) {
      console.error('❌ Error starting tryout:', err);
      toast.error(err.message || 'Gagal memulai tryout');
    } finally {
      setIsStarting(false);
    }
  };

  // ✅ NEW: Handler untuk submit final setelah semua subtest selesai
  const handleSubmitFinal = async () => {
    try {
      setIsStarting(true);
      
      // ✅ Cek apakah ada subtest yang belum selesai
      const incompleteSub = Object.values(progressData).find(
        (p) => p.status !== 'completed'
      );
      
      if (incompleteSub) {
        toast.error('Selesaikan semua subtest terlebih dahulu!');
        setIsStarting(false);
        return;
      }

      toast.loading('Mengkalkulasi hasil akhir...');
      
      // ✅ Submit tryout (ambil session ID dari subtest mana saja yang sudah completed)
      const { data: sessions, error } = await supabase
        .from('tryout_sessions')
        .select('id')
        .eq('tryout_id', tryoutId)
        .eq('user_id', currentUser?.user_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !sessions?.id) {
        throw new Error('Session tidak ditemukan');
      }

      // ✅ Submit tryout via API
      await api.submitTryout(sessions.id);

      toast.dismiss();
      toast.success('Tryout berhasil diselesaikan!');
      
      // ✅ Navigate ke result
      navigate(`/tryout/${tryoutId}/result?session=${sessions.id}`);
      
    } catch (err: any) {
      console.error('❌ Error submitting final:', err);
      toast.dismiss();
      toast.error(err.message || 'Gagal submit tryout');
    } finally {
      setIsStarting(false);
    }
  };

  // ✅ Cek apakah semua subtest sudah selesai
  const allSubtestsCompleted = Object.keys(progressData).length > 0 && Object.values(progressData).every(
    (p) => p.status === 'completed'
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#e6f3ff] via-[#f8fbff] to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#89b0c7] mx-auto mb-4"></div>
          <p className="text-[#62748e] font-medium">Memuat detail tryout...</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (!tryout) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#e6f3ff] via-[#f8fbff] to-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <p className="text-lg text-[#1d293d] font-semibold mb-4">Tryout tidak ditemukan</p>
            <button
              onClick={() => navigate('/tryout')}
              className="px-6 py-3 bg-gradient-to-r from-[#295782] to-[#89b0c7] text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              Kembali ke Daftar Tryout
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e6f3ff] via-[#f8fbff] to-white">
      <Header 
        userName={currentUser?.username || currentUser?.nama_lengkap || 'User'}
        userPhoto={currentUser?.photo_profile}
      />

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/tryout')}
          className="flex items-center gap-2 text-[#62748e] hover:text-[#295782] mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Kembali ke Daftar Tryout</span>
        </button>

        {/* Title Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1d293d] mb-2">{tryout.nama_tryout}</h1>
          <div className="flex items-center gap-4 text-sm text-[#62748e]">
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {format(new Date(tryout.tanggal_ujian), 'd MMMM yyyy', { locale: idLocale })}
            </span>
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {tryout.durasi_menit} menit
            </span>
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Total soal per subtest
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Subtest List */}
          <div className="lg:col-span-2 space-y-6">
            <SubtestList
              groupedKategoris={groupedKategoris}
              progressData={progressData}
              onStartSubtest={handleStartTryout}
              canStart={!!targetInfo}
              isStarting={isStarting}
            />
          </div>

          {/* Right Column - Info & Actions */}
          <div className="space-y-6">
            {/* Target Info Card */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-[#1d293d]">Target Kampus & Jurusan</h2>
                <button
                  onClick={() => setShowTargetModal(true)}
                  className="text-xs text-[#295782] hover:underline font-medium"
                >
                  {targetInfo ? 'Ubah' : 'Pilih'}
                </button>
              </div>
              
              {targetInfo ? (
                <div className="space-y-2">
                  <div className="bg-gradient-to-r from-[#e6f3ff] to-[#f8fbff] rounded-lg p-3">
                    <p className="text-xs text-[#62748e] mb-1">Kampus Target</p>
                    <p className="text-sm font-semibold text-[#1d293d]">{targetInfo.kampusName}</p>
                  </div>
                  <div className="bg-gradient-to-r from-[#e6f3ff] to-[#f8fbff] rounded-lg p-3">
                    <p className="text-xs text-[#62748e] mb-1">Program Studi</p>
                    <p className="text-sm font-semibold text-[#1d293d]">{targetInfo.prodiName}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
                  <p className="text-sm text-orange-600 font-medium mb-2">
                    ⚠️ Belum memilih target
                  </p>
                  <button
                    onClick={() => setShowTargetModal(true)}
                    className="text-xs text-orange-600 hover:underline font-medium"
                  >
                    Klik untuk memilih →
                  </button>
                </div>
              )}
            </div>

            {/* Info Card */}
            <div className="bg-gradient-to-br from-[#295782] to-[#89b0c7] rounded-2xl shadow-lg p-6 text-white">
              <h3 className="text-lg font-bold mb-3">Informasi Penting</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-[#fbbf24]">✓</span>
                  <span>Koneksi internet stabil</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#fbbf24]">✓</span>
                  <span>Kerjakan dengan fokus</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#fbbf24]">✓</span>
                  <span>Timer otomatis berjalan</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#fbbf24]">✓</span>
                  <span>Jawaban tersimpan otomatis</span>
                </li>
              </ul>
            </div>

            {allSubtestsCompleted ? (
              <button
                onClick={handleSubmitFinal}
                disabled={isStarting}
                className="w-full py-4 rounded-xl text-base font-bold shadow-lg transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isStarting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Memproses...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Lihat Hasil Akhir
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() => {
                  let firstIncompleteKategori: string | null = null;
                  
                  const kelompokOrder = ['TPS', 'Literasi', 'Matematika', 'Sains', 'Sosial'];
                  
                  for (const kelompok of kelompokOrder) {
                    const kategorisInGroup = groupedKategoris[kelompok];
                    if (!kategorisInGroup) continue;
                    
                    // Sort by urutan
                    const sortedKategoris = [...kategorisInGroup].sort((a, b) => a.urutan - b.urutan);
                    
                    for (const kategori of sortedKategoris) {
                      const progress = progressData[kategori.id];
                      
                      // Cek apakah belum completed
                      if (!progress || progress.status !== 'completed') {
                        firstIncompleteKategori = kategori.id;
                        break;
                      }
                    }
                    
                    if (firstIncompleteKategori) break;
                  }
                  
                  if (firstIncompleteKategori) {
                    console.log('Starting first incomplete kategori:', firstIncompleteKategori);
                    handleStartTryout(firstIncompleteKategori);
                  }
                }}
                disabled={isStarting || !targetInfo}
                className={`w-full py-4 rounded-xl text-base font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${
                  targetInfo
                    ? 'bg-gradient-to-r from-[#295782] to-[#1e4060] text-white hover:shadow-xl'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isStarting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Memulai...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Mulai Tryout
                  </>
                )}
              </button>
            )}

            {/* Warning message */}
            {!targetInfo && !allSubtestsCompleted && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
                <p className="text-xs text-orange-600 font-medium">
                  ⚠️ Pilih kampus dan program studi terlebih dahulu
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Target Selection Modal */}
      <TargetSelectionModal
        show={showTargetModal}
        onClose={() => setShowTargetModal(false)}
        tryoutId={tryoutId!}
        onSuccess={() => {
          setShowTargetModal(false);
          refreshData();
        }}
      />
    </div>
  );
}