import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import useTryoutStore from '../../stores/tryoutStore';

const initialQuestion = { question: "", optionA: "", optionB: "", optionC: "", optionD: "", answer: "" };

export default function AddQuestionPage() {
  const { tryoutId, kategoriId } = useParams();
  const navigate = useNavigate();

  const { questionsByCategory, setQuestionsForCategory, resetTryout } = useTryoutStore();
  
  const [questions, setQuestions] = useState([initialQuestion]); // ✅ CHANGED: Default empty
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isNewMode = tryoutId === 'new';

  useEffect(() => {
    return () => {
      console.log("🧹 AddQuestionPage unmounting");
      
      if (isNewMode) {
        console.log(`🧹 Clearing kategori ${kategoriId} from store`);
        setQuestionsForCategory(kategoriId, []); // Clear empty array
      }
    };
  }, [kategoriId, isNewMode, setQuestionsForCategory]);

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        setIsLoading(true);
        
        // ✅ NEW: Detect if 'new' mode (from AddTryout)
        if (isNewMode) {
          console.log("🆕 New mode detected, loading from store");
          const storeQuestions = questionsByCategory[kategoriId] || [];
          if (storeQuestions.length > 0) {
            setQuestions(storeQuestions);
          } else {
            setQuestions([initialQuestion]);
          }
          setIsLoading(false);
          return; // ✅ STOP here, don't call API
        }

        // ✅ ONLY call API if NOT 'new' mode (edit mode)
        console.log("✏️ Edit mode detected, loading from database");
        
        const response = await api.adminGetTryoutQuestions(tryoutId);
        const allQuestions = response?.data || response;

        if (!Array.isArray(allQuestions)) {
          setQuestions([initialQuestion]);
          setIsLoading(false);
          return;
        }

        const categoryQuestions = allQuestions
          .filter((q: any) => q.kategori_id === kategoriId)
          .map((q: any) => ({
            question: q.soal_text,
            optionA: q.opsi_a,
            optionB: q.opsi_b,
            optionC: q.opsi_c,
            optionD: q.opsi_d,
            answer: q.jawaban_benar,
          }));

        if (categoryQuestions.length > 0) {
          setQuestions(categoryQuestions);
        } else {
          setQuestions([initialQuestion]);
        }
      } catch (err: any) {
        console.error("❌ Error loading questions:", err);
        toast.error("Gagal memuat soal dari database");
        setQuestions([initialQuestion]);
      } finally {
        setIsLoading(false);
      }
    };

    loadQuestions();
  }, [tryoutId, kategoriId, isNewMode]);

  const addQuestion = () => {
    setQuestions([...questions, { ...initialQuestion }]); // ✅ Use spread to avoid reference
  };

  const removeQuestion = (index) => {
    if (questions.length === 1) {
      toast.error("Minimal harus ada 1 soal!");
      return;
    }
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleQuestionChange = (index, field, value) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index][field] = value;
    setQuestions(updatedQuestions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isValid = questions.every(
      (q) => q.question && q.optionA && q.optionB && q.optionC && q.optionD && q.answer
    );

    if (!isValid) {
      toast.error("Semua field soal harus diisi!");
      return;
    }

    // ✅ NEW: If 'new' mode, save to store only
    if (isNewMode) {
      console.log("💾 Saving to store (new mode)");
      setQuestionsForCategory(kategoriId, questions);
      toast.success("Soal berhasil disimpan! Klik 'Simpan Tryout' untuk menyimpan ke database.");
      navigate(-1);
      return; // ✅ STOP here, don't call API
    }

    // ✅ ONLY save to API if NOT 'new' mode (edit mode)
    console.log("📝 Saving questions to database (edit mode)...");

    setIsSaving(true);

    try {
      const allDBQuestions = await api.adminGetTryoutQuestions(tryoutId);
      const dbQuestionsData = Array.isArray(allDBQuestions?.data) 
        ? allDBQuestions.data 
        : allDBQuestions;

      const otherCategoryQuestions = dbQuestionsData.filter(
        (q: any) => q.kategori_id !== kategoriId
      );

      await api.adminDeleteQuestions(tryoutId);

      const allQuestionsToInsert: any[] = [];

      otherCategoryQuestions.forEach((q: any) => {
        allQuestionsToInsert.push({
          tryout_id: tryoutId,
          kategori_id: q.kategori_id,
          urutan: q.urutan || 1,
          soal_text: q.soal_text,
          opsi_a: q.opsi_a,
          opsi_b: q.opsi_b,
          opsi_c: q.opsi_c,
          opsi_d: q.opsi_d,
          jawaban_benar: q.jawaban_benar,
        });
      });

      questions.forEach((q, index) => {
        allQuestionsToInsert.push({
          tryout_id: tryoutId,
          kategori_id: kategoriId,
          urutan: index + 1,
          soal_text: q.question,
          opsi_a: q.optionA,
          opsi_b: q.optionB,
          opsi_c: q.optionC,
          opsi_d: q.optionD,
          jawaban_benar: q.answer,
        });
      });

      await api.adminBulkInsertQuestions(allQuestionsToInsert);

      setQuestionsForCategory(kategoriId, questions);
      toast.success("Semua soal berhasil disimpan!");
      
      console.log(`✅ Saved ${questions.length} questions for kategori ${kategoriId}`);
      navigate(-1);
    } catch (err: any) {
      console.error("❌ Error saving questions:", err);
      toast.error(`Gagal menyimpan: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FBFF] px-6 py-8">
        <div className="max-w-4xl mx-auto bg-white shadow rounded-2xl p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#295782] mx-auto mb-4"></div>
              <p className="text-[#64748B]">Memuat soal...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FBFF] px-6 py-8">
      <div className="max-w-4xl mx-auto bg-white shadow rounded-2xl p-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-[#295782] hover:underline mb-6"
          disabled={isSaving}
        >
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>

        <h1 className="text-2xl font-bold text-[#1E293B] mb-6">Tambah Soal Baru</h1>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <h2 className="text-lg font-semibold text-[#1E293B] mb-4">Daftar Soal</h2>

            {questions.map((q, index) => (
              <div key={index} className="border rounded-xl p-4 mb-4 bg-[#F9FBFF]">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium text-[#1E293B]">Soal {index + 1}</h3>
                  {questions.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => removeQuestion(index)}
                      disabled={isSaving}
                    >
                      <Trash2 className="w-4 h-4 text-red-500 hover:text-red-700" />
                    </button>
                  )}
                </div>

                <textarea
                  className="w-full border rounded-lg px-3 py-2 text-sm mb-3 focus:ring-2 focus:ring-[#295782]"
                  placeholder="Tulis pertanyaan..."
                  value={q.question}
                  onChange={(e) => handleQuestionChange(index, "question", e.target.value)}
                  disabled={isSaving}
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
                      disabled={isSaving}
                      required
                    />
                  ))}
                </div>

                <div className="mt-3">
                  <label className="text-sm text-[#64748B] mr-2">Jawaban Benar:</label>
                  <select
                    className="border rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-[#295782]"
                    value={q.answer}
                    onChange={(e) => handleQuestionChange(index, "answer", e.target.value)}
                    disabled={isSaving}
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

            <button
              type="button"
              onClick={addQuestion}
              disabled={isSaving}
              className="flex items-center gap-2 text-[#295782] text-sm hover:underline mt-4"
            >
              <Plus className="w-4 h-4" /> Tambah Soal
            </button>
          </div>

          <div className="pt-4 border-t">
            <button
              type="submit"
              disabled={isSaving}
              className="bg-[#295782] text-white px-6 py-2.5 rounded-lg hover:bg-[#295782]/90 transition-colors text-sm font-medium"
            >
              {isSaving ? "Menyimpan..." : "Simpan Semua Soal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}