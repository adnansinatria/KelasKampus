import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Play, Clock, FileText, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import toast from 'react-hot-toast';
import Header from '@/components/Header';
import SubtestList from '@/components/tryout/SubtestList';
import TargetSelectionModal from '@/components/tryout/TargetSelectionModal';
import { api } from '@/lib/api';
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

  // Auto-open modal if no target selected
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

  const handleStartTryout = async (kategoriKode?: string) => {
    console.log('╔════════════════════════════════════╗');
    console.log('║   START TRYOUT - DEBUG INFO       ║');
    console.log('╚════════════════════════════════════╝');
    console.log('📋 kategoriKode received:', kategoriKode);

    if (!targetInfo) {
      toast.error('Pilih kampus dan jurusan terlebih dahulu!');
      setShowTargetModal(true);
      return;
    }

    try {
      setIsStarting(true);

      console.log('👤 Target Info:', targetInfo);
      console.log('✅ kategoriKode to use:', kategoriKode || 'NULL (all categories)');

      // ✅ CHANGED: Use API call instead of direct Supabase query
      console.log('🚀 Calling API to create session...');
      
      const sessionResponse = await api.createSession({
        tryout_id: tryoutId!,
        kategori_id: kategoriKode,
        target_kampus: targetInfo.kampusName,
        target_jurusan: targetInfo.prodiName,
      });

      console.log('✅ Session API Response:', sessionResponse);

      // ✅ NEW: Handle response from API
      if (!sessionResponse?.session_id) {
        throw new Error('Failed to create session - no session_id returned');
      }

      const sessionId = sessionResponse.session_id;
      console.log('✅ Session ID from API:', sessionId);

      // Navigate to exam page
      const params = new URLSearchParams();
      params.set('session', sessionId);
      if (kategoriKode) params.set('kategori', kategoriKode);

      console.log('🚀 Navigating to exam with params:', params.toString());
      console.log('╔════════════════════════════════════╗');
      console.log('║   END START TRYOUT - DEBUG        ║');
      console.log('╚════════════════════════════════════╝\n');

      navigate(`/tryout/${tryoutId}/exam?${params.toString()}`);

    } catch (err: any) {
      console.error('❌ Error in handleStartTryout:', err);
      toast.error(err.message || 'Gagal memulai tryout');
    } finally {
      setIsStarting(false);
    }
  };

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
          <div className="lg:col-span-2">
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

            {/* Start Button */}
            <button
              onClick={() => {
                // Cari subkategori pertama yang belum completed
                let firstIncompleteKategori: string | null = null;
                
                // Loop berdasarkan urutan kelompok
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
                } else {
                  toast.error('Semua subtest sudah diselesaikan!');
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

            {/* Warning message */}
            {!targetInfo && (
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
