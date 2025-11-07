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

  // ✅ Get hook data
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
    bookmarkedQuestions,
    saveBookmarks
  } = useExamSession(sessionId || '', kategoriId || undefined);

  // ✅ Fetch current user (with empty dependency array)
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: userData } = await supabase
          .from('users')
          .select('nama_lengkap, username, photo_profile')
          .eq('auth_id', session.user.id)
          .single();
        setCurrentUser(userData);
      }
    } catch (err) {
      console.error('Error fetching user:', err);
    }
  };

  // Redirect if no session
  useEffect(() => {
    if (!sessionId) {
      toast.error('Session tidak valid');
      navigate(`/tryout/${tryoutId}/start`);
    }
  }, [sessionId, navigate, tryoutId]);

  // Auto-submit when time is up
  useEffect(() => {
    if (timeRemaining === 0 && questions.length > 0) {
      handleAutoSubmit();
    }
  }, [timeRemaining, questions.length]);

  const handleAutoSubmit = async () => {
    toast.error('Waktu habis! Tryout akan disubmit otomatis.');
    try {
      await submitExam();
      navigate(`/tryout/${tryoutId}/result?session=${sessionId}`);
    } catch (err) {
      console.error('Auto submit error:', err);
    }
  };

  const handleManualSubmit = async () => {
    try {
      await submitExam();
      toast.success('Tryout berhasil disubmit!');
      navigate(`/tryout/${tryoutId}/start`);
    } catch (err) {
      toast.error('Gagal submit tryout');
    }
  };

  // ✅ FIXED: Save bookmarks before exit
  const handleExit = async () => {
    console.log('🚪 Exit button clicked');

    try {
      // ✅ Save bookmarks DULU sebelum exit
      if (bookmarkedQuestions.length > 0) {
        console.log('💾 Saving bookmarks before exit:', bookmarkedQuestions);
        await saveBookmarks(bookmarkedQuestions);
      }

      // ✅ Then save time remaining
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

    // Navigate back to TryoutStart
    navigate(`/tryout/${tryoutId}/start`);
  };

  // ✅ FIXED: Toggle bookmark with async
  const handleToggleBookmark = async () => {
    let updated: number[];

    if (bookmarkedQuestions.includes(currentIndex)) {
      updated = bookmarkedQuestions.filter(q => q !== currentIndex);
      toast.success('Tanda soal dihapus');
    } else {
      updated = [...bookmarkedQuestions, currentIndex];
      toast.success('Soal ditandai');
    }

    // Save to backend via API
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

  // Get current question
  const currentQuestion = questions[currentIndex];

  // Handle answer select
  const handleAnswerChange = (answer: string) => {
    if (currentQuestion) {
      saveAnswer(currentQuestion.id, answer);
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

  // Prevent accidental page close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Guard: Return null while redirecting
  if (!sessionId) {
    return null;
  }

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
      {/* Header Component dengan User Info */}
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
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
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
              onAnswerSelect={handleAnswerChange}
              isSaving={false}
            />

            {/* Navigation Buttons */}
            <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col sm:flex-row justify-between gap-4">
              {/* Tombol Sebelumnya - Hanya muncul jika bukan soal pertama */}
              {currentIndex > 0 && (
                <button
                  onClick={handlePrevious}
                  className="rounded-xl border-2 border-[#4A90E2] text-[#4A90E2] hover:bg-blue-50 px-6 py-2.5 font-medium transition-colors flex items-center justify-center gap-2"
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

              {/* Spacer untuk menjaga posisi tombol kanan */}
              {currentIndex === 0 && <div></div>}

              {/* Tombol Selanjutnya atau Selesai */}
              {currentIndex < questions.length - 1 ? (
                <button
                  onClick={handleNext}
                  className="rounded-xl bg-[#295782] hover:bg-[#1e3f5f] text-white px-8 py-2.5 font-medium transition-colors flex items-center justify-center gap-2"
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
                  className="rounded-xl bg-[#00A63E] hover:bg-[#009038] text-white px-10 py-2.5 font-medium shadow-md transition-colors"
                >
                  Selesai
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
                className={`w-full mb-6 px-4 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 font-medium ${
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
                      className={`aspect-square rounded-lg font-bold text-sm transition-all ${
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
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setShowSubmitConfirm(false)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold mb-4">Konfirmasi Selesai</h3>
              <p className="text-gray-600 mb-2">
                Apakah kamu yakin ingin mengakhiri tryout? Pastikan semua jawaban
                sudah benar.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                ⚠️ Soal terjawab: {Object.keys(answers).length}/{questions.length}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowSubmitConfirm(false)}
                  className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-medium transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleManualSubmit}
                  className="flex-1 px-4 py-2.5 bg-[#00A63E] text-white rounded-xl hover:bg-[#009038] font-medium transition-colors"
                >
                  Ya, Selesai
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
