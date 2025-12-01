// components/exam/QuestionDisplay.tsx - FULL CODE WITH IMAGE SUPPORT
import { useState } from 'react';

export interface Question {
  id: string;
  soal_text: string;
  opsi_a: string;
  opsi_b: string;
  opsi_c: string;
  opsi_d: string;
  opsi_e?: string;
  urutan: number;
  jawaban_benar?: string;
  image_url?: string | null; // ✅ ADD THIS
}

interface Props {
  question: Question;
  selectedAnswer?: string;
  onAnswerSelect: (answer: string) => void;
  isSaving: boolean;
  isReviewMode?: boolean; // ✅ Optional for result review
}

const OPTIONS = [
  { key: 'A', value: 'opsi_a' },
  { key: 'B', value: 'opsi_b' },
  { key: 'C', value: 'opsi_c' },
  { key: 'D', value: 'opsi_d' }
];

export default function QuestionDisplay({
  question,
  selectedAnswer,
  onAnswerSelect,
  isSaving,
  isReviewMode = false
}: Props) {
  // ✅ Debug logs
  console.log('📍 QuestionDisplay received:');
  console.log('  - question:', question);
  console.log('  - soal_text:', question?.soal_text);
  console.log('  - image_url:', question?.image_url); // ✅ NEW

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl shadow-lg p-6">
        {/* ✅ NEW: Display Image if exists */}
        {question?.image_url && (
          <div className="mb-6">
            <img
              src={question.image_url}
              alt="Gambar soal"
              className="max-w-full h-auto max-h-96 rounded-lg border-2 border-gray-200 mx-auto"
              onError={(e) => {
                // Hide if image fails to load
                console.warn('⚠️ Failed to load image:', question.image_url);
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Question Text */}
        <h2 className="text-lg text-gray-800 leading-relaxed">
          {question?.soal_text || '⚠️ SOAL KOSONG'}
        </h2>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {OPTIONS.map((option) => {
          const optionText = question[option.value as keyof Question] as string;
          const isSelected = selectedAnswer === option.key;
          const isCorrect = isReviewMode && question.jawaban_benar === option.key;
          const isWrong = isReviewMode && isSelected && question.jawaban_benar !== option.key;

          return (
            <button
              key={option.key}
              onClick={() => !isReviewMode && onAnswerSelect(option.key)}
              disabled={isSaving || isReviewMode}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                isCorrect
                  ? 'bg-green-50 border-green-500'
                  : isWrong
                  ? 'bg-red-50 border-red-500'
                  : isSelected
                  ? 'bg-[#295782] border-[#295782] shadow-md'
                  : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50'
              } ${isSaving || isReviewMode ? 'cursor-default' : ''}`}
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  isCorrect
                    ? 'border-green-600 bg-green-600'
                    : isWrong
                    ? 'border-red-600 bg-red-600'
                    : isSelected
                    ? 'border-white bg-white'
                    : 'border-gray-300 bg-white'
                }`}
              >
                {isCorrect ? (
                  <span className="text-white text-xs font-bold">✓</span>
                ) : isWrong ? (
                  <span className="text-white text-xs font-bold">✗</span>
                ) : isSelected ? (
                  <div className="w-3 h-3 rounded-full bg-[#4A90E2]" />
                ) : null}
              </div>

              <div className="flex items-center gap-3 flex-1 text-left">
                <span
                  className={`text-lg font-bold min-w-[24px] ${
                    isCorrect
                      ? 'text-green-700'
                      : isWrong
                      ? 'text-red-700'
                      : isSelected
                      ? 'text-white'
                      : 'text-gray-800'
                  }`}
                >
                  {option.key}
                </span>
                <span
                  className={`text-base ${
                    isCorrect
                      ? 'text-green-700'
                      : isWrong
                      ? 'text-red-700'
                      : isSelected
                      ? 'text-white'
                      : 'text-gray-700'
                  }`}
                >
                  {optionText || '(kosong)'}
                </span>
              </div>

              {/* ✅ Show check/cross icons in review mode */}
              {isReviewMode && (
                <>
                  {isCorrect && (
                    <span className="text-green-600 font-bold text-xl">✓</span>
                  )}
                  {isWrong && (
                    <span className="text-red-600 font-bold text-xl">✗</span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* ✅ Show correct answer indicator in review mode */}
      {isReviewMode && question.jawaban_benar && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4">
          <p className="text-sm text-gray-700">
            <span className="font-semibold text-[#295782]">
              Jawaban yang benar:
            </span>{' '}
            Opsi {question.jawaban_benar}
          </p>
          {selectedAnswer && selectedAnswer !== question.jawaban_benar && (
            <p className="text-sm text-red-600 mt-1">
              Jawaban Anda: Opsi {selectedAnswer} (Salah)
            </p>
          )}
          {!selectedAnswer && (
            <p className="text-sm text-gray-600 mt-1">
              Anda tidak menjawab soal ini
            </p>
          )}
        </div>
      )}
    </div>
  );
}