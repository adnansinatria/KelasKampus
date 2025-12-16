import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Image, X } from "lucide-react";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import useTryoutStore from '../../stores/tryoutStore';

// ✅ UPDATED: Type Definition with pembahasan
interface Question {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  answer: string;
  pembahasan: string;  // ← NEW FIELD
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
  pembahasan: "",  // ← NEW FIELD
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
            pembahasan: q.pembahasan || "",  // ← LOAD FROM DB
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

  const handleRemoveImage = (index: number) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      image: null,
      image_url: "",
    };
    setQuestions(updatedQuestions);
  };

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
      // Upload images
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

      // Save to database
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
          pembahasan: q.pembahasan || null,  // ← KEEP EXISTING PEMBAHASAN
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
          pembahasan: q.pembahasan || null,  // ← SAVE PEMBAHASAN
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
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Memuat soal...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-[#295782] hover:underline mb-6"
          disabled={isSaving}
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </button>

        <h1 className="text-3xl font-bold mb-8 text-gray-800">Tambah Soal Baru</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Daftar Soal</h2>

            {questions.map((q, index) => (
              <div key={index} className="mb-8 pb-8 border-b border-gray-200 last:border-0">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-700">Soal {index + 1}</h3>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQuestion(index)}
                      disabled={isSaving}
                      className="text-red-600 hover:text-red-800 p-2 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Image Upload Section */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gambar Soal (Opsional)
                  </label>
                  {q.image_url ? (
                    <div className="relative inline-block">
                      <img
                        src={q.image_url}
                        alt={`Soal ${index + 1}`}
                        className="max-w-md h-auto rounded-lg border-2 border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        disabled={isSaving}
                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors shadow-md"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer inline-block">
                      <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 border-2 border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                        <Image className="w-5 h-5" />
                        <span className="text-sm font-medium">Upload Gambar</span>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/jpeg,image/png,image/webp,image/jpg"
                        disabled={isSaving}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageChange(index, file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  )}
                  <p className="text-xs text-gray-500 mt-2">Format: JPG, PNG, WEBP. Maks 2MB</p>
                </div>

                {/* Question Text */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pertanyaan
                  </label>
                  <textarea
                    value={q.question}
                    onChange={(e) => handleQuestionChange(index, "question", e.target.value)}
                    disabled={isSaving}
                    required
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Tulis pertanyaan di sini..."
                  />
                </div>

                {/* Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {["A", "B", "C", "D"].map((opt) => (
                    <div key={opt}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Opsi {opt}
                      </label>
                      <input
                        type="text"
                        value={q[`option${opt}` as keyof Question] as string}
                        onChange={(e) => handleQuestionChange(index, `option${opt}` as keyof Question, e.target.value)}
                        disabled={isSaving}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={`Opsi ${opt}`}
                      />
                    </div>
                  ))}
                </div>

                {/* Correct Answer */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Jawaban Benar:
                  </label>
                  <select
                    value={q.answer}
                    onChange={(e) => handleQuestionChange(index, "answer", e.target.value)}
                    disabled={isSaving}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Pilih</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>

                {/* ✅ NEW: Pembahasan Field */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pembahasan (Opsional)
                  </label>
                  <textarea
                    value={q.pembahasan}
                    onChange={(e) => handleQuestionChange(index, "pembahasan", e.target.value)}
                    disabled={isSaving}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Tulis pembahasan jawaban di sini..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Pembahasan akan ditampilkan ke user setelah mengerjakan soal
                  </p>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addQuestion}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Tambah Soal
            </button>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-3 bg-[#295782] text-white font-semibold rounded-lg hover:bg-[#1e3f5f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Menyimpan..." : "Simpan Semua Soal"}
          </button>
        </form>
      </div>
    </div>
  );
}
