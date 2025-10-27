// src/pages/admin/adminPengaturan.tsx

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Edit2, Trash2, LogOut, Eye, EyeOff, Check, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import AdminLayout from "@/components/admin/AdminLayout";
import AddAdminModal from "@/components/admin/AddAdminModal";

interface Admin {
  id: string;
  name: string;
  email: string;
  role: "Super Admin" | "Moderator";
  lastLogin: string;
  status: "Aktif" | "Nonaktif";
  permissions?: {
    kelolaPengguna: boolean;
    kelolaTryout: boolean;
    kelolaTransaksi: boolean;
    ubahPengaturan: boolean;
  };
}

export default function AdminPengaturan() {
  const navigate = useNavigate();
  
  // Password states
  const [passwordLama, setPasswordLama] = useState("");
  const [passwordBaru, setPasswordBaru] = useState("");
  const [konfirmasiPassword, setKonfirmasiPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  
  // System states
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  
  // Admin management states
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  // Role management states
  const [selectedAdminId, setSelectedAdminId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<"Super Admin" | "Moderator">("Moderator");
  const [permissions, setPermissions] = useState({
    kelolaPengguna: false,
    kelolaTryout: false,
    kelolaTransaksi: false,
    ubahPengaturan: false,
  });

  // Fungsi validasi password
  const validatePassword = (pass: string) => {
    const errors: string[] = [];
    if (pass.length < 6) errors.push("Minimal 6 karakter.");
    if (!/\d/.test(pass)) errors.push("Harus mengandung angka.");
    if (!/[A-Z]/.test(pass)) errors.push("Harus ada huruf kapital.");
    return errors;
  };

  const handlePasswordBaruChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPasswordBaru(newPassword);
    setPasswordErrors(newPassword ? validatePassword(newPassword) : []);
    setConfirmPasswordError(konfirmasiPassword && newPassword !== konfirmasiPassword ? "Password tidak cocok" : "");
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newConfirmPassword = e.target.value;
    setKonfirmasiPassword(newConfirmPassword);
    setConfirmPasswordError(passwordBaru !== newConfirmPassword ? "Password tidak cocok" : "");
  };

  const isPasswordValid = passwordErrors.length === 0 && passwordBaru.length > 0;
  const isConfirmMatch = konfirmasiPassword && passwordBaru === konfirmasiPassword;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchAdmins(),
        fetchMaintenanceMode()
      ]);
    } catch (error: any) {
      console.error("❌ Fetch error:", error);
      toast.error("Gagal memuat data");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAdmins = async () => {
    console.log("🔍 Fetching admins...");

    // Force fresh data dengan menambahkan order by updated_at desc
    const { data, error } = await supabase
      .from("users")
      .select(`
        user_id,
        nama_lengkap,
        email,
        created_at,
        admin_roles!inner (
          role,
          permissions,
          updated_at
        )
      `)
      .eq("role", "admin")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Fetch error:", error);
      throw error;
    }

    console.log("✅ Raw data from database:", data);

    const transformedAdmins: Admin[] = data?.map((admin: any) => {
      // Ambil data admin_roles terbaru (sorted by updated_at)
      const latestRole = Array.isArray(admin.admin_roles) 
        ? admin.admin_roles.sort((a: any, b: any) => 
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          )[0]
        : admin.admin_roles;

      console.log(`✅ Admin ${admin.nama_lengkap} role:`, latestRole?.role);

      return {
        id: admin.user_id,
        name: admin.nama_lengkap,
        email: admin.email,
        role: latestRole?.role || "Moderator",
        lastLogin: "-",
        status: "Aktif",
        permissions: latestRole?.permissions || {
          kelolaPengguna: false,
          kelolaTryout: false,
          kelolaTransaksi: false,
          ubahPengaturan: false,
        }
      };
    }) || [];

    console.log("✅ Transformed admins:", transformedAdmins);

    setAdmins(transformedAdmins);
  };


  const fetchMaintenanceMode = async () => {
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "maintenance_mode")
      .single();

    if (error) {
      console.error("❌ Maintenance mode fetch error:", error);
      return;
    }

    setMaintenanceMode(data?.value === "true");
  };

  const handlePasswordChange = async () => {
    if (!passwordLama || !passwordBaru || !konfirmasiPassword) {
      toast.error("Semua field harus diisi!");
      return;
    }

    const currentPasswordErrors = validatePassword(passwordBaru);
    if (currentPasswordErrors.length > 0) {
      setPasswordErrors(currentPasswordErrors);
      toast.error("Password tidak memenuhi kriteria yang ditentukan!");
      return;
    }

    if (passwordBaru !== konfirmasiPassword) {
      setConfirmPasswordError("Password tidak cocok");
      toast.error("Password baru dan konfirmasi tidak cocok!");
      return;
    }

    if (passwordLama === passwordBaru) {
      toast.error("Password baru harus berbeda dari password lama!");
      return;
    }

    const changePromise = (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.email) {
        throw new Error("User tidak ditemukan");
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordLama,
      });

      if (signInError) {
        throw new Error("Password lama salah!");
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordBaru
      });

      if (updateError) throw updateError;

      setPasswordLama("");
      setPasswordBaru("");
      setKonfirmasiPassword("");
      setPasswordErrors([]);
      setConfirmPasswordError("");
    })();

    toast.promise(changePromise, {
      loading: "Mengubah password...",
      success: "Password berhasil diubah!",
      error: (err) => `Gagal: ${err.message}`,
    });
  };

  const handleToggleMaintenanceMode = async () => {
    const newMode = !maintenanceMode;

    const togglePromise = (async () => {
      const { error } = await supabase
        .from("app_settings")
        .update({ value: String(newMode), updated_at: new Date().toISOString() })
        .eq("key", "maintenance_mode");

      if (error) throw error;

      setMaintenanceMode(newMode);
    })();

    toast.promise(togglePromise, {
      loading: "Mengubah mode maintenance...",
      success: `Mode maintenance ${newMode ? "diaktifkan" : "dinonaktifkan"}!`,
      error: (err) => `Gagal: ${err.message}`,
    });
  };

  const handleLogout = async () => {
    if (!confirm("Yakin ingin logout?")) return;

    const logoutPromise = (async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate("/signin");
    })();

    toast.promise(logoutPromise, {
      loading: "Logging out...",
      success: "Berhasil logout!",
      error: (err) => `Gagal: ${err.message}`,
    });
  };

  const handleSaveRole = async () => {
    if (!selectedAdminId) {
      toast.error("Pilih admin terlebih dahulu!");
      return;
    }

    const savePromise = (async () => {
      // 1. Check existing role
      const { data: existingRole, error: checkError } = await supabase
        .from("admin_roles")
        .select("id")
        .eq("user_id", selectedAdminId)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError;
      }

      // 2. Update atau Insert
      if (existingRole) {
        const { error } = await supabase
          .from("admin_roles")
          .update({
            role: selectedRole,
            permissions: permissions,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", selectedAdminId);

        if (error) throw error;
        console.log("✅ Role updated successfully for user:", selectedAdminId);
      } else {
        const { error } = await supabase
          .from("admin_roles")
          .insert({
            user_id: selectedAdminId,
            role: selectedRole,
            permissions: permissions,
          });

        if (error) throw error;
        console.log("✅ Role inserted successfully for user:", selectedAdminId);
      }

      // 3. CRITICAL: Tambahkan delay untuk memastikan DB commit
      await new Promise(resolve => setTimeout(resolve, 800));

      // 4. Verifikasi data terbaru dari database
      const { data: verifiedRole } = await supabase
        .from("admin_roles")
        .select("role, permissions, updated_at")
        .eq("user_id", selectedAdminId)
        .single();

      console.log("✅ Verified role from database:", verifiedRole);

      // 5. Update state admins secara OPTIMISTIC (langsung update UI)
      setAdmins(prevAdmins => 
        prevAdmins.map(admin => 
          admin.id === selectedAdminId 
            ? { 
                ...admin, 
                role: selectedRole,
                permissions: permissions
              }
            : admin
        )
      );

      // 6. Fetch ulang untuk double confirm
      await fetchAdmins();
      
      // 7. Reset state
      setSelectedAdminId("");
      setSelectedRole("Moderator");
      setPermissions({
        kelolaPengguna: false,
        kelolaTryout: false,
        kelolaTransaksi: false,
        ubahPengaturan: false,
      });
    })();

    toast.promise(savePromise, {
      loading: "Menyimpan peran...",
      success: "Peran berhasil disimpan!",
      error: (err) => `Gagal: ${err.message}`,
    });
  };

  const handleDeleteAdmin = async (id: string, name: string) => {
    if (!confirm(`Hapus admin "${name}"?`)) return;

    const deletePromise = (async () => {
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("user_id", id);

      if (error) throw error;

      await fetchAdmins();
    })();

    toast.promise(deletePromise, {
      loading: "Menghapus admin...",
      success: `"${name}" berhasil dihapus!`,
      error: (err) => `Gagal: ${err.message}`,
    });
  };

  const handleAdminSelect = (adminId: string) => {
    setSelectedAdminId(adminId);
    const admin = admins.find(a => a.id === adminId);
    if (admin) {
      setSelectedRole(admin.role);
      setPermissions(admin.permissions || {
        kelolaPengguna: false,
        kelolaTryout: false,
        kelolaTransaksi: false,
        ubahPengaturan: false,
      });
    }
  };

  const filteredAdmins = admins.filter(admin =>
    admin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Komponen ValidationItem untuk reusability
  const ValidationItem = ({ isValid, text }: { isValid: boolean; text: string }) => (
    <div className={`flex items-center gap-2 text-xs ${isValid ? 'text-green-600' : 'text-[#64748B]'}`}>
      {isValid ? (
        <Check className="w-3.5 h-3.5" />
      ) : (
        <AlertCircle className="w-3.5 h-3.5" />
      )}
      <span>{text}</span>
    </div>
  );

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
          <h1 className="text-2xl font-bold text-[#1E293B] mb-2">Pengaturan Admin</h1>
          <p className="text-sm text-[#64748B]">Kelola keamanan akun admin, peran, dan status sistem.</p>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Keamanan Akun */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-[#1E293B] mb-4">Keamanan Akun</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#64748B] mb-2">Password Lama</label>
                <div className="relative">
                  <input
                    type={showOldPassword ? "text" : "password"}
                    value={passwordLama}
                    onChange={(e) => setPasswordLama(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#F3F4F6] rounded-lg border-0 text-sm text-[#1E293B] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#295782]"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#1E293B]"
                  >
                    {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#64748B] mb-2">Password Baru</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={passwordBaru}
                    onChange={handlePasswordBaruChange}
                    className={`w-full px-4 py-2.5 rounded-lg border text-sm text-[#1E293B] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#295782] transition-colors ${
                      passwordErrors.length > 0
                        ? 'border-red-500 bg-red-50'
                        : 'border-0 bg-[#F3F4F6]'
                    }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#1E293B]"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Validasi Real-time dengan list */}
                {passwordErrors.length > 0 && (
                  <ul className="text-xs text-red-500 mt-2 pl-1 list-disc list-inside space-y-0.5">
                    {passwordErrors.map(error => <li key={error}>{error}</li>)}
                  </ul>
                )}
              </div>

              <div>
                <label className="block text-sm text-[#64748B] mb-2">Konfirmasi Password Baru</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={konfirmasiPassword}
                    onChange={handleConfirmPasswordChange}
                    className={`w-full px-4 py-2.5 rounded-lg border text-sm text-[#1E293B] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#295782] transition-colors ${
                      confirmPasswordError
                        ? 'border-red-500 bg-red-50'
                        : 'border-0 bg-[#F3F4F6]'
                    }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#1E293B]"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Validasi Konfirmasi Password */}
                {confirmPasswordError && (
                  <p className="text-xs text-red-500 mt-2 pl-1">{confirmPasswordError}</p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handlePasswordChange}
                  disabled={!passwordLama || !isPasswordValid || !isConfirmMatch}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    passwordLama && isPasswordValid && isConfirmMatch
                      ? 'bg-[#295782] text-white hover:bg-[#295782]/90 cursor-pointer'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Simpan Perubahan
                </button>
                <button
                  onClick={() => {
                    setPasswordLama("");
                    setPasswordBaru("");
                    setKonfirmasiPassword("");
                    setShowValidation(false);
                  }}
                  className="flex-1 bg-white border border-gray-200 text-[#64748B] px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>

          {/* Mode Sistem & Logout */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-[#1E293B] mb-4">Mode Sistem & Logout</h3>
            
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-[#1E293B]">Maintenance Mode</label>
                  <button
                    onClick={handleToggleMaintenanceMode}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      maintenanceMode ? "bg-[#295782]" : "bg-[#E5E7EB]"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                        maintenanceMode ? "translate-x-6" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
                <p className="text-xs text-[#64748B]">
                  Saat aktif, pengguna melihat halaman perawatan.
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 border-2 border-[#DC2626] text-[#DC2626] px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#FEF2F2] transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>

          {/* Manajemen Peran */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-[#1E293B] mb-4">Manajemen Peran</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#64748B] mb-2">Pilih Admin</label>
                <select
                  value={selectedAdminId}
                  onChange={(e) => handleAdminSelect(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#F3F4F6] rounded-lg border-0 text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#295782]"
                >
                  <option value="">Pilih Admin</option>
                  {admins.map(admin => (
                    <option key={admin.id} value={admin.id}>{admin.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-[#64748B] mb-3">Peran</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      checked={selectedRole === "Super Admin"}
                      onChange={() => {
                        setSelectedRole("Super Admin");
                        setPermissions({
                          kelolaPengguna: true,
                          kelolaTryout: true,
                          kelolaTransaksi: true,
                          ubahPengaturan: true,
                        });
                      }}
                      className="w-4 h-4 text-[#295782] focus:ring-[#295782]"
                    />
                    <span className="text-sm text-[#1E293B]">Super Admin</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      checked={selectedRole === "Moderator"}
                      onChange={() => {
                        setSelectedRole("Moderator");
                        setPermissions({
                          kelolaPengguna: false,
                          kelolaTryout: false,
                          kelolaTransaksi: false,
                          ubahPengaturan: false,
                        });
                      }}
                      className="w-4 h-4 text-[#295782] focus:ring-[#295782]"
                    />
                    <span className="text-sm text-[#1E293B]">Moderator</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#64748B] mb-3">Hak Akses</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions.kelolaPengguna}
                      onChange={(e) => setPermissions({...permissions, kelolaPengguna: e.target.checked})}
                      disabled={selectedRole === "Super Admin"}
                      className="w-4 h-4 text-[#295782] rounded border-gray-300 focus:ring-[#295782] disabled:opacity-50"
                    />
                    <span className="text-sm text-[#1E293B]">Kelola Pengguna</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions.kelolaTryout}
                      onChange={(e) => setPermissions({...permissions, kelolaTryout: e.target.checked})}
                      disabled={selectedRole === "Super Admin"}
                      className="w-4 h-4 text-[#295782] rounded border-gray-300 focus:ring-[#295782] disabled:opacity-50"
                    />
                    <span className="text-sm text-[#1E293B]">Kelola Tryout</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions.kelolaTransaksi}
                      onChange={(e) => setPermissions({...permissions, kelolaTransaksi: e.target.checked})}
                      disabled={selectedRole === "Super Admin"}
                      className="w-4 h-4 text-[#295782] rounded border-gray-300 focus:ring-[#295782] disabled:opacity-50"
                    />
                    <span className="text-sm text-[#1E293B]">Kelola Transaksi & Paket</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions.ubahPengaturan}
                      onChange={(e) => setPermissions({...permissions, ubahPengaturan: e.target.checked})}
                      disabled={selectedRole === "Super Admin"}
                      className="w-4 h-4 text-[#295782] rounded border-gray-300 focus:ring-[#295782] disabled:opacity-50"
                    />
                    <span className="text-sm text-[#1E293B]">Ubah Pengaturan</span>
                  </label>
                </div>
              </div>

              <button
                onClick={handleSaveRole}
                disabled={!selectedAdminId}
                className="w-full bg-[#295782] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#295782]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Simpan Peran
              </button>
            </div>
          </div>
        </div>

        {/* Manajemen Admin */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-[#1E293B]">Manajemen Admin</h3>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama/email admin"
                  className="pl-10 pr-4 py-2 bg-[#F9FAFB] rounded-lg border border-gray-200 text-sm text-[#1E293B] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#295782] w-64"
                />
              </div>
              <button
                onClick={() => setShowAddAdminModal(true)}  // ✅ Update handler ini saja
                className="flex items-center gap-2 px-4 py-2 bg-[#295782] text-white rounded-lg hover:bg-[#295782]/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Tambah Admin
              </button>

            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-[#64748B]">Nama Admin</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-[#64748B]">Peran</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-[#64748B]">Terakhir Login</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-[#64748B]">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-[#64748B]">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdmins.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[#64748B]">
                      Tidak ada admin ditemukan
                    </td>
                  </tr>
                ) : (
                  filteredAdmins.map((admin) => (
                    <tr key={admin.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#295782] flex items-center justify-center">
                            <span className="text-sm font-semibold text-white">
                              {admin.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[#1E293B]">{admin.name}</p>
                            <p className="text-xs text-[#64748B]">{admin.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-lg bg-[#DBEAFE] text-[#1E40AF] text-xs font-medium">
                          {admin.role}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-[#64748B]">{admin.lastLogin}</td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium ${
                          admin.status === "Aktif" 
                            ? "bg-[#DCFCE7] text-[#16A34A]" 
                            : "bg-[#FEE2E2] text-[#DC2626]"
                        }`}>
                          {admin.status}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleAdminSelect(admin.id)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4 text-[#295782]" />
                          </button>
                          <button 
                            onClick={() => handleDeleteAdmin(admin.id, admin.name)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-[#DC2626]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <AddAdminModal
        isOpen={showAddAdminModal}
        onClose={() => setShowAddAdminModal(false)}
        onSuccess={fetchAdmins}
      />
    </AdminLayout>
  );
}