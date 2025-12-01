// pages/TryoutResult.tsx - FULL CODE WITH IMAGE SUPPORT
import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Trophy, Target, Clock, BarChart3, RefreshCw, Home } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import Header from '@/components/Header';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

interface QuestionResult {
  id: string;
  questionNumber: number;
  userAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean;
  topic: string;
  soal_text: string;
  image_url?: string | null; // ✅ ADD THIS
}

interface TopicStats {
  topic: string;
  correct: number;
  wrong: number;
  unanswered: number;
  totalQuestions: number;
  percentage: number;
}

interface ResultStats {
  score: number;
  totalQuestions: number;
  correct: number;
  wrong: number;
  unanswered: number;
  timeSpent: number;
  isPassed: boolean;
  passingGrade: number;
}

export default function TryoutResult() {
  const { tryoutId } = useParams<{ tryoutId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session');
  const kategoriId = searchParams.get('kategori');

  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [tryoutData, setTryoutData] = useState<any>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [questions, setQuestions] = useState<QuestionResult[]>([]);
  const [stats, setStats] = useState<ResultStats | null>(null);
  const [topicStats, setTopicStats] = useState<TopicStats[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');

  useEffect(() => {
    // ✅ Validate sessionId
    if (!sessionId) {
      toast.error('Session tidak valid');
      navigate('/tryout');
      return;
    }

    fetchCurrentUser();
    fetchResultData();
  }, [sessionId]);

  // ✅ PATTERN DARI ADMIN: Fetch current user via direct Supabase
  const fetchCurrentUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: userData } = await supabase
          .from('users')
          .select('user_id, nama_lengkap, username, photo_profile')
          .eq('auth_id', session.user.id)
          .single();
        
        setCurrentUser(userData);
      }
    } catch (err) {
      console.error('Error fetching user:', err);
    }
  };

  // ✅ PATTERN DARI ADMIN: Direct Supabase access (WITH IMAGE SUPPORT)
  const fetchResultData = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Fetching result for session:', sessionId);

      // ✅ 1. Fetch session data (DIRECT SUPABASE)
      const { data: session, error: sessionError } = await supabase
        .from('tryout_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;
      if (!session) throw new Error('Session tidak ditemukan');

      console.log('✅ Session data:', session);
      setSessionData(session);

      // ✅ 2. Fetch tryout detail (DIRECT SUPABASE)
      const { data: tryout, error: tryoutError } = await supabase
        .from('tryouts')
        .select('*')
        .eq('id', session.tryout_id)
        .single();

      if (tryoutError) throw tryoutError;
      console.log('✅ Tryout data:', tryout);
      setTryoutData(tryout);

      // ✅ 3. Fetch questions (DIRECT SUPABASE - WITH IMAGE URL)
      let questionsQuery = supabase
        .from('questions')
        .select('id, soal_text, opsi_a, opsi_b, opsi_c, opsi_d, jawaban_benar, kategori_id, urutan, image_url') // ✅ Include image_url
        .eq('tryout_id', session.tryout_id)
        .order('urutan', { ascending: true });

      // ✅ Filter by kategori if kategoriId is provided (per subtest)
      if (kategoriId) {
        questionsQuery = questionsQuery.eq('kategori_id', kategoriId);
      }

      const { data: questionsData, error: questionsError } = await questionsQuery;

      if (questionsError) throw questionsError;
      console.log('✅ Questions loaded:', questionsData?.length || 0);

      // ✅ Log questions with images
      const questionsWithImage = questionsData?.filter(q => q.image_url) || [];
      if (questionsWithImage.length > 0) {
        console.log(`🖼️ Questions with images: ${questionsWithImage.length}`);
      }

      // ✅ 4. Fetch answers (DIRECT SUPABASE)
      const { data: answersData, error: answersError } = await supabase
        .from('answers')
        .select('*')
        .eq('session_id', sessionId);

      if (answersError) throw answersError;

      // Convert answers array to map
      const answersMap: Record<string, string> = {};
      answersData?.forEach(answer => {
        answersMap[answer.question_id] = answer.selected_answer;
      });

      console.log('✅ Answers loaded:', Object.keys(answersMap).length);

      // ✅ 5. Process questions with answers (INCLUDING IMAGE_URL)
      const processedQuestions: QuestionResult[] = (questionsData || []).map((q, index) => ({
        id: q.id,
        questionNumber: index + 1,
        userAnswer: answersMap[q.id] || null,
        correctAnswer: q.jawaban_benar,
        isCorrect: answersMap[q.id] === q.jawaban_benar,
        topic: q.kategori_id || 'General',
        soal_text: q.soal_text,
        image_url: q.image_url || null, // ✅ Include image URL
      }));

      setQuestions(processedQuestions);

      // ✅ 6. Calculate statistics
      const calculatedStats = calculateStats(processedQuestions, tryout);
      setStats(calculatedStats);

      // ✅ 7. Calculate per-topic analysis
      const topicAnalysis = calculateTopicStats(processedQuestions);
      setTopicStats(topicAnalysis);

    } catch (error: any) {
      console.error('❌ Error fetching result:', error);
      toast.error(error.message || 'Gagal memuat hasil tryout');
      setTimeout(() => navigate('/tryout'), 2000);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate overall statistics
  const calculateStats = (questions: QuestionResult[], tryout: any): ResultStats => {
    let correct = 0;
    let wrong = 0;
    let unanswered = 0;

    questions.forEach(q => {
      if (!q.userAnswer) {
        unanswered++;
      } else if (q.isCorrect) {
        correct++;
      } else {
        wrong++;
      }
    });

    const totalQuestions = questions.length;
    const score = totalQuestions > 0 
      ? Math.round((correct / totalQuestions) * 100) 
      : 0;

    const passingGrade = 65; // Default passing grade
    const isPassed = score >= passingGrade;

    // Calculate time spent (from session data)
    const durasiTotal = (tryout?.durasi_menit || 0) * 60; // in seconds
    const timeRemaining = sessionData?.time_remaining || 0;
    const timeSpent = durasiTotal - timeRemaining;

    return {
      score,
      totalQuestions,
      correct,
      wrong,
      unanswered,
      timeSpent: Math.max(0, timeSpent),
      isPassed,
      passingGrade
    };
  };

  // Calculate per-topic statistics
  const calculateTopicStats = (questions: QuestionResult[]): TopicStats[] => {
    const topicMap: Record<string, TopicStats> = {};

    // Topic name mapping
    const topicNameMap: Record<string, string> = {
      'biologi': 'Biologi',
      'kimia': 'Kimia',
      'fisika': 'Fisika',
      'matematika': 'Matematika',
      'penmat': 'Matematika',
      'pm': 'Matematika',
      'kpu': 'Penalaran Umum',
      'ppu': 'Penalaran Umum',
      'kmbm': 'Literasi',
      'pbm': 'Literasi',
      'pk': 'Kuantitatif',
      'pbi': 'Umum'
    };

    questions.forEach(q => {
      const topicKey = q.topic.toLowerCase();
      const topicName = topicNameMap[topicKey] || q.topic;

      if (!topicMap[topicName]) {
        topicMap[topicName] = {
          topic: topicName,
          correct: 0,
          wrong: 0,
          unanswered: 0,
          totalQuestions: 0,
          percentage: 0
        };
      }

      topicMap[topicName].totalQuestions++;

      if (!q.userAnswer) {
        topicMap[topicName].unanswered++;
      } else if (q.isCorrect) {
        topicMap[topicName].correct++;
      } else {
        topicMap[topicName].wrong++;
      }
    });

    // Calculate percentages
    const statsArray = Object.values(topicMap);
    statsArray.forEach(stat => {
      stat.percentage = stat.totalQuestions > 0
        ? Math.round((stat.correct / stat.totalQuestions) * 100)
        : 0;
    });

    return statsArray.sort((a, b) => b.percentage - a.percentage);
  };

  // Format time display (MM:SS)
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} menit ${secs} detik`;
  };

  // Handle retry tryout
  const handleRetry = () => {
    navigate(`/tryout/${tryoutId}/start`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#e6f3ff] via-[#f8fbff] to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#295782] mx-auto mb-4"></div>
          <p className="text-[#62748e] font-medium text-lg">Menghitung hasil...</p>
        </div>
      </div>
    );
  }

  // No data state
  if (!stats || !tryoutData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#e6f3ff] via-[#f8fbff] to-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <p className="text-lg text-[#1d293d] font-semibold mb-4">
              Data hasil tidak ditemukan
            </p>
            <button
              onClick={() => navigate('/tryout')}
              className="px-6 py-3 bg-[#295782] text-white rounded-xl font-semibold hover:bg-[#1e3f5f] transition-colors"
            >
              Kembali ke Daftar Tryout
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const distributionData = [
    { name: 'Benar', value: stats.correct, fill: '#3b82f6' },
    { name: 'Salah', value: stats.wrong, fill: '#3b82f6' },
    { name: 'Tidak Dijawab', value: stats.unanswered, fill: '#3b82f6' }
  ];

  const radarData = topicStats.map(stat => ({
    topic: stat.topic,
    percentage: stat.percentage
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e6f3ff] via-[#f8fbff] to-white">
      <Header
        userName={currentUser?.username || currentUser?.nama_lengkap || 'User'}
        userPhoto={currentUser?.photo_profile}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/tryout')}
          className="flex items-center gap-2 text-[#62748e] hover:text-[#295782] mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Kembali ke Daftar Tryout</span>
        </button>

        {/* =============== TOP SUMMARY CARDS =============== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Score Card */}
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Trophy className="w-7 h-7 text-blue-600" />
            </div>
            <div className="text-5xl font-bold text-[#1d293d] mb-2">
              {stats.score}/100
            </div>
            <p className="text-[#62748e]">Skor Anda</p>
          </div>

          {/* Grade Badge */}
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${
              stats.isPassed ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <Target className={`w-7 h-7 ${stats.isPassed ? 'text-green-600' : 'text-red-600'}`} />
            </div>
            <div className={`inline-block px-6 py-2 rounded-full font-bold text-xl mb-2 ${
              stats.isPassed ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}>
              {stats.isPassed ? 'LULUS' : 'TIDAK LULUS'}
            </div>
            <p className="text-[#62748e] text-sm mt-2">
              Passing Grade: {stats.passingGrade}
            </p>
          </div>

          {/* Time Card */}
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Clock className="w-7 h-7 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-[#1d293d] mb-2">
              {formatTime(stats.timeSpent)}
            </div>
            <p className="text-[#62748e] text-sm">
              Dari total {stats.totalQuestions} soal
            </p>
          </div>
        </div>

        {/* =============== DETAIL HASIL UJIAN =============== */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-bold text-[#1d293d]">
              Detail Hasil Ujian
            </h2>

            {/* Toggle View */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#62748e]">Tampilan:</span>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'table'
                      ? 'bg-[#295782] text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Tabel
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-[#295782] text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Grid
                </button>
              </div>
            </div>
          </div>

          {/* Grid View (10 columns per row) */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {questions.map((q) => {
                const isAnswered = q.userAnswer !== null;
                const bgColor = !isAnswered
                  ? 'bg-gray-400'
                  : q.isCorrect
                  ? 'bg-green-500'
                  : 'bg-red-500';

                return (
                  <div
                    key={q.id}
                    className={`aspect-square rounded-lg flex items-center justify-center font-bold text-sm text-white ${bgColor} hover:opacity-80 transition-opacity cursor-pointer`}
                    title={`Soal ${q.questionNumber}: ${!isAnswered ? 'Tidak dijawab' : q.isCorrect ? 'Benar' : 'Salah'}`}
                  >
                    {q.questionNumber}
                  </div>
                );
              })}
            </div>
          )}

          {/* Table View (WITH IMAGE) */}
          {viewMode === 'table' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold">No</th>
                    <th className="text-left p-3 font-semibold">Soal</th>
                    <th className="text-left p-3 font-semibold">Jawaban Anda</th>
                    <th className="text-left p-3 font-semibold">Jawaban Benar</th>
                    <th className="text-left p-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((q) => (
                    <tr key={q.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{q.questionNumber}</td>
                      <td className="p-3 max-w-md">
                        {/* ✅ NEW: Display image if exists */}
                        {q.image_url && (
                          <img
                            src={q.image_url}
                            alt={`Soal ${q.questionNumber}`}
                            className="max-w-xs h-auto max-h-32 rounded border mb-2"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                        <span className="line-clamp-2">{q.soal_text.substring(0, 100) + '...'}</span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded ${
                          !q.userAnswer ? 'bg-gray-200 text-gray-600' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {q.userAnswer || '-'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-1 rounded bg-green-100 text-green-700">
                          {q.correctAnswer}
                        </span>
                      </td>
                      <td className="p-3">
                        {!q.userAnswer ? (
                          <span className="text-gray-500">Tidak dijawab</span>
                        ) : q.isCorrect ? (
                          <span className="text-green-600 font-semibold">✓ Benar</span>
                        ) : (
                          <span className="text-red-600 font-semibold">✗ Salah</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* =============== ANALISIS & STATISTIK =============== */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-[#1d293d] mb-6">
            Analisis & Statistik
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Bar Chart - Distribusi Jawaban */}
            <div>
              <h3 className="font-semibold text-gray-700 mb-4">
                Distribusi Jawaban
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={distributionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Radar Chart - Analisis Per Topik */}
            <div>
              <h3 className="font-semibold text-gray-700 mb-4">
                Analisis Per Topik
              </h3>
              {radarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="topic" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar
                      name="Persentase"
                      dataKey="percentage"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.6}
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  Tidak ada data topik
                </div>
              )}
            </div>
          </div>

          {/* Topic Stats Table */}
          {topicStats.length > 0 && (
            <div className="mt-8">
              <h3 className="font-semibold text-gray-700 mb-4">
                Detail Per Topik
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 font-semibold">Topik</th>
                      <th className="text-center p-3 font-semibold">Benar</th>
                      <th className="text-center p-3 font-semibold">Salah</th>
                      <th className="text-center p-3 font-semibold">Tidak Dijawab</th>
                      <th className="text-center p-3 font-semibold">Persentase</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topicStats.map((stat) => (
                      <tr key={stat.topic} className="border-b hover:bg-gray-50">
                        <td className="p-3">{stat.topic || 'General'}</td>
                        <td className="p-3 text-center text-green-600 font-semibold">
                          {stat.correct}
                        </td>
                        <td className="p-3 text-center text-red-600 font-semibold">
                          {stat.wrong}
                        </td>
                        <td className="p-3 text-center text-gray-500">
                          {stat.unanswered}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            stat.percentage >= 70
                              ? 'bg-green-100 text-green-700'
                              : stat.percentage >= 50
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {stat.percentage}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* =============== ACTION BUTTONS =============== */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleRetry}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border-2 border-[#295782] text-[#295782] rounded-xl font-semibold hover:bg-blue-50 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            Ulangi Tryout
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#295782] text-white rounded-xl font-semibold hover:bg-[#1e3f5f] transition-colors shadow-md hover:shadow-lg"
          >
            <Home className="w-5 h-5" />
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}