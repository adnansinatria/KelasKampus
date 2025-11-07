import { useState } from 'react';

export interface Question {
  id: string;
  soal_text: string;    // ✅ DARI DATABASE
  opsi_a: string;
  opsi_b: string;
  opsi_c: string;
  opsi_d: string;
  opsi_e?: string;
  urutan: number;
  jawaban_benar?: string;
}

interface Props {
  question: Question;
  selectedAnswer?: string;
  onAnswerSelect: (answer: string) => void;
  isSaving: boolean;
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
  isSaving
}: Props) {
  // ✅ Debug logs
  console.log('📍 QuestionDisplay received:');
  console.log('  - question:', question);
  console.log('  - soal_text:', question?.soal_text);
  console.log('  - opsi_a:', question?.opsi_a);
  console.log('  - opsi_b:', question?.opsi_b);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-lg text-gray-800 mb-6">
          {question?.soal_text || '⚠️ SOAL KOSONG'}  {/* ✅ CHANGED: soal_text */}
        </h2>
      </div>

      <div className="space-y-3">
        {OPTIONS.map((option) => {
          const optionText = question[option.value as keyof Question] as string;
          const isSelected = selectedAnswer === option.key;

          return (
            <button
              key={option.key}
              onClick={() => onAnswerSelect(option.key)}
              disabled={isSaving}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                isSelected
                  ? 'bg-[#295782] border-[#295782] shadow-md'
                  : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50'
              } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  isSelected ? 'border-white bg-white' : 'border-gray-300 bg-white'
                }`}
              >
                {isSelected && (
                  <div className="w-3 h-3 rounded-full bg-[#4A90E2]" />
                )}
              </div>

              <div className="flex items-center gap-3 flex-1 text-left">
                <span
                  className={`text-lg font-bold min-w-[24px] ${
                    isSelected ? 'text-white' : 'text-gray-800'
                  }`}
                >
                  {option.key}
                </span>
                <span
                  className={`text-base ${
                    isSelected ? 'text-white' : 'text-gray-700'
                  }`}
                >
                  {optionText || '(kosong)'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}