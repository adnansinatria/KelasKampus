import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import useTryoutStore from "../../stores/tryoutStore";

export default function AddNewTryoutPage() {
  const navigate = useNavigate();

  // 👇 PERUBAHAN: Ambil juga fungsi 'resetTryout' dari store
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
      subcategories: [{ id: "pm", name: "Penalaran Matematika" }],
    },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const finalTryoutInfo = {
      ...tryoutInfo,
      id: tryoutInfo.id || `tryout-${Date.now()}`,
      [name]: value,
    };
    setTryoutInfo(finalTryoutInfo);
  };

  // 👇 BARU: Fungsi untuk menyimpan seluruh data tryout
  const handleSaveTryout = async () => {
    // Validasi sederhana
    if (!tryoutInfo.name || !tryoutInfo.tanggal) {
      alert("Nama Tryout dan Tanggal Ujian wajib diisi.");
      return;
    }

    // Gabungkan semua data menjadi satu objek
    const finalTryoutData = {
      info: tryoutInfo,
      questions: questionsByCategory,
    };

    console.log("DATA LENGKAP UNTUK DIKIRIM KE BACKEND:", finalTryoutData);
    
    // --- Di sinilah Anda akan mengirim 'finalTryoutData' ke backend Anda ---
    // Contoh:
    // await fetch('/api/tryouts', {
    //   method: 'POST',
    //   body: JSON.stringify(finalTryoutData),
    // });
    // --------------------------------------------------------------------

    alert("Tryout berhasil disimpan!"); // Feedback untuk pengguna

    // Reset store agar form kosong lagi untuk tryout berikutnya
    resetTryout();

    // Arahkan kembali ke halaman daftar
    navigate("/admin-tryout");
  };

  return (
    <div className="min-h-screen bg-[#F8FBFF] px-6 py-8">
      <div className="max-w-4xl mx-auto bg-white shadow rounded-2xl p-6">
        <button
          onClick={() => navigate("/admin-tryout")}
          className="flex items-center gap-2 text-sm text-[#295782] hover:underline mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Tryout
        </button>

        {/* --- Bagian 1: Informasi Tryout --- */}
        <div className="border-b pb-6 mb-6">
          <h1 className="text-2xl font-bold text-[#1E293B]">
            Tambah Tryout Baru
          </h1>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[#64748B] mb-1">
                  Nama Tryout
                </label>
                <input
                  type="text"
                  name="name"
                  value={tryoutInfo.name}
                  onChange={handleInputChange}
                  placeholder="Contoh: Tryout SNBT Paket 1"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#295782]"
                />
              </div>
              <div>
                <label className="block text-sm text-[#64748B] mb-1">
                  Tanggal Ujian
                </label>
                <input
                  type="date"
                  name="tanggal"
                  value={tryoutInfo.tanggal}
                  onChange={handleInputChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#295782]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* --- Bagian 2: Kelola Kategori Soal --- */}
        <div>
          <h2 className="text-xl font-bold text-[#1E293B]">
            Kelola Kategori Soal
          </h2>
          <div className="space-y-6 mt-6">
            {categories.map((cat) => (
              <div key={cat.name}>
                <h3 className="font-semibold text-lg text-[#1E293B] mb-3">
                  {cat.name}
                </h3>
                <div className="space-y-3">
                  {cat.subcategories.map((sub) => {
                    const savedQuestions = questionsByCategory[sub.id] || [];
                    const hasQuestions = savedQuestions.length > 0;
                    return (
                      <div
                        key={sub.id}
                        className="flex justify-between items-center bg-[#F9FBFF] border border-gray-200 p-3 rounded-lg hover:border-[#295782] transition-colors"
                      >
                        <p className="text-sm text-[#1E293B]">{sub.name}</p>
                        <div className="flex items-center gap-3">
                          {hasQuestions && (
                            <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                              {savedQuestions.length} soal tersimpan
                            </span>
                          )}
                          <Link
                            to={`/admin-tryout/${tryoutInfo.id}/${sub.id}/questions/new`}
                            className="text-sm font-medium text-[#295782] hover:underline"
                          >
                            {hasQuestions ? "✏️ Edit Soal" : "+ Tambah Soal"}
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* 👇 BARU: Tombol Simpan Final */}
        <div className="mt-8 pt-6 border-t flex justify-end">
          <button
            onClick={handleSaveTryout}
            className="bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            Simpan Tryout
          </button>
        </div>

      </div>
    </div>
  );
}