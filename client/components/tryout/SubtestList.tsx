import { Play, Check, Lock } from 'lucide-react';

interface Kategori {
  id: string;
  nama_kategori: string;
  kelompok: string;
  urutan: number;
}

interface ProgressData {
  [kategoriId: string]: {
    answered: number;
    total: number;
    status: 'not_started' | 'in_progress' | 'completed';
  };
}

interface SubtestListProps {
  groupedKategoris: Record<string, Kategori[]>;
  progressData: ProgressData;
  onStartSubtest: (kategoriId: string) => void;
  canStart: boolean;
  isStarting: boolean;
}

export default function SubtestList({
  groupedKategoris,
  progressData,
  onStartSubtest,
  canStart,
  isStarting
}: SubtestListProps) {
  const kelompokOrder = ['TPS', 'Literasi', 'Matematika', 'Sains', 'Sosial'];

  const getStatusIcon = (status: string) => {
    if (status === 'completed') {
      return <Check className="w-5 h-5 text-green-600" />;
    }
    if (status === 'in_progress') {
      return <Play className="w-5 h-5 text-blue-600" />;
    }
    return <Lock className="w-5 h-5 text-gray-400" />;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'completed') {
      return (
        <span className="text-xs font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
          Selesai
        </span>
      );
    }
    if (status === 'in_progress') {
      return (
        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
          Berlangsung
        </span>
      );
    }
    return (
      <span className="text-xs font-medium text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
        Belum Mulai
      </span>
    );
  };

  const getButtonText = (status: string) => {
    if (status === 'completed') return 'Review';
    if (status === 'in_progress') return 'Lanjutkan';
    return 'Mulai';
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <h2 className="text-xl font-bold text-[#1d293d] mb-6">Daftar Subtest</h2>

      <div className="space-y-6">
        {kelompokOrder.map((kelompok) => {
          const kategoris = groupedKategoris[kelompok];
          if (!kategoris || kategoris.length === 0) return null;

          return (
            <div key={kelompok} className="space-y-3">
              <h3 className="text-sm font-bold text-[#295782] uppercase tracking-wide">
                {kelompok}
              </h3>

              <div className="space-y-3">
                {kategoris
                  .sort((a, b) => a.urutan - b.urutan)
                  .map((kategori) => {
                    const progress = progressData[kategori.id] || {
                      answered: 0,
                      total: 0,
                      status: 'not_started'
                    };

                    return (
                      <div
                        key={kategori.id}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-[#f8fbff] to-white rounded-xl border border-gray-100 hover:border-[#89b0c7] transition-all"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="flex-shrink-0">
                            {getStatusIcon(progress.status)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                              <h4 className="text-sm font-semibold text-[#1d293d] truncate">
                                {kategori.nama_kategori}
                              </h4>
                              {getStatusBadge(progress.status)}
                            </div>

                            <div className="flex items-center gap-4 text-xs text-[#62748e]">
                              <span>
                                {progress.total} Soal
                              </span>
                              {progress.status === 'in_progress' && (
                                <>
                                  <span>•</span>
                                  <span>
                                    {progress.answered}/{progress.total} Dijawab
                                  </span>
                                </>
                              )}
                            </div>

                            {progress.status === 'in_progress' && (
                              <div className="mt-2">
                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                  <div
                                    className="bg-[#89b0c7] h-1.5 rounded-full transition-all"
                                    style={{
                                      width: `${(progress.answered / progress.total) * 100}%`
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => onStartSubtest(kategori.id)}
                          disabled={!canStart || isStarting}
                          className={`ml-4 px-6 py-2 rounded-lg text-sm font-semibold transition-all flex-shrink-0 ${
                            canStart && !isStarting
                              ? progress.status === 'completed'
                                ? 'bg-green-50 text-green-600 hover:bg-green-100'
                                : progress.status === 'in_progress'
                                ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                : 'bg-gradient-to-r from-[#295782] to-[#1e4060] text-white hover:shadow-md'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {isStarting ? 'Memuat...' : getButtonText(progress.status)}
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          );
        })}
      </div>

      {!canStart && (
        <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-xl">
          <p className="text-sm text-orange-600 text-center font-medium">
            ⚠️ Pilih kampus dan program studi terlebih dahulu untuk memulai tryout
          </p>
        </div>
      )}
    </div>
  );
}
