import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Play, Clock, Calendar, Eye, Lock, Loader2, AlertTriangle } from 'lucide-react';
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
  const [globalProgress, setGlobalProgress] = useState<any>(null);
  const [isProgressLoading, setIsProgressLoading] = useState(true); 

  const [now, setNow] = useState(new Date());
  
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
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleWindowFocus = () => refreshData();
    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, [refreshData]);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const refreshDataRef = useRef(refreshData);

  useEffect(() => {
    refreshDataRef.current = refreshData;
  }, [refreshData]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      refreshDataRef.current();
    }, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isLoading && !targetInfo) setShowTargetModal(true);
  }, [isLoading, targetInfo]);

  useEffect(() => {
    if (tryoutId) {
      setIsProgressLoading(true);
      api.getUserProgress(tryoutId)
        .then(res => setGlobalProgress(res))
        .catch(() => console.log("Progress not found"))
        .finally(() => setIsProgressLoading(false)); 
    }
  }, [tryoutId]);

  const formatCountdown = (targetDate: Date) => {
    const diff = targetDate.getTime() - now.getTime();
    if (diff <= 0) return null;
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStartTryout = async (kategoriKode?: string) => {
    const currentState = getButtonState();
    if (currentState.type === 'locked' || currentState.type === 'view_result') {
      toast.error('Akses Tryout ditutup atau sudah selesai!');
      return;
    }

    if (!targetInfo) {
      toast.error('Pilih kampus dan jurusan terlebih dahulu!');
      setShowTargetModal(true);
      return;
    }

    try {
      setIsStarting(true);
      const { data: existingSession } = await supabase
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
        await supabase.from('tryout_sessions').update({
            target_kampus: targetInfo.kampusName,
            target_jurusan: targetInfo.prodiName,
            status: 'in_progress' 
        }).eq('id', sessionId);
      } else {
        const sessionResponse = await api.createSession({
            tryout_id: tryoutId!,
            kategori_id: kategoriKode,
            target_kampus: targetInfo.kampusName,
            target_jurusan: targetInfo.prodiName,
        });
        sessionId = sessionResponse?.session_id;
      }

      if (!sessionId) throw new Error('Gagal mendapatkan Session ID');
      const params = new URLSearchParams();
      params.set('session', sessionId);
      if (kategoriKode) params.set('kategori', kategoriKode);
      navigate(`/tryout/${tryoutId}/exam?${params.toString()}`);

    } catch (err: any) {
      toast.error(err.message || 'Gagal memulai tryout');
    } finally {
      setIsStarting(false);
    }
  };

  const handleViewResult = () => {
    const sessionId = globalProgress?.session_id;
    if (sessionId) navigate(`/tryout/${tryoutId}/result?session=${sessionId}`);
  };

  const getButtonState = () => {
    if (isProgressLoading) {
      return { type: 'locked', label: 'Memeriksa Data...', icon: <Loader2 className="w-5 h-5 animate-spin" />, disabled: true, gradient: 'from-gray-400 to-gray-500' };
    }

    const openDate = tryout?.open_date ? new Date(tryout.open_date) : null;
    const closeDate = tryout?.close_date ? new Date(tryout.close_date) : null;
    const overallStatus = globalProgress?.status || 'not_started';
    const isScoring = overallStatus === 'completed' && !tryout?.is_result_published;

    if (isScoring) {
      return { type: 'locked', label: 'Sedang Dinilai...', icon: <Clock className="w-5 h-5" />, disabled: true, gradient: 'from-orange-400 to-orange-500' };
    }
    if (overallStatus === 'completed') {
      return { type: 'view_result', label: 'Lihat Hasil', icon: <Eye className="w-5 h-5" />, action: handleViewResult, gradient: 'from-green-500 to-emerald-600' };
    }

    if (openDate && now < openDate) {
      return { type: 'locked', label: `Buka dalam: ${formatCountdown(openDate)}`, icon: <Lock className="w-5 h-5" />, disabled: true, gradient: 'from-gray-400 to-gray-500' };
    }
    
    if (closeDate && now > closeDate) {
      return { type: 'locked', label: 'Waktu Habis', icon: <Lock className="w-5 h-5" />, disabled: true, gradient: 'from-red-400 to-red-500' };
    }

    const progressValues = Object.values(progressData);
    const hasInProgress = progressValues.some(p => p.status === 'in_progress');
    
    if (hasInProgress || overallStatus === 'in_progress') {
      return { type: 'continue', label: 'Lanjutkan Tryout', icon: <Play className="w-5 h-5" />, action: () => handleStartTryout(), gradient: 'from-[#295782] to-[#1e4060]' };
    }
    
    return {
      type: 'start',
      label: 'Mulai Tryout',
      icon: <Play className="w-5 h-5" />,
      action: () => {
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
        if (firstIncompleteKategori) handleStartTryout(firstIncompleteKategori);
        else handleStartTryout();
      },
      gradient: 'from-[#295782] to-[#1e4060]'
    };
  };

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

  if (!tryout) return null;

  const buttonState = getButtonState();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e6f3ff] via-[#f8fbff] to-white">
      <Header userName={currentUser?.username || currentUser?.nama_lengkap || 'User'} userPhoto={currentUser?.photo_profile} />

      <div className="max-w-6xl mx-auto px-6 py-8">
        <button onClick={() => navigate('/tryout')} className="flex items-center gap-2 text-[#62748e] hover:text-[#295782] mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Kembali ke Daftar Tryout</span>
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1d293d] mb-2">{tryout.nama_tryout}</h1>
          <div className="flex items-center gap-4 text-sm text-[#62748e]">
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {tryout.open_date ? format(new Date(tryout.open_date), 'd MMM yyyy, HH:mm', { locale: idLocale }) : format(new Date(tryout.tanggal_ujian), 'd MMMM yyyy', { locale: idLocale })}
            </span>
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {tryout.durasi_menit} menit
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <SubtestList
              groupedKategoris={groupedKategoris}
              progressData={progressData}
              onStartSubtest={handleStartTryout}
              canStart={!!targetInfo && !isProgressLoading && (buttonState.type === 'start' || buttonState.type === 'continue')}
              isStarting={isStarting}
            />
          </div>

          <div className="space-y-6">
            {/* Target Card */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-[#1d293d]">Target Kampus & Jurusan</h2>
                <button onClick={() => setShowTargetModal(true)} className="text-xs text-[#295782] hover:underline font-medium">
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
                  <p className="text-sm text-orange-600 font-medium mb-2">⚠️ Belum memilih target</p>
                  <button onClick={() => setShowTargetModal(true)} className="text-xs text-orange-600 hover:underline font-medium">Klik untuk memilih →</button>
                </div>
              )}
            </div>

            {/* Info Card */}
            <div className="bg-gradient-to-br from-[#295782] to-[#89b0c7] rounded-2xl shadow-lg p-6 text-white">
              <h3 className="text-lg font-bold mb-3">Informasi Penting</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2"><span className="text-[#fbbf24]">✓</span><span>Koneksi internet stabil</span></li>
                <li className="flex items-start gap-2"><span className="text-[#fbbf24]">✓</span><span>Timer otomatis berjalan</span></li>
                <li className="flex items-start gap-2"><span className="text-[#fbbf24]">✓</span><span>Tidak bisa mengulang jika disubmit</span></li>
              </ul>
            </div>

            {/* ✅ NEW: Warning Anti-Cheat Card (Muncul saat tombol siap ditekan) */}
            {(buttonState.type === 'start' || buttonState.type === 'continue') && (
              <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-4 shadow-sm animate-fade-in">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-red-800 mb-1">Sistem Pengawas Aktif!</h3>
                    <ul className="text-xs text-red-700 space-y-1 list-disc pl-4">
                      <li>Dilarang pindah tab browser atau membuka aplikasi lain.</li>
                      <li>Fitur Klik Kanan & Copy-Paste dimatikan.</li>
                      <li>Jika melanggar batas peringatan, <strong>ujian dikumpulkan paksa.</strong></li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* ACTION BUTTON DENGAN TIMER & LOADING STATE */}
            <button
              onClick={buttonState.action}
              disabled={isStarting || buttonState.disabled || (!targetInfo && buttonState.type === 'start')}
              className={`w-full py-4 rounded-xl text-base font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${
                targetInfo || buttonState.type !== 'start'
                  ? `bg-gradient-to-r ${buttonState.gradient} text-white hover:shadow-xl disabled:opacity-80`
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isStarting ? (
                <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> Memproses...</>
              ) : (
                <>{buttonState.icon} {buttonState.label}</>
              )}
            </button>

            {/* Warning Message Disembunyikan Saat Loading Database */}
            {!targetInfo && buttonState.type === 'start' && !isProgressLoading && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
                <p className="text-xs text-orange-600 font-medium">
                  ⚠️ Pilih kampus dan program studi terlebih dahulu
                </p>
              </div>
            )}

          </div>
        </div>
      </div>

      <TargetSelectionModal
        show={showTargetModal}
        onClose={() => setShowTargetModal(false)}
        tryoutId={tryoutId!}
        onSuccess={() => { setShowTargetModal(false); refreshData(); }}
      />
    </div>
  );
}