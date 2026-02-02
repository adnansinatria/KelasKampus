// client/pages/admin/AddQuestionPage.tsx

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Image, X, HelpCircle } from "lucide-react";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import useTryoutStore from '../../stores/tryoutStore';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Question {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  answer: string;
  pembahasan: string;
  difficulty: number;     // b-parameter
  discrimination: number; // a-parameter (NEW)
  image: File | null;
  image_url: string;
}

const initialQuestion: Question = {
  question: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  answer: "",
  pembahasan: "",
  difficulty: 0, 
  discrimination: 1.0, // Default standar IRT
  image: null,
  image_url: "",
};

export default function AddQuestionPage() {
  const { tryoutId, kategoriId } = useParams<{ tryoutId: string; kategoriId: string }>();
  const navigate = useNavigate();
  const { questionsByCategory, setQuestionsForCategory } = useTryoutStore();
  const [questions, setQuestions] = useState<Question[]>([initialQuestion]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isNewMode = tryoutId === 'new';

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        setIsLoading(true);
        
        if (isNewMode) {
          const storeQuestions = questionsByCategory[kategoriId!] || [];
          if (storeQuestions.length > 0) {
            setQuestions(storeQuestions as Question[]);
          } else {
            setQuestions([{ ...initialQuestion }]);
          }
          setIsLoading(false);
          return;
        }

        const response = await api.adminGetTryoutQuestions(tryoutId!);
        const allQuestions = response?.data || response;

        if (!Array.isArray(allQuestions)) {
          setQuestions([{ ...initialQuestion }]);
          setIsLoading(false);
          return;
        }

        const categoryQuestions: Question[] = allQuestions
          .filter((q: any) => q.kategori_id === kategoriId)
          .map((q: any) => ({
            question: q.soal_text || "",
            optionA: q.opsi_a || "",
            optionB: q.opsi_b || "",
            optionC: q.opsi_c || "",
            optionD: q.opsi_d || "",
            answer: q.jawaban_benar || "",
            pembahasan: q.pembahasan || "",
            difficulty: q.difficulty || 0,
            discrimination: q.discrimination || 1.0, // Load discrimination
            image: null,
            image_url: q.image_url || "",
          }));

        if (categoryQuestions.length > 0) {
          setQuestions(categoryQuestions);
        } else {
          setQuestions([{ ...initialQuestion }]);
        }

      } catch (err: any) {
        console.error("❌ Error loading questions:", err);
        toast.error("Gagal memuat soal dari database");
        setQuestions([{ ...initialQuestion }]);
      } finally {
        setIsLoading(false);
      }
    };

    loadQuestions();
  }, [tryoutId, kategoriId, isNewMode, questionsByCategory]);

  const addQuestion = () => {
    setQuestions([...questions, { ...initialQuestion }]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length === 1) {
      toast.error("Minimal harus ada 1 soal!");
      return;
    }
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleQuestionChange = (index: number, field: keyof Question, value: string | number) => {
    const updatedQuestions = [...questions];
    // @ts-ignore
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setQuestions(updatedQuestions);
  };

  // ... (handleImageChange & uploadImageToStorage SAMA, tidak perlu diubah, disalin ulang saja)
  const handleImageChange = (index: number, file: File | null) => {
    if (!file) return;
    const maxSize = 2 * 1024 * 1024; 
    if (file.size > maxSize) { toast.error('Ukuran gambar maksimal 2MB'); return; }
    const updatedQuestions = [...questions];
    updatedQuestions[index] = { ...updatedQuestions[index], image: file, image_url: URL.createObjectURL(file) };
    setQuestions(updatedQuestions);
  };

  const handleRemoveImage = (index: number) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = { ...updatedQuestions[index], image: null, image_url: "" };
    setQuestions(updatedQuestions);
  };

  const uploadImageToStorage = async (file: File, questionIndex: number): Promise<string> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_q${questionIndex}.${fileExt}`;
      const filePath = fileName;
      const { error: uploadError } = await supabase.storage.from('question-images').upload(filePath, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('question-images').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error: any) {
      console.error('Error uploading image:', error);
      throw new Error(error.message || 'Gagal upload gambar');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = questions.every((q) => q.question && q.optionA && q.optionB && q.optionC && q.optionD && q.answer);
    if (!isValid) { toast.error("Semua field soal harus diisi!"); return; }

    if (isNewMode) {
      setQuestionsForCategory(kategoriId!, questions);
      toast.success("Soal berhasil disimpan! Klik 'Simpan Tryout' untuk menyimpan ke database.");
      navigate(-1);
      return;
    }

    setIsSaving(true);
    try {
      // Upload images logic (sama)
      const questionsWithImages = [...questions];
      for (let i = 0; i < questionsWithImages.length; i++) {
        if (questionsWithImages[i].image && questionsWithImages[i].image instanceof File) {
          try {
            const publicUrl = await uploadImageToStorage(questionsWithImages[i].image!, i);
            questionsWithImages[i].image_url = publicUrl;
          } catch (error: any) {
            toast.error(`Gagal upload gambar soal ${i + 1}`);
            setIsSaving(false); return;
          }
        }
      }

      // Get & Delete logic (sama)
      const allDBQuestions = await api.adminGetTryoutQuestions(tryoutId!);
      const dbQuestionsData = Array.isArray(allDBQuestions?.data) ? allDBQuestions.data : allDBQuestions;
      const otherCategoryQuestions = dbQuestionsData.filter((q: any) => q.kategori_id !== kategoriId);
      await api.adminDeleteQuestions(tryoutId!);

      const allQuestionsToInsert: any[] = [];

      // Keep other category questions (Pastikan difficulty/discrimination terjaga)
      otherCategoryQuestions.forEach((q: any) => {
        allQuestionsToInsert.push({
          tryout_id: tryoutId,
          kategori_id: q.kategori_id,
          urutan: q.urutan || 1,
          soal_text: q.soal_text,
          opsi_a: q.opsi_a, opsi_b: q.opsi_b, opsi_c: q.opsi_c, opsi_d: q.opsi_d,
          jawaban_benar: q.jawaban_benar,
          pembahasan: q.pembahasan || null,
          difficulty: q.difficulty || 0,
          discrimination: q.discrimination || 1.0,
          image_url: q.image_url || null,
        });
      });

      // Add current category questions (INCLUDE NEW PARAMS)
      questionsWithImages.forEach((q, index) => {
        allQuestionsToInsert.push({
          tryout_id: tryoutId,
          kategori_id: kategoriId,
          urutan: index + 1,
          soal_text: q.question,
          opsi_a: q.optionA, opsi_b: q.optionB, opsi_c: q.optionC, opsi_d: q.optionD,
          jawaban_benar: q.answer,
          pembahasan: q.pembahasan || null,
          difficulty: Number(q.difficulty) || 0,
          discrimination: Number(q.discrimination) || 1.0, // ✅ SAVE DISCRIMINATION
          image_url: q.image_url || null,
        });
      });

      await api.adminBulkInsertQuestions(allQuestionsToInsert);
      setQuestionsForCategory(kategoriId!, questionsWithImages);
      toast.success("Semua soal berhasil disimpan!");
      navigate(-1);

    } catch (err: any) {
      console.error("❌ Error saving questions:", err);
      toast.error(`Gagal menyimpan: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-5xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-[#295782] hover:underline mb-6" disabled={isSaving}>
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>

        <h1 className="text-3xl font-bold mb-8 text-gray-800">Tambah Soal Baru</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            {questions.map((q, index) => (
              <div key={index} className="mb-8 pb-8 border-b border-gray-200 last:border-0">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-700">Soal {index + 1}</h3>
                  {questions.length > 1 && (
                    <button type="button" onClick={() => removeQuestion(index)} disabled={isSaving} className="text-red-600 hover:text-red-800 p-2">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* ✅ SECTION: IRT PARAMETERS (Updated) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Difficulty & Discrimination Card */}
                  <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 space-y-4">
                    
                    {/* Difficulty Control */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm font-medium text-blue-900 flex items-center gap-2">
                          Tingkat Kesulitan (Difficulty)
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild><HelpCircle className="w-3 h-3 text-blue-400 cursor-help" /></TooltipTrigger>
                              <TooltipContent><p className="text-xs">-3.0 (Mudah) s/d +3.0 (Sulit)</p></TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </label>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                          q.difficulty < -0.5 ? 'bg-green-100 text-green-700' : q.difficulty > 0.5 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>{q.difficulty}</span>
                      </div>
                      <input 
                        type="range" min="-3" max="3" step="0.1" value={q.difficulty}
                        onChange={(e) => handleQuestionChange(index, "difficulty", parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>

                    {/* Discrimination Control */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm font-medium text-blue-900 flex items-center gap-2">
                          Daya Beda (Discrimination)
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild><HelpCircle className="w-3 h-3 text-blue-400 cursor-help" /></TooltipTrigger>
                              <TooltipContent><p className="text-xs">Seberapa baik soal membedakan kemampuan. Standar: 1.0 (0.5 - 2.5)</p></TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </label>
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">{q.discrimination}</span>
                      </div>
                      <input 
                        type="range" min="0.1" max="3" step="0.1" value={q.discrimination}
                        onChange={(e) => handleQuestionChange(index, "discrimination", parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Gambar Soal (Opsional)</label>
                    {q.image_url ? (
                      <div className="relative inline-block group">
                        <img src={q.image_url} alt="Soal" className="h-28 w-auto object-cover rounded-lg border" />
                        <button type="button" onClick={() => handleRemoveImage(index)} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex items-center justify-center h-28 w-full border-2 border-dashed border-gray-300 rounded-lg hover:bg-blue-50">
                        <div className="flex flex-col items-center gap-1">
                          <Image className="w-6 h-6 text-gray-400" /><span className="text-xs text-gray-500">Upload</span>
                        </div>
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageChange(index, e.target.files[0])} />
                      </label>
                    )}
                  </div>
                </div>

                {/* Question Inputs */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pertanyaan</label>
                    <textarea value={q.question} onChange={(e) => handleQuestionChange(index, "question", e.target.value)} rows={3} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {["A", "B", "C", "D"].map((opt) => (
                      <div key={opt}>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Opsi {opt}</label>
                        <input type="text" value={q[`option${opt}` as keyof Question] as string} onChange={(e) => handleQuestionChange(index, `option${opt}` as keyof Question, e.target.value)} className="w-full px-3 py-2 border rounded-lg" required />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-4">
                    <div className="w-1/3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Jawaban Benar</label>
                      <select value={q.answer} onChange={(e) => handleQuestionChange(index, "answer", e.target.value)} className="w-full px-3 py-2 border rounded-lg" required>
                        <option value="">Pilih</option><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
                      </select>
                    </div>
                    <div className="w-2/3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pembahasan</label>
                      <input type="text" value={q.pembahasan} onChange={(e) => handleQuestionChange(index, "pembahasan", e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <button type="button" onClick={addQuestion} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              <Plus className="w-5 h-5" /> Tambah Soal
            </button>
          </div>
          <button type="submit" disabled={isSaving} className="w-full py-3 bg-[#295782] text-white font-semibold rounded-lg hover:bg-[#1e3f5f] disabled:opacity-50">
            {isSaving ? "Menyimpan..." : "Simpan Semua Soal"}
          </button>
        </form>
      </div>
    </div>
  );
}