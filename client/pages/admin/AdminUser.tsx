import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronDown, Eye, Edit2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/lib/supabase";
import UserViewModal from "@/components/admin/UserViewModal";
import UserEditModal from "@/components/admin/UserEditModal";

interface User {
  user_id: string;
  nama_lengkap: string;
  email: string;
  role: string;
  asalsekolah?: string;
  status_akun?: string;
  created_at: string;
  photoprofile?: string;
  paket_aktif?: string;
  paket_aktif_list?: string[];
  total_transaksi?: number;
}

export default function AdminUser() {
  const navigate = useNavigate();
  
  // State management
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const itemsPerPage = 20;

  // Modal states
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch users
      let userQuery = supabase
        .from("users")
        .select(`
          user_id,
          nama_lengkap,
          email,
          role,
          status_akun,
          photo_profile,
          created_at,
          transactions (
            id,
            package_id,
            status,
            amount,
            created_at,
            packages (
              id,
              name,
              price
            )
          )
        `, { count: "exact" })
        .order("created_at", { ascending: false })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      if (searchQuery) {
        userQuery = userQuery.or(`nama_lengkap.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }

      if (roleFilter !== "all") {
        userQuery = userQuery.eq("role", roleFilter);
      }

      const { data: userData, error: userError, count } = await userQuery;

      if (userError) throw userError;

      // 2. Fetch data siswa untuk semua user
      const userIds = userData?.map(u => u.user_id) || [];
      const { data: siswaData, error: siswaError } = await supabase
        .from("siswa")
        .select('user_id, asal_sekolah')
        .in("user_id", userIds);

      if (siswaError) {
        console.error("⚠️ Warning - siswa fetch error:", siswaError);
      }

      // 3. Gabungkan data
      const transformedUsers: User[] = userData?.map((user: any) => {
        // ... transform transactions sama seperti sebelumnya ...
        const successTransactions = user.transactions?.filter((t: any) => t.status === "success") || [];
        const totalTransaksi = successTransactions.length;
        
        let highestPriceTransaction = null;
        let maxPrice = 0;

        for (const transaction of successTransactions) {
          const packagePrice = transaction.packages?.price || 0;
          if (packagePrice > maxPrice) {
            maxPrice = packagePrice;
            highestPriceTransaction = transaction;
          }
        }

        const packageName = highestPriceTransaction?.packages?.name || null;
        const allPackageNames = successTransactions
          .map((t: any) => t.packages?.name)
          .filter((name: string) => name !== null && name !== undefined);

        // ✅ GABUNGKAN dengan data siswa
        const siswaInfo = siswaData?.find(s => s.user_id === user.user_id);

        return {
          user_id: user.user_id,
          nama_lengkap: user.nama_lengkap,
          email: user.email,
          role: user.role,
          asalsekolah: siswaInfo?.asal_sekolah || null,
          status_akun: user.status_akun || "aktif",
          created_at: user.created_at,
          photoprofile: user.photo_profile,
          paket_aktif: packageName || "Free",
          paket_aktif_list: allPackageNames.length > 0 ? allPackageNames : ["Free"],
          total_transaksi: totalTransaksi,
        };
      }) || [];

      setUsers(transformedUsers);
      setTotal(count || 0);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
    } catch (err: any) {
      console.error("❌ Failed to fetch users:", err);
      setError(err.message);
      toast.error(`Gagal memuat data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };


  // Delete user handler
  const handleDelete = async (userId: string, userName: string) => {
    if (!confirm(`Hapus user "${userName}"?`)) return;

    const deletePromise = (async () => {
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("user_id", userId);

      if (error) throw new Error(error.message);

      await fetchUsers();
      return userName;
    })();

    toast.promise(deletePromise, {
      loading: 'Menghapus user...',
      success: (name) => `"${name}" berhasil dihapus!`,
      error: (err) => `Gagal menghapus: ${err.message}`,
    });
  };

  // Modal handlers
  const handleView = (user: User) => {
    setSelectedUser(user);
    setShowViewModal(true);
  };

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleEditSuccess = () => {
    fetchUsers();
  };

  // Effects
  useEffect(() => {
    fetchUsers();
  }, [currentPage, roleFilter, statusFilter]);

  // Utility functions
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusBadge = (status?: string) => {
    const statusValue = (status || "aktif").toLowerCase();
    const styles = {
      aktif: "bg-[#DCFCE7] text-[#016630]",
      nonaktif: "bg-[#FEE2E2] text-[#991B1B]",
      suspended: "bg-[#FEF3C7] text-[#92400E]",
    };
    return styles[statusValue as keyof typeof styles] || "bg-gray-100 text-gray-800";
  };

  // Loading state
  if (isLoading) {
    return (
      <AdminLayout>
        <div className="max-w-[1363px] mx-auto px-4 md:px-6 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#295782]"></div>
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
            <div className="text-xl text-red-600 mb-4">{error}</div>
            <button
              onClick={fetchUsers}
              className="px-4 py-2 bg-[#295782] text-white rounded-lg hover:bg-[#295782]/90"
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
          <h1 className="text-2xl font-bold text-[#1E293B] mb-2">Manajemen Pengguna</h1>
          <p className="text-sm text-[#64748B]">
            Kelola akun pengguna, status, dan aktivitas mereka.
          </p>
        </div>

        {/* Filter & Search Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex flex-wrap gap-3 flex-1">
              {/* Role Filter */}
              <div className="relative">
                <select
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="appearance-none px-4 h-9 pr-10 rounded-xl border border-gray-200 bg-[#F3F3F5] text-sm text-[#717182] hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#295782] cursor-pointer"
                >
                  <option value="all">Semua</option>
                  <option value="siswa">Siswa</option>
                  <option value="guru">Guru</option>
                  <option value="admin">Admin</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#717182] pointer-events-none opacity-50" />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="appearance-none px-4 h-9 pr-10 rounded-xl border border-gray-200 bg-[#F3F3F5] text-sm text-[#717182] hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#295782] cursor-pointer"
                >
                  <option value="all">Semua Status</option>
                  <option value="aktif">Aktif</option>
                  <option value="nonaktif">Nonaktif</option>
                  <option value="suspended">Suspended</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#717182] pointer-events-none opacity-50" />
              </div>
            </div>

            {/* Search */}
            <div className="relative w-full md:w-[400px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#99A1AF]" />
              <input
                type="text"
                placeholder="Cari berdasarkan nama atau email"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setCurrentPage(1);
                    fetchUsers();
                  }
                }}
                className="w-full h-10 pl-10 pr-3 rounded-xl border border-gray-200 bg-[#F3F3F5] text-sm text-[#717182] placeholder:text-[#717182] focus:outline-none focus:ring-2 focus:ring-[#295782]"
              />
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                    Nama Pengguna
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                    Asal Sekolah
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                    Paket Aktif
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                    Status Akun
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                    Tanggal Daftar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <Search className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-sm text-[#64748B]">Belum ada pengguna terdaftar</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.user_id} className="hover:bg-[#F9FBFF] transition-colors">
                      {/* Nama Pengguna */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {user.photoprofile ? (
                            <img
                              src={user.photoprofile}
                              alt={user.nama_lengkap}
                              className="w-10 h-10 rounded-full object-contain border-2 border-gray-100"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#295782] to-[#1e4060] flex items-center justify-center text-white text-sm font-semibold">
                              {user.nama_lengkap.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-semibold text-[#1E293B]">
                              {user.nama_lengkap}
                            </p>
                            <p className="text-xs text-[#64748B]">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-[#1E293B] font-medium">
                          {user.asalsekolah || "-"}
                        </p>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-[#1E293B] font-medium">
                          {user.paket_aktif || "Free"}
                        </p>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${getStatusBadge(
                            user.status_akun
                          )}`}
                        >
                          {user.status_akun
                            ? user.status_akun.charAt(0).toUpperCase() + user.status_akun.slice(1)
                            : "Aktif"}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-[#64748B]">{formatDate(user.created_at)}</p>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => handleView(user)}
                            className="p-2 rounded-lg hover:bg-blue-50 transition-colors group"
                            title="Lihat Detail"
                          >
                            <Eye className="w-4 h-4 text-[#155EEF]" strokeWidth={1.33} />
                          </button>
                          <button 
                            onClick={() => handleEditClick(user)}
                            className="p-2 rounded-lg hover:bg-blue-50 transition-colors group"
                            title="Edit User"
                          >
                            <Edit2 className="w-4 h-4 text-[#155EEF]" strokeWidth={1.33} />
                          </button>
                          <button
                            onClick={() => handleDelete(user.user_id, user.nama_lengkap)}
                            className="p-2 rounded-lg hover:bg-red-50 transition-colors group disabled:opacity-30 disabled:cursor-not-allowed"
                            disabled={user.role === "admin"}
                            title={user.role === "admin" ? "Tidak dapat menghapus admin" : "Hapus User"}
                          >
                            <Trash2
                              className={`w-4 h-4 ${
                                user.role === "admin"
                                  ? "text-gray-300"
                                  : "text-[#64748B] group-hover:text-[#EF4444]"
                              }`}
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-[#64748B]">
              Menampilkan {users.length} dari {total} pengguna
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronDown className="w-4 h-4 rotate-90 text-gray-600" />
              </button>
              <div className="px-3 py-1 text-sm font-medium text-[#1E293B]">
                {currentPage} / {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronDown className="w-4 h-4 -rotate-90 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedUser && (
        <>
          <UserViewModal
            user={selectedUser}
            isOpen={showViewModal}
            onClose={() => setShowViewModal(false)}
          />
          <UserEditModal
            user={selectedUser}
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            onSuccess={handleEditSuccess}
          />
        </>
      )}
    </AdminLayout>
  );
}
