import { useState, useEffect } from "react";
import { Upload, FileText, AlertCircle, CheckCircle, X } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import { api } from "@/lib/api";

interface CSVRow {
  nama_tryout: string;
  tanggal_ujian: string;
  durasi_menit: string;
  status: string;
  kategori_id: string;
  soal_text: string;
  opsi_a: string;
  opsi_b: string;
  opsi_c: string;
  opsi_d: string;
  jawaban_benar: string;
}

interface PreviewData {
  nama_tryout: string;
  tanggal_ujian: string;
  durasi_menit: number;
  status: string;
  questions: Record<string, any[]>;
  totalQuestions: number;
}

interface ImportTryoutCSVProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

export default function ImportTryoutCSV({ isOpen, onClose, onImportSuccess }: ImportTryoutCSVProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setPreviewData(null);
      setErrors([]);
      setIsUploading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    const fileExtension = uploadedFile.name.split(".").pop()?.toLowerCase();

    if (fileExtension === "csv") {
      setFile(uploadedFile);
      parseCSV(uploadedFile);
    } else if (fileExtension === "xlsx" || fileExtension === "xls") {
      setFile(uploadedFile);
      parseExcel(uploadedFile);
    } else {
      toast.error("Format file harus .csv atau .xlsx");
      return;
    }
  };

  const parseCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: ",",
      complete: (results) => {
        validateAndPreview(results.data as CSVRow[]);
      },
      error: (error) => {
        toast.error(`Error parsing CSV: ${error.message}`);
      },
    });
  };

  const parseExcel = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        validateAndPreview(jsonData as CSVRow[]);
      } catch (err: any) {
        toast.error(`Error parsing Excel: ${err.message}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const isDateBeforeToday = (dateStr: string) => {
    if (!dateStr) return false;
    const today = new Date(getTodayDateString());
    const inputDate = new Date(dateStr);
    return inputDate < today;
  };

  const validateAndPreview = (rows: CSVRow[]) => {
    const validationErrors: string[] = [];
    const questionsByCategory: Record<string, any[]> = {};

    if (rows.length === 0) {
      validationErrors.push("File tidak berisi data");
      setErrors(validationErrors);
      setPreviewData(null);
      return;
    }

    const firstRow = rows[0];
    const nama_tryout = firstRow.nama_tryout?.trim();
    const tanggal_ujian = firstRow.tanggal_ujian?.trim();
    const durasi_menit = parseInt(firstRow.durasi_menit);
    const status = firstRow.status?.trim().toLowerCase();

    if (!nama_tryout) {
      validationErrors.push("Nama tryout tidak boleh kosong");
    }

    if (!tanggal_ujian) {
      validationErrors.push("Tanggal ujian tidak boleh kosong");
    } else if (isDateBeforeToday(tanggal_ujian)) {
      validationErrors.push("Tanggal ujian tidak boleh sebelum hari ini");
    }

    if (!durasi_menit || durasi_menit <= 0) {
      validationErrors.push("Durasi tryout harus berupa angka lebih dari 0 menit");
    }

    if (!["active", "inactive"].includes(status)) {
      validationErrors.push('Status harus "active" atau "inactive"');
    }

    const validCategories = ["kpu", "ppu", "kmbm", "pk", "lit-id", "lit-en", "pm"];

    rows.forEach((row, index) => {
      const rowNum = index + 2;

      if (!row.kategori_id || !validCategories.includes(row.kategori_id.trim())) {
        validationErrors.push(
          `Baris ${rowNum}: Kategori tidak valid "${row.kategori_id}". Harus salah satu dari: ${validCategories.join(", ")}`
        );
      }

      if (!row.soal_text?.trim()) {
        validationErrors.push(`Baris ${rowNum}: Soal text tidak boleh kosong`);
      }

      if (!row.opsi_a?.trim()) {
        validationErrors.push(`Baris ${rowNum}: Opsi A tidak boleh kosong`);
      }
      if (!row.opsi_b?.trim()) {
        validationErrors.push(`Baris ${rowNum}: Opsi B tidak boleh kosong`);
      }
      if (!row.opsi_c?.trim()) {
        validationErrors.push(`Baris ${rowNum}: Opsi C tidak boleh kosong`);
      }
      if (!row.opsi_d?.trim()) {
        validationErrors.push(`Baris ${rowNum}: Opsi D tidak boleh kosong`);
      }

      const validAnswers = ["A", "B", "C", "D"];
      if (!validAnswers.includes(row.jawaban_benar?.toUpperCase())) {
        validationErrors.push(
          `Baris ${rowNum}: Jawaban benar harus A, B, C, atau D (sekarang: "${row.jawaban_benar}")`
        );
      }

      if (row.kategori_id) {
        if (!questionsByCategory[row.kategori_id]) {
          questionsByCategory[row.kategori_id] = [];
        }

        questionsByCategory[row.kategori_id].push({
          soal_text: row.soal_text,
          opsi_a: row.opsi_a,
          opsi_b: row.opsi_b,
          opsi_c: row.opsi_c,
          opsi_d: row.opsi_d,
          jawaban_benar: row.jawaban_benar?.toUpperCase(),
        });
      }
    });

    setErrors(validationErrors);

    if (validationErrors.length === 0) {
      const totalQuestions = Object.values(questionsByCategory).reduce(
        (sum, questions) => sum + questions.length,
        0
      );

      setPreviewData({
        nama_tryout,
        tanggal_ujian,
        durasi_menit,
        status,
        questions: questionsByCategory,
        totalQuestions,
      });
    } else {
      setPreviewData(null);
    }
  };

  const handleImport = async () => {
    if (!previewData) return;

    setIsUploading(true);

    const uploadPromise = (async () => {
      try {
        // Validasi nama tryout duplikat
        const existingTryouts = await api.adminGetTryouts();
        const existingData = existingTryouts?.data || existingTryouts || [];
        const existingNames = existingData.map((t: any) =>
          t.nama_tryout?.toLowerCase().trim()
        );

        const newNameLower = previewData.nama_tryout.toLowerCase().trim();

        if (existingNames.includes(newNameLower)) {
          throw new Error("Nama tryout sudah digunakan. Gunakan nama lain.");
        }

        console.log("📝 Step 1: Creating tryout...");

        const tryoutResponse = await api.adminCreateTryout({
          nama_tryout: previewData.nama_tryout,
          tanggal_ujian: previewData.tanggal_ujian,
          kategori: "umum",
          durasi_menit: previewData.durasi_menit,
          status: previewData.status,
        });

        const tryoutData = tryoutResponse?.data || tryoutResponse;
        const tryoutId = tryoutData.id;

        console.log("✅ Tryout created with ID:", tryoutId);
        console.log("📝 Step 2: Inserting questions...");

        const questionsToInsert: any[] = [];

        Object.entries(previewData.questions).forEach(([kategoriId, questions]) => {
          questions.forEach((q: any) => {
            questionsToInsert.push({
              tryout_id: tryoutId,
              kategori_id: kategoriId,
              soal_text: q.soal_text,
              opsi_a: q.opsi_a,
              opsi_b: q.opsi_b,
              opsi_c: q.opsi_c,
              opsi_d: q.opsi_d,
              jawaban_benar: q.jawaban_benar,
            });
          });
        });

        await api.adminBulkInsertQuestions(questionsToInsert);

        console.log("✅ Questions inserted successfully!");

        onImportSuccess();
        onClose();
      } catch (err: any) {
        console.error("❌ Import error:", err);
        throw err;
      }
    })();

    toast
      .promise(uploadPromise, {
        loading: "Mengimport tryout...",
        success: "Tryout berhasil diimport!",
        error: (err) => `Gagal import: ${err.message}`,
      })
      .finally(() => setIsUploading(false));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-[#1E293B]">Import Tryout dari CSV</h2>
            <p className="text-sm text-[#64748B] mt-1">
              Upload file CSV atau Excel untuk membuat tryout baru
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-[#64748B]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Upload Section */}
          <div>
            <label className="block text-sm font-medium text-[#1E293B] mb-2">
              Upload File CSV atau Excel
            </label>
            <div className="relative">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                disabled={isUploading}
              />
              <label
                htmlFor="file-upload"
                className="flex items-center justify-center gap-3 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#295782] hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <Upload className="w-5 h-5 text-[#64748B]" />
                <span className="text-sm text-[#64748B]">
                  {file ? file.name : "Pilih file CSV atau Excel (.xlsx)"}
                </span>
              </label>
            </div>
          </div>

          {/* Template Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 mb-1">
                  Format CSV Template
                </p>
                <p className="text-xs text-blue-700 mb-2">
                  Kolom wajib: <span className="font-mono">nama_tryout, tanggal_ujian, durasi_menit, status, kategori_id, soal_text, opsi_a, opsi_b, opsi_c, opsi_d, jawaban_benar</span>
                </p>
                <p className="text-xs text-blue-700 mb-1">
                  <strong>Format tanggal:</strong> YYYY-MM-DD (contoh: 2025-12-25)
                </p>
                <p className="text-xs text-blue-700 mb-1">
                  <strong>Durasi:</strong> angka dalam menit (contoh: 180)
                </p>
                <p className="text-xs text-blue-700 mb-1">
                  <strong>Status:</strong> active atau inactive
                </p>
                <p className="text-xs text-blue-700">
                  <strong>Kategori valid:</strong> kpu, ppu, kmbm, pk, lit-id, lit-en, pm
                </p>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 mb-2">
                    Ditemukan {errors.length} Error:
                  </h3>
                  <ul className="space-y-1 max-h-48 overflow-y-auto">
                    {errors.map((error, idx) => (
                      <li key={idx} className="text-sm text-red-700">
                        • {error}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Preview Display */}
          {previewData && errors.length === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3 mb-4">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-green-900 mb-3">Data Siap Diimport</h3>
                  <div className="space-y-2 text-sm text-green-800">
                    <p>
                      <strong>Nama Tryout:</strong> {previewData.nama_tryout}
                    </p>
                    <p>
                      <strong>Tanggal Ujian:</strong> {previewData.tanggal_ujian}
                    </p>
                    <p>
                      <strong>Durasi:</strong> {previewData.durasi_menit} menit
                    </p>
                    <p>
                      <strong>Status:</strong> {previewData.status}
                    </p>
                    <p>
                      <strong>Total Soal:</strong> {previewData.totalQuestions} soal
                    </p>
                    <p>
                      <strong>Kategori:</strong>{" "}
                      {Object.entries(previewData.questions)
                        .map(([id, qs]: [string, any]) => `${id} (${qs.length} soal)`)
                        .join(", ")}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleImport}
                disabled={isUploading}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isUploading ? "Sedang Mengimport..." : "Import Tryout"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}