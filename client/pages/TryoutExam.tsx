// client/pages/TryoutExam.tsx - REFACTORED VERSION
// ✅ Implementasi Server-Side Session Guard untuk mencegah akses ke completed exam

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
  const [isVerifying, setIsVerifying] = useState(true); // ✅ NEW: Loading state untuk verifikasi

  // Get hook data
  const {
    questions,
    currentIndex,
    setCurrentIndex,
    answers,
    saveAnswer,
    submitExam,
    isLoading,
    timeRemaining,
    tryoutId: examTryoutId,
    isSaving,
    isSubmitting,
    bookmarkedQuestions,
    saveBookmarks
  } = useExamSession(sessionId || '', kategoriId || undefined);

  // ✅ CRITICAL: Server-Side Session Guard (Navigation Protection)
  useEffect(() => {
    const verifySessionAccess = async () => {
      if (!sessionId || !tryoutId) {
        console.log('⚠️ Missing sessionId or tryoutId');
        toast.error('Session tidak valid');
        navigate(`/tryout/${tryoutId}/start`, { replace: true });
        return;
      }

      try {
        setIsVerifying(true);
        console.log('🔍 Verifying session access for:', sessionId);

        // Query langsung ke Supabase untuk cek status sesi
        const { data: session, error } = await supabase
          .from('tryout_sessions')
          .select('status, tryout_id')
          .eq('id', sessionId)
          .single();

        if (error) {
          console.error('❌ Error verifying session:', error);
          toast.error('Session tidak ditemukan');
          navigate(`/tryout/${tryoutId}/start`, { replace: true });
          return;
        }

        // ✅ CRITICAL CHECK: Jika status sudah 'completed', redirect paksa ke result
        if (session.status === 'completed') {
          console.log('⚠️ Session already completed, redirecting to result...');
          toast.error('Ujian ini sudah selesai.');
          navigate(`/tryout/${tryoutId}/result?session=${sessionId}`, { 
            replace: true // ✅ Prevent back navigation
          });
          return;
        }

        // ✅ Session valid dan masih in_progress
        console.log('✅ Session verified, status:', session.status);
        setIsVerifying(false);

      } catch (err) {
        console.error('❌ Error in session verification:', err);
        toast.error('Terjadi kesalahan saat memuat ujian');
        navigate(`/tryout/${tryoutId}/start`, { replace: true });
      }
    };

    verifySessionAccess();
  }, [sessionId, tryoutId, navigate]);

  // ✅ Fetch current user
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
    } catch (err) {
      console.error('Error fetching user:', err);
    }
  };

  // ✅ Prevent accidental page close
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
    if (!currentQuestion) {
      console.error('❌ No current question');
      return;
    }

    console.log('✅ Answer selected:', answer, 'for question ID:', currentQuestion.id);
    saveAnswer(currentQuestion.id, answer);
  };

  const currentQuestion = questions[currentIndex];

  const handleExit = async () => {
    console.log('🚪 Exit button clicked');

    try {
      if (bookmarkedQuestions.length > 0) {
        console.log('💾 Saving bookmarks before exit:', bookmarkedQuestions);
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
      console.error('Error saving progress:', err);
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
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, questions.length, setCurrentIndex]);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ✅ Guard: Return null while redirecting (prevent flicker)
  if (!sessionId) {
    return null;
  }

  // ✅ Show loading during verification (prevent showing exam content before verification)
  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#295782] mx-auto"></div>
          <p className="mt-4 text-gray-600">Memverifikasi akses...</p>
        </div>
      </div>
    );
  }

  // ✅ Loading state for questions
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#295782] mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat soal...</p>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Soal tidak ditemukan</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50/30 to-white">
      {/* Header Component */}
      <Header
        userName={currentUser?.username || currentUser?.nama_lengkap || 'User'}
        userPhoto={currentUser?.photo_profile}
      />

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-12 py-6">
        {/* Title and Timer Section with Exit Button */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            {/* Tombol Keluar */}
            <button
              onClick={handleExit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span className="font-medium">Keluar</span>
            </button>

            <div>
              <h1 className="text-2xl font-medium text-gray-800 mb-2">
                Ujian/Tes
              </h1>
              <p className="text-lg font-medium text-[#4A90E2]">
                Soal {currentIndex + 1} dari {questions.length}
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-lg text-gray-700">
            <span className="font-medium">Waktu Tersisa:</span>
            <span className="font-mono text-xl font-bold">
              {formatTime(timeRemaining)}
            </span>
          </div>
        </div>

        {/* Mobile Timer */}
        <div className="sm:hidden mb-4 flex items-center gap-2 text-base text-gray-700">
          <span className="font-medium">Waktu Tersisa:</span>
          <span className="font-mono text-lg font-bold">
            {formatTime(timeRemaining)}
          </span>
        </div>

        {/* Question Card and Sidebar Layout */}
        <div className="flex flex-col lg:flex-row gap-5">
          {/* Main Question Area */}
          <div className="flex-1">
            <QuestionDisplay
              question={currentQuestion}
              selectedAnswer={answers[currentQuestion.id]}
              onAnswerSelect={handleAnswerSelect}
              isSaving={isSaving}
            />

            {/* Navigation Buttons */}
            <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col sm:flex-row justify-between gap-4">
              {/* Tombol Sebelumnya */}
              {currentIndex > 0 && (
                <button
                  onClick={handlePrevious}
                  disabled={isSubmitting}
                  className="rounded-xl border-2 border-[#4A90E2] text-[#4A90E2] hover:bg-blue-50 px-6 py-2.5 font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  <span>Sebelumnya</span>
                </button>
              )}

              {/* Spacer */}
              {currentIndex === 0 && <div></div>}

              {/* Tombol Selanjutnya atau Selesai */}
              {currentIndex < questions.length - 1 ? (
                <button
                  onClick={handleNext}
                  disabled={isSubmitting}
                  className="rounded-xl bg-[#295782] hover:bg-[#1e3f5f] text-white px-8 py-2.5 font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span>Selanjutnya</span>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
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

          {/* Right Sidebar - Question Navigator */}
          <div className="lg:w-64">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
              {/* Bookmark Button */}
              <button
                onClick={handleToggleBookmark}
                disabled={isSubmitting}
                className={`w-full mb-6 px-4 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 font-medium disabled:opacity-50 ${
                  bookmarkedQuestions.includes(currentIndex)
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-gray-700 hover:bg-gray-800 text-white'
                }`}
              >
                <Flag
                  size={18}
                  className={
                    bookmarkedQuestions.includes(currentIndex)
                      ? 'fill-current'
                      : ''
                  }
                />
                {bookmarkedQuestions.includes(currentIndex)
                  ? 'Batal Tandai Soal'
                  : 'Tandai Soal'}
              </button>

              {/* Question Grid */}
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

              {/* Legend */}
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

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => !isSubmitting && setShowSubmitConfirm(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Kumpulkan Jawaban?
              </h3>
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

      {/* Question Sidebar Modal (Mobile) */}
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