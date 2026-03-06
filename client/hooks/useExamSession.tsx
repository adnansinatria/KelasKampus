// client/hooks/useExamSession.tsx - BATCHING AUTOSAVE VERSION
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
  
  const isSubmittingRef = useRef(false);
  
  // ✅ Antrean Jawaban (Queue) untuk Batching
  const unsyncedQueue = useRef<Record<string, any>>({});

  const updateTimer = useCallback(async (time: number) => {
    try {
      if (time % 10 === 0) console.log('⏱️ Updating timer:', time);
      await api.updateTimer(sessionId, time);
    } catch (error) {
      console.error('❌ Error updating timer:', error);
    }
  }, [sessionId]);

  // ✅ Fungsi untuk mengirim borongan jawaban ke server (Flush)
  const forceSync = useCallback(async () => {
    const queueItems = Object.values(unsyncedQueue.current);
    if (queueItems.length === 0) return;

    // Salin dan kosongkan antrean agar tidak dikirim dua kali
    const itemsToSend = [...queueItems];
    unsyncedQueue.current = {}; 
    setIsSaving(true);

    try {
      console.log(`🔄 Batch Syncing ${itemsToSend.length} answers to database...`);
      // Kirim sekaligus
      await Promise.all(itemsToSend.map(item => api.saveAnswerIRT(item)));
      console.log(`✅ Batch Sync complete.`);
    } catch (error) {
      console.error('❌ Error in batch sync:', error);
      // Jika gagal, kembalikan ke antrean
      itemsToSend.forEach(item => {
        unsyncedQueue.current[item.question_id] = item;
      });
    } finally {
      // Matikan indikator saving hanya jika tidak ada antrean baru yang masuk saat proses sync
      if (Object.keys(unsyncedQueue.current).length === 0) {
        setIsSaving(false);
      }
    }
  }, []);

  // ✅ Interval Autosave setiap 10 Detik
  useEffect(() => {
    const syncInterval = setInterval(() => {
      forceSync();
    }, 10000); // 10 detik

    return () => clearInterval(syncInterval);
  }, [forceSync]);

  const submitExamLogic = useCallback(async () => {
    if (isSubmittingRef.current) {
      console.log('⚠️ Submission already in progress, skipping...');
      return;
    }

    try {
      isSubmittingRef.current = true; 
      setIsSubmitting(true);
      setIsSaving(true);
      
      console.log('📤 Starting atomic submission process...');

      // ✅ PASTIKAN SEMUA ANTREAN JAWABAN TERKIRIM SEBELUM SUBMIT
      console.log('0️⃣ Flushing remaining answers in queue...');
      await forceSync();

      console.log('1️⃣ Updating session status to completed...');
      const { error: updateError } = await supabase
        .from('tryout_sessions')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;
      console.log('✅ Session status updated to completed');

      console.log('2️⃣ Calculating IRT score on server...');
      try {
        await api.calculateIRTScoreServer(sessionId);
        console.log('✅ IRT score calculated successfully');
      } catch (irtError: any) {
        console.error('⚠️ IRT calculation failed (non-fatal):', irtError?.message);
      }

      console.log('3️⃣ Clearing global cache...');
      api.clearCache();

      toast.success('Ujian berhasil dikumpulkan!');

      console.log('4️⃣ Navigating to result page...');
      navigate(`/tryout/${tryoutId}/result?session=${sessionId}`, { 
        replace: true 
      });
      
    } catch (error: any) {
      console.error('❌ Error submitting exam:', error);
      toast.error(error.message || 'Gagal mengumpulkan jawaban. Silakan coba lagi.');
      
      try {
        await supabase.from('tryout_sessions').update({ status: 'in_progress' }).eq('id', sessionId);
      } catch (rollbackError) {
        console.error('❌ Error rolling back status:', rollbackError);
      }
    } finally {
      isSubmittingRef.current = false; 
      setIsSaving(false);
      setIsSubmitting(false);
    }
  }, [sessionId, tryoutId, navigate, forceSync]);

  const handleAutoSubmit = useCallback(async () => {
    console.log('⏰ Time expired. Auto-submitting...');
    await submitExamLogic();
  }, [submitExamLogic]);

  useEffect(() => {
    if (timeRemaining > 0 && !isLoading && !isSubmitting) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1;
          if (newTime % 30 === 0) updateTimer(newTime);
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

  const fetchSessionData = useCallback(async () => {
    try {
      setIsLoading(true);
      const sessionResponse = await api.getSession(sessionId);
      const sessionData = sessionResponse?.data || sessionResponse;

      if (!sessionData) throw new Error('Session data not found');

      if (sessionData.status === 'completed') {
        toast.error('Ujian ini sudah selesai.');
        navigate(`/tryout/${sessionData.tryout_id}/result?session=${sessionId}`, { replace: true });
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
    if (sessionId) fetchSessionData();
  }, [sessionId, fetchSessionData]);

  // ✅ UPDATE SECURE: Save Answer masuk ke Antrean (Hanya kirim apa yang dipilih siswa)
  const saveAnswer = useCallback((questionId: string, answer: string) => {
    // Optimistic Update: UI langsung berubah tanpa delay
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
    setIsSaving(true);

    // Simpan ke Queue. Kita tidak lagi mengecek jawaban_benar di sini!
    // Server (Database) yang akan mengeceknya secara diam-diam.
    unsyncedQueue.current[questionId] = {
      session_id: sessionId,
      question_id: questionId,
      selected_answer: answer,
    };
  }, [sessionId]);

  const saveBookmarks = useCallback(async (bookmarks: number[]) => {
    try {
      setBookmarkedQuestions(bookmarks);
      await api.saveBookmarks(sessionId, bookmarks);
    } catch (error) {
      console.error('❌ Error saving bookmarks:', error);
    }
  }, [sessionId]);

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
    forceSync, // Dikeluarkan agar bisa dipanggil saat user menekan 'Keluar'
    isLoading,
    timeRemaining,
    tryoutId,
    isSaving,
    isSubmitting,
    bookmarkedQuestions,
    saveBookmarks
  };
}