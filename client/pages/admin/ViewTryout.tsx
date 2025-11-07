import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, FileText, CheckCircle2, Edit2, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "@/lib/api"; // ✅ CHANGED: Import API
import AdminLayout from "@/components/admin/AdminLayout";

// ✅ Kategori struktur dengan GROUPING - TIDAK DIUBAH
const CATEGORIES = [
  {
    id: "tps",
    name: "Tes Potensi Skolastik",
    subcategories: [
      { id: "kpu", name: "Kemampuan Penalaran Umum" },
      { id: "ppu", name: "Pengetahuan dan Pemahaman Umum" },
      { id: "kmbm", name: "Kemampuan Memahami Bacaan dan Menulis" },
      { id: "pk", name: "Pengetahuan Kuantitatif" },
    ],
  },
  {
    id: "literasi",
    name: "Tes Literasi Bahasa",
    subcategories: [
      { id: "lit-id", name: "Literasi dalam Bahasa Indonesia" },
      { id: "lit-en", name: "Literasi dalam Bahasa Inggris" },
    ],
  },
  {
    id: "matematika",
    name: "Tes Penalaran Matematika",
    subcategories: [
      { id: "pm", name: "Penalaran Matematika" },
    ],
  },
];

export default function ViewTryout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tryout, setTryout] = useState<any>(null);
  const [questionsByCategory, setQuestionsByCategory] = useState<Record<string, any[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // ✅ CHANGED: Fetch via API instead of supabase
  const fetchTryoutDetail = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("🔍 Fetching tryout detail via API:", id);

      // ✅ CHANGED: Use API to get tryout detail
      const tryoutResponse = await api.adminGetTryoutDetail(id!);
      const tryoutData = tryoutResponse?.data || tryoutResponse;

      console.log("📊 Tryout data:", tryoutData);
      setTryout(tryoutData);

      // ✅ CHANGED: Use API to get questions
      const questionsResponse = await api.adminGetTryoutQuestions(id!);
      const soalData = questionsResponse?.data || questionsResponse;

      if (!Array.isArray(soalData)) {
        throw new Error("Invalid questions data format");
      }

      console.log("📝 Questions loaded:", soalData?.length);

      // ✅ UNCHANGED: Group questions by kategori_id
      const grouped: Record<string, any[]> = {};
      soalData?.forEach((q: any) => {
        if (!grouped[q.kategori_id]) {
          grouped[q.kategori_id] = [];
        }
        grouped[q.kategori_id].push(q);
      });

      setQuestionsByCategory(grouped);

    } catch (err: any) {
      console.error("❌ Error:", err);
      setError(err.message);
      toast.error(`Gagal memuat tryout: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ UNCHANGED: useEffect
  useEffect(() => {
    fetchTryoutDetail();
  }, [id]);

  // ✅ UNCHANGED: Toggle category
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  // ✅ UNCHANGED: Get total questions
  const getTotalQuestions = () => {
    return Object.values(questionsByCategory).reduce((sum, questions) => sum + questions.length, 0);
  };

  // ✅ UNCHANGED: Loading state
  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#295782]"></div>
        </div>
      </AdminLayout>
    );
  }

  // ✅ UNCHANGED: Error state
  if (error || !tryout) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <p className="text-red-600 mb-4">{error || "Tryout tidak ditemukan"}</p>
          <Link to="/admin-tryout" className="text-[#295782] hover:underline">
            Kembali ke Daftar Tryout
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-[1363px] mx-auto px-4 md:px-6 py-8">
        {/* Header - TIDAK DIUBAH */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              to="/admin-tryout"
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-[#64748B]" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-[#1E293B]">{tryout.nama_tryout}</h1>
              <p className="text-sm text-[#64748B] mt-1">
                Detail tryout dan daftar soal yang tersedia
              </p>
            </div>
          </div>
          <Link
            to={`/admin-tryout/edit/${id}`}
            className="flex items-center gap-2 px-4 py-2 bg-[#295782] text-white rounded-lg hover:bg-[#295782]/90 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Edit Tryout
          </Link>
        </div>

        {/* Tryout Info Card - TIDAK DIUBAH */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-[#64748B] mb-1">Tanggal Ujian</p>
              <p className="text-lg font-semibold text-[#1E293B]">
                {new Date(tryout.tanggal_ujian).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-[#64748B] mb-1">Total Soal</p>
              <p className="text-lg font-semibold text-[#1E293B]">{getTotalQuestions()} Soal</p>
            </div>
            <div>
              <p className="text-sm text-[#64748B] mb-1">Status</p>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium ${
                  tryout.status === "active"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {tryout.status === "active" ? "Aktif" : "Nonaktif"}
              </span>
            </div>
          </div>
        </div>

        {/* Questions by Category - DESIGN TIDAK DIUBAH, LOGIC DIOPTIMASI */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-[#1E293B]">Daftar Soal per Kategori</h2>

          {Object.entries(questionsByCategory).length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-[#64748B]">Belum ada soal untuk tryout ini</p>
              <Link
                to={`/admin-tryout/edit/${id}`}
                className="inline-block mt-4 text-[#295782] hover:underline"
              >
                Tambah Soal
              </Link>
            </div>
          ) : (
            CATEGORIES.map((category) => {
              // Hitung total soal dalam kategori utama
              const categoryTotal = category.subcategories.reduce((sum, sub) => {
                return sum + (questionsByCategory[sub.id]?.length || 0);
              }, 0);

              if (categoryTotal === 0) return null;

              const isExpanded = expandedCategories[category.id];

              return (
                <div
                  key={category.id}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
                >
                  {/* Main Category Header */}
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#295782]/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-[#295782]" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg font-semibold text-[#1E293B]">
                          {category.name}
                        </h3>
                        <p className="text-sm text-[#64748B]">{categoryTotal} Soal</p>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-[#64748B] transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Subcategories */}
                  {isExpanded && (
                    <div className="border-t border-gray-200">
                      {category.subcategories.map((sub) => {
                        const questions = questionsByCategory[sub.id] || [];
                        if (questions.length === 0) return null;

                        const subExpanded = expandedCategories[sub.id];

                        return (
                          <div key={sub.id} className="border-b border-gray-200 last:border-0">
                            {/* Subcategory Header */}
                            <button
                              onClick={() => toggleCategory(sub.id)}
                              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors bg-gray-50/50"
                            >
                              <div className="flex items-center gap-3">
                                <div className="text-left">
                                  <h4 className="text-base font-semibold text-[#1E293B]">
                                    {sub.name}
                                  </h4>
                                  <p className="text-sm text-[#64748B]">{questions.length} Soal</p>
                                </div>
                              </div>
                              <ChevronDown
                                className={`w-5 h-5 text-[#64748B] transition-transform ${
                                  subExpanded ? "rotate-180" : ""
                                }`}
                              />
                            </button>

                            {/* Questions List */}
                            {subExpanded && (
                              <div className="p-6 space-y-4 bg-white">
                                {questions.map((question, index) => (
                                  <div
                                    key={index}
                                    className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                                  >
                                    <div className="flex items-start gap-3 mb-3">
                                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#295782] text-white flex items-center justify-center text-xs font-semibold">
                                        {index + 1}
                                      </div>
                                      <p className="flex-1 text-sm text-[#1E293B]">{question.soal_text}</p>
                                    </div>
                                    <div className="ml-9 space-y-2">
                                      {["opsi_a", "opsi_b", "opsi_c", "opsi_d"].map((opsi, idx) => (
                                        <div
                                          key={idx}
                                          className={`flex items-center gap-2 p-2 rounded ${
                                            question.jawaban_benar === String.fromCharCode(65 + idx)
                                              ? "bg-green-50 border border-green-200"
                                              : "bg-white border border-gray-200"
                                          }`}
                                        >
                                          {question.jawaban_benar === String.fromCharCode(65 + idx) && (
                                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                                          )}
                                          <span className="text-xs font-medium text-[#64748B]">
                                            {String.fromCharCode(65 + idx)}.
                                          </span>
                                          <span className="text-sm text-[#1E293B]">{question[opsi]}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
