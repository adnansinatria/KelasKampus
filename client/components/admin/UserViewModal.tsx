// src/components/admin/UserViewModal.tsx

import { X } from "lucide-react";

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

interface UserViewModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
}

export default function UserViewModal({ user, isOpen, onClose }: UserViewModalProps) {
  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-[#1E293B]">Detail Pengguna</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[#64748B]" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Profile Section */}
          <div className="flex items-center gap-4 pb-6 border-b border-gray-200">
            {user.photo_profile ? (
              <img
                src={user.photo_profile}
                alt={user.nama_lengkap}
                className="w-20 h-20 rounded-full object-cover border-4 border-gray-100"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#295782] to-[#1e4060] flex items-center justify-center text-white text-2xl font-semibold">
                {user.nama_lengkap.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h4 className="text-lg font-semibold text-[#1E293B]">{user.nama_lengkap}</h4>
              <p className="text-sm text-[#64748B]">{user.email}</p>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium mt-2 ${getStatusBadge(
                  user.status_akun
                )}`}
              >
                {user.status_akun
                  ? user.status_akun.charAt(0).toUpperCase() + user.status_akun.slice(1)
                  : "Aktif"}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">Role</label>
              <p className="text-sm font-medium text-[#1E293B] capitalize">{user.role}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">Asal Sekolah</label>
              <p className="text-sm font-medium text-[#1E293B]">{user.asal_sekolah || "-"}</p>
            </div>
            {/* <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">Jurusan Minat</label>
              <p className="text-sm font-medium text-[#1E293B]">{user.jurusan_minat || "-"}</p>
            </div> */}
            
            {/* Paket Aktif */}
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">Paket Aktif</label>
              {user.paket_aktif_list && user.paket_aktif_list.length > 1 ? (
                <ul className="text-sm font-medium text-[#1E293B] space-y-1">
                  {user.paket_aktif_list.map((paket, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#295782]"></span>
                      {paket}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm font-medium text-[#1E293B]">{user.paket_aktif || "Free"}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">Total Transaksi</label>
              <p className="text-sm font-medium text-[#1E293B]">{user.total_transaksi || 0} transaksi</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">Tanggal Daftar</label>
              <p className="text-sm font-medium text-[#1E293B]">{formatDate(user.created_at)}</p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#64748B] hover:bg-gray-100 rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
