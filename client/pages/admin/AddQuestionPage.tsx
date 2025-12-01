// AddQuestionPage.tsx - FULL CODE WITH IMAGE FEATURE
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Image, X } from "lucide-react";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import useTryoutStore from '../../stores/tryoutStore';

// ✅ Type Definition
interface Question {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  answer: string;
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
  image: null,
  image_url: "",
};

export default function AddQuestionPage() {
  const { tryoutId, kategoriId } = useParams<{ tryoutId: string; kategoriId: string }>();
  const navigate = useNavigate();

  const { questionsByCategory, setQuestionsForCategory, resetTryout } = useTryoutStore();
  
  const [questions, setQuestions] = useState<Question[]>([initialQuestion]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isNewMode = tryoutId === 'new';

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        setIsLoading(true);
        
        if (isNewMode) {
          console.log("🆕 New mode detected, loading from store");
          const storeQuestions = questionsByCategory[kategoriId!] || [];
          if (storeQuestions.length > 0) {
            setQuestions(storeQuestions as Question[]);
          } else {
            setQuestions([{ ...initialQuestion }]);
          }
          setIsLoading(false);
          return;
        }

        console.log("✏️ Edit mode detected, loading from database");
        
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

  const handleQuestionChange = (index: number, field: keyof Question, value: string) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setQuestions(updatedQuestions);
  };

  // ✅ NEW: Handle image upload
  const handleImageChange = (index: number, file: File | null) => {
    if (!file) return;

    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      toast.error('Ukuran gambar maksimal 2MB');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Format tidak didukung. Gunakan JPG, PNG, atau WEBP.');
      return;
    }

    const updatedQuestions = [...questions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      image: file,
      image_url: URL.createObjectURL(file),
    };
    setQuestions(updatedQuestions);
  };

  // ✅ NEW: Remove image
  const handleRemoveImage = (index: number) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      image: null,
      image_url: "",
    };
    setQuestions(updatedQuestions);
  };

  // ✅ NEW: Upload image to Supabase Storage
  const uploadImageToStorage = async (file: File, questionIndex: number): Promise<string> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_q${questionIndex}.${fileExt}`;
      const filePath = fileName;

      console.log(`📤 Uploading image ${questionIndex + 1}:`, fileName);

      const { error: uploadError } = await supabase.storage
        .from('question-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        
        if (uploadError.message.includes('exceeded')) {
          throw new Error('File terlalu besar. Maksimal 2MB.');
        }
        if (uploadError.message.includes('type')) {
          throw new Error('Format file tidak didukung.');
        }
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('question-images')
        .getPublicUrl(filePath);

      console.log(`✅ Uploaded image ${questionIndex + 1}:`, data.publicUrl);
      return data.publicUrl;
    } catch (error: any) {
      console.error('Error uploading image:', error);
      throw new Error(error.message || 'Gagal upload gambar');
    }
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

    if (isNewMode) {
      console.log("💾 Saving to store (new mode)");
      setQuestionsForCategory(kategoriId!, questions);
      toast.success("Soal berhasil disimpan! Klik 'Simpan Tryout' untuk menyimpan ke database.");
      navigate(-1);
      return;
    }

    console.log("📝 Saving questions to database (edit mode)...");
    setIsSaving(true);

    try {
      // ✅ Step 1: Upload all new images
      console.log('📤 Uploading images...');
      const questionsWithImages = [...questions];
      
      for (let i = 0; i < questionsWithImages.length; i++) {
        if (questionsWithImages[i].image && questionsWithImages[i].image instanceof File) {
          try {
            const publicUrl = await uploadImageToStorage(questionsWithImages[i].image!, i);
            questionsWithImages[i].image_url = publicUrl;
          } catch (error: any) {
            console.error(`❌ Failed to upload image ${i + 1}:`, error);
            toast.error(`Gagal upload gambar soal ${i + 1}: ${error.message}`);
            setIsSaving(false);
            return;
          }
        }
      }
      
      console.log('✅ All images uploaded successfully');

      // ✅ Step 2: Save to database
      const allDBQuestions = await api.adminGetTryoutQuestions(tryoutId!);
      const dbQuestionsData = Array.isArray(allDBQuestions?.data) 
        ? allDBQuestions.data 
        : allDBQuestions;

      const otherCategoryQuestions = dbQuestionsData.filter(
        (q: any) => q.kategori_id !== kategoriId
      );

      await api.adminDeleteQuestions(tryoutId!);

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
          image_url: q.image_url || null,
        });
      });

      questionsWithImages.forEach((q, index) => {
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
          image_url: q.image_url || null,
        });
      });

      await api.adminBulkInsertQuestions(allQuestionsToInsert);

      setQuestionsForCategory(kategoriId!, questionsWithImages);
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

                {/* ✅ NEW: Image Upload Section - DI ATAS TEXTAREA */}
                <div className="mb-3">
                  <label className="flex items-center gap-2 text-xs font-medium text-[#64748B] mb-2">
                    <Image className="w-3.5 h-3.5" />
                    Gambar Soal (Opsional)
                  </label>
                  
                  {q.image_url ? (
                    // Preview image
                    <div className="relative inline-block">
                      <img 
                        src={q.image_url} 
                        alt="Preview soal" 
                        className="max-w-full h-auto max-h-40 rounded-lg border-2 border-[#E2E8F0]"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        disabled={isSaving}
                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors shadow-md"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    // Upload button
                    <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#F1F5F9] text-[#295782] border border-[#CBD5E1] rounded-lg cursor-pointer hover:bg-[#E2E8F0] transition-colors text-xs">
                      <Image className="w-3.5 h-3.5" />
                      <span className="font-medium">Upload Gambar</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={isSaving}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageChange(index, file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  )}
                  
                  <p className="text-[10px] text-[#94A3B8] mt-1">
                    Format: JPG, PNG, WEBP. Maks 2MB
                  </p>
                </div>

                {/* Textarea Pertanyaan */}
                <textarea
                  className="w-full border rounded-lg px-3 py-2 text-sm mb-3 focus:ring-2 focus:ring-[#295782] focus:border-transparent"
                  placeholder="Tulis pertanyaan..."
                  rows={3}
                  value={q.question}
                  onChange={(e) => handleQuestionChange(index, "question", e.target.value)}
                  disabled={isSaving}
                  required
                />

                {/* Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {["A", "B", "C", "D"].map((opt) => (
                    <input
                      key={opt}
                      type="text"
                      placeholder={`Opsi ${opt}`}
                      className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#295782] focus:border-transparent"
                      value={q[`option${opt}` as keyof Question] as string}
                      onChange={(e) => handleQuestionChange(index, `option${opt}` as keyof Question, e.target.value)}
                      disabled={isSaving}
                      required
                    />
                  ))}
                </div>

                {/* Answer Selection */}
                <div className="mt-3">
                  <label className="text-sm text-[#64748B] mr-2">Jawaban Benar:</label>
                  <select
                    className="border rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-[#295782] focus:border-transparent"
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
              className="flex items-center gap-2 text-[#295782] text-sm hover:underline mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" /> Tambah Soal
            </button>
          </div>

          <div className="pt-4 border-t">
            <button
              type="submit"
              disabled={isSaving}
              className="bg-[#295782] text-white px-6 py-2.5 rounded-lg hover:bg-[#295782]/90 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Menyimpan..." : "Simpan Semua Soal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
