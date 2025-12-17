import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { toast } from "react-hot-toast";

export default function AddTryout() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    nama_tryout: "",
    tanggal_ujian: "",
    kategori: "",
    durasi_menit: "",
    status: "draft",
  });

  // ✅ Get today's date in YYYY-MM-DD format (local timezone)
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ✅ VALIDATION 1: Check all fields
    if (!formData.nama_tryout.trim()) {
      toast.error("Nama tryout harus diisi!");
      return;
    }

    if (!formData.tanggal_ujian) {
      toast.error("Tanggal ujian harus diisi!");
      return;
    }

    if (!formData.kategori) {
      toast.error("Kategori harus dipilih!");
      return;
    }

    if (!formData.durasi_menit || parseInt(formData.durasi_menit) <= 0) {
      toast.error("Durasi harus diisi dengan angka positif!");
      return;
    }

    // ✅ VALIDATION 2: Check date not in the past
    const selectedDate = new Date(formData.tanggal_ujian);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to compare dates only

    if (selectedDate < today) {
      toast.error("Tanggal ujian tidak boleh sebelum hari ini!");
      return;
    }

    setIsLoading(true);

    try {
      // ✅ VALIDATION 3: Check duplicate nama_tryout
      const { data: existingTryout, error: checkError } = await supabase
        .from("tryouts")
        .select("nama_tryout")
        .ilike("nama_tryout", formData.nama_tryout.trim())
        .limit(1);

      if (checkError) {
        console.error("Error checking duplicate:", checkError);
        toast.error("Gagal memeriksa duplikat nama tryout");
        return;
      }

      if (existingTryout && existingTryout.length > 0) {
        toast.error(`Nama tryout "${formData.nama_tryout}" sudah digunakan! Gunakan nama lain.`);
        return;
      }

      // ✅ All validations passed, create tryout
      const { data, error } = await supabase
        .from("tryouts")
        .insert([
          {
            nama_tryout: formData.nama_tryout.trim(),
            tanggal_ujian: formData.tanggal_ujian,
            kategori: formData.kategori,
            durasi_menit: parseInt(formData.durasi_menit),
            status: formData.status,
          },
        ])
        .select();

      if (error) throw error;

      toast.success("Tryout berhasil ditambahkan!");
      navigate("/admin/tryout");
    } catch (error: any) {
      console.error("Error adding tryout:", error);
      toast.error(error.message || "Gagal menambahkan tryout");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Button
        variant="ghost"
        onClick={() => navigate("/admin/tryout")}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Kembali
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Tambah Tryout Baru</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nama Tryout */}
            <div className="space-y-2">
              <Label htmlFor="nama_tryout">
                Nama Tryout <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nama_tryout"
                value={formData.nama_tryout}
                onChange={(e) =>
                  setFormData({ ...formData, nama_tryout: e.target.value })
                }
                placeholder="Contoh: Tryout SNBT 2025 #1"
                required
              />
              <p className="text-xs text-gray-500">
                Nama tryout harus unik dan tidak boleh duplikat
              </p>
            </div>

            {/* Tanggal Ujian */}
            <div className="space-y-2">
              <Label htmlFor="tanggal_ujian">
                Tanggal Ujian <span className="text-red-500">*</span>
              </Label>
              <Input
                id="tanggal_ujian"
                type="date"
                value={formData.tanggal_ujian}
                onChange={(e) =>
                  setFormData({ ...formData, tanggal_ujian: e.target.value })
                }
                min={getTodayDate()} // ✅ Set minimum date to today
                required
              />
              <p className="text-xs text-gray-500">
                Tanggal tidak boleh sebelum hari ini
              </p>
            </div>

            {/* Kategori */}
            <div className="space-y-2">
              <Label htmlFor="kategori">
                Kategori <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.kategori}
                onValueChange={(value) =>
                  setFormData({ ...formData, kategori: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SNBT">SNBT</SelectItem>
                  <SelectItem value="UTBK">UTBK</SelectItem>
                  <SelectItem value="umum">Umum</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Durasi */}
            <div className="space-y-2">
              <Label htmlFor="durasi_menit">
                Durasi (menit) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="durasi_menit"
                type="number"
                value={formData.durasi_menit}
                onChange={(e) =>
                  setFormData({ ...formData, durasi_menit: e.target.value })
                }
                placeholder="120"
                min="1"
                required
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Menyimpan..." : "Simpan Tryout"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/admin/tryout")}
              >
                Batal
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}