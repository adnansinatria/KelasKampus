import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface Props {
  show: boolean;
  onClose: () => void;
  tryoutId: string;
  onSuccess: () => void;
}

interface Kampus {
  id: number;
  nama_kampus: string;
}

interface ProgramStudi {
  id: number;
  nama_prodi: string;
}

export default function TargetSelectionModal({ show, onClose, tryoutId, onSuccess }: Props) {
  const [kampusList, setKampusList] = useState<Kampus[]>([]);
  const [prodiList, setProdiList] = useState<ProgramStudi[]>([]);
  const [selectedKampus, setSelectedKampus] = useState('');
  const [selectedProdi, setSelectedProdi] = useState('');
  const [isLoadingProdi, setIsLoadingProdi] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState(false); // ✅ ADD: Initial loading state

  useEffect(() => {
    if (show) {
      // ✅ CHANGED: Call parallel fetch function
      fetchKampusAndExistingTarget();
    }
  }, [show]);

  // ✅ NEW: Parallel fetch kombussi
  const fetchKampusAndExistingTarget = async () => {
    try {
      setIsLoadingInitial(true);
      
      console.log("⏱️ [START] Fetching kampus & existing selection in parallel...");
      const startTime = Date.now();
      
      // ✅ PARALLEL: Fetch both at the same time (tidak sequential)
      const [kampusRes, targetRes] = await Promise.all([
        api.getKampusList(),
        tryoutId ? api.getUserTarget(tryoutId) : Promise.resolve(null),
      ]);

      const kampusData = (kampusRes?.data || kampusRes) as Kampus[];
      setKampusList(Array.isArray(kampusData) ? kampusData : []);

      console.log(`✅ Loaded ${kampusData?.length || 0} kampus in ${Date.now() - startTime}ms`);

      // ✅ Load existing selection if available
      const targetData = targetRes?.data || targetRes;
      if (targetData && targetData.kampus_name) {
        console.log("📍 Loading existing selection:", targetData.kampus_name, targetData.prodi_name);
        
        const kampus = kampusData?.find(k => k.nama_kampus === targetData.kampus_name);
        if (kampus) {
          setSelectedKampus(kampus.id.toString());
          
          // ✅ Fetch prodi untuk kampus ini
          await fetchAndSelectProdi(kampus.id.toString(), targetData.prodi_name);
        }
      }

      console.log(`⏱️ [END] Total load time: ${Date.now() - startTime}ms`);
    } catch (err) {
      console.error('❌ Error fetching kampus & target:', err);
      toast.error('Gagal memuat data kampus');
    } finally {
      setIsLoadingInitial(false);
    }
  };

  // ✅ NEW: Helper untuk fetch & select prodi
  const fetchAndSelectProdi = async (kampusId: string, targetProdiName?: string) => {
    try {
      setIsLoadingProdi(true);
      
      console.log("🔄 Fetching prodi for kampus:", kampusId);
      const startTime = Date.now();
      
      const response = await api.getProgramStudiList(kampusId);
      const data = (response?.data || response) as ProgramStudi[];

      setProdiList(Array.isArray(data) ? data : []);

      console.log(`✅ Loaded ${data?.length || 0} prodi in ${Date.now() - startTime}ms`);

      // ✅ Auto-select if targeting specific prodi
      if (targetProdiName && data?.length > 0) {
        const selectedProdiData = data.find(p => p.nama_prodi === targetProdiName);
        if (selectedProdiData) {
          setSelectedProdi(selectedProdiData.id.toString());
          console.log("✅ Auto-selected prodi:", targetProdiName);
        }
      }
    } catch (err) {
      console.error('❌ Error fetching prodi:', err);
      toast.error('Gagal memuat program studi');
    } finally {
      setIsLoadingProdi(false);
    }
  };

  const handleKampusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedKampus(value);
    setSelectedProdi(''); // ✅ Reset prodi selection
    
    if (value) {
      fetchAndSelectProdi(value); // ✅ Use helper function
    }
  };

  // ✅ OPTIMIZED: Save dengan loading indicator
  const handleSave = async () => {
    if (!selectedKampus || !selectedProdi) {
      toast.error('Pilih kampus dan program studi!');
      return;
    }

    try {
      setIsSaving(true);

      // Get kampus and prodi names
      const selectedKampusData = kampusList.find(k => k.id.toString() === selectedKampus);
      const selectedProdiData = prodiList.find(p => p.id.toString() === selectedProdi);

      if (!selectedKampusData || !selectedProdiData) {
        toast.error('Data kampus atau prodi tidak valid');
        return;
      }

      console.log("📝 Saving target selection...");
      const startTime = Date.now();

      // ✅ Save via API
      await api.saveUserTarget({
        tryout_id: tryoutId,
        kampus_name: selectedKampusData.nama_kampus,
        prodi_name: selectedProdiData.nama_prodi
      });

      console.log(`✅ Target saved in ${Date.now() - startTime}ms`);

      // ✅ Also save to localStorage for quick access
      localStorage.setItem(`tryout_${tryoutId}_kampus`, selectedKampus);
      localStorage.setItem(`tryout_${tryoutId}_prodi`, selectedProdi);
      localStorage.setItem(`tryout_${tryoutId}_kampus_name`, selectedKampusData.nama_kampus);
      localStorage.setItem(`tryout_${tryoutId}_prodi_name`, selectedProdiData.nama_prodi);

      toast.success('Target berhasil disimpan!');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('❌ Error saving target:', err);
      toast.error(err.message || 'Gagal menyimpan target');
    } finally {
      setIsSaving(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-[#1d293d]">Pilih Target Kampus & Jurusan</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-gradient-to-r from-[#e6f3ff] to-[#f8fbff] rounded-xl p-4">
            <p className="text-xs text-[#295782] leading-relaxed">
              💡 Pilihan ini akan membantu analisis performa kamu terhadap target kampus impian
            </p>
          </div>

          {/* ✅ ADD: Loading state untuk initial fetch */}
          {isLoadingInitial ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#295782]"></div>
              <p className="ml-2 text-sm text-[#64748B]">Memuat data...</p>
            </div>
          ) : (
            <>
              {/* Kampus Dropdown */}
              <div>
                <label className="block text-sm font-medium text-[#1d293d] mb-2">
                  Kampus <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedKampus}
                  onChange={handleKampusChange}
                  className="w-full px-4 py-3 bg-[#f8fbff] border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#295782] transition-all"
                >
                  <option value="">-- Pilih Kampus --</option>
                  {kampusList.map((kampus) => (
                    <option key={kampus.id} value={kampus.id}>
                      {kampus.nama_kampus}
                    </option>
                  ))}
                </select>
              </div>

              {/* Program Studi Dropdown */}
              <div>
                <label className="block text-sm font-medium text-[#1d293d] mb-2">
                  Program Studi <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedProdi}
                  onChange={(e) => setSelectedProdi(e.target.value)}
                  disabled={!selectedKampus || isLoadingProdi}
                  className="w-full px-4 py-3 bg-[#f8fbff] border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#295782] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {isLoadingProdi ? '⏳ Memuat...' : '-- Pilih Program Studi --'}
                  </option>
                  {prodiList.map((prodi) => (
                    <option key={prodi.id} value={prodi.id}>
                      {prodi.nama_prodi}
                    </option>
                  ))}
                </select>
                {!selectedKampus && (
                  <p className="text-xs text-[#62748e] mt-2">Pilih kampus terlebih dahulu</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t">
          <button
            onClick={onClose}
            disabled={isSaving || isLoadingInitial}
            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedKampus || !selectedProdi || isSaving || isLoadingInitial}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-[#295782] to-[#1e4060] text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Menyimpan...</span>
              </>
            ) : (
              'Simpan'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
