import { useState, useEffect } from "react";
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
  Package,
  Eye,
  Check,
  X,
  Clock,
  Image as ImageIcon,
  ZoomIn
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import AddPackageModal from "@/components/admin/AddPackageModal";
import EditPackageModal from "@/components/admin/EditPackageModal";
import { sendPaymentConfirmationEmail } from "@/lib/emailService";

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
  payment_proof?: string | null;
  created_at: string;
  updated_at?: string;
}

export default function AdminPaketTransaksi() {
  const [activeTab, setActiveTab] = useState<"transaksi" | "paket">("paket");
  const [searchParams, setSearchParams] = useSearchParams();
  const [sortOrder, setSortOrder] = useState("terbaru");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const [pakets, setPakets] = useState<Paket[]>([]);
  const [transaksis, setTransaksis] = useState<Transaksi[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [revenueThisMonth, setRevenueThisMonth] = useState(0);
  const [totalPurchases, setTotalPurchases] = useState(0);
  const [bestSellingPackage, setBestSellingPackage] = useState("-");
  const [pendingCount, setPendingCount] = useState(0);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPackage_Id, setSelectedPackage_Id] = useState<string | null>(null);
  const [showProofModal, setShowProofModal] = useState(false);
  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaksi | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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

  const filteredTransaksis = transaksis.filter((t) => {
    if (statusFilter === "all") return true;
    return t.status === statusFilter;
  });

  const fetchPakets = async () => {
    try {
      const { data, error } = await supabase
        .from("packages")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
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
        payment_proof: t.payment_proof,
        created_at: t.created_at,
        updated_at: t.updated_at,
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
    const pendingTransactions = transactions.filter((t) => t.status === "pending");

    setPendingCount(pendingTransactions.length);

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

  // ✅ NEW: Function untuk hapus transaksi pending
  const handleDeleteTransaction = async (transaction: Transaksi) => {
    if (transaction.status !== 'pending') {
      toast.error('Hanya transaksi pending yang bisa dihapus');
      return;
    }

    if (!confirm(`Hapus transaksi dari ${transaction.user_name}?\n\nPaket: ${transaction.package_name}\nNominal: ${formatPrice(transaction.amount)}\n\nData ini akan dihapus permanen.`)) {
      return;
    }

    const deletePromise = (async () => {
      // 1. Hapus file bukti pembayaran dari storage (jika ada)
      if (transaction.payment_proof) {
        try {
          const urlParts = transaction.payment_proof.split('/');
          const fileName = urlParts[urlParts.length - 1];
          
          const { error: storageError } = await supabase.storage
            .from('payment-proofs')
            .remove([fileName]);

          if (storageError) {
            console.warn('Storage delete warning:', storageError);
          }
        } catch (err) {
          console.warn('Failed to delete proof file:', err);
        }
      }

      // 2. Hapus transaksi dari database
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", transaction.id);

      if (error) throw error;

      // 3. Update localStorage
      const existingTransactions = JSON.parse(localStorage.getItem('package_transactions') || '[]');
      const updatedTransactions = existingTransactions.filter((t: any) => t.id !== transaction.id);
      localStorage.setItem('package_transactions', JSON.stringify(updatedTransactions));

      await fetchTransaksis();
      return transaction.user_name;
    })();

    toast.promise(deletePromise, {
      loading: 'Menghapus transaksi...',
      success: (name) => `Transaksi dari ${name} berhasil dihapus!`,
      error: (err) => `Gagal menghapus: ${err.message}`,
    });
  };

  const handleViewProof = (transaction: Transaksi) => {
    if (!transaction.payment_proof) {
      toast.error("Bukti pembayaran tidak tersedia");
      return;
    }
    setSelectedTransaction(transaction);
    setSelectedProof(transaction.payment_proof);
    setShowProofModal(true);
  };

  const handleUpdateStatus = async (newStatus: "success" | "failed") => {
    if (!selectedTransaction) return;

    const statusLabel = newStatus === "success" ? "menerima" : "menolak";
    if (!confirm(`Apakah Anda yakin ingin ${statusLabel} transaksi dari ${selectedTransaction.user_name}?`)) {
      return;
    }

    setIsProcessing(true);

    const updatePromise = async () => {
      try {
        console.log("🔍 DEBUG - Transaction:", selectedTransaction);

        // ✅ 1. Update transaction status
        const { error: updateError } = await supabase
          .from("transactions")
          .update({
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedTransaction.id);

        if (updateError) {
          console.error("❌ Update transaction error:", updateError);
          throw updateError;
        }

        console.log("✅ Transaction status updated");

        // ✅ 2. Grant package access (only if approved)
        if (newStatus === "success") {
          // Get user_id and package_id (handle both field name formats)
          const userId = selectedTransaction.user_id || selectedTransaction.user_id;
          const packageId = selectedTransaction.package_id || selectedTransaction.package_id;

          console.log("📦 Package data:", { userId, packageId });

          if (!userId || !packageId) {
            console.error("❌ Missing user_id or package_id");
            throw new Error("Data user atau paket tidak lengkap");
          }

          // Check if package already exists
          const { data: existingPackage, error: checkError } = await supabase
            .from("user_packages")
            .select("*")
            .eq("user_id", userId)
            .eq("package_id", packageId)
            .maybeSingle();

          if (checkError) {
            console.error("❌ Check package error:", checkError);
            throw checkError;
          }

          if (existingPackage) {
            // Update existing package
            console.log("📝 Updating existing package...");
            const { error: updatePkgError } = await supabase
              .from("user_packages")
              .update({
                is_active: true,
                valid_until: null, // Lifetime
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingPackage.id);

            if (updatePkgError) {
              console.error("❌ Update package error:", updatePkgError);
              throw updatePkgError;
            }
            console.log("✅ Package updated (lifetime)");
          } else {
            // Create new package
            console.log("➕ Creating new package...");
            const { error: insertPkgError } = await supabase
              .from("user_packages")
              .insert({
                user_id: userId,
                package_id: packageId,
                is_active: true,
                valid_until: null, // Lifetime
              });

            if (insertPkgError) {
              console.error("❌ Insert package error:", insertPkgError);
              throw insertPkgError;
            }
            console.log("✅ Package created (lifetime)");

            try {
              console.log("📧 Sending email notification...");
              
              const { data: emailResult, error: emailError } = await supabase.functions.invoke(
                'send-payment-email',
                {
                  body: {
                    userEmail: selectedTransaction.user_email,
                    userName: selectedTransaction.user_name,
                    packageName: selectedTransaction.package_name,
                    amount: selectedTransaction.amount,
                    transactionId: selectedTransaction.id,
                  }
                }
              );

              if (emailError) {
                console.warn("⚠️ Email error:", emailError);
              } else {
                console.log("✅ Email sent successfully:", emailResult);
              }
            } catch (emailErr) {
              console.warn("⚠️ Email service error:", emailErr);
              // Don't throw - transaction still successful even if email fails
            }
          }
        }

        // ✅ 3. Refresh data
        await fetchTransaksis();
        setShowProofModal(false);
        setSelectedTransaction(null);
        setSelectedProof(null);
        
        return statusLabel;
      } catch (error) {
        console.error("❌ Full error:", error);
        throw error;
      }
    };

    toast.promise(updatePromise(), {
      loading: "Memproses transaksi...",
      success: (label) => `✅ Transaksi berhasil ${label}!`,
      error: (err) => {
        console.error("❌ Toast error:", err);
        return `❌ Gagal: ${err.message || "Terjadi kesalahan"}`;
      },
    }).finally(() => {
      setIsProcessing(false);
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
        return { bg: "bg-[#FEF3C7]", text: "text-[#92400E]" };
      default:
        return { bg: "bg-[#F3F4F6]", text: "text-[#4A5565]" };
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "success":
        return "Sukses";
      case "failed":
        return "Ditolak";
      case "pending":
        return "Menunggu Verifikasi";
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
            Kelola paket langganan dan verifikasi transaksi pengguna.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-sm text-[#64748B]">Pending Verification</p>
            </div>
            <p className="text-2xl font-bold text-[#1E293B]">{pendingCount}</p>
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
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors relative ${
                activeTab === "transaksi"
                  ? "text-[#295782] border-b-2 border-[#295782]"
                  : "text-[#64748B] hover:text-[#1E293B]"
              }`}
            >
              Kelola Transaksi
              {pendingCount > 0 && (
                <span className="absolute top-2 right-2 bg-orange-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
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

                      <div className="flex items-center gap-2 pt-4 border-t border-gray-200 mt-auto">
                        <button
                          onClick={() => {
                            setSelectedPackage_Id(paket.id);
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
          // Transaction Management Tab
          <div>
            {/* Filter */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-[#64748B]">Filter Status:</span>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setStatusFilter("all")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      statusFilter === "all"
                        ? "bg-[#295782] text-white"
                        : "bg-gray-100 text-[#64748B] hover:bg-gray-200"
                    }`}
                  >
                    Semua ({transaksis.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter("pending")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      statusFilter === "pending"
                        ? "bg-orange-500 text-white"
                        : "bg-gray-100 text-[#64748B] hover:bg-gray-200"
                    }`}
                  >
                    Pending ({pendingCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter("success")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      statusFilter === "success"
                        ? "bg-green-600 text-white"
                        : "bg-gray-100 text-[#64748B] hover:bg-gray-200"
                    }`}
                  >
                    Sukses ({transaksis.filter(t => t.status === 'success').length})
                  </button>
                  <button
                    onClick={() => setStatusFilter("failed")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      statusFilter === "failed"
                        ? "bg-red-600 text-white"
                        : "bg-gray-100 text-[#64748B] hover:bg-gray-200"
                    }`}
                  >
                    Ditolak ({transaksis.filter(t => t.status === 'failed').length})
                  </button>
                </div>
              </div>
            </div>

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
                        Tanggal
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredTransaksis.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center">
                          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <p className="text-[#64748B]">Belum ada transaksi</p>
                        </td>
                      </tr>
                    ) : (
                      filteredTransaksis.map((transaksi) => {
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

                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {transaksi.payment_proof ? (
                                  <button
                                    onClick={() => handleViewProof(transaksi)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                                      transaksi.status === 'pending'
                                        ? 'bg-orange-500 text-white hover:bg-orange-600'
                                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                    }`}
                                    title="Lihat & Verifikasi Bukti"
                                  >
                                    <ZoomIn className="w-4 h-4" />
                                    <span className="text-xs font-medium">
                                      {transaksi.status === 'pending' ? 'Verifikasi' : 'Lihat Bukti'}
                                    </span>
                                  </button>
                                ) : (
                                  <span className="text-xs text-gray-400 italic">
                                    Tidak ada bukti
                                  </span>
                                )}

                                {/* ✅ Tombol Hapus untuk Pending */}
                                {transaksi.status === 'pending' && (
                                  <button
                                    onClick={() => handleDeleteTransaction(transaksi)}
                                    className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                    title="Hapus Transaksi"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
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
                  Menampilkan {filteredTransaksis.length} dari {transaksis.length} transaksi
                </p>
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
            setSearchParams({});
          }}
          onSuccess={() => {
            fetchPakets();
            fetchTransaksis();
            setSearchParams({});
          }}
        />
      )}

      {showEditModal && selectedPackage_Id && (
        <EditPackageModal
          isOpen={showEditModal}
          package_Id={selectedPackage_Id}
          onClose={() => {
            setShowEditModal(false);
            setSelectedPackage_Id(null);
          }}
          onSuccess={() => {
            fetchPakets();
            fetchTransaksis();
          }}
        />
      )}

      {/* Proof Review Modal */}
      {showProofModal && selectedProof && selectedTransaction && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={() => {
            if (!isProcessing) {
              setShowProofModal(false);
              setSelectedTransaction(null);
              setSelectedProof(null);
            }
          }}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-[#295782] to-[#1e4060]">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Verifikasi Bukti Pembayaran</h3>
                <p className="text-sm text-white/80">
                  Review bukti pembayaran sebelum konfirmasi
                </p>
              </div>
              <button
                onClick={() => {
                  if (!isProcessing) {
                    setShowProofModal(false);
                    setSelectedTransaction(null);
                    setSelectedProof(null);
                  }
                }}
                disabled={isProcessing}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            <div className="p-6 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-[#64748B] mb-1">Pengguna</p>
                  <p className="text-sm font-semibold text-[#1E293B]">
                    {selectedTransaction.user_name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#64748B] mb-1">Paket</p>
                  <p className="text-sm font-semibold text-[#1E293B]">
                    {selectedTransaction.package_name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#64748B] mb-1">Nominal</p>
                  <p className="text-sm font-semibold text-green-600">
                    {formatPrice(selectedTransaction.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#64748B] mb-1">Metode</p>
                  <p className="text-sm font-semibold text-[#1E293B]">
                    {selectedTransaction.payment_method}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
              <div className="flex items-center justify-center min-h-full">
                <img
                  src={selectedProof}
                  alt="Bukti Pembayaran"
                  className="max-w-full h-auto rounded-lg shadow-lg border-4 border-white"
                />
              </div>
            </div>

            {selectedTransaction.status === 'pending' && (
              <div className="p-6 border-t border-gray-200 bg-white">
                <div className="flex gap-3">
                  <button
                    onClick={() => handleUpdateStatus('failed')}
                    disabled={isProcessing}
                    className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X className="w-5 h-5" />
                    <span className="font-semibold">Tolak Pembayaran</span>
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('success')}
                    disabled={isProcessing}
                    className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check className="w-5 h-5" />
                    <span className="font-semibold">Terima Pembayaran</span>
                  </button>
                </div>
                <p className="text-xs text-center text-[#64748B] mt-3">
                  ⚠️ Pastikan bukti pembayaran valid sebelum konfirmasi
                </p>
              </div>
            )}

            {selectedTransaction.status !== 'pending' && (
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <p className="text-sm text-center text-[#64748B]">
                  Transaksi ini sudah diproses dengan status:{" "}
                  <span className={`font-semibold ${
                    selectedTransaction.status === 'success' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {getStatusLabel(selectedTransaction.status)}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
