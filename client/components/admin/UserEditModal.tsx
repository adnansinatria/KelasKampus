// src/components/admin/UserEditModal.tsx

import { useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";

interface User {
  user_id: string;
  nama_lengkap: string;
  email: string;
  role: string;
  asal_sekolah?: string;
  // jurusan_minat?: string;
  status_akun?: string;
  created_at: string;
  photo_profile?: string;
  paket_aktif?: string;
  paket_aktif_list?: string[];
  total_transaksi?: number;
}

interface UserEditModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UserEditModal({ user, isOpen, onClose, onSuccess }: UserEditModalProps) {
  const [editForm, setEditForm] = useState({
    nama_lengkap: user.nama_lengkap,
    asal_sekolah: user.asal_sekolah || "",
    // jurusan_minat: user.jurusan_minat || "",
    status_akun: user.status_akun || "aktif",
  });

  if (!isOpen) return null;

  const handleSubmit = async () => {
    try {
      // 1. Update tabel users (nama_lengkap, status_akun)
      const { error: userError } = await supabase
        .from("users")
        .update({
          nama_lengkap: editForm.nama_lengkap,
          status_akun: editForm.status_akun,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.user_id);

      if (userError) throw userError;

      // 2. Update tabel siswa (asal_sekolah) - Hanya untuk role siswa
      if (user.role === "siswa") {
        const { data: siswaData, error: checkError } = await supabase
          .from("siswa")
          .select("id")
          .eq("user_id", user.user_id)
          .maybeSingle();

        if (checkError) throw checkError;

        if (siswaData) {
          // Update jika sudah ada
          const { error: siswaError } = await supabase
            .from("siswa")
            .update({
              asal_sekolah: editForm.asal_sekolah || null,
              updated_at: new Date().toISOString() // ← TAMBAHKAN INI
            })
            .eq("user_id", user.user_id);

          if (siswaError) throw siswaError;
        } else {
          // Insert jika belum ada
          const { error: siswaError } = await supabase
            .from("siswa")
            .insert({
              user_id: user.user_id,
              asal_sekolah: editForm.asal_sekolah || null,
            });

          if (siswaError) throw siswaError;
        }
      }

      // Success - Panggil callback
      toast.success("Data user berhasil diperbarui!");
      onSuccess(); // ← Dipanggil SETELAH semua update selesai
      onClose();
    } catch (err: any) {
      console.error("Update error:", err);
      toast.error(`Gagal memperbarui data: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-[#1E293B]">Edit Pengguna</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[#64748B]" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Nama Lengkap */}
          <div>
            <label className="block text-sm font-medium text-[#64748B] mb-2">Nama Lengkap</label>
            <input
              type="text"
              value={editForm.nama_lengkap}
              onChange={(e) => setEditForm({ ...editForm, nama_lengkap: e.target.value })}
              className="w-full px-4 py-2.5 bg-[#F3F4F6] rounded-lg border-0 text-sm text-[#1E293B] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#295782]"
              placeholder="Masukkan nama lengkap"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-[#64748B] mb-2">Email</label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full px-4 py-2.5 bg-gray-200 rounded-lg border-0 text-sm text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-[#64748B] mt-1">Email tidak dapat diubah</p>
          </div>

          {/* Asal Sekolah - Hanya tampil jika role siswa */}
          {user.role === "siswa" && (
            <>
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-2">Asal Sekolah</label>
                <input
                  type="text"
                  value={editForm.asal_sekolah}
                  onChange={(e) => setEditForm({ ...editForm, asal_sekolah: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#F3F4F6] rounded-lg border-0 text-sm text-[#1E293B] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#295782]"
                  placeholder="Masukkan asal sekolah"
                />
              </div>

              {/* Jurusan Minat
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-2">Jurusan Minat</label>
                <select
                  value={editForm.jurusan_minat}
                  onChange={(e) => setEditForm({ ...editForm, jurusan_minat: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#F3F4F6] rounded-lg border-0 text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#295782]"
                >
                  <option value="">Pilih Jurusan</option>
                  <option value="IPA">IPA</option>
                  <option value="IPS">IPS</option>
                  <option value="Bahasa">Bahasa</option>
                </select>
              </div> */}
            </>
          )}

          {/* Status Akun */}
          <div>
            <label className="block text-sm font-medium text-[#64748B] mb-2">Status Akun</label>
            <select
              value={editForm.status_akun}
              onChange={(e) => setEditForm({ ...editForm, status_akun: e.target.value })}
              className="w-full px-4 py-2.5 bg-[#F3F4F6] rounded-lg border-0 text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#295782]"
            >
              <option value="aktif">Aktif</option>
              <option value="nonaktif">Nonaktif</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#64748B] border border-gray-200 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-[#295782] hover:bg-[#295782]/90 rounded-lg transition-colors"
          >
            Simpan Perubahan
          </button>
        </div>
      </div>
    </div>
  );
}
