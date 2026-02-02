// client/hooks/useExamSession.tsx

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase'; // Import supabase client
import toast from 'react-hot-toast'; // Import toast untuk notifikasi error

interface Question {
  id: string; // Backend menggunakan BigInt, tapi di frontend biasanya string/number
  soal_text: string;
  opsi_a: string;       
  opsi_b: string;       
  opsi_c: string;       
  opsi_d: string;
  urutan: number;
  jawaban_benar: string;
  image_url?: string | null;
  difficulty?: number;      // ✅ IRT Parameter (b)
  discrimination?: number;  // ✅ IRT Parameter (a) - Tambahan baru
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

  // 1. Update Timer (Periodic Sync)
  const updateTimer = useCallback(async (time: number) => {
    try {
      if (time % 10 === 0) console.log('⏱️ Updating timer:', time);
      await api.updateTimer(sessionId, time);
    } catch (error) {
      console.error('❌ Error updating timer:', error);
    }
  }, [sessionId]);

  // 2. Auto Submit (Saat Waktu Habis)
  const handleAutoSubmit = useCallback(async () => {
    try {
      console.log('⏰ Time expired. Auto-submitting...');
      // Panggil fungsi submit yang sama dengan tombol manual
      await submitExamLogic(); 
    } catch (error) {
      console.error('❌ Error auto-submitting:', error);
    }
  }, [sessionId, tryoutId, navigate]);

  useEffect(() => {
    if (timeRemaining > 0 && !isLoading) {
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
  }, [timeRemaining, isLoading, updateTimer, handleAutoSubmit]);

  // 3. Fetch Data Awal
  const fetchSessionData = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Fetching session data for:', sessionId);

      const sessionResponse = await api.getSession(sessionId);
      const sessionData = sessionResponse?.data || sessionResponse;

      if (!sessionData) throw new Error('Session data not found');

      setTryoutId(sessionData.tryout_id);
      setTimeRemaining(sessionData.time_remaining || 0);

      const questionsResponse = await api.getQuestions(sessionId);
      const questionData = questionsResponse?.questions || questionsResponse;

      if (Array.isArray(questionData)) {
        // ✅ Mapping Data Soal (termasuk IRT params)
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
          difficulty: q.difficulty || 0,          // Default 0
          discrimination: q.discrimination || 1.0 // Default 1.0 (Standard Rasch/2PL)
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
  };

  useEffect(() => {
    if (sessionId) fetchSessionData();
  }, [sessionId]);

  // 4. Save Answer (Logic Baru untuk IRT)
  const saveAnswer = async (questionId: string, answer: string) => {
    try {
      // Optimistic Update UI
      setAnswers(prev => ({ ...prev, [questionId]: answer }));
      setIsSaving(true);

      // Cari data soal untuk dapat parameter IRT
      const currentQuestion = questions.find(q => String(q.id) === String(questionId));
      
      if (!currentQuestion) {
        console.warn('⚠️ Soal tidak ditemukan di state lokal');
        return;
      }

      const isCorrect = answer === currentQuestion.jawaban_benar;

      // ✅ Simpan ke tabel 'student_answers' via API baru
      await api.saveAnswerIRT({
        session_id: sessionId,
        question_id: Number(questionId), // Konversi ke number (backend bigint)
        selected_answer: answer,
        is_correct: isCorrect,
        question_difficulty: currentQuestion.difficulty || 0,
        question_discrimination: currentQuestion.discrimination || 1.0,
      });

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
  };

  // 5. Save Bookmarks
  const saveBookmarks = async (bookmarks: number[]) => {
    try {
      setBookmarkedQuestions(bookmarks);
      await api.saveBookmarks(sessionId, bookmarks);
    } catch (error) {
      console.error('❌ Error saving bookmarks:', error);
    }
  };

  // 6. Submit Exam Logic (Server-Side Trigger)
  const submitExamLogic = async () => {
    try {
      console.log('📤 Submitting exam to server...');
      
      // A. Update status session jadi 'completed' (Syarat backend sebelum hitung nilai)
      const { error: updateError } = await supabase
        .from('tryout_sessions')
        .update({ status: 'completed' })
        .eq('id', sessionId);

      if (updateError) throw updateError;

      // B. 🔥 Panggil Edge Function untuk menghitung nilai (Server-Side Scoring)
      console.log('🧮 Triggering server calculation...');
      await api.calculateIRTScoreServer(sessionId);
      
      console.log('✅ Exam submitted & scored successfully');
      
      // C. Redirect ke halaman hasil
      navigate(`/tryout/${tryoutId}/result?session=${sessionId}`);
      
    } catch (error: any) {
      console.error('❌ Error submitting exam:', error);
      toast.error(`Gagal mengirim jawaban: ${error.message || 'Server error'}`);
      throw error;
    }
  };

  // Wrapper function untuk dipanggil dari UI
  const submitExam = async () => {
    await submitExamLogic();
  };

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
    bookmarkedQuestions,
    saveBookmarks
  };
}