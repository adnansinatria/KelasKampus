// src/pages/admin/adminTryout.tsx

import { useEffect, useState } from "react";
import { Search, ChevronDown, Eye, Edit2, Trash2, FileText, Upload } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import AdminLayout from "@/components/admin/AdminLayout";
import { api } from "@/lib/api"; // ✅ ADDED: Import API instead of supabase
import ImportTryoutCSV from "@/components/admin/ImportTryoutCSV";

console.log("🔥 adminTryout.tsx VERSION 4.0 - USING API INSTEAD OF HARDCODE");

export default function AdminTryout() {
  const [tryouts, setTryouts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [showImportModal, setShowImportModal] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    navigate("/signin", { replace: true });
  };

  // ✅ CHANGED: Use API instead of direct supabase
  const fetchTryouts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log("🔄 Fetching tryouts via API...");

      // ✅ NEW: Call API instead of supabase
      const response = await api.adminGetTryouts();
      
      console.log("✅ API Response:", response);

      const tryoutsData = Array.isArray(response?.data) ? response.data : [];

      console.log("✅ Tryouts loaded:", tryoutsData.length);

      // ✅ API should already return with jumlah_soal
      // If not, calculate here
      const tryoutsWithCount = tryoutsData.map((tryout: any) => ({
        ...tryout,
        jumlah_soal: tryout.jumlah_soal || 0,
      }));

      console.log("🎉 Final result:", tryoutsWithCount);
      setTryouts(tryoutsWithCount);

    } catch (err: any) {
      console.error("❌ Failed to fetch tryouts:", err);
      const errorMessage = err.message || "Gagal memuat data tryout";
      setError(errorMessage);
      toast.error(`Gagal memuat data: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ CHANGED: Use API instead of direct supabase
  const handleDelete = async (tryoutId: string, tryoutName: string) => {
    const deletePromise = (async () => {
      console.log("🗑️ Deleting tryout:", tryoutId);

      // ✅ NEW: Use API instead of supabase
      await api.adminDeleteTryout(tryoutId);

      console.log("✅ Tryout deleted");

      // Refresh data after delete
      await fetchTryouts();
      return tryoutName;
    })();

    toast.promise(deletePromise, {
      loading: "Menghapus tryout...",
      success: (name) => `"${name}" berhasil dihapus!`,
      error: (err) => `Gagal menghapus: ${err.message}`,
    });
  };

  useEffect(() => {
    fetchTryouts();
  }, []);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="max-w-[1363px] mx-auto px-4 md:px-6 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#295782] mx-auto mb-4"></div>
              <div className="text-xl text-[#1E293B]">Loading tryouts...</div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="max-w-[1363px] mx-auto px-4 md:px-6 py-8">
          <div className="flex flex-col items-center justify-center h-64">
            <div className="text-xl text-red-600 mb-4">Error: {error}</div>
            <button
              onClick={fetchTryouts}
              className="px-4 py-2 bg-[#295782] text-white rounded-lg hover:bg-[#295782]/90 transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-[1363px] mx-auto px-4 md:px-6 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#1E293B] mb-2">Manajemen Tryout</h1>
          <p className="text-sm text-[#64748B]">Kelola semua tryout yang tersedia di platform.</p>
        </div>

        {/* Filter & Search Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex flex-wrap gap-4 flex-1">
              <button className="flex items-center justify-between gap-2 px-3 h-9 rounded-xl border border-gray-200 bg-[#F3F3F5] hover:bg-gray-100 transition-colors min-w-[150px]">
                <span className="text-sm text-[#717182]">Status</span>
                <ChevronDown className="w-4 h-4 text-[#717182] opacity-50" />
              </button>

              <button className="flex items-center justify-between gap-2 px-3 h-9 rounded-xl border border-gray-200 bg-[#F3F3F5] hover:bg-gray-100 transition-colors min-w-[150px]">
                <span className="text-sm text-[#717182]">Urutkan</span>
                <ChevronDown className="w-4 h-4 text-[#717182] opacity-50" />
              </button>
            </div>

            <div className="relative w-full md:w-[400px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#99A1AF]" />
              <input
                type="text"
                placeholder="Cari tryout berdasarkan judul"
                className="w-full h-10 pl-10 pr-3 rounded-xl border border-gray-200 bg-[#F3F3F5] text-sm text-[#717182] placeholder:text-[#717182] focus:outline-none focus:ring-2 focus:ring-[#295782] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-8">
          {/* Table - Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-4 text-left text-sm font-medium text-[#1E293B]">
                    Nama Tryout
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-medium text-[#1E293B]">
                    Jumlah Soal
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-medium text-[#1E293B]">
                    Status
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-medium text-[#1E293B]">
                    Jadwal Ujian
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-medium text-[#1E293B]">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {tryouts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">
                      Belum ada tryout. Silakan buat tryout baru.
                    </td>
                  </tr>
                ) : (
                  tryouts.map((tryout, index) => (
                    <tr
                      key={tryout.id}
                      className={`border-b border-gray-100 ${
                        index % 2 === 1 ? "bg-[#F9FBFF]" : "bg-white"
                      }`}
                    >
                      <td className="px-4 py-5">
                        <p className="text-sm font-bold text-[#1E293B]">
                          {tryout.nama_tryout}
                        </p>
                      </td>
                      <td className="px-4 py-5">
                        <p className="text-sm text-[#1E293B]">
                          {tryout.jumlah_soal || 0}
                        </p>
                      </td>
                      <td className="px-4 py-5">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-normal"
                          style={{
                            backgroundColor:
                              tryout.status === "active"
                                ? "#DCFCE7"
                                : "#F3F4F6",
                            color:
                              tryout.status === "active"
                                ? "#016630"
                                : "#4A5565",
                          }}
                        >
                          {tryout.status === "active" ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td className="px-4 py-5">
                        <p className="text-sm text-[#64748B]">
                          {new Date(tryout.tanggal_ujian).toLocaleDateString(
                            "id-ID",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </p>
                      </td>
                      <td className="px-4 py-5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              navigate(`/admin-tryout/view/${tryout.id}`)
                            }
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                            title="Lihat detail"
                          >
                            <Eye
                              className="w-4 h-4 text-[#155EEF]"
                              strokeWidth={1.33}
                            />
                          </button>
                          <button
                            onClick={() =>
                              navigate(`/admin-tryout/edit/${tryout.id}`)
                            }
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                            title="Edit tryout"
                          >
                            <Edit2
                              className="w-4 h-4 text-[#155EEF]"
                              strokeWidth={1.33}
                            />
                          </button>
                          <button
                            onClick={() => {
                              if (
                                confirm(`Hapus "${tryout.nama_tryout}"?`)
                              ) {
                                handleDelete(tryout.id, tryout.nama_tryout);
                              }
                            }}
                            className="p-2 rounded-lg hover:bg-red-50 transition-colors group"
                            title="Hapus tryout"
                          >
                            <Trash2
                              className="w-4 h-4 text-[#64748B] group-hover:text-[#EF4444]"
                              strokeWidth={1.5}
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 border-t border-gray-200">
            <p className="text-xs text-[#64748B]">
              Menampilkan {tryouts.length} dari {tryouts.length} tryout
            </p>
            <div className="flex items-center gap-2">
              <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
                <ChevronDown className="w-4 h-4 rotate-90 text-gray-400" />
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#155EEF] bg-[#155EEF] text-white text-sm">
                1
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
                <ChevronDown className="w-4 h-4 -rotate-90 text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-[#1E293B] mb-1">
                Upload soal tryout
              </h3>
              <p className="text-sm text-[#64748B]">
                Unggah soal baru secara manual atau melalui file CSV.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <Link
                to="/admin-tryout/new"
                className="flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-gray-200 bg-[#64748B] text-white hover:bg-[#64748B]/90 transition-colors text-xs"
              >
                <FileText className="w-4 h-4" strokeWidth={1.33} />
                Upload Manual
              </Link>
              {/* ✅ PERBAIKAN: Ganti Link menjadi button */}
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg bg-[#295782] text-white hover:bg-[#295782]/90 transition-colors text-xs"
              >
                <Upload className="w-4 h-4" strokeWidth={1.33} />
                Import CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ TAMBAHAN: Modal Import CSV */}
      {showImportModal && (
        <ImportTryoutCSV
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImportSuccess={() => {
            fetchTryouts(); // Refresh data setelah import berhasil
          }}
        />
      )}
    </AdminLayout>
  );
}