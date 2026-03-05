// client/pages/TryoutExam.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Flag } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import QuestionDisplay from '@/components/exam/QuestionDisplay';
import QuestionSidebar from '@/components/exam/QuestionSidebar';
import { useExamSession } from '@/hooks/useExamSession';

export default function TryoutExam() {
  const { tryoutId } = useParams<{ tryoutId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const sessionId = searchParams.get('session');
  const kategoriId = searchParams.get('kategori');

  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(true);

  // ✅ STATE ANTI-CHEAT
  const [cheatWarnings, setCheatWarnings] = useState(0);
  const MAX_WARNINGS = 3;

  // Get hook data (termasuk fungsi forceSync & submitExam)
  const {
    questions,
    currentIndex,
    setCurrentIndex,
    answers,
    saveAnswer,
    submitExam,
    forceSync, 
    isLoading,
    timeRemaining,
    tryoutId: examTryoutId,
    isSaving,
    isSubmitting,
    bookmarkedQuestions,
    saveBookmarks
  } = useExamSession(sessionId || '', kategoriId || undefined);

  // ✅ VERIFIKASI SESI
  useEffect(() => {
    const verifySessionAccess = async () => {
      if (!sessionId || !tryoutId) {
        toast.error('Session tidak valid');
        navigate(`/tryout/${tryoutId}/start`, { replace: true });
        return;
      }

      try {
        setIsVerifying(true);
        const { data: session, error } = await supabase
          .from('tryout_sessions')
          .select('status, tryout_id')
          .eq('id', sessionId)
          .single();

        if (error) {
          toast.error('Session tidak ditemukan');
          navigate(`/tryout/${tryoutId}/start`, { replace: true });
          return;
        }

        if (session.status === 'completed') {
          toast.error('Ujian ini sudah selesai.');
          navigate(`/tryout/${tryoutId}/result?session=${sessionId}`, { replace: true });
          return;
        }
        setIsVerifying(false);
      } catch (err) {
        toast.error('Terjadi kesalahan saat memuat ujian');
        navigate(`/tryout/${tryoutId}/start`, { replace: true });
      }
    };

    verifySessionAccess();
  }, [sessionId, tryoutId, navigate]);

  // ✅ FETCH USER INFO
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: userData } = await supabase
          .from('users')
          .select('nama_lengkap, username, photo_profile, user_id')
          .eq('auth_id', session.user.id)
          .single();
        setCurrentUser(userData);
      }
    } catch (err) {}
  };

  // ✅ FITUR ANTI-CHEAT: Deteksi Pindah Tab / Aplikasi
  useEffect(() => {
    if (!sessionId || isSubmitting || isVerifying || isLoading) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Siswa meninggalkan tab/layar ujian
        setCheatWarnings((prev) => {
          const newCount = prev + 1;
          if (newCount >= MAX_WARNINGS) {
            toast.error("🚨 PELANGGARAN FATAL! Ujian dikumpulkan paksa karena Anda berulang kali keluar dari layar ujian.", { duration: 8000 });
            submitExam(); // Kumpulkan paksa otomatis!
          } else {
            toast.error(`⚠️ PERINGATAN KECURANGAN (${newCount}/${MAX_WARNINGS})! Jangan tinggalkan halaman ujian atau nilai akan dibatalkan otomatis.`, {
              duration: 6000,
              icon: '👀'
            });
          }
          return newCount;
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [sessionId, isSubmitting, submitExam, isVerifying, isLoading]);


  // ✅ MENCEGAH CLOSE TAB TANPA SENGAJA
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isSubmitting) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isSubmitting]);

  const handleAnswerSelect = (answer: string) => {
    if (!currentQuestion) return;
    saveAnswer(currentQuestion.id, answer);
  };

  const currentQuestion = questions[currentIndex];

  const handleExit = async () => {
    try {
      console.log('💾 Syncing remaining answers before exit...');
      await forceSync();

      if (bookmarkedQuestions.length > 0) {
        await saveBookmarks(bookmarkedQuestions);
      }

      await supabase
        .from('tryout_sessions')
        .update({
          time_remaining: timeRemaining,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      toast.success('Progress tersimpan');
    } catch (err) {
      toast.error('Gagal menyimpan progress');
    }

    navigate(`/tryout/${tryoutId}/start`);
  };

  const handleToggleBookmark = async () => {
    let updated: number[];
    if (bookmarkedQuestions.includes(currentIndex)) {
      updated = bookmarkedQuestions.filter(q => q !== currentIndex);
      toast.success('Tanda soal dihapus');
    } else {
      updated = [...bookmarkedQuestions, currentIndex];
      toast.success('Soal ditandai');
    }
    await saveBookmarks(updated);
  };

  const handlePrevious = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex(currentIndex + 1);
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentIndex > 0) setCurrentIndex(currentIndex - 1);
      else if (e.key === 'ArrowRight' && currentIndex < questions.length - 1) setCurrentIndex(currentIndex + 1);
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, questions.length, setCurrentIndex]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!sessionId) return null;

  if (isVerifying || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#295782] mx-auto"></div>
          <p className="mt-4 text-gray-600">{isVerifying ? 'Memverifikasi akses...' : 'Memuat soal...'}</p>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Soal tidak ditemukan</p>
      </div>
    );
  }

  return (
    // ✅ FITUR ANTI-CHEAT: Blokir Kursor (select-none) dan Klik Kanan/Copy-Paste
    <div 
      className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50/30 to-white select-none"
      onContextMenu={(e) => e.preventDefault()} // Blokir klik kanan
      onCopy={(e) => e.preventDefault()} // Blokir Copy
      onPaste={(e) => e.preventDefault()} // Blokir Paste
      onCut={(e) => e.preventDefault()} // Blokir Cut
    >
      <Header
        userName={currentUser?.username || currentUser?.nama_lengkap || 'User'}
        userPhoto={currentUser?.photo_profile}
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-12 py-6">
        {/* Peringatan Tampil jika ada pelanggaran */}
        {cheatWarnings > 0 && (
          <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-sm flex justify-between items-center animate-pulse">
            <div>
              <p className="font-bold">⚠️ Sistem Pengawas Aktif!</p>
              <p className="text-sm">Anda telah terdeteksi meninggalkan halaman sebanyak <strong>{cheatWarnings} kali</strong>. Jika mencapai {MAX_WARNINGS} kali, ujian otomatis dihentikan.</p>
            </div>
          </div>
        )}

        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={handleExit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-medium">Keluar</span>
            </button>

            <div>
              <h1 className="text-2xl font-medium text-gray-800 mb-2">Ujian/Tes</h1>
              <p className="text-lg font-medium text-[#4A90E2]">Soal {currentIndex + 1} dari {questions.length}</p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-lg text-gray-700">
            <span className="font-medium">Waktu Tersisa:</span>
            <span className="font-mono text-xl font-bold">{formatTime(timeRemaining)}</span>
          </div>
        </div>

        <div className="sm:hidden mb-4 flex items-center gap-2 text-base text-gray-700">
          <span className="font-medium">Waktu Tersisa:</span>
          <span className="font-mono text-lg font-bold">{formatTime(timeRemaining)}</span>
        </div>

        <div className="flex flex-col lg:flex-row gap-5">
          <div className="flex-1">
            <QuestionDisplay
              question={currentQuestion}
              selectedAnswer={answers[currentQuestion.id]}
              onAnswerSelect={handleAnswerSelect}
              isSaving={isSaving}
            />

            <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col sm:flex-row justify-between gap-4">
              {currentIndex > 0 && (
                <button
                  onClick={handlePrevious}
                  disabled={isSubmitting}
                  className="rounded-xl border-2 border-[#4A90E2] text-[#4A90E2] hover:bg-blue-50 px-6 py-2.5 font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Sebelumnya</span>
                </button>
              )}

              {currentIndex === 0 && <div></div>}

              {currentIndex < questions.length - 1 ? (
                <button
                  onClick={handleNext}
                  disabled={isSubmitting}
                  className="rounded-xl bg-[#295782] hover:bg-[#1e3f5f] text-white px-8 py-2.5 font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span>Selanjutnya</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={() => setShowSubmitConfirm(true)}
                  disabled={isSubmitting}
                  className="rounded-xl bg-[#00A63E] hover:bg-[#009038] text-white px-10 py-2.5 font-medium shadow-md transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Mengumpulkan...' : 'Selesai'}
                </button>
              )}
            </div>
          </div>

          <div className="lg:w-64">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
              <button
                onClick={handleToggleBookmark}
                disabled={isSubmitting}
                className={`w-full mb-6 px-4 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 font-medium disabled:opacity-50 ${
                  bookmarkedQuestions.includes(currentIndex) ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-gray-700 hover:bg-gray-800 text-white'
                }`}
              >
                <Flag size={18} className={bookmarkedQuestions.includes(currentIndex) ? 'fill-current' : ''} />
                {bookmarkedQuestions.includes(currentIndex) ? 'Batal Tandai Soal' : 'Tandai Soal'}
              </button>

              <div className="grid grid-cols-5 gap-2 mb-6">
                {questions.map((question, index) => {
                  const isAnswered = !!answers[question.id];
                  const isCurrent = index === currentIndex;
                  const isBookmarked = bookmarkedQuestions.includes(index);

                  return (
                    <button
                      key={question.id}
                      onClick={() => setCurrentIndex(index)}
                      disabled={isSubmitting}
                      className={`aspect-square rounded-lg font-bold text-sm transition-all disabled:opacity-50 ${
                        isCurrent ? 'ring-2 ring-[#295782] ring-offset-2' : ''
                      } ${
                        isBookmarked
                          ? 'bg-gray-500 text-white hover:bg-gray-600'
                          : isAnswered
                          ? 'bg-[#295782] text-white hover:bg-[#1e3f5f]'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2.5 text-xs">
                <p className="font-semibold text-gray-700 mb-3">Keterangan:</p>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[#295782]"></div>
                  <span className="text-gray-600">Sudah dijawab</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-gray-500"></div>
                  <span className="text-gray-600">Soal ditandai</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showSubmitConfirm && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => !isSubmitting && setShowSubmitConfirm(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Kumpulkan Jawaban?</h3>
              <p className="text-gray-600 mb-4">
                Jawaban Anda akan dikumpulkan dan nilai akan dihitung. Setelah dikumpulkan, Anda akan diarahkan ke halaman hasil.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                ⚠️ Soal terjawab: {Object.keys(answers).length}/{questions.length}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSubmitConfirm(false)}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={submitExam}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-[#00A63E] text-white rounded-xl hover:bg-[#009038] font-medium transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Mengumpulkan...' : 'Ya, Kumpulkan'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <QuestionSidebar
        show={showSidebar}
        questions={questions}
        answers={answers}
        currentIndex={currentIndex}
        bookmarkedQuestions={bookmarkedQuestions}
        onQuestionSelect={setCurrentIndex}
        onClose={() => setShowSidebar(false)}
      />
    </div>
  );
}