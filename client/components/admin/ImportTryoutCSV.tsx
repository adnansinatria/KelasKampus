// src/components/admin/ImportTryoutCSV.tsx

import { useState, useRef } from "react";
import { Upload, X, FileText, AlertCircle, CheckCircle } from "lucide-react";
import Papa from "papaparse";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

interface ImportTryoutCSVProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: () => void;
}

export default function ImportTryoutCSV({
  isOpen,
  onClose,
  onImportSuccess,
}: ImportTryoutCSVProps) {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      toast.error("File harus berformat CSV");
      return;
    }

    setFile(selectedFile);
    setErrors([]);
    setPreviewData(null);
  };

  const handleParseCSV = () => {
    if (!file) {
      toast.error("Pilih file CSV terlebih dahulu");
      return;
    }

    setIsProcessing(true);
    setErrors([]);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        console.log("📊 Parsed CSV data:", results.data);

        const parsedErrors: string[] = [];
        const questionsByCategory: Record<string, any[]> = {};
        let tryoutName = "";
        let tanggalUjian = "";
        let status = "active";

        results.data.forEach((row: any, index: number) => {
          const rowNumber = index + 2;

          // Ambil metadata tryout dari baris pertama
          if (index === 0) {
            if (!row.nama_tryout) {
              parsedErrors.push(`Baris ${rowNumber}: nama_tryout wajib diisi`);
              return;
            }
            if (!row.tanggal_ujian) {
              parsedErrors.push(`Baris ${rowNumber}: tanggal_ujian wajib diisi`);
              return;
            }

            tryoutName = row.nama_tryout.trim();
            tanggalUjian = row.tanggal_ujian.trim();
            status = row.status?.trim() || "active";
          }

          // Validasi data soal
          if (!row.kategori_id) {
            parsedErrors.push(`Baris ${rowNumber}: kategori_id tidak boleh kosong`);
            return;
          }

          if (!row.soal_text) {
            parsedErrors.push(`Baris ${rowNumber}: soal_text tidak boleh kosong`);
            return;
          }

          if (!row.opsi_a || !row.opsi_b || !row.opsi_c || !row.opsi_d) {
            parsedErrors.push(`Baris ${rowNumber}: Semua opsi (A, B, C, D) harus diisi`);
            return;
          }

          if (!row.jawaban_benar) {
            parsedErrors.push(`Baris ${rowNumber}: jawaban_benar harus diisi`);
            return;
          }

          const answer = row.jawaban_benar.toUpperCase();
          if (!["A", "B", "C", "D"].includes(answer)) {
            parsedErrors.push(
              `Baris ${rowNumber}: jawaban_benar harus A, B, C, atau D`
            );
            return;
          }

          // Group by kategori
          const kategoriId = row.kategori_id.trim();
          if (!questionsByCategory[kategoriId]) {
            questionsByCategory[kategoriId] = [];
          }

          questionsByCategory[kategoriId].push({
            soal_text: row.soal_text.trim(),
            opsi_a: row.opsi_a.trim(),
            opsi_b: row.opsi_b.trim(),
            opsi_c: row.opsi_c.trim(),
            opsi_d: row.opsi_d.trim(),
            jawaban_benar: answer,
          });
        });

        if (parsedErrors.length > 0) {
          setErrors(parsedErrors);
          toast.error(`Ditemukan ${parsedErrors.length} error`);
        } else {
          const totalQuestions = Object.values(questionsByCategory).reduce(
            (sum, questions) => sum + questions.length,
            0
          );

          setPreviewData({
            nama_tryout: tryoutName,
            tanggal_ujian: tanggalUjian,
            status: status,
            questions: questionsByCategory,
            totalQuestions,
          });

          toast.success(
            `${totalQuestions} soal dari ${Object.keys(questionsByCategory).length} kategori siap diimport!`
          );
        }

        setIsProcessing(false);
      },
      error: (error) => {
        console.error("❌ Parse error:", error);
        setErrors([`Error parsing file: ${error.message}`]);
        toast.error("Gagal membaca file CSV");
        setIsProcessing(false);
      },
    });
  };

  const handleImport = async () => {
    if (!previewData) {
      toast.error("Tidak ada data untuk diimport");
      return;
    }

    setIsImporting(true);

    const importPromise = (async () => {
      console.log("📝 Step 1: Creating tryout...");

      // 1. Insert tryout
      const { data: tryoutData, error: tryoutError } = await supabase
        .from("tryouts")
        .insert({
          nama_tryout: previewData.nama_tryout,
          tanggal_ujian: previewData.tanggal_ujian,
          status: previewData.status,
        })
        .select()
        .single();

      if (tryoutError) throw tryoutError;

      const tryoutId = tryoutData.id;
      console.log(`✅ Tryout created with ID: ${tryoutId}`);

      // 2. Insert questions
      console.log("📝 Step 2: Inserting questions...");
      const questionsToInsert: any[] = [];

      Object.entries(previewData.questions).forEach(([kategoriId, questions]: [string, any]) => {
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

      console.log(`💾 Inserting ${questionsToInsert.length} questions...`);

      const { error: insertError } = await supabase
        .from("questions")
        .insert(questionsToInsert);

      if (insertError) throw insertError;

      console.log("✅ All questions inserted!");

      return { tryoutId, totalQuestions: questionsToInsert.length };
    })();

    toast
      .promise(importPromise, {
        loading: "Mengimport tryout...",
        success: (data) => `Tryout berhasil dibuat dengan ${data.totalQuestions} soal!`,
        error: (err) => `Gagal: ${err.message}`,
      })
      .then((data) => {
        handleClose();
        if (onImportSuccess) {
          onImportSuccess();
        }
        setTimeout(() => {
          navigate(`/admin-tryout`);
        }, 1000);
      })
      .finally(() => {
        setIsImporting(false);
      });
  };

  const handleClose = () => {
    setFile(null);
    setPreviewData(null);
    setErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-xl font-bold text-[#1E293B]">
              Import Tryout dari CSV
            </h3>
            <p className="text-sm text-[#64748B] mt-1">
              Upload file CSV untuk membuat tryout baru lengkap dengan soal-soalnya
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[#64748B]" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[#64748B] mb-2">
              Pilih File CSV
            </label>
            <div className="flex gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#295782] file:text-white hover:file:bg-[#295782]/90 cursor-pointer"
              />
              <button
                onClick={handleParseCSV}
                disabled={!file || isProcessing}
                className="px-4 py-2 bg-[#295782] text-white rounded-lg hover:bg-[#295782]/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                {isProcessing ? "Memproses..." : "Parse CSV"}
              </button>
            </div>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm font-semibold text-red-900">
                  Ditemukan {errors.length} Error:
                </p>
              </div>
              <ul className="space-y-1 ml-7">
                {errors.slice(0, 10).map((error, index) => (
                  <li key={index} className="text-xs text-red-700">
                    • {error}
                  </li>
                ))}
                {errors.length > 10 && (
                  <li className="text-xs text-red-700 font-semibold">
                    ... dan {errors.length - 10} error lainnya
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Preview */}
          {previewData && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-900 mb-2">
                    Data Siap Diimport
                  </p>
                  <div className="bg-white border border-green-200 rounded-lg p-3 text-xs space-y-1">
                    <p>
                      <strong>Nama Tryout:</strong> {previewData.nama_tryout}
                    </p>
                    <p>
                      <strong>Tanggal Ujian:</strong> {previewData.tanggal_ujian}
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
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleClose}
            disabled={isImporting}
            className="px-4 py-2 text-sm font-medium text-[#64748B] border border-gray-200 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={handleImport}
            disabled={!previewData || isImporting}
            className="px-4 py-2 text-sm font-medium text-white bg-[#295782] hover:bg-[#295782]/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            {isImporting ? "Mengimport..." : "Import Tryout"}
          </button>
        </div>
      </div>
    </div>
  );
}
