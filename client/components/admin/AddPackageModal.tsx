// src/components/admin/AddPackageModal.tsx

import { useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";

interface AddPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddPackageModal({ isOpen, onClose, onSuccess }: AddPackageModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    duration: "",
    tryout_count: "",
    benefits: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast.error("Nama paket wajib diisi!");
      return;
    }
    if (!formData.price || parseInt(formData.price) <= 0) {
      toast.error("Harga harus lebih dari 0!");
      return;
    }
    if (!formData.duration || parseInt(formData.duration) <= 0) {
      toast.error("Durasi harus lebih dari 0!");
      return;
    }

    setIsSaving(true);

    const savePromise = (async () => {
      // ✅ PENTING: Simpan benefits sebagai STRING biasa, bukan array
      const { error } = await supabase.from("packages").insert({
        name: formData.name.trim(),
        price: parseInt(formData.price),
        duration: parseInt(formData.duration),
        tryout_count: parseInt(formData.tryout_count) || 0,
        benefits: formData.benefits.trim(), // ✅ String langsung, bukan di-parse
      });

      if (error) throw error;

      // Reset form
      setFormData({
        name: "",
        price: "",
        duration: "",
        tryout_count: "",
        benefits: "",
      });

      onSuccess();
      onClose();
    })();

    toast.promise(savePromise, {
      loading: "Menyimpan paket...",
      success: "Paket berhasil ditambahkan!",
      error: (err) => `Gagal: ${err.message}`,
    }).finally(() => setIsSaving(false));
  };

  const handleClose = () => {
    if (isSaving) return;
    setFormData({
      name: "",
      price: "",
      duration: "",
      tryout_count: "",
      benefits: "",
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h3 className="text-xl font-bold text-[#1E293B]">Tambah Paket Baru</h3>
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-[#64748B]" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Nama Paket */}
          <div>
            <label className="block text-sm font-medium text-[#1E293B] mb-2">
              Nama Paket <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#295782] focus:border-transparent transition-colors"
              placeholder="Contoh: Juara Kampus"
              disabled={isSaving}
            />
          </div>

          {/* Harga */}
          <div>
            <label className="block text-sm font-medium text-[#1E293B] mb-2">
              Harga (Rp) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#295782] focus:border-transparent transition-colors"
              placeholder="119000"
              min="0"
              disabled={isSaving}
            />
          </div>

          {/* Durasi & Jumlah Tryout */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1E293B] mb-2">
                Durasi (Bulan) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#295782] focus:border-transparent transition-colors"
                placeholder="3"
                min="1"
                disabled={isSaving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1E293B] mb-2">
                Jumlah Tryout
              </label>
              <input
                type="number"
                value={formData.tryout_count}
                onChange={(e) => setFormData({ ...formData, tryout_count: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#295782] focus:border-transparent transition-colors"
                placeholder="5"
                min="0"
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Benefits */}
          <div>
            <label className="block text-sm font-medium text-[#1E293B] mb-2">
              Benefits (Pisahkan dengan koma)
            </label>
            <textarea
              value={formData.benefits}
              onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#295782] focus:border-transparent transition-colors resize-none"
              rows={4}
              placeholder="Akses 100 tryout, Pembahasan lengkap, Analisis Hasil, Konsultasi Mentor"
              disabled={isSaving}
            />
            <p className="text-xs text-[#64748B] mt-2">
              Contoh: Akses 5 tryout, Pembahasan lengkap, Sertifikat digital
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
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
              {isSaving ? "Menyimpan..." : "Simpan Paket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
