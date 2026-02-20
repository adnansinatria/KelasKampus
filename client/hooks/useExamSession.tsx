// client/hooks/useExamSession.tsx - REFACTORED VERSION
// ✅ Implementasi Atomic Submission Logic dengan Cache Invalidation

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface Question {
  id: string;
  soal_text: string;
  opsi_a: string;
  opsi_b: string;
  opsi_c: string;
  opsi_d: string;
  urutan: number;
  jawaban_benar: string;
  image_url?: string | null;
  difficulty?: number;
  discrimination?: number;
}

export function useExamSession(sessionId: string, kategoriId?: string) {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [tryoutId, setTryoutId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // ✅ FIX #2: Ref sebagai guard utama — tidak masuk dependency array useCallback.
  // Jika isSubmitting (state) dipakai di deps, submitExamLogic dibuat ulang saat submission
  // dimulai → handleAutoSubmit ikut dibuat ulang → timer effect restart → timer loncat detik.
  const isSubmittingRef = useRef(false);

  // ✅ 1. Update Timer (Periodic Sync)
  const updateTimer = useCallback(async (time: number) => {
    try {
      if (time % 10 === 0) console.log('⏱️ Updating timer:', time);
      await api.updateTimer(sessionId, time);
    } catch (error) {
      console.error('❌ Error updating timer:', error);
    }
  }, [sessionId]);

  // ✅ 2. ATOMIC SUBMISSION LOGIC (Server-Side dengan Cache Invalidation)
  const submitExamLogic = useCallback(async () => {
    // ✅ FIX #2: Guard pakai ref bukan state, agar tidak menyebabkan deps berubah
    if (isSubmittingRef.current) {
      console.log('⚠️ Submission already in progress, skipping...');
      return;
    }

    try {
      isSubmittingRef.current = true; // ← set ref SEBELUM set state
      setIsSubmitting(true);
      setIsSaving(true);
      
      console.log('📤 Starting atomic submission process...');

      // STEP 1: Update status ke 'completed' di database
      console.log('1️⃣ Updating session status to completed...');
      const { error: updateError } = await supabase
        .from('tryout_sessions')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (updateError) {
        console.error('❌ Error updating session status:', updateError);
        throw updateError;
      }
      console.log('✅ Session status updated to completed');

      // STEP 2: Hitung skor IRT via server-side Edge Function
      // ✅ FIX: IRT calculation bersifat non-blocking.
      // Jika Edge Function return 400/500, submission TETAP berhasil dan
      // user tetap diarahkan ke result. Cek Supabase Edge Function Logs
      // untuk root cause error IRT yang sebenarnya.
      console.log('2️⃣ Calculating IRT score on server...');
      try {
        await api.calculateIRTScoreServer(sessionId);
        console.log('✅ IRT score calculated successfully');
      } catch (irtError: any) {
        console.error('⚠️ IRT calculation failed (non-fatal):', irtError?.message);
        console.warn('⚠️ Cek Supabase Dashboard → Edge Functions → calculate-irt → Logs');
        // Tidak throw — submission tetap lanjut
      }

      // STEP 3: CRITICAL - Clear global cache untuk memastikan data segar
      console.log('3️⃣ Clearing global cache...');
      api.clearCache();
      console.log('✅ Global cache cleared - Dashboard & TryoutList will be fresh');

      toast.success('Ujian berhasil dikumpulkan!');

      // STEP 4: Navigate dengan { replace: true } untuk membersihkan navigation stack
      console.log('4️⃣ Navigating to result page...');
      navigate(`/tryout/${tryoutId}/result?session=${sessionId}`, { 
        replace: true // ✅ CRITICAL: Prevent back navigation to exam page
      });
      
    } catch (error: any) {
      console.error('❌ Error submitting exam:', error);
      toast.error(error.message || 'Gagal mengumpulkan jawaban. Silakan coba lagi.');
      
      // Rollback status jika gagal
      try {
        await supabase
          .from('tryout_sessions')
          .update({ status: 'in_progress' })
          .eq('id', sessionId);
        console.log('↩️ Session status rolled back to in_progress');
      } catch (rollbackError) {
        console.error('❌ Error rolling back status:', rollbackError);
      }
    } finally {
      isSubmittingRef.current = false; // ← selalu reset ref
      setIsSaving(false);
      setIsSubmitting(false);
    }
  // ✅ FIX #2: isSubmitting TIDAK ada di deps — guard pakai ref, bukan state
  }, [sessionId, tryoutId, navigate]);

  // ✅ 3. Auto Submit Handler (Saat Waktu Habis)
  const handleAutoSubmit = useCallback(async () => {
    console.log('⏰ Time expired. Auto-submitting...');
    await submitExamLogic();
  }, [submitExamLogic]);

  // ✅ 4. Timer Effect dengan Auto-Submit
  useEffect(() => {
    if (timeRemaining > 0 && !isLoading && !isSubmitting) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1;
          
          // Update timer setiap 30 detik
          if (newTime % 30 === 0) {
            updateTimer(newTime);
          }
          
          // Auto-submit saat waktu habis
          if (newTime <= 0) {
            handleAutoSubmit();
            return 0;
          }
          
          return newTime;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeRemaining, isLoading, isSubmitting, updateTimer, handleAutoSubmit]);

  // ✅ 5. Fetch Session Data
  const fetchSessionData = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Fetching session data for:', sessionId);

      const sessionResponse = await api.getSession(sessionId);
      const sessionData = sessionResponse?.data || sessionResponse;

      if (!sessionData) throw new Error('Session data not found');

      // Validasi status sesi
      if (sessionData.status === 'completed') {
        console.log('⚠️ Session already completed, redirecting...');
        toast.error('Ujian ini sudah selesai.');
        navigate(`/tryout/${sessionData.tryout_id}/result?session=${sessionId}`, { 
          replace: true 
        });
        return;
      }

      setTryoutId(sessionData.tryout_id);
      setTimeRemaining(sessionData.time_remaining || 0);

      const questionsResponse = await api.getQuestions(sessionId);
      const questionData = questionsResponse?.questions || questionsResponse;

      if (Array.isArray(questionData)) {
        const questionsWithData = questionData.map((q: any) => ({
          id: q.id,
          soal_text: q.soal_text,
          opsi_a: q.opsi_a,
          opsi_b: q.opsi_b,
          opsi_c: q.opsi_c,
          opsi_d: q.opsi_d,
          urutan: q.urutan,
          jawaban_benar: q.jawaban_benar,
          image_url: q.image_url || null,
          difficulty: q.difficulty || 0,
          discrimination: q.discrimination || 1.0
        }));

        setQuestions(questionsWithData);
        console.log(`✅ Questions loaded: ${questionsWithData.length} (IRT Ready)`);
      }

      const answersData = questionsResponse?.answers || {};
      setAnswers(answersData);
      
      const bookmarksData = questionsResponse?.bookmarked_questions || [];
      setBookmarkedQuestions(Array.isArray(bookmarksData) ? bookmarksData : []);

    } catch (error) {
      console.error('❌ Error fetching session data:', error);
      toast.error('Gagal memuat soal ujian.');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, navigate]);

  useEffect(() => {
    if (sessionId) {
      fetchSessionData();
    }
  }, [sessionId, fetchSessionData]);

  // ✅ 6. Save Answer (IRT Optimized)
  const saveAnswer = useCallback(async (questionId: string, answer: string) => {
    try {
      // Optimistic Update UI
      setAnswers(prev => ({ ...prev, [questionId]: answer }));
      setIsSaving(true);

      const currentQuestion = questions.find(q => String(q.id) === String(questionId));
      
      if (!currentQuestion) {
        console.warn('⚠️ Soal tidak ditemukan di state lokal');
        return;
      }

      const isCorrect = answer === currentQuestion.jawaban_benar;

      // Save ke tabel 'student_responses' via API
      await api.saveAnswerIRT({
        session_id: sessionId,
        question_id: questionId,
        selected_answer: answer,
        is_correct: isCorrect,
        question_difficulty: currentQuestion.difficulty || 0,
        question_discrimination: currentQuestion.discrimination || 1.0,
      });

      console.log(`✅ Progress tersimpan: Soal ${questionId} = ${answer}`);

    } catch (error) {
      console.error('❌ Error saving answer:', error);
      toast.error('Gagal menyimpan jawaban. Cek koneksi internet.');
      
      // Rollback jika gagal
      setAnswers(prev => {
        const updated = { ...prev };
        delete updated[questionId];
        return updated;
      });
    } finally {
      setIsSaving(false);
    }
  }, [sessionId, questions]);

  // ✅ 7. Save Bookmarks
  const saveBookmarks = useCallback(async (bookmarks: number[]) => {
    try {
      setBookmarkedQuestions(bookmarks);
      await api.saveBookmarks(sessionId, bookmarks);
      console.log('✅ Bookmarks saved:', bookmarks);
    } catch (error) {
      console.error('❌ Error saving bookmarks:', error);
    }
  }, [sessionId]);

  // ✅ 8. Public Submit Function (Wrapper)
  const submitExam = useCallback(async () => {
    await submitExamLogic();
  }, [submitExamLogic]);

  return {
    questions,
    currentIndex,
    setCurrentIndex,
    answers,
    saveAnswer,
    submitExam,
    isLoading,
    timeRemaining,
    tryoutId,
    isSaving,
    isSubmitting,
    bookmarkedQuestions,
    saveBookmarks
  };
}