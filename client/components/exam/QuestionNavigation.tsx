import { ChevronLeft, ChevronRight } from 'lucide-react';

interface QuestionNavigationProps {
  currentIndex: number;
  totalQuestions: number;
  onPrevious: () => void;
  onNext: () => void;
  hasAnswer: boolean;
}

export default function QuestionNavigation({
  currentIndex,
  totalQuestions,
  onPrevious,
  onNext,
  hasAnswer
}: QuestionNavigationProps) {
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalQuestions - 1;

  return (
    <div className="flex items-center justify-between gap-4">
      <button
        onClick={onPrevious}
        disabled={isFirst}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
          isFirst
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-white text-[#295782] border border-[#295782] hover:bg-[#f8fbff]'
        }`}
      >
        <ChevronLeft className="w-4 h-4" />
        Sebelumnya
      </button>

      <div className="text-sm text-[#62748e]">
        {hasAnswer ? (
          <span className="text-green-600 font-medium">✓ Terjawab</span>
        ) : (
          <span>Belum dijawab</span>
        )}
      </div>

      <button
        onClick={onNext}
        disabled={isLast}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
          isLast
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-[#295782] to-[#1e4060] text-white hover:shadow-lg'
        }`}
      >
        Selanjutnya
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
