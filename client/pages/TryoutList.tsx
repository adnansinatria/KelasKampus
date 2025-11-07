// src/pages/TryoutList.tsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api'; // ✅ ADDED: Import API
import { Search, ChevronDown, Calendar, AlertCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { id as idLocale } from 'date-fns/locale';
import Header from '@/components/Header';

interface TryoutProgress {
  status: 'not_started' | 'in_progress' | 'completed';
  questions_answered: number;
  total_questions: number;
  score?: number | null;
}

interface Tryout {
  id: string;
  nama_tryout: string;
  tanggal_ujian: string;
  kategori: string;
  status: string;
  durasi_menit: number;
  jumlah_soal: number;
  progress: TryoutProgress;
}

export default function TryoutList() {
  const navigate = useNavigate();
  
  const [tryouts, setTryouts] = useState<Tryout[]>([]);
  const [filteredTryouts, setFilteredTryouts] = useState<Tryout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [selectedKategori, setSelectedKategori] = useState('Semua');
  const [selectedJadwal, setSelectedJadwal] = useState('Semua');
  const [selectedStatus, setSelectedStatus] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');

  const kategoriOptions = ['Semua', 'SNBT', 'UTBK', 'Saintek', 'Soshum', 'Campuran'];
  const jadwalOptions = ['Semua', 'Hari Ini', 'Minggu Ini', 'Bulan Ini'];
  const statusOptions = ['Semua', 'Belum Dikerjakan', 'Sedang Dikerjakan', 'Selesai'];

  useEffect(() => {
    fetchCurrentUser();
    fetchTryouts();
  }, []);

  useEffect(() => {
    filterTryouts();
  }, [tryouts, selectedKategori, selectedJadwal, selectedStatus, searchQuery]);

  const fetchCurrentUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: userData } = await supabase
          .from('users')
          .select('nama_lengkap, username, photo_profile')
          .eq('auth_id', session.user.id)
          .single();
        
        setCurrentUser(userData);
      }
    } catch (err) {
      console.error('Error fetching user:', err);
    }
  };

  // ✅ CHANGED: Menggunakan API call instead of hardcode database
  const fetchTryouts = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔄 Fetching tryouts via API...');

      const response = await api.getTryouts();
      
      console.log('✅ API Response:', response);

      // ✅ SIMPLIFIED: Direct access since no nesting
      const tryoutsData = Array.isArray(response?.data) ? response.data : [];
      
      setTryouts(tryoutsData);
      setFilteredTryouts(tryoutsData);
      console.log(`✅ Loaded ${tryoutsData.length} tryouts`);

    } catch (err: any) {
      console.error('❌ Error fetching tryouts:', err);
      setError(err.message || 'Gagal memuat data tryout');
      toast.error('Gagal memuat daftar tryout');
    } finally {
      setIsLoading(false);
    }
  };

  const filterTryouts = () => {
    let filtered = [...tryouts];

    if (selectedKategori !== 'Semua') {
      filtered = filtered.filter(t => t.kategori === selectedKategori);
    }

    if (selectedJadwal !== 'Semua') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(t => {
        const tryoutDate = new Date(t.tanggal_ujian);
        const tryoutDay = new Date(
          tryoutDate.getFullYear(), 
          tryoutDate.getMonth(), 
          tryoutDate.getDate()
        );
        
        if (selectedJadwal === 'Hari Ini') {
          return tryoutDay.getTime() === today.getTime();
        } else if (selectedJadwal === 'Minggu Ini') {
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          return tryoutDay >= weekStart && tryoutDay <= weekEnd;
        } else if (selectedJadwal === 'Bulan Ini') {
          return tryoutDate.getMonth() === now.getMonth() && 
                 tryoutDate.getFullYear() === now.getFullYear();
        }
        return true;
      });
    }

    if (selectedStatus !== 'Semua') {
      const statusMap: Record<string, string> = {
        'Belum Dikerjakan': 'not_started',
        'Sedang Dikerjakan': 'in_progress',
        'Selesai': 'completed'
      };
      const mappedStatus = statusMap[selectedStatus];
      filtered = filtered.filter(t => t.progress.status === mappedStatus);
    }

    if (searchQuery) {
      filtered = filtered.filter(t => 
        t.nama_tryout.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredTryouts(filtered);
  };

  const getStatusBadge = (progress: TryoutProgress) => {
    if (progress.status === 'not_started') {
      return (
        <div className="bg-yellow-100 px-3 py-2 rounded-lg">
          <span className="text-yellow-700 text-[11px] font-medium">Belum Mulai</span>
        </div>
      );
    }
    if (progress.status === 'in_progress') {
      return (
        <div className="bg-blue-100 px-3 py-2 rounded-lg">
          <span className="text-blue-600 text-[11px] font-medium">Berlangsung</span>
        </div>
      );
    }
    return (
      <div className="bg-green-100 px-3 py-2 rounded-lg">
        <span className="text-green-600 text-[11px] font-medium">Selesai</span>
      </div>
    );
  };

  const getButtonText = (progress: TryoutProgress) => {
    if (progress.status === 'not_started') return 'Mulai';
    if (progress.status === 'in_progress') return 'Lanjutkan';
    return 'Review Hasil';
  };

  const handleStartTryout = (tryoutId: string) => {
    navigate(`/tryout/${tryoutId}/start`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#e6f3ff] via-[#f8fbff] to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#89b0c7] mx-auto mb-4"></div>
          <p className="text-[#62748e] text-lg font-medium">Memuat tryout...</p>
          <p className="text-[#62748e] text-sm mt-2">Mohon tunggu sebentar</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#e6f3ff] via-[#f8fbff] to-white flex items-center justify-center p-8">
        <div className="text-center max-w-md bg-white rounded-2xl shadow-lg p-8">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#1d293d] mb-2">Oops! Terjadi Kesalahan</h2>
          <p className="text-[#62748e] mb-6">{error}</p>
          <button
            onClick={fetchTryouts}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#295782] text-white rounded-xl font-semibold hover:bg-[#1e4060] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e6f3ff] via-[#f8fbff] to-white">
      <Header 
        userName={currentUser?.username || currentUser?.nama_lengkap || 'User'}
        userPhoto={currentUser?.photo_profile}
        activeMenu="tryout"
      />

      <div className="max-w-[1363px] mx-auto px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1d293d] mb-1">Daftar Try Out</h1>
          <p className="text-[#62748e]">Pilih try out yang ingin kamu kerjakan</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[#1d293d] text-[13px] font-medium">Kategori</label>
              <div className="relative">
                <select
                  value={selectedKategori}
                  onChange={(e) => setSelectedKategori(e.target.value)}
                  className="w-full bg-[#f1f5f9] rounded-lg px-3 py-2 text-[13px] text-[#717182] appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#89b0c7]"
                >
                  {kategoriOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[#1d293d] text-[13px] font-medium">Jadwal</label>
              <div className="relative">
                <select
                  value={selectedJadwal}
                  onChange={(e) => setSelectedJadwal(e.target.value)}
                  className="w-full bg-[#f1f5f9] rounded-lg px-3 py-2 text-[13px] text-[#717182] appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#89b0c7]"
                >
                  {jadwalOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[#1d293d] text-[13px] font-medium">Status</label>
              <div className="relative">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full bg-[#f1f5f9] rounded-lg px-3 py-2 text-[13px] text-[#717182] appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#89b0c7]"
                >
                  {statusOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[#1d293d] text-[13px] font-medium">Cari Tryout</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari tryout..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#f1f5f9] rounded-lg pl-10 pr-3 py-2 text-[13px] text-[#62748e] placeholder:text-[#62748e] focus:outline-none focus:ring-2 focus:ring-[#89b0c7]"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <p className="text-[#62748e] text-sm">
            Menampilkan <span className="font-semibold text-[#1d293d]">{filteredTryouts.length}</span> tryout
          </p>
          {(selectedKategori !== 'Semua' || selectedJadwal !== 'Semua' || selectedStatus !== 'Semua' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedKategori('Semua');
                setSelectedJadwal('Semua');
                setSelectedStatus('Semua');
                setSearchQuery('');
              }}
              className="text-[#89b0c7] text-sm font-medium hover:underline"
            >
              Reset Filter
            </button>
          )}
        </div>

        {filteredTryouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl">
            <Search className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-[#62748e] text-lg font-medium">Tidak ada tryout yang tersedia</p>
            <p className="text-[#62748e] text-sm mt-1">Coba ubah filter atau cari dengan kata kunci lain</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTryouts.map((tryout) => (
              <div
                key={tryout.id}
                className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-all hover:scale-[1.02] duration-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="text-[#1d293d] text-[15px] font-semibold mb-1.5 line-clamp-2">
                      {tryout.nama_tryout}
                    </h3>
                    <p className="text-[#62748e] text-[13px]">
                      {tryout.jumlah_soal} Soal • {tryout.durasi_menit} Menit
                    </p>
                  </div>
                  {getStatusBadge(tryout.progress)}
                </div>

                {tryout.progress.status === 'in_progress' && (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-[#62748e]">
                        Progress: {tryout.progress.questions_answered}/{tryout.progress.total_questions} Soal
                      </span>
                      <span className="text-[#1d293d] font-medium">
                        {Math.round((tryout.progress.questions_answered / tryout.progress.total_questions) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-[#89b0c7] h-1.5 rounded-full transition-all"
                        style={{
                          width: `${(tryout.progress.questions_answered / tryout.progress.total_questions) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                )}

                {tryout.progress.status === 'completed' && tryout.progress.score !== null && (
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[#62748e] text-[11px]">Nilai Akhir</span>
                      <span className="text-green-600 text-[15px] font-bold">
                        {tryout.progress.score.toFixed(1)}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#62748e]" />
                    <span className="text-[#62748e] text-[11px]">
                      {format(new Date(tryout.tanggal_ujian), 'd MMM yyyy', { locale: idLocale })}
                    </span>
                  </div>
                  <span className="text-[#89b0c7] text-[11px] font-medium bg-[#e6f3ff] px-2 py-1 rounded">
                    {tryout.kategori}
                  </span>
                </div>

                <button
                  onClick={() => handleStartTryout(tryout.id)}
                  className="w-full bg-gradient-to-r from-[#295782] to-[#295782] text-white px-4 py-2.5 rounded-xl text-[13px] font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
                >
                  {getButtonText(tryout.progress)}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
