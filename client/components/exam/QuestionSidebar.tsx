// components/exam/QuestionSidebar.tsx

interface Question {
  id: string;
  soal: string;
}

interface QuestionSidebarProps {
  show: boolean;
  questions: Question[];
  answers: Record<string, string>;
  currentIndex: number;
  bookmarkedQuestions: number[];
  onQuestionSelect: (index: number) => void;
  onClose: () => void;
}

export default function QuestionSidebar({
  show,
  questions,
  answers,
  currentIndex,
  bookmarkedQuestions,
  onQuestionSelect,
  onClose
}: QuestionSidebarProps) {
  if (!show) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl z-50 lg:hidden overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-800">Navigasi Soal</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Question Grid */}
          <div className="grid grid-cols-5 gap-2">
            {questions.map((question, index) => {
              const isAnswered = !!answers[question.id];
              const isCurrent = index === currentIndex;
              const isBookmarked = bookmarkedQuestions.includes(index);
              
              return (
                <button
                  key={question.id}
                  onClick={() => {
                    onQuestionSelect(index);
                    onClose();
                  }}
                  className={`aspect-square rounded-lg font-bold text-sm transition-all ${
                    isCurrent
                      ? 'ring-2 ring-[#295782] ring-offset-2'
                      : ''
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
        </div>
      </div>
    </>
  );
}