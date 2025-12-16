import { useState } from 'react';
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle2, XCircle, BookOpen, Lightbulb } from 'lucide-react';

interface QuestionDetail {
  questionNumber: number;
  soal_text: string;
  image_url?: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  topik?: string;
  pembahasan?: string;
  opsi_a?: string;
  opsi_b?: string;
  opsi_c?: string;
  opsi_d?: string;
  opsi_e?: string;
}

interface TopicStat {
  topic: string;
  correct: number;
  wrong: number;
  unanswered: number;
  percentage: number;
  questions: QuestionDetail[];
}

interface AnalysisViewProps {
  topicStats: TopicStat[];
  allQuestions: QuestionDetail[];
}

export default function AnalysisView({ topicStats, allQuestions }: AnalysisViewProps) {
  const [expandedTopik, setExpandedTopik] = useState<string | null>(null);
  const [expandedSoal, setExpandedSoal] = useState<number | null>(null);

  // Render pilihan ganda
  const renderOptions = (q: QuestionDetail) => {
    const options = [
      { key: 'A', value: q.opsi_a },
      { key: 'B', value: q.opsi_b },
      { key: 'C', value: q.opsi_c },
      { key: 'D', value: q.opsi_d },
      { key: 'E', value: q.opsi_e },
    ].filter(opt => opt.value);

    if (options.length === 0) return null;

    return (
      <div className="space-y-2 mt-3">
        {options.map(opt => {
          const isUserAnswer = q.userAnswer === opt.key;
          const isCorrectAnswer = q.correctAnswer === opt.key;

          return (
            <div
              key={opt.key}
              className={`p-2 rounded border-2 text-xs ${
                isCorrectAnswer
                  ? 'bg-green-50 border-green-400'
                  : isUserAnswer
                  ? 'bg-red-50 border-red-400'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className={`font-bold flex-shrink-0 ${
                  isCorrectAnswer ? 'text-green-700' : isUserAnswer ? 'text-red-700' : 'text-gray-600'
                }`}>
                  {opt.key}.
                </span>
                <span className={`flex-1 ${
                  isCorrectAnswer ? 'text-green-800 font-semibold' : isUserAnswer ? 'text-red-800' : 'text-gray-700'
                }`}>
                  {opt.value}
                </span>
                {isCorrectAnswer && (
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                )}
                {isUserAnswer && !isCorrectAnswer && (
                  <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {topicStats.map((topic) => {
        const isExpanded = expandedTopik === topic.topic;
        
        return (
          <div key={topic.topic} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
            {/* Header Topik */}
            <button
              onClick={() => setExpandedTopik(isExpanded ? null : topic.topic)}
              className="w-full p-5 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-all flex items-center justify-between"
            >
              <div className="flex-1 text-left">
                <h3 className="font-bold text-[#1d293d] text-lg mb-2">
                  {topic.topic || 'Topik Umum'}
                </h3>
                <div className="flex gap-4 text-sm">
                  <span className="flex items-center gap-1 text-green-600 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    {topic.correct} Benar
                  </span>
                  <span className="flex items-center gap-1 text-red-600 font-semibold">
                    <XCircle className="w-4 h-4" />
                    {topic.wrong} Salah
                  </span>
                  <span className="flex items-center gap-1 text-gray-500 font-semibold">
                    <AlertCircle className="w-4 h-4" />
                    {topic.unanswered} Tidak Dijawab
                  </span>
                </div>
              </div>

              {/* Persentase Badge */}
              <div className="flex items-center gap-3">
                <div
                  className={`text-l font-bold px-4 py-2 rounded-lg ${
                    topic.percentage >= 70
                      ? 'bg-green-200 text-green-700'
                      : topic.percentage >= 50
                      ? 'bg-yellow-200 text-yellow-700'
                      : 'bg-red-200 text-red-700'
                  }`}
                >
                  {topic.percentage}%
                </div>

                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-[#295782]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#295782]" />
                )}
              </div>
            </button>

            {/* Expanded: Detail Soal per Topik */}
            {isExpanded && (
              <div className="p-5 bg-white border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-4 font-medium">
                  Total {topic.questions.length} soal dalam topik ini
                </p>
                
                <div className="space-y-3">
                  {topic.questions.map((q) => {
                    const isQuestionExpanded = expandedSoal === q.questionNumber;
                    
                    return (
                      <div
                        key={q.questionNumber}
                        className={`rounded-lg border-l-4 transition-all hover:shadow-sm ${
                          q.isCorrect
                            ? 'bg-green-50 border-l-green-500'
                            : !q.userAnswer
                            ? 'bg-gray-50 border-l-gray-400'
                            : 'bg-red-50 border-l-red-500'
                        }`}
                      >
                        <div className="p-4">
                          <div className="flex gap-3">
                            {/* Icon Status */}
                            {q.isCorrect ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            ) : !q.userAnswer ? (
                              <AlertCircle className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            )}

                            <div className="flex-1">
                              {/* Question Number & Text */}
                              <p className="text-xs text-gray-500 font-semibold mb-1">
                                Soal #{q.questionNumber}
                              </p>
                              
                              {q.image_url && (
                                <img 
                                  src={q.image_url} 
                                  alt={`Soal ${q.questionNumber}`}
                                  className="w-full max-w-md mb-2 rounded border border-gray-200"
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                              )}
                              
                              <p className="text-sm text-[#1d293d] font-medium mb-3">
                                {q.soal_text}
                              </p>

                              {/* Button Lihat Pembahasan */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedSoal(isQuestionExpanded ? null : q.questionNumber);
                                }}
                                className="flex items-center gap-1 text-xs font-semibold text-[#295782] hover:text-[#1e3f5f] transition-colors mb-2"
                              >
                                <BookOpen className="w-3 h-3" />
                                {isQuestionExpanded ? 'Sembunyikan Detail' : 'Lihat Detail & Pembahasan'}
                              </button>

                              {/* Expandable Section */}
                              {isQuestionExpanded && (
                                <div className="space-y-3 mt-3 pt-3 border-t border-gray-200">
                                  {/* Pilihan Jawaban */}
                                  {renderOptions(q)}

                                  {/* Pembahasan */}
                                  {q.pembahasan && (
                                    <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                                      <div className="flex items-start gap-2">
                                        <Lightbulb className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                          <h5 className="text-xs font-bold text-blue-900 mb-1">
                                            💡 Pembahasan
                                          </h5>
                                          <p className="text-xs text-gray-800 leading-relaxed whitespace-pre-line">
                                            {q.pembahasan}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Answer Grid (hanya tampil jika tidak expanded) */}
                              {!isQuestionExpanded && (
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div className={`p-2 rounded ${
                                    q.isCorrect ? 'bg-white bg-opacity-60' : 'bg-white bg-opacity-80'
                                  }`}>
                                    <p className="text-gray-600 font-semibold mb-1">Jawaban Anda:</p>
                                    <p className={`font-bold ${
                                      !q.userAnswer ? 'text-gray-400 italic' : 
                                      q.isCorrect ? 'text-green-700' : 'text-red-700'
                                    }`}>
                                      {q.userAnswer || '(Tidak Dijawab)'}
                                    </p>
                                  </div>
                                  
                                  <div className="bg-green-100 p-2 rounded">
                                    <p className="text-gray-600 font-semibold mb-1">Jawaban Benar:</p>
                                    <p className="text-green-700 font-bold">{q.correctAnswer}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
