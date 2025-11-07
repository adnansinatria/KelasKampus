import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';

interface Question {
  id: string;
  soal_text: string;
  opsi_a: string;       
  opsi_b: string;       
  opsi_c: string;       
  opsi_d: string;y
  urutan: number;
  jawaban_benar: string;
}

interface Answer {
  question_id: string;
  selected_answer: string;
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

  // ✅ Update timer callback
  const updateTimer = useCallback(async (time: number) => {
    try {
      console.log('⏱️ Updating timer:', time);
      await api.updateTimer(sessionId, time);
      console.log('✅ Timer updated');
    } catch (error) {
      console.error('❌ Error updating timer:', error);
    }
  }, [sessionId]);

  // ✅ Auto submit callback
  const handleAutoSubmit = useCallback(async () => {
    try {
      console.log('⏰ Auto-submitting exam (time expired)');
      await api.submitTryout(sessionId);
      console.log('✅ Exam auto-submitted');
      navigate(`/tryout/${tryoutId}/result?session=${sessionId}`);
    } catch (error) {
      console.error('❌ Error auto-submitting:', error);
    }
  }, [sessionId, tryoutId, navigate]);

  // Fetch session data on mount
  useEffect(() => {
    if (sessionId) {
      fetchSessionData();
    }
  }, [sessionId]);

  // Timer countdown effect
  useEffect(() => {
    if (timeRemaining > 0 && !isLoading) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1;

          // Auto-save timer every 30 seconds
          if (newTime % 30 === 0) {
            updateTimer(newTime);
          }

          // Auto-submit when time is up
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

  // ✅ Fetch session data via API
  const fetchSessionData = async () => {
    try {
      setIsLoading(true);

      console.log('🔍 Fetching session data for:', sessionId);

      const sessionResponse = await api.getSession(sessionId);
      console.log('✅ Session data from API:', sessionResponse);

      const sessionData = sessionResponse?.data || sessionResponse;

      if (!sessionData) {
        throw new Error('Session data not found');
      }

      setTryoutId(sessionData.tryout_id);
      setTimeRemaining(sessionData.time_remaining || 0);

      console.log('🔍 Fetching questions for session:', sessionId);

      const questionsResponse = await api.getQuestions(sessionId);
      console.log('✅ Questions from API:', questionsResponse);

      const questionData = questionsResponse?.questions || questionsResponse;

      if (Array.isArray(questionData)) {
        setQuestions(questionData);
        console.log(`✅ Questions loaded: ${questionData.length}`);
      } else {
        console.warn('⚠️ Questions is not array:', questionData);
      }

      const answersData = questionsResponse?.answers || {};
      setAnswers(answersData);
      console.log('✅ Existing answers loaded:', Object.keys(answersData).length);

      // ✅ Load bookmarks dari response
      const bookmarksData = questionsResponse?.bookmarked_questions || [];
      setBookmarkedQuestions(
        Array.isArray(bookmarksData) ? bookmarksData : []
      );
      console.log('✅ Bookmarks loaded:', bookmarksData);
    } catch (error) {
      console.error('❌ Error fetching session data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Save answer via API
  const saveAnswer = async (questionId: string, answer: string) => {
    try {
      setAnswers(prev => ({ ...prev, [questionId]: answer }));

      console.log('💾 Saving answer via API:', questionId, answer);

      setIsSaving(true);

      await api.saveAnswer({
        session_id: sessionId,
        question_id: questionId,
        selected_answer: answer
      });

      console.log('✅ Answer saved:', questionId, answer);
    } catch (error) {
      console.error('❌ Error saving answer:', error);
      setAnswers(prev => {
        const updated = { ...prev };
        delete updated[questionId];
        return updated;
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ Save bookmarks to API + update state
  const saveBookmarks = async (bookmarks: number[]) => {
    try {
      console.log('💾 Saving bookmarks to API:', bookmarks);
      setBookmarkedQuestions(bookmarks);
      await api.saveBookmarks(sessionId, bookmarks);
      console.log('✅ Bookmarks saved');
    } catch (error) {
      console.error('❌ Error saving bookmarks:', error);
    }
  };

  // ✅ Manual submit via API
  const submitExam = async () => {
    try {
      console.log('📤 Submitting exam manually');
      const result = await api.submitTryout(sessionId);
      console.log('✅ Exam submitted:', result);
      navigate(`/tryout/${tryoutId}/result?session=${sessionId}`);
    } catch (error) {
      console.error('❌ Error submitting exam:', error);
      throw error;
    }
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