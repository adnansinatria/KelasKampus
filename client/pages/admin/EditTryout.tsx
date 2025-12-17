import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import useTryoutStore from "../../stores/tryoutStore";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";

interface Question {
  id?: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  answer: string;
  pembahasan: string;
  image: File | null;
  image_url: string;
}

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

// Helper: today in YYYY-MM-DD 
const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function EditTryout() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("active");
  const [originalName, setOriginalName] = useState(""); 

  const {
    tryoutInfo,
    setTryoutInfo,
    questionsByCategory,
    setQuestionsForCategory,
    resetTryout,
  } = useTryoutStore();

  // Fetch detail tryout + soal
  const fetchTryoutDetail = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("ðŸ” Fetching tryout detail for edit:", id);

      console.log("ðŸ”„ Resetting store...");
      resetTryout();

      const tryoutResponse = await api.adminGetTryoutDetail(id!);
      const tryoutData = tryoutResponse?.data || tryoutResponse;

      console.log("ðŸ“Š Tryout data loaded:", tryoutData);

      setTryoutInfo({
        id: tryoutData.id,
        name: tryoutData.nama_tryout,
        tanggal:
          tryoutData.tanggal_ujian?.split("T")[0] ||
          tryoutData.tanggal_ujian,
        durasi: tryoutData.durasi_menit?.toString() || "180",
      });

      setOriginalName(tryoutData.nama_tryout || "");
      setStatus(tryoutData.status || "active");

      const questionsResponse = await api.adminGetTryoutQuestions(id!);
      const questionsData = questionsResponse?.data || questionsResponse;

      console.log("ðŸ“Š Questions response:", questionsResponse);
      console.log("ðŸ“ Questions data:", questionsData);

      if (!Array.isArray(questionsData)) {
        throw new Error("Invalid questions data format - expected array");
      }

      console.log(
        `ðŸ“ Loaded ${questionsData.length} questions for tryout ${id}`
      );

      const questionsByKategori: Record<string, Question[]> = {};

      questionsData.forEach((q: any) => {
        if (!questionsByKategori[q.kategori_id]) {
          questionsByKategori[q.kategori_id] = [];
        }

        questionsByKategori[q.kategori_id].push({
          id: q.id,
          question: q.soal_text || "",
          optionA: q.opsi_a || "",
          optionB: q.opsi_b || "",
          optionC: q.opsi_c || "",
          optionD: q.opsi_d || "",
          answer: q.jawaban_benar || "",
          pembahasan: q.pembahasan || "",
          image: null,
          image_url: q.image_url || "",
        });
      });

      Object.entries(questionsByKategori).forEach(
        ([kategoriId, questions]) => {
          console.log(
            `âœ… Setting ${questions.length} questions for kategori ${kategoriId}`
          );
          setQuestionsForCategory(kategoriId, questions);
        }
      );

      console.log("âœ… All questions loaded to store");
    } catch (err: any) {
      console.error("âŒ Error:", err);
      setError(err.message);
      toast.error(`Gagal memuat tryout: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchTryoutDetail();
    }

    return () => {
      console.log("ðŸ§¹ Cleanup: Resetting store on unmount");
      resetTryout();
    };
  }, [id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTryoutInfo({
      ...tryoutInfo,
      [name]: value,
    });
  };

  // helper cek nama duplikat di Supabase (exclude current id)
  const checkDuplicateName = async (name: string, currentId: string) => {
    const { data, error } = await supabase
      .from("tryouts")
      .select("id, nama_tryout")
      .ilike("nama_tryout", name)
      .neq("id", currentId)
      .limit(1);

    if (error) return { exists: false, error };

    if (data && data.length > 0) {
      return { exists: true, error: null };
    }
    return { exists: false, error: null };
  };

  // Update tryout + VALIDASI
  const handleUpdateTryout = async () => {
    if (!tryoutInfo.name || !tryoutInfo.tanggal) {
      toast.error("Nama Tryout dan Tanggal Ujian wajib diisi.");
      return;
    }

    const trimmedName = tryoutInfo.name.trim();
    if (!trimmedName) {
      toast.error("Nama Tryout tidak boleh kosong.");
      return;
    }

    // âœ… VALIDASI TANGGAL â‰¥ HARI INI
    const selectedDate = new Date(tryoutInfo.tanggal);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      toast.error("Tanggal ujian tidak boleh sebelum hari ini.");
      return;
    }

    // VALIDASI NAMA UNIK (case-insensitive) kalau nama berubah
    const nameChanged =
      trimmedName.toLowerCase() !== (originalName || "").trim().toLowerCase();

    if (nameChanged) {
      try {
        const { exists, error } = await checkDuplicateName(trimmedName, id!);
        if (error) {
          console.error("âŒ Error checking duplicate name:", error);
          toast.error("Gagal mengecek duplikat nama tryout.");
          return;
        }
        if (exists) {
          toast.error(
            `Nama tryout "${trimmedName}" sudah digunakan. Gunakan nama lain.`
          );
          return;
        }
      } catch (err: any) {
        console.error("âŒ Error checking duplicate:", err);
        toast.error("Gagal mengecek duplikat nama tryout.");
        return;
      }
    }

    setIsSaving(true);

    const updatePromise = (async () => {
      console.log("ðŸ“ Step 1: Updating tryout info via API...");

      await api.adminUpdateTryout(id!, {
        nama_tryout: trimmedName,
        tanggal_ujian: tryoutInfo.tanggal,
        status: status,
      });

      console.log("âœ… Step 1: Info updated");

      console.log("ðŸ“ Step 2: Deleting old questions via API...");
      try {
        await api.adminDeleteQuestions(id!);
        console.log("âœ… Step 2: Old questions deleted");
      } catch (err) {
        console.warn("âš ï¸ Warning: Failed to delete old questions:", err);
      }

      if (Object.keys(questionsByCategory).length > 0) {
        console.log("ðŸ“ Step 3: Inserting new questions via API...");
        const questionsToInsert: any[] = [];

        Object.entries(questionsByCategory).forEach(
          ([kategoriId, questions]) => {
            questions.forEach((q: any, index) => {
              questionsToInsert.push({
                tryout_id: id,
                kategori_id: kategoriId,
                urutan: index + 1,
                soal_text: q.question,
                opsi_a: q.optionA,
                opsi_b: q.optionB,
                opsi_c: q.optionC,
                opsi_d: q.optionD,
                jawaban_benar: q.answer,
                pembahasan: q.pembahasan || null,
                image_url: q.image_url || null,
              });
            });
          }
        );

        console.log(`ðŸ’¾ Inserting ${questionsToInsert.length} questions...`);
        const withPembahasan = questionsToInsert.filter(
          (q) => q.pembahasan
        ).length;
        console.log(
          `ðŸ“Š Questions with pembahasan: ${withPembahasan} out of ${questionsToInsert.length}`
        );

        await api.adminBulkInsertQuestions(questionsToInsert);

        console.log("âœ… Step 3: New questions inserted");
      }

      console.log("ðŸŽ‰ All steps completed!");
      resetTryout();
      navigate("/admin-tryout");
    })();

    toast
      .promise(updatePromise, {
        loading: "Menyimpan perubahan...",
        success: "Tryout berhasil diupdate!",
        error: (err) => `Gagal mengupdate: ${err.message}`,
      })
      .finally(() => setIsSaving(false));
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
        disabled={isSaving}
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
              disabled={isSaving}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#295782] focus:border-transparent disabled:bg-gray-100"
              placeholder="Contoh: Tryout SNBT 2025 #1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Nama tryout harus unik, tidak boleh sama dengan tryout lain.
            </p>
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
              disabled={isSaving}
              min={getTodayDate()}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#295782] focus:border-transparent disabled:bg-gray-100"
            />
            <p className="text-xs text-gray-500 mt-1">
              Tanggal tidak boleh sebelum hari ini.
            </p>
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
                disabled={isSaving}
                className="w-4 h-4 text-[#295782] focus:ring-[#295782] disabled:opacity-50"
              />
              <span className="text-sm text-[#1E293B]">Aktif</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="inactive"
                checked={status === "inactive"}
                onChange={(e) => setStatus(e.target.value)}
                disabled={isSaving}
                className="w-4 h-4 text-[#295782] focus:ring-[#295782] disabled:opacity-50"
              />
              <span className="text-sm text-[#1E293B]">Nonaktif</span>
            </label>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Tryout yang nonaktif tidak akan ditampilkan ke siswa.
          </p>
        </div>
      </div>

      {/* Bagian 2: Kelola Kategori Soal */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-bold text-[#1E293B] mb-2">
          Kelola Kategori Soal
        </h3>
        <p className="text-sm text-[#64748B] mb-4">
          Klik "Tambah/Edit Soal" untuk mengubah soal di kategori tertentu
        </p>

        {CATEGORIES.map((cat) => (
          <div key={cat.name} className="mb-6">
            <h4 className="text-md font-semibold text-[#295782] mb-3">
              {cat.name}
            </h4>
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
                      <p className="text-sm font-medium text-[#1E293B]">
                        {sub.name}
                      </p>
                      {hasQuestions && (
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-green-600">
                            {savedQuestions.length} soal tersimpan
                          </p>
                        </div>
                      )}
                    </div>
                    <Link
                      to={`/admin-tryout/${id}/${sub.id}/questions/new`}
                      className="px-4 py-2 text-sm bg-[#295782] text-white rounded-lg hover:bg-[#295782]/90 transition-colors"
                    >
                      {hasQuestions ? "âœï¸ Edit Soal" : "+ Tambah Soal"}
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
          disabled={isSaving}
          className="px-6 py-2 border border-gray-300 text-[#64748B] rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Batal
        </button>
        <button
          onClick={handleUpdateTryout}
          disabled={isSaving}
          className="px-6 py-2 bg-[#295782] text-white rounded-lg hover:bg-[#295782]/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
        >
          <Save className="w-4 h-4" />
          {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </div>
    </div>
  );
}