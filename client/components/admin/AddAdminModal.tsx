// src/components/admin/AddAdminModal.tsx (FINAL - CHAOS SCHEMA FIX)

import { useState } from "react";
import { X, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";

interface AddAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddAdminModal({ isOpen, onClose, onSuccess }: AddAdminModalProps) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    nama_lengkap: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  // Password validation helper
  const validatePassword = (password: string) => {
    const minLength = password.length >= 6;
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    return {
      minLength,
      hasUppercase,
      hasNumber,
      isValid: minLength && hasUppercase && hasNumber,
    };
  };

  const passwordValidation = validatePassword(formData.password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.email.trim()) {
      toast.error("Email wajib diisi!");
      return;
    }
    if (!formData.email.includes("@")) {
      toast.error("Format email tidak valid!");
      return;
    }
    if (!formData.nama_lengkap.trim()) {
      toast.error("Nama lengkap wajib diisi!");
      return;
    }

    // Enhanced password validation
    if (!passwordValidation.isValid) {
      if (!passwordValidation.minLength) {
        toast.error("Password minimal 6 karakter!");
        return;
      }
      if (!passwordValidation.hasUppercase) {
        toast.error("Password harus mengandung huruf besar!");
        return;
      }
      if (!passwordValidation.hasNumber) {
        toast.error("Password harus mengandung angka!");
        return;
      }
      return;
    }

    setIsSaving(true);

    const savePromise = (async () => {
      // 1. Create auth user with metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            nama_lengkap: formData.nama_lengkap.trim(),
            role: "admin",
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      console.log("✅ Auth user created:", authData.user.id);

      // 2. Wait for database trigger to complete
      await new Promise(resolve => setTimeout(resolve, 4000));

      // 3. Check if user already exists in custom users table
      const { data: existingUser } = await supabase
        .from("users")
        .select("email, role, user_id, auth_id")
        .eq("email", formData.email.trim())
        .maybeSingle();

      console.log("🔍 Existing user check:", existingUser);

      // 4. If user doesn't exist, insert manually
      if (!existingUser) {
        console.log("⚠️ User not found, inserting manually...");

        // ✅ IMPORTANT: Jangan kirim id (biar auto-increment), hanya kirim data minimal
        const { error: insertError } = await supabase
          .from("users")
          .insert({
            email: formData.email.trim(),
            nama_lengkap: formData.nama_lengkap.trim(),
            role: "admin",
            auth_id: authData.user.id, // Link to auth.users
            status_akun: "aktif",
            // id akan auto-increment (integer)
            // user_id akan auto-generate via gen_random_uuid()
          });

        if (insertError) {
          console.error("❌ Insert error:", insertError);
          throw new Error(`Failed to insert user: ${insertError.message}`);
        }

        console.log("✅ User successfully inserted");
      } 
      // 5. If user exists but not admin, update role
      else if (existingUser.role !== "admin") {
        console.log("⚠️ User exists but not admin, updating role...");

        const { error: updateError } = await supabase
          .from("users")
          .update({ 
            role: "admin", 
            nama_lengkap: formData.nama_lengkap.trim(),
            auth_id: authData.user.id, // Update auth_id link
          })
          .eq("email", formData.email.trim());

        if (updateError) {
          console.error("❌ Update error:", updateError);
          throw updateError;
        }

        console.log("✅ User role updated to admin");
      } else {
        console.log("✅ User already exists as admin");
      }

      // Reset form
      setFormData({
        email: "",
        password: "",
        nama_lengkap: "",
      });

      onSuccess();
      onClose();
    })();

    toast.promise(savePromise, {
      loading: "Membuat akun admin...",
      success: "Admin berhasil ditambahkan!",
      error: (err) => `Gagal: ${err.message}`,
    }).finally(() => setIsSaving(false));
  };

  const handleClose = () => {
    if (isSaving) return;
    setFormData({
      email: "",
      password: "",
      nama_lengkap: "",
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-[#1E293B]">Tambah Admin Baru</h3>
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-[#64748B]" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-[#1E293B] mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#295782] focus:border-transparent transition-colors"
              placeholder="admin@example.com"
              disabled={isSaving}
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-[#1E293B] mb-2">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#295782] focus:border-transparent transition-colors pr-10"
                placeholder="Minimal 6 karakter"
                disabled={isSaving}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#1E293B]"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Password Requirements - Hanya tampil jika belum valid */}
            {formData.password && !passwordValidation.isValid && (
              <div className="mt-3 space-y-2">
                {!passwordValidation.minLength && (
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span className="text-xs text-red-400">
                      Minimal 6 karakter
                    </span>
                  </div>
                )}
                {!passwordValidation.hasUppercase && (
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span className="text-xs text-red-400">
                      Minimal 1 huruf besar (A-Z)
                    </span>
                  </div>
                )}
                {!passwordValidation.hasNumber && (
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span className="text-xs text-red-400">
                      Minimal 1 angka (0-9)
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Nama Lengkap */}
          <div>
            <label className="block text-sm font-medium text-[#1E293B] mb-2">
              Nama Lengkap <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.nama_lengkap}
              onChange={(e) => setFormData({ ...formData, nama_lengkap: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#295782] focus:border-transparent transition-colors"
              placeholder="John Doe"
              disabled={isSaving}
            />
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-xs text-blue-800">
              <strong>Info:</strong> Admin baru akan mendapat email konfirmasi. Pastikan email yang dimasukkan valid.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSaving}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-[#64748B] rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-4 py-2.5 bg-[#295782] text-white rounded-lg hover:bg-[#295782]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Menyimpan..." : "Tambah Admin"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
