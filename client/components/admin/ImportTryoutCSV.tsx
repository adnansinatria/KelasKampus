import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, FileText, AlertCircle, CheckCircle, ArrowLeft, Table } from "lucide-react";
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
  pembahasan?: string;
  image_filename?: string;
}

interface PreviewData {
  nama_tryout: string;
  tanggal_ujian: string;
  durasi_menit: number;
  status: string;
  questions: Record<string, any[]>;
  totalQuestions: number;
}

export default function ImportTryoutCSV() {
  const navigate = useNavigate();
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [imageFolder, setImageFolder] = useState<FileList | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pastedData, setPastedData] = useState("");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split(".").pop()?.toLowerCase();

    if (fileExt === "csv") {
      setCsvFile(file);
      parseCSV(file);
    } else if (fileExt === "xlsx" || fileExt === "xls") {
      setCsvFile(file);
      parseExcel(file);
    } else {
      toast.error("File harus berformat .csv atau .xlsx");
    }
  };

  const handleImageFolderUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setImageFolder(files);
      toast.success(`${files.length} gambar berhasil diupload`);
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

  const handlePasteData = () => {
    if (!pastedData.trim()) {
      toast.error("Data paste kosong");
      return;
    }

    try {
      const lines = pastedData.trim().split("\n");
      const firstLine = lines[0];
      const delimiter = firstLine.includes("\t") ? "\t" : ",";

      // Parse using PapaParse
      Papa.parse(pastedData, {
        header: true,
        skipEmptyLines: true,
        delimiter: delimiter,
        complete: (results) => {
          validateAndPreview(results.data as CSVRow[]);
          toast.success("Data berhasil diparse!");
        },
        error: (error) => {
          toast.error(`Error parsing data: ${error.message}`);
        },
      });
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    }
  };

  const validateAndPreview = (rows: CSVRow[]) => {
    const validationErrors: string[] = [];
    const questionsByCategory: Record<string, any[]> = {};

    if (rows.length === 0) {
      validationErrors.push("Data kosong");
      setErrors(validationErrors);
      return;
    }

    const firstRow = rows[0];
    const nama_tryout = firstRow.nama_tryout?.toString().trim();
    const tanggal_ujian = firstRow.tanggal_ujian?.toString().trim();
    const durasi_menit = parseInt(firstRow.durasi_menit?.toString());
    const status = firstRow.status?.toString().trim();

    if (!durasi_menit || durasi_menit <= 0) {
      validationErrors.push("Durasi tryout tidak valid atau kosong");
    }

    if (!nama_tryout) {
      validationErrors.push("Nama tryout tidak boleh kosong");
    }

    if (!tanggal_ujian) {
      validationErrors.push("Tanggal ujian tidak boleh kosong");
    }

    if (!["active", "inactive"].includes(status)) {
      validationErrors.push("Status harus 'active' atau 'inactive'");
    }

    const validCategories = ["kpu", "ppu", "kmbm", "pk", "lit-id", "lit-en", "pm"];

    rows.forEach((row, index) => {
      const rowNum = index + 2;

      if (!row.kategori_id || !validCategories.includes(row.kategori_id)) {
        validationErrors.push(`Baris ${rowNum}: Kategori tidak valid (${row.kategori_id})`);
      }

      if (!row.soal_text?.toString().trim()) {
        validationErrors.push(`Baris ${rowNum}: Soal text kosong`);
      }

      if (!row.opsi_a?.toString().trim() || !row.opsi_b?.toString().trim() || 
          !row.opsi_c?.toString().trim() || !row.opsi_d?.toString().trim()) {
        validationErrors.push(`Baris ${rowNum}: Salah satu opsi jawaban kosong`);
      }

      if (!["A", "B", "C", "D"].includes(row.jawaban_benar?.toString().toUpperCase())) {
        validationErrors.push(`Baris ${rowNum}: Jawaban benar harus A, B, C, atau D`);
      }

      if (!questionsByCategory[row.kategori_id]) {
        questionsByCategory[row.kategori_id] = [];
      }

      questionsByCategory[row.kategori_id].push({
        soal_text: row.soal_text,
        opsi_a: row.opsi_a,
        opsi_b: row.opsi_b,
        opsi_c: row.opsi_c,
        opsi_d: row.opsi_d,
        jawaban_benar: row.jawaban_benar?.toString().toUpperCase(),
        pembahasan: row.pembahasan || "",
        image_filename: row.image_filename || "",
      });
    });

    setErrors(validationErrors);

    if (validationErrors.length === 0) {
      const totalQuestions = Object.values(questionsByCategory).reduce(
        (sum, qs) => sum + qs.length,
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
    }
  };

  const handleImport = async () => {
    if (!previewData) return;

    setIsProcessing(true);

    const importPromise = (async () => {
      try {
        const tryoutResponse = await api.adminCreateTryout({
          nama_tryout: previewData.nama_tryout,
          tanggal_ujian: previewData.tanggal_ujian,
          kategori: "umum",
          durasi_menit: previewData.durasi_menit,
          status: previewData.status,
        });

        const tryoutData = tryoutResponse?.data || tryoutResponse;
        const tryoutId = tryoutData.id;

        const questionsToInsert: any[] = [];
        const imageMap = new Map<string, File>();

        if (imageFolder) {
          Array.from(imageFolder).forEach((file) => {
            imageMap.set(file.name.toLowerCase(), file);
          });
        }

        Object.entries(previewData.questions).forEach(([kategoriId, questions]) => {
          questions.forEach((q: any) => {
            const imageFile = q.image_filename 
              ? imageMap.get(q.image_filename.toLowerCase()) 
              : null;

            questionsToInsert.push({
              tryout_id: tryoutId,
              kategori_id: kategoriId,
              soal_text: q.soal_text,
              opsi_a: q.opsi_a,
              opsi_b: q.opsi_b,
              opsi_c: q.opsi_c,
              opsi_d: q.opsi_d,
              jawaban_benar: q.jawaban_benar,
              pembahasan: q.pembahasan,
              image: imageFile || null,
            });
          });
        });

        await api.adminBulkInsertQuestions(questionsToInsert);

        navigate("/admin-tryout");
      } catch (err: any) {
        console.error("Import error:", err);
        throw err;
      }
    })();

    toast
      .promise(importPromise, {
        loading: "Mengimport tryout...",
        success: "Tryout berhasil diimport!",
        error: (err) => `Gagal import: ${err.message}`,
      })
      .finally(() => setIsProcessing(false));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8FBFF] to-[#EFF6FF] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate("/admin-tryout")}
            className="p-2 rounded-lg hover:bg-white/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#64748B]" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#1E293B]">Import Tryout</h1>
            <p className="text-sm text-[#64748B] mt-1">
              Upload file CSV/Excel atau paste data dari spreadsheet
            </p>
          </div>
        </div>

        {/* Upload Methods */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-[#1E293B] mb-4">Pilih Metode Input</h2>
          
          <div className="space-y-6">
            {/* Method 1: File Upload */}
            <div>
              <label className="block text-sm font-medium text-[#1E293B] mb-2">
                1. Upload File CSV/Excel
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  disabled={isProcessing}
                />
                <label
                  htmlFor="file-upload"
                  className="flex items-center justify-center gap-3 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#295782] hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <Upload className="w-5 h-5 text-[#64748B]" />
                  <span className="text-sm text-[#64748B]">
                    {csvFile ? csvFile.name : "Pilih file CSV atau Excel (.xlsx)"}
                  </span>
                </label>
              </div>
            </div>

            {/* Method 2: Paste from Spreadsheet */}
            <div>
              <label className="block text-sm font-medium text-[#1E293B] mb-2">
                2. Paste dari Google Sheets/Excel
              </label>
              <textarea
                value={pastedData}
                onChange={(e) => setPastedData(e.target.value)}
                placeholder="Copy tabel dari Google Sheets atau Excel, lalu paste di sini..."
                rows={8}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#295782] font-mono text-sm"
                disabled={isProcessing}
              />
              <button
                onClick={handlePasteData}
                disabled={isProcessing || !pastedData.trim()}
                className="mt-2 px-4 py-2 bg-[#295782] text-white rounded-lg hover:bg-[#295782]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                <Table className="w-4 h-4 inline mr-2" />
                Parse Data
              </button>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <label className="block text-sm font-medium text-[#1E293B] mb-2">
                3. Upload Gambar Soal (Opsional)
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageFolderUpload}
                  className="hidden"
                  id="image-upload"
                  disabled={isProcessing}
                />
                <label
                  htmlFor="image-upload"
                  className="flex items-center justify-center gap-3 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#295782] hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <FileText className="w-5 h-5 text-[#64748B]" />
                  <span className="text-sm text-[#64748B]">
                    {imageFolder ? `${imageFolder.length} gambar dipilih` : "Pilih gambar soal"}
                  </span>
                </label>
              </div>
              <p className="text-xs text-[#64748B] mt-1">
                Nama file gambar harus sesuai dengan kolom 'image_filename'
              </p>
            </div>
          </div>
        </div>

        {/* Template Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 mb-2">
                Format Kolom (Header)
              </p>
              <div className="text-xs text-blue-700 space-y-1 font-mono bg-white/50 p-2 rounded">
                <p>nama_tryout | tanggal_ujian | durasi_menit | status | kategori_id</p>
                <p>soal_text | opsi_a | opsi_b | opsi_c | opsi_d | jawaban_benar</p>
                <p>pembahasan | image_filename (opsional)</p>
              </div>
              <p className="text-xs text-blue-700 mt-2">
                <strong>Kategori valid:</strong> kpu, ppu, kmbm, pk, lit-id, lit-en, pm
              </p>
              <p className="text-xs text-blue-700">
                <strong>Status:</strong> active atau inactive
              </p>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 mb-2">
                  Ditemukan {errors.length} Error:
                </h3>
                <ul className="space-y-1">
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
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-6">
            <div className="flex items-start gap-3 mb-4">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
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
              disabled={isProcessing}
              className="w-full mt-4 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isProcessing ? "Sedang Mengimport..." : "Import Tryout"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}