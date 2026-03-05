import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface ExportCSVButtonProps {
  tryoutId: string;
  tryoutName: string;
}

export default function ExportCSVButton({ tryoutId, tryoutName }: ExportCSVButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    const toastId = toast.loading('Menyiapkan data CSV...');

    try {
      // 1. Ambil data sesi peserta yang sudah selesai (completed)
      const { data: sessions, error: sessionError } = await supabase
        .from('tryout_sessions')
        .select(`
          id,
          user_id,
          percentage_score,
          irt_theta,
          completed_at
        `)
        .eq('tryout_id', tryoutId)
        .eq('status', 'completed');

      if (sessionError) throw sessionError;

      if (!sessions || sessions.length === 0) {
        toast.error('Belum ada peserta yang selesai mengerjakan ujian ini.', { id: toastId });
        return;
      }

      // 2. Ambil data nama dan email dari tabel users
      const userIds = sessions.map(s => s.user_id);
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('user_id, nama_lengkap, email')
        .in('user_id', userIds);

      if (userError) throw userError;

      // 3. Ambil data asal sekolah dari tabel siswa
      const { data: siswaData, error: siswaError } = await supabase
        .from('siswa')
        .select('user_id, asal_sekolah')
        .in('user_id', userIds);

      if (siswaError) console.error("Gagal mengambil data sekolah", siswaError);

      // 4. Siapkan Header CSV
      const csvRows = [
        ['Nama Lengkap', 'Email', 'Asal Sekolah', 'Skor Klasik (0-100)', 'Skor IRT (Theta)', 'Waktu Selesai']
      ];

      // 5. Gabungkan data dan format baris CSV
      sessions.forEach(session => {
        const user = users?.find(u => u.user_id === session.user_id);
        const siswa = siswaData?.find(s => s.user_id === session.user_id);

        // Format angka desimal agar koma tidak merusak format CSV
        const skorKlasik = (session.percentage_score || 0).toFixed(2);
        const skorIRT = (session.irt_theta || 0).toFixed(4);
        const waktuSelesai = session.completed_at 
          ? new Date(session.completed_at).toLocaleString('id-ID') 
          : '-';

        // Bungkus teks dengan tanda kutip ganda ("") agar aman jika ada koma di dalam nama/sekolah
        const row = [
          `"${user?.nama_lengkap || 'Unknown'}"`,
          `"${user?.email || '-'}"`,
          `"${siswa?.asal_sekolah || '-'}"`,
          skorKlasik,
          skorIRT,
          `"${waktuSelesai}"`
        ];
        
        csvRows.push(row);
      });

      // 6. Buat dan Download File CSV
      const csvContent = csvRows.map(e => e.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      link.href = url;
      link.download = `Hasil_Nilai_${tryoutName.replace(/\s+/g, '_')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Berhasil mendownload nilai!', { id: toastId });

    } catch (err: any) {
      console.error('Export Error:', err);
      toast.error(`Gagal mendownload: ${err.message}`, { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
    >
      {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      Download CSV Nilai
    </button>
  );
}