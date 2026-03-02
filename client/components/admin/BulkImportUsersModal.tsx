import { useState, useRef } from "react";
import { Upload, X, AlertCircle, CheckCircle, FileText, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";

interface BulkImportUsersModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkImportUsersModal({ show, onClose, onSuccess }: BulkImportUsersModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const headers = "nama_lengkap,email,password,asal_sekolah,tokens\n";
    const sample = "Budi Santoso,budi.sman1@gmail.com,Budi123!,SMAN 1 Bandung,1\nSiti Aminah,siti.sman1@gmail.com,Siti123!,SMAN 1 Bandung,1";
    const blob = new Blob([headers + sample], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "template_import_siswa.csv";
    a.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    if (uploadedFile.type !== "text/csv" && !uploadedFile.name.endsWith('.csv')) {
      toast.error("Format file harus .csv");
      return;
    }

    setFile(uploadedFile);

    // Parsing CSV manual sederhana
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim() !== '');
      
      if (lines.length <= 1) {
        toast.error("File CSV kosong atau tidak valid");
        return;
      }

      const data = [];
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      for (let i = 1; i < lines.length; i++) {
        const currentline = lines[i].split(',');
        if (currentline.length === headers.length) {
          const obj: any = {};
          for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = currentline[j].trim();
          }
          data.push(obj);
        }
      }
      setParsedData(data);
    };
    reader.readAsText(uploadedFile);
  };

  const handleProcessImport = async () => {
    if (parsedData.length === 0) return;
    
    // Validasi Kolom
    const firstRow = parsedData[0];
    if (!firstRow.email || !firstRow.password || !firstRow.nama_lengkap) {
      toast.error("Header CSV salah! Pastikan ada kolom: nama_lengkap, email, password");
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading(`Memproses ${parsedData.length} siswa...`);

    try {
      const response = await api.adminBulkCreateUsers(parsedData);
      
      if (response?.success) {
        const successes = response.results.filter((r: any) => r.status === 'success').length;
        const errors = response.results.filter((r: any) => r.status === 'error').length;
        
        toast.success(`Berhasil: ${successes} akun. Gagal: ${errors} akun.`, { id: toastId, duration: 5000 });
        onSuccess(); // Refresh table
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal melakukan import data massal", { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-[#1d293d]">Import Siswa Massal (Sekolah)</h2>
          <button onClick={onClose} disabled={isUploading} className="text-gray-400 hover:text-red-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm flex gap-3 items-start">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Cara Penggunaan:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Download template CSV.</li>
                <li>Isi data siswa menggunakan Excel / Google Sheets.</li>
                <li>Simpan ulang (Save As) sebagai file <b>CSV (Comma delimited)</b>.</li>
                <li>Upload file tersebut ke sini.</li>
              </ol>
            </div>
          </div>

          <button onClick={downloadTemplate} className="text-sm font-semibold text-[#295782] hover:underline flex items-center gap-2">
            <FileText className="w-4 h-4" /> Download Template CSV
          </button>

          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
              ${file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-[#295782] hover:bg-gray-50'}`}
          >
            <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
            {file ? (
              <div className="flex flex-col items-center text-green-700">
                <CheckCircle className="w-8 h-8 mb-2" />
                <p className="font-semibold">{file.name}</p>
                <p className="text-xs mt-1">{parsedData.length} baris data terdeteksi</p>
              </div>
            ) : (
              <div className="flex flex-col items-center text-gray-500">
                <Upload className="w-8 h-8 mb-2 text-gray-400" />
                <p className="font-medium text-sm">Klik untuk upload file CSV</p>
                <p className="text-xs mt-1">Maksimal 100 baris per upload direkomendasikan</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
          <button onClick={onClose} disabled={isUploading} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">
            Batal
          </button>
          <button 
            onClick={handleProcessImport} 
            disabled={!file || parsedData.length === 0 || isUploading}
            className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-[#295782] hover:bg-[#1e4060] rounded-lg disabled:opacity-50 transition-colors"
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {isUploading ? 'Memproses...' : 'Mulai Import'}
          </button>
        </div>
      </div>
    </div>
  );
}