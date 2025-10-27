// src/components/modals/DeleteAccountModal.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DeleteAccountModal({ isOpen, onClose }: DeleteAccountModalProps) {
  const navigate = useNavigate();
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (confirmText !== "HAPUS AKUN") {
      setError('Ketik "HAPUS AKUN" untuk konfirmasi');
      return;
    }

    if (!confirm("Apakah Anda yakin ingin menghapus akun? Tindakan ini tidak dapat dibatalkan!")) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      // Get user data
      const { data: userData } = await supabase
        .from("users")
        .select("id, user_id")
        .eq("auth_id", user.id)
        .single();

      if (!userData) throw new Error("User data not found");

      // Delete siswa data first (foreign key)
      await supabase
        .from("siswa")
        .delete()
        .eq("user_id", userData.user_id);

      // Update users status to deleted
      await supabase
        .from("users")
        .update({ status_akun: "nonaktif" })
        .eq("id", userData.id);

      // Sign out from Supabase Auth
      await supabase.auth.signOut();

      // Clear local storage
      localStorage.removeItem("sb_token");
      localStorage.removeItem("auth_token");

      alert("Akun berhasil dihapus. Anda akan diarahkan ke halaman utama.");
      navigate("/signin");
    } catch (err: any) {
      console.error("Delete account error:", err);
      setError(err.message || "Gagal menghapus akun");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-red-600">Hapus Akun</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h4 className="text-sm font-semibold text-red-800 mb-1">Peringatan!</h4>
                <p className="text-sm text-red-700">
                  Menghapus akun akan menghapus semua data Anda secara permanen, termasuk:
                </p>
                <ul className="text-sm text-red-700 list-disc list-inside mt-2 space-y-1">
                  <li>Informasi profil</li>
                  <li>Riwayat tryout</li>
                  <li>Skor dan hasil ujian</li>
                  <li>Semua data pribadi</li>
                </ul>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Ketik <span className="font-bold text-red-600">"HAPUS AKUN"</span> untuk konfirmasi
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 outline-none"
              placeholder="HAPUS AKUN"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Batal
            </button>
            <button
              onClick={handleDelete}
              disabled={loading || confirmText !== "HAPUS AKUN"}
              className="flex-1 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:bg-gray-400"
            >
              {loading ? "Menghapus..." : "Hapus Akun"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}