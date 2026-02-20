// client/pages/TryoutStart.tsx - REFACTORED VERSION
// ✅ Implementasi Conditional UI State dan Auto-Refresh pada Window Focus

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Play, Clock, FileText, Calendar, CheckCircle, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import toast from 'react-hot-toast';
import Header from '@/components/Header';
import SubtestList from '@/components/tryout/SubtestList';
import TargetSelectionModal from '@/components/tryout/TargetSelectionModal';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
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

  // ✅ Auto-refresh data saat window mendapat fokus kembali
  useEffect(() => {
    const handleWindowFocus = () => {
      console.log('🔄 Window focused, refreshing data...');
      refreshData();
    };

    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, [refreshData]);

  // ✅ FIX #3: Gunakan ref agar interval hanya dibuat SEKALI.
  // Sebelumnya: deps [isLoading, tryout, refreshData] menyebabkan interval di-reset setiap kali
  // refreshData dipanggil (isLoading jadi true → false → effect re-run → timer mulai dari nol lagi).
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const refreshDataRef = useRef(refreshData);

  // Selalu sinkronkan ref ke fungsi refreshData terbaru tanpa memicu re-run effect
  useEffect(() => {
    refreshDataRef.current = refreshData;
  }, [refreshData]);

  // Setup interval hanya sekali saat mount, cleanup saat unmount
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      console.log('🔄 Auto-refreshing data (30s interval)...');
      refreshDataRef.current();
    }, 30000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []); // ← deps kosong, interval tidak pernah di-reset

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
    if (!targetInfo) {
      toast.error('Pilih kampus dan jurusan terlebih dahulu!');
      setShowTargetModal(true);
      return;
    }

    try {
      setIsStarting(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      // Cari session terakhir yang statusnya in_progress/purchased
      const { data: existingSession, error: sessionError } = await supabase
        .from('tryout_sessions')
        .select('id, status')
        .eq('tryout_id', tryoutId)
        .eq('user_id', currentUser?.user_id)
        .in('status', ['in_progress', 'purchased']) 
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      let sessionId = existingSession?.id;

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

      // Navigasi ke Ujian
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

  // ✅ Handler untuk melihat hasil (jika sudah completed)
  const handleViewResult = async () => {
    try {
      setIsStarting(true);
      
      // Ambil session yang sudah completed
      const { data: sessions, error } = await supabase
        .from('tryout_sessions')
        .select('id')
        .eq('tryout_id', tryoutId)
        .eq('user_id', currentUser?.user_id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !sessions?.id) {
        throw new Error('Session hasil tidak ditemukan');
      }

      // Navigate ke result page
      navigate(`/tryout/${tryoutId}/result?session=${sessions.id}`);
      
    } catch (err: any) {
      console.error('❌ Error viewing result:', err);
      toast.error(err.message || 'Gagal membuka hasil');
    } finally {
      setIsStarting(false);
    }
  };

  // ✅ Handler untuk lanjutkan tryout (jika masih in_progress)
  const handleContinueTryout = async () => {
    try {
      setIsStarting(true);
      
      // Ambil session yang masih in_progress
      const { data: sessions, error } = await supabase
        .from('tryout_sessions')
        .select('id')
        .eq('tryout_id', tryoutId)
        .eq('user_id', currentUser?.user_id)
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !sessions?.id) {
        throw new Error('Session tidak ditemukan');
      }

      // Navigate ke exam page
      const params = new URLSearchParams();
      params.set('session', sessions.id);
      navigate(`/tryout/${tryoutId}/exam?${params.toString()}`);
      
    } catch (err: any) {
      console.error('❌ Error continuing tryout:', err);
      toast.error(err.message || 'Gagal melanjutkan tryout');
    } finally {
      setIsStarting(false);
    }
  };

  // ✅ CRITICAL: Determine button state berdasarkan progress
  const getButtonState = () => {
    const progressValues = Object.values(progressData);
    
    // Cek apakah ada session yang in_progress
    const hasInProgress = progressValues.some(p => p.status === 'in_progress');
    
    // Cek apakah semua subtest completed
    const allCompleted = progressValues.length > 0 && 
                        progressValues.every(p => p.status === 'completed');
    
    if (allCompleted) {
      return {
        type: 'view_result',
        label: 'Lihat Hasil',
        icon: <Eye className="w-5 h-5" />,
        action: handleViewResult,
        gradient: 'from-green-500 to-emerald-600'
      };
    }
    
    if (hasInProgress) {
      return {
        type: 'continue',
        label: 'Lanjutkan Tryout',
        icon: <Play className="w-5 h-5" />,
        action: handleContinueTryout,
        gradient: 'from-[#295782] to-[#1e4060]'
      };
    }
    
    return {
      type: 'start',
      label: 'Mulai Tryout',
      icon: <Play className="w-5 h-5" />,
      action: () => {
        // Cari subtest pertama yang belum dikerjakan
        let firstIncompleteKategori: string | null = null;
        
        const kelompokOrder = ['TPS', 'Literasi', 'Matematika', 'Sains', 'Sosial'];
        
        for (const kelompok of kelompokOrder) {
          const kategorisInGroup = groupedKategoris[kelompok];
          if (!kategorisInGroup) continue;
          
          const sortedKategoris = [...kategorisInGroup].sort((a, b) => a.urutan - b.urutan);
          
          for (const kategori of sortedKategoris) {
            const progress = progressData[kategori.id];
            
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
      },
      gradient: 'from-[#295782] to-[#1e4060]'
    };
  };

  const buttonState = getButtonState();

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

            {/* ✅ CONDITIONAL ACTION BUTTON */}
            <button
              onClick={buttonState.action}
              disabled={isStarting || (!targetInfo && buttonState.type === 'start')}
              className={`w-full py-4 rounded-xl text-base font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${
                targetInfo || buttonState.type !== 'start'
                  ? `bg-gradient-to-r ${buttonState.gradient} text-white hover:shadow-xl disabled:opacity-50`
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isStarting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Memproses...
                </>
              ) : (
                <>
                  {buttonState.icon}
                  {buttonState.label}
                </>
              )}
            </button>

            {/* Warning message */}
            {!targetInfo && buttonState.type === 'start' && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
                <p className="text-xs text-orange-600 font-medium">
                  ⚠️ Pilih kampus dan program studi terlebih dahulu
                </p>
              </div>
            )}

            {/* Status Info */}
            {buttonState.type === 'view_result' && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-green-600 font-semibold">
                  ✅ Semua subtest telah selesai!
                </p>
              </div>
            )}

            {buttonState.type === 'continue' && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-blue-600 font-semibold">
                  📝 Tryout sedang berlangsung
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