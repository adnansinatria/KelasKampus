import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import useTryoutStore from "../../stores/tryoutStore";
import { supabase } from "@/lib/supabase"; // ✅ tambahin ini

// ✅ helper: tanggal hari ini (YYYY-MM-DD)
const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function AddNewTryoutPage() {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);

  const {
    tryoutInfo,
    setTryoutInfo,
    questionsByCategory,
    resetTryout
  } = useTryoutStore();

  const categories = [
    { 
      name: "Tes Potensi Skolastik", 
      subcategories: [
        { id: "kpu", name: "Kemampuan Penalaran Umum" }, 
        { id: "ppu", name: "Pengetahuan dan Pemahaman Umum" },
        { id: "kmbm", name: "Kemampuan Memahami Bacaan dan Menulis" }, 
        { id: "pk", name: "Pengetahuan Kuantitatif" },
      ],
    },
    { 
      name: "Tes Literasi Bahasa", 
      subcategories: [
        { id: "lit-id", name: "Literasi dalam Bahasa Indonesia" }, 
        { id: "lit-en", name: "Literasi dalam Bahasa Inggris" },
      ],
    },
    { 
      name: "Tes Penalaran Matematika", 
      subcategories: [
        { id: "pm", name: "Penalaran Matematika" }
      ],
    },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTryoutInfo({
      ...tryoutInfo,
      [name]: value,
    });
  };

  // ✅ VALIDASI + save ke API
  const handleSaveTryout = async () => {
    const trimmedName = (tryoutInfo.name || "").trim();

    // 1) wajib isi
    if (!trimmedName || !tryoutInfo.tanggal) {
      toast.error("Nama Tryout dan Tanggal Ujian wajib diisi.");
      return;
    }

    // 2) tanggal tidak boleh mundur
    const selectedDate = new Date(tryoutInfo.tanggal);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      toast.error("Tanggal ujian tidak boleh sebelum hari ini.");
      return;
    }

    // 3) minimal 1 kategori soal
    if (Object.keys(questionsByCategory).length === 0) {
      toast.error("Minimal harus ada 1 kategori soal yang diisi.");
      return;
    }

    // 4) nama unik (case-insensitive)
    try {
      const { data: existing, error: checkError } = await supabase
        .from("tryouts")
        .select("id, nama_tryout")
        .ilike("nama_tryout", trimmedName)
        .limit(1);

      if (checkError) {
        console.error("Error checking duplicate:", checkError);
        toast.error("Gagal memeriksa duplikat nama tryout.");
        return;
      }

      if (existing && existing.length > 0) {
        toast.error(`Nama tryout "${trimmedName}" sudah digunakan. Gunakan nama lain.`);
        return;
      }
    } catch (err: any) {
      console.error("❌ Error checking duplicate:", err);
      toast.error("Gagal memeriksa duplikat nama tryout.");
      return;
    }

    setIsSaving(true);

    const savePromise = (async () => {
      console.log("📝 Step 1: Creating tryout via API...");

      try {
        const tryoutResponse = await api.adminCreateTryout({
          nama_tryout: trimmedName,
          tanggal_ujian: tryoutInfo.tanggal,
          kategori: "umum",
          durasi_menit: 180,
          status: "active",
        });

        const tryoutData = tryoutResponse?.data || tryoutResponse;
        const tryoutId = tryoutData.id;

        console.log("✅ Step 1: Tryout created with ID:", tryoutId);

        console.log("📝 Step 2: Inserting questions via API...");

        const questionsToInsert: any[] = [];
        Object.entries(questionsByCategory).forEach(([kategoriId, questions]) => {
          questions.forEach((q: any) => {
            questionsToInsert.push({
              tryout_id: tryoutId,
              kategori_id: kategoriId,
              soal_text: q.question,
              opsi_a: q.optionA,
              opsi_b: q.optionB,
              opsi_c: q.optionC,
              opsi_d: q.optionD,
              jawaban_benar: q.answer,
            });
          });
        });

        await api.adminBulkInsertQuestions(questionsToInsert);

        console.log("✅ Step 2: Questions inserted");
        console.log("🎉 Tryout saved successfully!");

        resetTryout();
        navigate("/admin-tryout");
      } catch (err: any) {
        console.error("❌ Error:", err);
        throw err;
      }
    })();

    toast.promise(savePromise, {
      loading: 'Menyimpan tryout...',
      success: 'Tryout berhasil dibuat!',
      error: (err) => `Gagal menyimpan: ${err.message}`,
    }).finally(() => setIsSaving(false));
  };

  const getTotalQuestions = () => {
    return Object.values(questionsByCategory).reduce(
      (sum, questions) => sum + questions.length,
      0
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8FBFF] to-[#EFF6FF] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header - TIDAK DIUBAH */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/admin-tryout"
            className="p-2 rounded-lg hover:bg-white/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#64748B]" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#1E293B]">Buat Tryout Baru</h1>
            <p className="text-sm text-[#64748B] mt-1">
              Isi informasi tryout dan tambahkan soal per kategori
            </p>
          </div>
        </div>

        {/* Tryout Info Card - TIDAK DIUBAH */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-[#1E293B] mb-4">Informasi Tryout</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1E293B] mb-2">
                Nama Tryout *
              </label>
              <input
                type="text"
                name="name"
                value={tryoutInfo.name}
                onChange={handleInputChange}
                placeholder="Contoh: Tryout UTBK 2025 #1"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#295782]"
                disabled={isSaving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1E293B] mb-2">
                Tanggal Ujian *
              </label>
              <input
                type="date"
                name="tanggal"
                value={tryoutInfo.tanggal}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#295782]"
                disabled={isSaving}
                min={getTodayDate()} // ✅ batas minimal hari ini
              />
            </div>
          </div>
        </div>

        {/* Categories List - TIDAK DIUBAH */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-[#1E293B] mb-4">Kategori Soal</h2>
          <div className="space-y-4">
            {categories.map((category) => (
              <div key={category.name} className="border-b border-gray-100 pb-4 last:border-0">
                <h3 className="text-sm font-semibold text-[#1E293B] mb-2">{category.name}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {category.subcategories.map((sub) => {
                    const count = questionsByCategory[sub.id]?.length || 0;
                    return (
                      <Link
                        key={sub.id}
                        to={`/admin-tryout/new/${sub.id}/questions/new`} 
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-sm text-[#1E293B]">{sub.name}</span>
                        <span className="text-xs px-2 py-1 rounded bg-[#295782]/10 text-[#295782] font-medium">
                          {count} soal
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary Card - TIDAK DIUBAH */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#64748B]">Total Soal</p>
              <p className="text-2xl font-bold text-[#1E293B]">{getTotalQuestions()} Soal</p>
            </div>
            <button
              onClick={handleSaveTryout}
              disabled={isSaving || !tryoutInfo.name || !tryoutInfo.tanggal}
              className="px-6 py-2 bg-[#295782] text-white rounded-lg hover:bg-[#295782]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? "Menyimpan..." : "Simpan Tryout"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
