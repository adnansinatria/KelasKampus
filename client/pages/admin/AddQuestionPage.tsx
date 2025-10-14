import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import useTryoutStore from '../../stores/tryoutStore';

const initialQuestion = { question: "", optionA: "", optionB: "", optionC: "", optionD: "", answer: "" };

export default function AddQuestionPage() {
  const { tryoutId, kategoriId } = useParams();
  const navigate = useNavigate();

  const { questionsByCategory, setQuestionsForCategory } = useTryoutStore();
  
  const [questions, setQuestions] = useState(
    questionsByCategory[kategoriId] || [initialQuestion]
  );

//   // 🔹 PERUBAHAN: State diubah menjadi array of objects untuk menangani banyak soal
//   const [questions, setQuestions] = useState([
//     { question: "", optionA: "", optionB: "", optionC: "", optionD: "", answer: "" },
//   ]);

  // Fungsi untuk menambah object soal baru ke dalam state array
  const addQuestion = () => {
    setQuestions([...questions, initialQuestion]);
  };

  // Fungsi untuk menghapus soal dari state array berdasarkan index-nya
  const removeQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  // Fungsi terpusat untuk menangani perubahan pada setiap input soal
  const handleQuestionChange = (index, field, value) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index][field] = value;
    setQuestions(updatedQuestions);
  };

  // Fungsi saat form di-submit
  const handleSubmit = (e) => {
    e.preventDefault();
    setQuestionsForCategory(kategoriId, questions);
    
    console.log(`Soal untuk kategori ${kategoriId} telah disimpan ke store:`, questions);
    navigate(-1); 
  };

  return (
    <div className="min-h-screen bg-[#F8FBFF] px-6 py-8">
      <div className="max-w-4xl mx-auto bg-white shadow rounded-2xl p-6">
        <button
          onClick={() => navigate(-1)} // Kembali ke halaman sebelumnya
          className="flex items-center gap-2 text-sm text-[#295782] hover:underline mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>

        <h1 className="text-2xl font-bold text-[#1E293B] mb-6">Tambah Soal Baru</h1>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <h2 className="text-lg font-semibold text-[#1E293B] mb-4">Daftar Soal</h2>

            {questions.map((q, index) => (
              // 🔹 PERUBAHAN: Setiap soal dibungkus dalam card terpisah
              <div key={index} className="border rounded-xl p-4 mb-4 bg-[#F9FBFF]">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium text-[#1E293B]">Soal {index + 1}</h3>
                  {questions.length > 1 && ( // Tombol hapus hanya muncul jika ada lebih dari 1 soal
                    <button type="button" onClick={() => removeQuestion(index)}>
                      <Trash2 className="w-4 h-4 text-red-500 hover:text-red-700" />
                    </button>
                  )}
                </div>

                <textarea
                  className="w-full border rounded-lg px-3 py-2 text-sm mb-3 focus:ring-2 focus:ring-[#295782]"
                  placeholder="Tulis pertanyaan..."
                  value={q.question}
                  onChange={(e) => handleQuestionChange(index, "question", e.target.value)}
                  required
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {["A", "B", "C", "D"].map((opt) => (
                    <input
                      key={opt}
                      type="text"
                      placeholder={`Opsi ${opt}`}
                      className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#295782]"
                      value={q[`option${opt}`]}
                      onChange={(e) => handleQuestionChange(index, `option${opt}`, e.target.value)}
                      required
                    />
                  ))}
                </div>

                {/* 🔹 PERUBAHAN: Input jawaban benar menjadi dropdown */}
                <div className="mt-3">
                  <label className="text-sm text-[#64748B] mr-2">Jawaban Benar:</label>
                  <select
                    className="border rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-[#295782]"
                    value={q.answer}
                    onChange={(e) => handleQuestionChange(index, "answer", e.target.value)}
                    required
                  >
                    <option value="">Pilih</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>
              </div>
            ))}

            {/* Tombol untuk menambah soal baru */}
            <button
              type="button"
              onClick={addQuestion}
              className="flex items-center gap-2 text-[#295782] text-sm hover:underline mt-4"
            >
              <Plus className="w-4 h-4" /> Tambah Soal
            </button>
          </div>

          <div className="pt-4 border-t">
            <button
              type="submit"
              className="bg-[#295782] text-white px-6 py-2.5 rounded-lg hover:bg-[#295782]/90 transition-colors text-sm font-medium"
            >
              Simpan Semua Soal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}