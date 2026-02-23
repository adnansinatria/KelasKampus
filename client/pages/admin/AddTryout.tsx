import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import useTryoutStore from "../../stores/tryoutStore";

export default function AddNewTryoutPage() {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [existingNames, setExistingNames] = useState<string[]>([]);

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

  useEffect(() => {
    const fetchExisting = async () => {
      try {
        const res = await api.adminGetTryouts?.();
        const data = res?.data || res || [];
        const names = data.map((t: any) => t.nama_tryout?.toLowerCase().trim());
        setExistingNames(names);
      } catch (err: any) {
        console.error("Gagal load daftar tryout:", err);
      }
    };
    fetchExisting();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTryoutInfo({
      ...tryoutInfo,
      [name]: value,
    });
  };

  const handleSaveTryout = async () => {
    // Validasi Field Baru
    if (!tryoutInfo.name || !tryoutInfo.open_date || !tryoutInfo.close_date || !tryoutInfo.durasi) {
      toast.error("Semua field bertanda bintang (*) wajib diisi.");
      return;
    }

    if (new Date(tryoutInfo.close_date) <= new Date(tryoutInfo.open_date)) {
      toast.error("Waktu Tutup harus lebih akhir dari Waktu Buka.");
      return;
    }

    const nameLower = tryoutInfo.name.trim().toLowerCase();
    if (existingNames.includes(nameLower)) {
      toast.error("Nama tryout sudah digunakan. Gunakan nama lain.");
      return;
    }

    const durasi = Number(tryoutInfo.durasi);
    if (!durasi || durasi <= 0) {
      toast.error("Durasi harus berupa angka lebih dari 0 menit.");
      return;
    }

    if (Object.keys(questionsByCategory).length === 0) {
      toast.error("Minimal harus ada 1 kategori soal yang diisi.");
      return;
    }

    setIsSaving(true);

    const savePromise = (async () => {
      try {
        // PENTING: Mengirim open_date dan close_date ke database
        const tryoutResponse = await api.adminCreateTryout({
          nama_tryout: tryoutInfo.name.trim(),
          tanggal_ujian: tryoutInfo.open_date, // Fallback untuk legacy code
          open_date: tryoutInfo.open_date,
          close_date: tryoutInfo.close_date,
          is_result_published: false, // Default: Hasil belum dirilis saat baru dibuat
          kategori: "umum",
          durasi_menit: durasi,
          status: "active",
        });

        const tryoutData = tryoutResponse?.data || tryoutResponse;
        const tryoutId = tryoutData.id;

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
        resetTryout();
        navigate("/admin-tryout");
      } catch (err: any) {
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
    return Object.values(questionsByCategory).reduce((sum, questions) => sum + questions.length, 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8FBFF] to-[#EFF6FF] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/admin-tryout" className="p-2 rounded-lg hover:bg-white/50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-[#64748B]" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#1E293B]">Buat Tryout Baru</h1>
            <p className="text-sm text-[#64748B] mt-1">Isi informasi tryout dan tambahkan soal per kategori</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-[#1E293B] mb-4">Informasi Tryout & Jadwal</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1E293B] mb-2">Nama Tryout *</label>
              <input type="text" name="name" value={tryoutInfo.name} onChange={handleInputChange} placeholder="Contoh: Tryout UTBK 2025 #1" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#295782]" disabled={isSaving} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Waktu Buka (Mulai) *</label>
                <input type="datetime-local" name="open_date" value={tryoutInfo.open_date || ''} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#295782]" disabled={isSaving} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Waktu Tutup (Selesai) *</label>
                <input type="datetime-local" name="close_date" value={tryoutInfo.close_date || ''} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#295782]" disabled={isSaving} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1E293B] mb-2">Durasi (menit) *</label>
              <input type="number" name="durasi" value={tryoutInfo.durasi} onChange={handleInputChange} placeholder="Contoh: 180" min={1} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#295782]" disabled={isSaving} />
            </div>
          </div>
        </div>

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
                      <Link key={sub.id} to={`/admin-tryout/new/${sub.id}/questions/new`} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <span className="text-sm text-[#1E293B]">{sub.name}</span>
                        <span className="text-xs px-2 py-1 rounded bg-[#295782]/10 text-[#295782] font-medium">{count} soal</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#64748B]">Total Soal</p>
              <p className="text-2xl font-bold text-[#1E293B]">{getTotalQuestions()} Soal</p>
            </div>
            <button onClick={handleSaveTryout} disabled={isSaving} className="px-6 py-2 bg-[#295782] text-white rounded-lg hover:bg-[#295782]/90 disabled:opacity-50 transition-colors">
              {isSaving ? "Menyimpan..." : "Simpan Tryout"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}