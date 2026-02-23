import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Save, Zap, Lock, Unlock } from "lucide-react";
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
  { name: "Tes Potensi Skolastik", subcategories: [{ id: "kpu", name: "Kemampuan Penalaran Umum" }, { id: "ppu", name: "Pengetahuan dan Pemahaman Umum" }, { id: "kmbm", name: "Kemampuan Memahami Bacaan dan Menulis" }, { id: "pk", name: "Pengetahuan Kuantitatif" }] },
  { name: "Tes Literasi Bahasa", subcategories: [{ id: "lit-id", name: "Literasi dalam Bahasa Indonesia" }, { id: "lit-en", name: "Literasi dalam Bahasa Inggris" }] },
  { name: "Tes Penalaran Matematika", subcategories: [{ id: "pm", name: "Penalaran Matematika" }] },
];

export default function EditTryout() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [status, setStatus] = useState("active");
  const [isResultPublished, setIsResultPublished] = useState(false);
  const [originalName, setOriginalName] = useState(""); 

  const {
    tryoutInfo,
    setTryoutInfo,
    questionsByCategory,
    setQuestionsForCategory,
    resetTryout,
  } = useTryoutStore();

  const formatDatetimeForInput = (isoString: string | null | undefined) => {
    if (!isoString) return "";
    return new Date(isoString).toISOString().slice(0, 16);
  };

  const getNowFormatted = () => {
    // Mendapatkan waktu lokal saat ini dalam format YYYY-MM-DDThh:mm (sesuai input datetime-local)
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000; // offset dalam milliseconds
    const localISOTime = (new Date(now.getTime() - tzOffset)).toISOString().slice(0, 16);
    return localISOTime;
  };

  // --- MANUAL OVERRIDE ACTIONS ---
  const handleBukaSekarang = () => {
    setTryoutInfo({ 
      ...tryoutInfo, 
      open_date: getNowFormatted() 
    });
    toast.success("Waktu buka disetel ke SAAT INI. Jangan lupa klik Simpan!");
  };

  const handleTutupSekarang = () => {
    setTryoutInfo({ 
      ...tryoutInfo, 
      close_date: getNowFormatted() 
    });
    toast.success("Waktu tutup disetel ke SAAT INI. Jangan lupa klik Simpan!");
  };

  const fetchTryoutDetail = async () => {
    setIsLoading(true);
    setError(null);

    try {
      resetTryout();
      const tryoutResponse = await api.adminGetTryoutDetail(id!);
      const tryoutData = tryoutResponse?.data || tryoutResponse;

      setTryoutInfo({
        id: tryoutData.id,
        name: tryoutData.nama_tryout,
        tanggal: tryoutData.tanggal_ujian,
        open_date: formatDatetimeForInput(tryoutData.open_date),
        close_date: formatDatetimeForInput(tryoutData.close_date),
        durasi: tryoutData.durasi_menit?.toString() || "180",
      });

      setOriginalName(tryoutData.nama_tryout || "");
      setStatus(tryoutData.status || "active");
      setIsResultPublished(tryoutData.is_result_published || false);

      const questionsResponse = await api.adminGetTryoutQuestions(id!);
      const questionsData = questionsResponse?.data || questionsResponse;

      const questionsByKategori: Record<string, Question[]> = {};
      questionsData.forEach((q: any) => {
        if (!questionsByKategori[q.kategori_id]) questionsByKategori[q.kategori_id] = [];
        questionsByKategori[q.kategori_id].push({
          id: q.id, question: q.soal_text || "", optionA: q.opsi_a || "", optionB: q.opsi_b || "", optionC: q.opsi_c || "", optionD: q.opsi_d || "", answer: q.jawaban_benar || "", pembahasan: q.pembahasan || "", image: null, image_url: q.image_url || "",
        });
      });

      Object.entries(questionsByKategori).forEach(([kategoriId, questions]) => {
        setQuestionsForCategory(kategoriId, questions);
      });

    } catch (err: any) {
      setError(err.message);
      toast.error(`Gagal memuat tryout: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchTryoutDetail();
  }, [id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTryoutInfo({ ...tryoutInfo, [name]: value });
  };

  const handleUpdateTryout = async () => {
    if (!tryoutInfo.name || !tryoutInfo.open_date || !tryoutInfo.close_date) {
      toast.error("Nama Tryout, Waktu Buka, dan Waktu Tutup wajib diisi.");
      return;
    }

    if (new Date(tryoutInfo.close_date) <= new Date(tryoutInfo.open_date)) {
      toast.error("Waktu Tutup harus lebih akhir dari Waktu Buka.");
      return;
    }

    setIsSaving(true);
    const updatePromise = (async () => {
      // Pastikan ISO string UTC dikirim ke API
      const openDateUTC = new Date(tryoutInfo.open_date!).toISOString();
      const closeDateUTC = new Date(tryoutInfo.close_date!).toISOString();

      await api.adminUpdateTryout(id!, {
        nama_tryout: tryoutInfo.name.trim(),
        tanggal_ujian: openDateUTC, 
        open_date: openDateUTC,
        close_date: closeDateUTC,
        is_result_published: isResultPublished,
        status: status,
      });

      try {
        await api.adminDeleteQuestions(id!);
      } catch (err) {
        console.warn("Warning: Failed to delete old questions", err);
      }

      if (Object.keys(questionsByCategory).length > 0) {
        const questionsToInsert: any[] = [];
        Object.entries(questionsByCategory).forEach(([kategoriId, questions]) => {
          questions.forEach((q: any, index) => {
            questionsToInsert.push({ tryout_id: id, kategori_id: kategoriId, urutan: index + 1, soal_text: q.question, opsi_a: q.optionA, opsi_b: q.optionB, opsi_c: q.optionC, opsi_d: q.optionD, jawaban_benar: q.answer, pembahasan: q.pembahasan || null, image_url: q.image_url || null });
          });
        });
        await api.adminBulkInsertQuestions(questionsToInsert);
      }

      // 🧹 Clear cache supaya UI Admin dan UI Siswa langsung refresh tanpa perlu F5
      api.clearCache();
      
      resetTryout();
      navigate("/admin-tryout");
    })();

    toast.promise(updatePromise, {
      loading: "Menyimpan perubahan...",
      success: "Tryout berhasil diupdate!",
      error: (err) => `Gagal mengupdate: ${err.message}`,
    }).finally(() => setIsSaving(false));
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#295782]"></div></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button onClick={() => navigate("/admin-tryout")} disabled={isSaving} className="flex items-center gap-2 text-sm text-[#295782] hover:underline mb-6">
        <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Tryout
      </button>

      {/* Bagian 1: Informasi Tryout */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-[#1E293B] mb-1">Edit Jadwal & Akses Tryout</h2>
            <p className="text-sm text-[#64748B]">Atur kapan siswa bisa mengerjakan dan kapan hasil ujian dirilis.</p>
          </div>
          
          {/* QUICK ACTIONS BUTTONS */}
          <div className="flex items-center gap-2 mt-4 md:mt-0">
            <button 
              onClick={handleBukaSekarang} 
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors"
            >
              <Unlock className="w-3.5 h-3.5" /> Buka Sekarang
            </button>
            <button 
              onClick={handleTutupSekarang} 
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
            >
              <Lock className="w-3.5 h-3.5" /> Tutup Sekarang
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-[#64748B] mb-2">Nama Tryout</label>
          <input type="text" name="name" value={tryoutInfo.name} onChange={handleInputChange} disabled={isSaving} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#295782]" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-[#64748B] mb-2">Waktu Buka (Mulai)</label>
            <input type="datetime-local" name="open_date" value={tryoutInfo.open_date || ''} onChange={handleInputChange} disabled={isSaving} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#295782]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#64748B] mb-2">Waktu Tutup (Selesai)</label>
            <input type="datetime-local" name="close_date" value={tryoutInfo.close_date || ''} onChange={handleInputChange} disabled={isSaving} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#295782]" />
          </div>
        </div>

        {/* Status Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
          <div>
            <label className="block text-sm font-bold text-[#1E293B] mb-2">Status Penayangan</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value="active" checked={status === "active"} onChange={(e) => setStatus(e.target.value)} disabled={isSaving} className="w-4 h-4 text-[#295782]" /> Aktif
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value="inactive" checked={status === "inactive"} onChange={(e) => setStatus(e.target.value)} disabled={isSaving} className="w-4 h-4 text-[#295782]" /> Sembunyikan
              </label>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-bold text-[#1E293B] mb-2">Rilis Hasil & Pembahasan</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={isResultPublished === true} onChange={() => setIsResultPublished(true)} disabled={isSaving} className="w-4 h-4 text-green-600 focus:ring-green-500" /> 
                <span className="text-green-700 font-medium">Sudah Rilis</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={isResultPublished === false} onChange={() => setIsResultPublished(false)} disabled={isSaving} className="w-4 h-4 text-orange-500 focus:ring-orange-500" /> 
                <span className="text-orange-600 font-medium">Kunci Hasil (Scoring)</span>
              </label>
            </div>
            <p className="text-xs text-[#64748B] mt-1">Siswa hanya bisa melihat nilai setelah Anda merilisnya.</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-bold text-[#1E293B] mb-4">Kelola Kategori Soal</h3>
        {CATEGORIES.map((cat) => (
          <div key={cat.name} className="mb-6">
            <h4 className="text-md font-semibold text-[#295782] mb-3">{cat.name}</h4>
            <div className="space-y-2">
              {cat.subcategories.map((sub) => {
                const savedQuestions = questionsByCategory[sub.id] || [];
                return (
                  <div key={sub.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-[#1E293B]">{sub.name}</p>
                      {savedQuestions.length > 0 && <p className="text-xs text-green-600">{savedQuestions.length} soal tersimpan</p>}
                    </div>
                    <Link to={`/admin-tryout/${id}/${sub.id}/questions/new`} className="px-4 py-2 text-sm bg-[#295782] text-white rounded-lg">
                      {savedQuestions.length > 0 ? "✏️ Edit Soal" : "+ Tambah Soal"}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3">
        <button onClick={() => navigate("/admin-tryout")} disabled={isSaving} className="px-6 py-2 border text-[#64748B] rounded-lg">Batal</button>
        <button onClick={handleUpdateTryout} disabled={isSaving} className="px-6 py-2 bg-[#295782] text-white rounded-lg flex items-center gap-2">
          <Save className="w-4 h-4" /> {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </div>
    </div>
  );
}