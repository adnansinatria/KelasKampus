// src/pages/admin/EditTryout.tsx

import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import useTryoutStore from "../../stores/tryoutStore";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";

const CATEGORIES = [
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
    subcategories: [{ id: "pm", name: "Penalaran Matematika" }],
  },
];

export default function EditTryout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("active");
  
  const { 
    tryoutInfo, 
    setTryoutInfo, 
    questionsByCategory, 
    setQuestionsForCategory, 
    resetTryout 
  } = useTryoutStore();

  // ✅ PERBAIKAN: Fetch tryout data dengan reset store terlebih dahulu
  const fetchTryoutDetail = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("🔍 Fetching tryout detail for edit:", id);

      // ✅ STEP 0: RESET STORE SEBELUM FETCH DATA BARU
      console.log("🔄 Resetting store...");
      resetTryout();

      // ✅ Fetch tryout info
      const { data: tryoutData, error: tryoutError } = await supabase
        .from("tryouts")
        .select("*")
        .eq("id", id)
        .single();

      if (tryoutError) throw tryoutError;

      console.log("📊 Tryout data loaded:", tryoutData);

      setTryoutInfo({
        id: tryoutData.id,
        name: tryoutData.nama_tryout,
        tanggal: tryoutData.tanggal_ujian,
      });

      setStatus(tryoutData.status || "active");

      // ✅ Fetch questions by category
      const { data: soalData, error: soalError } = await supabase
        .from("questions")
        .select("*")
        .eq("tryout_id", id);

      if (soalError) throw soalError;

      console.log(`📝 Loaded ${soalData.length} questions for tryout ${id}`);

      // ✅ Group questions by kategori_id
      const questionsByKategori: Record<string, any[]> = {};
      
      soalData.forEach((q: any) => {
        if (!questionsByKategori[q.kategori_id]) {
          questionsByKategori[q.kategori_id] = [];
        }

        questionsByKategori[q.kategori_id].push({
          question: q.soal_text,
          optionA: q.opsi_a,
          optionB: q.opsi_b,
          optionC: q.opsi_c,
          optionD: q.opsi_d,
          answer: q.jawaban_benar,
        });
      });

      // ✅ Set questions to store
      Object.entries(questionsByKategori).forEach(([kategoriId, questions]) => {
        console.log(`✅ Setting ${questions.length} questions for kategori ${kategoriId}`);
        setQuestionsForCategory(kategoriId, questions);
      });

      console.log("✅ All questions loaded to store");

    } catch (err: any) {
      console.error("❌ Error:", err);
      setError(err.message);
      toast.error(`Gagal memuat tryout: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ PERBAIKAN: Re-fetch setiap kali ID berubah
  useEffect(() => {
    if (id) {
      fetchTryoutDetail();
    }

    // ✅ Cleanup: Reset store saat component unmount
    return () => {
      console.log("🧹 Cleanup: Resetting store on unmount");
      resetTryout();
    };
  }, [id]); // ✅ Dependency pada 'id'

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTryoutInfo({
      ...tryoutInfo,
      [name]: value,
    });
  };

  const handleUpdateTryout = async () => {
    if (!tryoutInfo.name || !tryoutInfo.tanggal) {
      toast.error("Nama Tryout dan Tanggal Ujian wajib diisi.");
      return;
    }

    setIsSaving(true);

    const updatePromise = (async () => {
      console.log("📝 Step 1: Updating tryout info...");

      // ✅ Update tryout info
      const { error: updateError } = await supabase
        .from("tryouts")
        .update({
          nama_tryout: tryoutInfo.name,
          tanggal_ujian: tryoutInfo.tanggal,
          status: status,
        })
        .eq("id", id);

      if (updateError) throw updateError;
      console.log("✅ Step 1: Info updated");

      // ✅ Delete old questions
      console.log("📝 Step 2: Deleting old questions...");
      const { error: deleteError } = await supabase
        .from("questions")
        .delete()
        .eq("tryout_id", id);

      if (deleteError) {
        console.warn("⚠️ Warning: Failed to delete old questions:", deleteError);
      } else {
        console.log("✅ Step 2: Old questions deleted");
      }

      // ✅ Insert new questions
      if (Object.keys(questionsByCategory).length > 0) {
        console.log("📝 Step 3: Inserting new questions...");
        const questionsToInsert: any[] = [];

        Object.entries(questionsByCategory).forEach(([kategoriId, questions]) => {
          questions.forEach((q: any) => {
            questionsToInsert.push({
              tryout_id: id,
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

        console.log(`💾 Inserting ${questionsToInsert.length} questions...`);

        const { error: insertError } = await supabase
          .from("questions")
          .insert(questionsToInsert);

        if (insertError) throw insertError;
        console.log("✅ Step 3: New questions inserted");
      }

      console.log("🎉 All steps completed!");
      resetTryout();
      navigate("/admin-tryout");
    })();

    toast.promise(updatePromise, {
      loading: 'Menyimpan perubahan...',
      success: 'Tryout berhasil diupdate!',
      error: (err) => `Gagal mengupdate: ${err.message}`,
    }).finally(() => setIsSaving(false));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#295782] mx-auto mb-4"></div>
          <p className="text-[#64748B]">Memuat data tryout...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <Link
            to="/admin-tryout"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#295782] text-white rounded-lg hover:bg-[#295782]/90"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Daftar Tryout
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate("/admin-tryout")}
        className="flex items-center gap-2 text-sm text-[#295782] hover:underline mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali ke Daftar Tryout
      </button>

      {/* Bagian 1: Informasi Tryout */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-bold text-[#1E293B] mb-2">Edit Tryout</h2>
        <p className="text-sm text-[#64748B] mb-6">
          Edit informasi tryout dan kelola soal-soal yang ada
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-[#64748B] mb-2">
              Nama Tryout
            </label>
            <input
              type="text"
              name="name"
              value={tryoutInfo.name}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#295782] focus:border-transparent"
              placeholder="Contoh: Tryout SNBT 2025 #1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#64748B] mb-2">
              Tanggal Ujian
            </label>
            <input
              type="date"
              name="tanggal"
              value={tryoutInfo.tanggal}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#295782] focus:border-transparent"
            />
          </div>
        </div>

        {/* Status Toggle */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[#64748B] mb-2">
            Status Tryout
          </label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="active"
                checked={status === "active"}
                onChange={(e) => setStatus(e.target.value)}
                className="w-4 h-4 text-[#295782] focus:ring-[#295782]"
              />
              <span className="text-sm text-[#1E293B]">Aktif</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="inactive"
                checked={status === "inactive"}
                onChange={(e) => setStatus(e.target.value)}
                className="w-4 h-4 text-[#295782] focus:ring-[#295782]"
              />
              <span className="text-sm text-[#1E293B]">Nonaktif</span>
            </label>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Tryout yang nonaktif tidak akan ditampilkan ke siswa
          </p>
        </div>
      </div>

      {/* Bagian 2: Kelola Kategori Soal */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-bold text-[#1E293B] mb-2">Kelola Kategori Soal</h3>
        <p className="text-sm text-[#64748B] mb-4">
          Klik "Tambah/Edit Soal" untuk mengubah soal di kategori tertentu
        </p>

        {CATEGORIES.map((cat) => (
          <div key={cat.name} className="mb-6">
            <h4 className="text-md font-semibold text-[#295782] mb-3">{cat.name}</h4>
            <div className="space-y-2">
              {cat.subcategories.map((sub) => {
                const savedQuestions = questionsByCategory[sub.id] || [];
                const hasQuestions = savedQuestions.length > 0;

                return (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-[#1E293B]">{sub.name}</p>
                      {hasQuestions && (
                        <p className="text-xs text-green-600 mt-1">
                          {savedQuestions.length} soal tersimpan
                        </p>
                      )}
                    </div>
                    <Link
                      to={`/admin-tryout/edit-question/${id}/${sub.id}`}
                      className="px-4 py-2 text-sm bg-[#295782] text-white rounded-lg hover:bg-[#295782]/90"
                    >
                      {hasQuestions ? "✏️ Edit Soal" : "+ Tambah Soal"}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => navigate("/admin-tryout")}
          className="px-6 py-2 border border-gray-300 text-[#64748B] rounded-lg hover:bg-gray-50"
        >
          Batal
        </button>
        <button
          onClick={handleUpdateTryout}
          disabled={isSaving}
          className="px-6 py-2 bg-[#295782] text-white rounded-lg hover:bg-[#295782]/90 disabled:opacity-50 flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </div>
    </div>
  );
}