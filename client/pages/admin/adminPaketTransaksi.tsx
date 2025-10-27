import { useState, useEffect} from "react";
// import { Link } from "react-router-dom";
import { 
  ChevronDown, 
  Edit2, 
  Trash2, 
  Plus, 
  Upload, 
  FileText, 
  TrendingUp, 
  Trophy, 
  ShoppingCart,
  Package
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import AddPackageModal from "@/components/admin/AddPackageModal";
import EditPackageModal from "@/components/admin/EditPackageModal";

interface Paket {
  id: string;
  name: string;
  price: number;
  duration: number;
  benefits: string;
  tryout_count?: number;
  created_at?: string;
}

interface Transaksi {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_photo?: string | null;
  package_id?: string | null;
  package_name: string;
  package_price: number;
  payment_method: string;
  amount: number;
  status: 'success' | 'failed' | 'pending';
  created_at: string;
}

export default function AdminPaketTransaksi() {
  const [activeTab, setActiveTab] = useState<"transaksi" | "paket">("paket");
  const [searchParams, setSearchParams] = useSearchParams();
  const [sortOrder, setSortOrder] = useState("terbaru");
  
  const [pakets, setPakets] = useState<Paket[]>([]);
  const [transaksis, setTransaksis] = useState<Transaksi[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [revenueThisMonth, setRevenueThisMonth] = useState(0);
  const [totalPurchases, setTotalPurchases] = useState(0);
  const [bestSellingPackage, setBestSellingPackage] = useState("-");

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);

  // Load data on mount + when tab changes
  useEffect(() => {
    if (activeTab === "paket") {
      fetchPakets();
    } else {
      fetchTransaksis();
    }
  }, [activeTab]);

  useEffect(() => {
    const action = searchParams.get("action");
    
    if (action === "add") {
      setShowAddModal(true);
      setActiveTab("paket");
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Initial load
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([fetchPakets(), fetchTransaksis()]);
    } catch (err) {
      console.error("Load error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const sortedPakets = [...pakets].sort((a, b) => {
    switch (sortOrder) {
      case "terbaru":
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      case "terlama":
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      case "harga-tinggi":
        return b.price - a.price;
      case "harga-rendah":
        return a.price - b.price;
      default:
        return 0;
    }
  });

  const fetchPakets = async () => {
    try {
      const { data, error } = await supabase
        .from("packages")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      console.log("📦 Packages:", data);
      setPakets(data || []);
    } catch (err) {
      console.error("Fetch packages error:", err);
      toast.error("Gagal memuat paket");
      setPakets([]);
    }
  };

  const fetchTransaksis = async () => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          *,
          users:user_id (
            nama_lengkap,
            email,
            photo_profile
          ),
          packages:package_id (
            id,
            name,
            price
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const transformedData = data?.map((t: any) => ({
        id: t.id,
        user_id: t.user_id,
        user_name: t.users?.nama_lengkap || "Unknown User",
        user_email: t.users?.email || "-",
        user_photo: t.users?.photo_profile || null,
        package_id: t.package_id,
        package_name: t.packages?.name || "-",
        package_price: t.packages?.price || t.amount,
        payment_method: t.payment_method,
        amount: t.amount,
        status: t.status,
        created_at: t.created_at,
      })) || [];

      setTransaksis(transformedData);
      calculateStats(transformedData);
    } catch (err) {
      console.error("Fetch transactions error:", err);
      toast.error("Gagal memuat transaksi");
      setTransaksis([]);
    }
  };

  const calculateStats = (transactions: Transaksi[]) => {
    const successTransactions = transactions.filter((t) => t.status === "success");

    // Revenue this month
    const now = new Date();
    const thisMonthTransactions = successTransactions.filter((t) => {
      const date = new Date(t.created_at);
      return (
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      );
    });

    const revenue = thisMonthTransactions.reduce((sum, t) => sum + t.amount, 0);
    setRevenueThisMonth(revenue);

    // Total purchases
    setTotalPurchases(successTransactions.length);

    // Best-Selling Package
    const packageCounts: Record<string, { count: number; name: string }> = {};
    
    successTransactions.forEach((t) => {
      if (t.package_id && t.package_name) {
        if (!packageCounts[t.package_id]) {
          packageCounts[t.package_id] = { count: 0, name: t.package_name };
        }
        packageCounts[t.package_id].count++;
      }
    });

    const sorted = Object.values(packageCounts).sort((a, b) => b.count - a.count);
    setBestSellingPackage(sorted[0]?.name || "-");
  };

  const handleDeletePaket = async (id: string, name: string) => {
    if (!confirm(`Hapus paket "${name}"?`)) return;

    const deletePromise = (async () => {
      const { error } = await supabase
        .from("packages")
        .delete()
        .eq("id", id);

      if (error) throw error;
      await fetchPakets();
      return name;
    })();

    toast.promise(deletePromise, {
      loading: "Menghapus paket...",
      success: (n) => `"${n}" berhasil dihapus!`,
      error: (err) => `Gagal menghapus: ${err.message}`,
    });
  };

  const parseBenefits = (benefits: string | null | undefined): string[] => {
    if (!benefits) return [];
    if (typeof benefits === "string") {
      return benefits.split(",").map(b => b.trim()).filter(b => b.length > 0);
    }
    if (Array.isArray(benefits)) return benefits;
    return [];
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return { bg: "bg-[#DCFCE7]", text: "text-[#016630]" };
      case "failed":
        return { bg: "bg-[#FEE2E2]", text: "text-[#DC2626]" };
      case "pending":
        return { bg: "bg-[#F3F4F6]", text: "text-[#4A5565]" };
      default:
        return { bg: "bg-[#F3F4F6]", text: "text-[#4A5565]" };
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "success":
        return "Sukses";
      case "failed":
        return "Gagal";
      case "pending":
        return "Pending";
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#295782]"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-[1363px] mx-auto px-4 md:px-6 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#1E293B] mb-2">
            Manajemen Paket & Transaksi
          </h1>
          <p className="text-sm text-[#64748B]">
            Kelola paket langganan dan pantau transaksi pengguna.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-sm text-[#64748B]">Revenue This Month</p>
            </div>
            <p className="text-2xl font-bold text-[#1E293B]">
              {formatPrice(revenueThisMonth)}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-yellow-600" />
              </div>
              <p className="text-sm text-[#64748B]">Best-Selling Package</p>
            </div>
            <p className="text-2xl font-bold text-[#1E293B]">{bestSellingPackage}</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-sm text-[#64748B]">Total Purchases</p>
            </div>
            <p className="text-2xl font-bold text-[#1E293B]">{totalPurchases}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("paket")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === "paket"
                  ? "text-[#295782] border-b-2 border-[#295782]"
                  : "text-[#64748B] hover:text-[#1E293B]"
              }`}
            >
              Kelola Paket
            </button>
            <button
              onClick={() => setActiveTab("transaksi")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === "transaksi"
                  ? "text-[#295782] border-b-2 border-[#295782]"
                  : "text-[#64748B] hover:text-[#1E293B]"
              }`}
            >
              Riwayat Transaksi
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === "paket" ? (
          <div>
            {/* Filter */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="relative">
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="appearance-none px-4 h-9 pr-10 rounded-xl border border-gray-200 bg-[#F3F3F5] text-sm text-[#717182] hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#295782] cursor-pointer"
                  >
                    <option value="terbaru">Terbaru</option>
                    <option value="terlama">Terlama</option>
                    <option value="harga-tinggi">Harga Tertinggi</option>
                    <option value="harga-rendah">Harga Terendah</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#717182] pointer-events-none opacity-50" />
                </div>

                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#295782] text-white rounded-lg hover:bg-[#295782]/90 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Paket
                </button>
              </div>
            </div>

            {/* Paket Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedPakets.length === 0 ? (
                <div className="col-span-full bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-[#64748B]">Belum ada paket. Silakan tambah paket baru.</p>
                </div>
              ) : (
                sortedPakets.map((paket) => {
                  const benefitsArray = parseBenefits(paket.benefits);
                  
                  return (
                    <div
                      key={paket.id}
                      className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow flex flex-col"
                    >
                      {/* Header Info */}
                      <div className="mb-4">
                        <h3 className="text-lg font-bold text-[#1E293B] mb-2">
                          {paket.name}
                        </h3>
                        <p className="text-2xl font-bold text-[#295782]">
                          {formatPrice(paket.price)}
                        </p>
                        <p className="text-sm text-[#64748B] mt-1">
                          {paket.duration} bulan • {paket.tryout_count || 0} tryout
                        </p>
                      </div>

                      {/* Benefits - Flex-grow */}
                      <div className="mb-4 flex-grow">
                        <p className="text-xs text-[#64748B] mb-2">Benefits:</p>
                        {benefitsArray.length > 0 ? (
                          <ul className="space-y-1">
                            {benefitsArray.map((benefit, idx) => (
                              <li key={idx} className="text-xs text-[#1E293B] flex items-start gap-2">
                                <span className="text-green-600">✓</span>
                                {benefit}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-[#64748B] italic">Tidak ada benefits</p>
                        )}
                      </div>

                      {/* Buttons - Always at bottom */}
                      <div className="flex items-center gap-2 pt-4 border-t border-gray-200 mt-auto">
                        <button
                          onClick={() => {
                            setSelectedPackageId(paket.id);
                            setShowEditModal(true);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-[#64748B]" />
                          <span className="text-sm text-[#64748B]">Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeletePaket(paket.id, paket.name)}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                          <span className="text-sm text-red-600">Hapus</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          // Transaction tab tetap sama seperti kode Anda
          <div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                        Nama Pengguna
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                        Paket
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                        Metode Pembayaran
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                        Nominal
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                        Tanggal Transaksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {transaksis.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <p className="text-[#64748B]">Belum ada transaksi</p>
                        </td>
                      </tr>
                    ) : (
                      transaksis.map((transaksi) => {
                        const statusColors = getStatusColor(transaksi.status);
                        return (
                          <tr
                            key={transaksi.id}
                            className="hover:bg-[#F9FBFF] transition-colors"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                {transaksi.user_photo ? (
                                  <img
                                    src={transaksi.user_photo}
                                    alt={transaksi.user_name}
                                    className="w-10 h-10 rounded-full object-cover border-2 border-gray-100"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#295782] to-[#1e4060] flex items-center justify-center text-white text-sm font-semibold">
                                    {transaksi.user_name
                                      ?.split(" ")
                                      .map((n) => n[0])
                                      .join("")
                                      .substring(0, 2)
                                      .toUpperCase() || "?"}
                                  </div>
                                )}
                                <div>
                                  <p className="text-sm font-semibold text-[#1E293B]">
                                    {transaksi.user_name}
                                  </p>
                                  <p className="text-xs text-[#64748B]">
                                    {transaksi.user_email}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-[#295782]/10 flex items-center justify-center">
                                  <Package className="w-4 h-4 text-[#295782]" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-[#1E293B]">
                                    {transaksi.package_name}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap">
                              <p className="text-sm text-[#1E293B]">
                                {transaksi.payment_method}
                              </p>
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap">
                              <p className="text-sm font-semibold text-[#1E293B]">
                                {formatPrice(transaksi.amount)}
                              </p>
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${statusColors.bg} ${statusColors.text}`}
                              >
                                {getStatusLabel(transaksi.status)}
                              </span>
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap">
                              <p className="text-sm text-[#64748B]">
                                {formatDate(transaksi.created_at)}
                              </p>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <p className="text-xs text-[#64748B]">
                  Menampilkan {transaksis.length} dari {transaksis.length} transaksi
                </p>
              </div>
            </div>

            {/* Upload Section */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mt-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-[#1E293B] mb-1">
                    Upload Data Transaksi
                  </h3>
                  <p className="text-sm text-[#64748B]">
                    Unggah transaksi secara manual atau melalui file CSV.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <button className="flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-gray-200 bg-[#64748B] text-white hover:bg-[#64748B]/90 transition-colors text-xs">
                    <FileText className="w-4 h-4" />
                    Upload Manual
                  </button>
                  <button className="flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg bg-[#295782] text-white hover:bg-[#295782]/90 transition-colors text-xs">
                    <Upload className="w-4 h-4" />
                    Import CSV
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Modals */}
      {showAddModal && (
        <AddPackageModal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setSearchParams({}); // ✅ TAMBAH: Clean URL
          }}
          onSuccess={() => {
            fetchPakets();
            fetchTransaksis();
            setSearchParams({}); // ✅ TAMBAH: Clean URL after success
          }}
        />
      )}

      {showEditModal && selectedPackageId && (
        <EditPackageModal
          isOpen={showEditModal}
          packageId={selectedPackageId}
          onClose={() => {
            setShowEditModal(false);
            setSelectedPackageId(null);
          }}
          onSuccess={() => {
            fetchPakets();
            fetchTransaksis(); // Refresh stats
          }}
        />
      )}
    </AdminLayout>
  );
}
