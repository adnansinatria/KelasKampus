// client/pages/TryoutResult.tsx

import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Trophy, Target, BrainCircuit, Percent, Home } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import Header from '@/components/Header';
import AnalysisView from '@/components/tryout/AnalysisView';
// ❌ Hapus import calculateIRTScore karena hitungan pindah ke server
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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
  image_url?: string | null;
  topik?: string; 
  pembahasan?: string; 
  opsi_a?: string;
  opsi_b?: string;
  opsi_c?: string;
  opsi_d?: string;
  difficulty?: number; 
}

interface TopicStats {
  topic: string;
  correct: number;
  wrong: number;
  unanswered: number;
  totalQuestions: number;
  percentage: number;
  questions: QuestionResult[];
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

interface IRTData {
  overallTheta: number;
  percentile: number;
  details: {
    kategoriId: string;
    theta: number;
    se: number;
  }[];
}

export default function TryoutResult() {
  const { tryoutId } = useParams<{ tryoutId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session');

  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [tryoutData, setTryoutData] = useState<any>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [questions, setQuestions] = useState<QuestionResult[]>([]);
  const [stats, setStats] = useState<ResultStats | null>(null);
  const [topicStats, setTopicStats] = useState<TopicStats[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
  
  const [irtData, setIrtData] = useState<IRTData | null>(null);
  const [passingGradeData, setPassingGradeData] = useState<number>(65);
  const [targetKampus, setTargetKampus] = useState<string>(''); 
  const [targetProdi, setTargetProdi] = useState<string>('');

  useEffect(() => {
    if (!sessionId) {
      toast.error('Session tidak valid');
      navigate('/tryout');
      return;
    }

    initializeResult();
  }, [sessionId]);

  const initializeResult = async () => {
    const userId = await fetchCurrentUser();
    if (userId) {
      await fetchPassingGrade(userId);
      await fetchResultData(userId);
    }
  };

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
        return userData?.user_id;
      }
    } catch (err) {
      console.error('Error fetching user:', err);
      return null;
    }
  };

  const fetchPassingGrade = async (userId: string): Promise<number> => {
    try {
      // Fetch user target
      const { data: userTarget, error: targetError } = await supabase
        .from('user_targets')
        .select('kampus_name, prodi_name')
        .eq('tryout_id', tryoutId)
        .eq('user_id', userId)
        .single();

      if (targetError || !userTarget) {
        return 65;
      }

      setTargetKampus(userTarget.kampus_name);
      setTargetProdi(userTarget.prodi_name);

      // Fetch kampus ID
      const { data: kampusData, error: kampusError } = await supabase
        .from('kampus')
        .select('id')
        .eq('nama_kampus', userTarget.kampus_name)
        .single();

      if (kampusError || !kampusData) {
        return 65;
      }

      // Fetch passing grade from program_studi
      const { data: prodiData, error: prodiError } = await supabase
        .from('program_studi')
        .select('passing_grade_histories')
        .eq('kampus_id', kampusData.id)
        .eq('nama_prodi', userTarget.prodi_name)
        .single();

      if (prodiError || !prodiData || !prodiData.passing_grade_histories) {
        return 65;
      }

      const pg = parseFloat(prodiData.passing_grade_histories);
      setPassingGradeData(pg);
      return pg;
    } catch (error) {
      console.error('❌ Failed to fetch passing grade:', error);
      return 65;
    }
  };

  const fetchResultData = async (userId: string) => {
    try {
      setIsLoading(true);
      console.log('🔍 Fetching result from server...');

      // 1. Ambil Data Sesi (Termasuk Nilai dari Server)
      const { data: currentSession, error: sessionsError } = await supabase
        .from('tryout_sessions')
        .select(`
          *,
          tryout:tryouts (nama_tryout, durasi_menit)
        `)
        .eq('id', sessionId)
        .single();

      if (sessionsError || !currentSession) {
        throw new Error('Sesi tidak ditemukan atau error loading');
      }

      setSessionData(currentSession);
      setTryoutData(currentSession.tryout);

      // 2. Ambil Soal & Jawaban (Untuk Review Detail)
      const { data: questionsData } = await supabase
        .from('questions')
        .select('id, soal_text, opsi_a, opsi_b, opsi_c, opsi_d, jawaban_benar, kategori_id, urutan, image_url, pembahasan, difficulty')
        .eq('tryout_id', tryoutId)
        .order('urutan', { ascending: true });

      // Ambil jawaban detail dari tabel student_answers (IRT compatible table)
      const { data: answersData } = await supabase
        .from('student_answers')
        .select('*')
        .eq('session_id', currentSession.id);

      const answersMap: Record<string, string> = {};
      answersData?.forEach((answer: any) => {
        answersMap[answer.question_id] = answer.selected_answer;
      });

      // 3. Proses Mapping Soal untuk Tampilan
      let localCorrect = 0;
      let localWrong = 0;
      let localUnanswered = 0;

      const processedQuestions: QuestionResult[] = (questionsData || []).map((q, index) => {
        const userAnswer = answersMap[q.id] || null;
        const isCorrect = userAnswer === q.jawaban_benar;
        
        // Hitung manual untuk detail statistik jawaban
        if (!userAnswer) localUnanswered++;
        else if (isCorrect) localCorrect++;
        else localWrong++;

        return {
          id: q.id,
          questionNumber: index + 1,
          userAnswer: userAnswer,
          correctAnswer: q.jawaban_benar,
          isCorrect: isCorrect,
          topic: q.kategori_id || 'General',
          topik: q.kategori_id || 'General',
          soal_text: q.soal_text,
          image_url: q.image_url || null,
          pembahasan: q.pembahasan || 'Pembahasan belum tersedia.',
          opsi_a: q.opsi_a, 
          opsi_b: q.opsi_b, 
          opsi_c: q.opsi_c, 
          opsi_d: q.opsi_d,
          difficulty: q.difficulty || 0 
        };
      });

      setQuestions(processedQuestions);
      const topicAnalysis = calculateTopicStats(processedQuestions);
      setTopicStats(topicAnalysis);

      // 4. ✅ SET STATS MENGGUNAKAN DATA SERVER
      // Kita prioritaskan nilai hitungan server (raw_score, percentage_score, irt_theta)
      
      const serverTheta = currentSession.irt_theta;
      const scorePercentage = Math.round(currentSession.percentage_score || 0);
      
      // Update Stats
      setStats({
        score: scorePercentage, 
        totalQuestions: currentSession.total_questions || processedQuestions.length,
        // Gunakan hitungan server jika ada, fallback ke hitungan lokal
        correct: currentSession.raw_score ?? localCorrect,
        wrong: localWrong, // Server biasanya tidak kirim 'wrong' eksplisit, pakai lokal aman
        unanswered: localUnanswered,
        timeSpent: 0, // Bisa dihitung jika ada created_at & finished_at
        isPassed: scorePercentage >= passingGradeData,
        passingGrade: passingGradeData,
      });

      // 5. ✅ SET IRT DATA DARI SERVER
      if (serverTheta !== null && serverTheta !== undefined) {
        // Konversi Theta ke Percentile (Hanya untuk Display UI)
        const percentile = (1 / (1 + Math.exp(-1.7 * serverTheta))) * 100;
        
        setIrtData({
          overallTheta: serverTheta,
          percentile: Math.round(percentile),
          details: []
        });
      } else {
        // Jika server belum selesai menghitung (misal delay async)
        toast('Nilai IRT sedang diproses server...', { icon: '⏳' });
      }

    } catch (error: any) {
      console.error('❌ Error fetching result:', error);
      toast.error(error.message || 'Gagal memuat hasil tryout');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTopicStats = (questions: QuestionResult[]): TopicStats[] => {
    const topicMap: Record<string, TopicStats> = {};

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
      const topicKey = (q.topic || 'umum').toLowerCase();
      const topicName = topicNameMap[topicKey] || q.topic || 'Umum';

      if (!topicMap[topicName]) {
        topicMap[topicName] = {
          topic: topicName,
          correct: 0,
          wrong: 0,
          unanswered: 0,
          totalQuestions: 0,
          percentage: 0,
          questions: []
        };
      }

      topicMap[topicName].questions.push(q);
      topicMap[topicName].totalQuestions++;

      if (!q.userAnswer) {
        topicMap[topicName].unanswered++;
      } else if (q.isCorrect) {
        topicMap[topicName].correct++;
      } else {
        topicMap[topicName].wrong++;
      }
    });

    const statsArray = Object.values(topicMap);
    statsArray.forEach(stat => {
      stat.percentage = stat.totalQuestions > 0
        ? Math.round((stat.correct / stat.totalQuestions) * 100)
        : 0;
    });

    return statsArray.sort((a, b) => b.percentage - a.percentage);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#e6f3ff] via-[#f8fbff] to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#295782] mx-auto mb-4"></div>
          <p className="text-[#62748e] font-medium text-lg">Memuat hasil dari server...</p>
        </div>
      </div>
    );
  }

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

  const distributionData = [
    { name: 'Benar', value: stats.correct, fill: '#3b82f6' },
    { name: 'Salah', value: stats.wrong, fill: '#ef4444' }, 
    { name: 'Tidak Dijawab', value: stats.unanswered, fill: '#94a3b8' } 
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
        <button
          onClick={() => navigate('/tryout')}
          className="flex items-center gap-2 text-[#62748e] hover:text-[#295782] mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Kembali ke Daftar Tryout</span>
        </button>

        {/* =============== TOP SUMMARY CARDS =============== */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Score Card */}
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Trophy className="w-7 h-7 text-blue-600" />
            </div>
            <div className="text-5xl font-bold text-[#1d293d] mb-2">
              {stats.score}
            </div>
            <p className="text-[#62748e]">Skor Klasik (0-100)</p>
          </div>

          {/* IRT Theta Score Card */}
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center border-2 border-purple-100">
            <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <BrainCircuit className="w-7 h-7 text-purple-600" />
            </div>
            {irtData ? (
              <>
                <div className="text-4xl font-bold text-purple-700 mb-1">
                  {irtData.overallTheta.toFixed(2)}
                </div>
                <div className="text-sm font-medium text-purple-600 bg-purple-50 inline-block px-2 py-1 rounded mb-1">
                  Theta Score
                </div>
                <p className="text-[#62748e] text-xs">
                  Kemampuan Murni
                </p>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-24">
                <span className="text-gray-400 text-sm">Menunggu Server...</span>
              </div>
            )}
          </div>

          {/* Percentile Rank Card */}
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center border-2 border-indigo-100">
            <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Percent className="w-7 h-7 text-indigo-600" />
            </div>
            {irtData ? (
              <>
                <div className="text-4xl font-bold text-indigo-700 mb-1">
                  Top {Math.max(1, 100 - irtData.percentile)}%
                </div>
                <div className="text-sm font-medium text-indigo-600 bg-indigo-50 inline-block px-2 py-1 rounded mb-1">
                  Peringkat Nasional
                </div>
                <p className="text-[#62748e] text-xs">
                  Lebih baik dari {irtData.percentile}% peserta
                </p>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-24">
                <span className="text-gray-400 text-sm">...</span>
              </div>
            )}
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
              {stats.isPassed ? 'LULUS' : 'GAGAL'}
            </div>
            <p className="text-[#62748e] text-sm mt-2">
              Passing Grade: {stats.passingGrade}
            </p>
            {targetKampus && targetProdi && (
              <p className="text-xs text-gray-500 mt-1">
                {targetKampus} - {targetProdi}
              </p>
            )}
          </div>
        </div>

        {/* =============== DETAIL HASIL UJIAN =============== */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-bold text-[#1d293d]">
              Detail Hasil Ujian
            </h2>

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

          {/* TAB SWITCHING - Detail Per Topik & Analisa Soal */}
          <div className="mt-8">
            <AnalysisView 
              topicStats={topicStats}
              allQuestions={questions}
            />
          </div>
        </div>

        {/* =============== ACTION BUTTONS =============== */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => navigate(`/tryout/${tryoutId}/tryoutrecommendations`)}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border-2 border-[#295782] text-[#295782] rounded-xl font-semibold hover:bg-blue-50 transition-colors"
          >
            <BrainCircuit className="w-5 h-5" />
            Lihat Rekomendasi
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