import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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

interface TargetInfo {
  kampusName: string;
  prodiName: string;
}

// ✅ MAPPING KATEGORI (dari kategori_id di questions)
const KATEGORI_MAP: Record<string, Kategori> = {
  // TPS
  'kpu': { id: 'kpu', nama_kategori: 'Kemampuan Penalaran Umum', kelompok: 'TPS', urutan: 1 },
  'ppu': { id: 'ppu', nama_kategori: 'Penalaran Umum', kelompok: 'TPS', urutan: 1 },
  'kmbm': { id: 'kmbm', nama_kategori: 'Kemampuan Memahami Bacaan dan Menulis', kelompok: 'TPS', urutan: 2 },
  'pbm': { id: 'pbm', nama_kategori: 'Pemahaman Bacaan dan Menulis', kelompok: 'TPS', urutan: 2 },
  'pk': { id: 'pk', nama_kategori: 'Pengetahuan Kuantitatif', kelompok: 'TPS', urutan: 3 },
  'pbi': { id: 'pbi', nama_kategori: 'Pengetahuan dan Pemahaman Umum', kelompok: 'TPS', urutan: 4 },
  
  // Literasi
  'lit-id': { id: 'lit-id', nama_kategori: 'Literasi Bahasa Indonesia', kelompok: 'Literasi', urutan: 5 },
  'lbi': { id: 'lbi', nama_kategori: 'Literasi Bahasa Indonesia', kelompok: 'Literasi', urutan: 5 },
  'litindo': { id: 'litindo', nama_kategori: 'Literasi Bahasa Indonesia', kelompok: 'Literasi', urutan: 5 },
  
  'lit-en': { id: 'lit-en', nama_kategori: 'Literasi Bahasa Inggris', kelompok: 'Literasi', urutan: 6 },
  'ling': { id: 'ling', nama_kategori: 'Literasi Bahasa Inggris', kelompok: 'Literasi', urutan: 6 },
  'litbing': { id: 'litbing', nama_kategori: 'Literasi Bahasa Inggris', kelompok: 'Literasi', urutan: 6 },
  
  // Matematika
  'pm': { id: 'pm', nama_kategori: 'Penalaran Matematika', kelompok: 'Matematika', urutan: 7 },
  'penmat': { id: 'penmat', nama_kategori: 'Penalaran Matematika', kelompok: 'Matematika', urutan: 7 },
  
  // Soshum
  'geografi': { id: 'geografi', nama_kategori: 'Geografi', kelompok: 'Sosial', urutan: 8 },
  'sejarah': { id: 'sejarah', nama_kategori: 'Sejarah', kelompok: 'Sosial', urutan: 9 },
  'sosiologi': { id: 'sosiologi', nama_kategori: 'Sosiologi', kelompok: 'Sosial', urutan: 10 },
  'ekonomi': { id: 'ekonomi', nama_kategori: 'Ekonomi', kelompok: 'Sosial', urutan: 11 },
  
  // Saintek
  'fisika': { id: 'fisika', nama_kategori: 'Fisika', kelompok: 'Sains', urutan: 12 },
  'kimia': { id: 'kimia', nama_kategori: 'Kimia', kelompok: 'Sains', urutan: 13 },
  'biologi': { id: 'biologi', nama_kategori: 'Biologi', kelompok: 'Sains', urutan: 14 },
  'matematika': { id: 'matematika', nama_kategori: 'Matematika Saintek', kelompok: 'Sains', urutan: 15 },
};

export function useTryoutData(tryoutId: string) {
  const [tryout, setTryout] = useState<any>(null);
  const [kategoris, setKategoris] = useState<Kategori[]>([]);
  const [groupedKategoris, setGroupedKategoris] = useState<Record<string, Kategori[]>>({});
  const [progressData, setProgressData] = useState<ProgressData>({});
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [targetInfo, setTargetInfo] = useState<TargetInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
        setIsLoading(true);

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: userData } = await supabase
        .from('users')
        .select('user_id, username, nama_lengkap, photo_profile')
        .eq('auth_id', session.user.id)
        .single();

        if (!userData) return;
        setCurrentUser(userData);

        const { data: tryoutData } = await supabase
        .from('tryouts')
        .select('*')
        .eq('id', tryoutId)
        .single();

        if (!tryoutData) return;
        setTryout(tryoutData);

        // ✅ GET DISTINCT kategori_id FROM questions
        const { data: questionsData } = await supabase
        .from('questions')
        .select('kategori_id')
        .eq('tryout_id', tryoutId);

        console.log('📦 Questions data:', questionsData);

        if (!questionsData || questionsData.length === 0) {
        console.warn('⚠️ No questions found for this tryout');
        return;
        }

        const uniqueKategoriIds = [...new Set(questionsData.map(q => q.kategori_id))];
        console.log('🏷️ Unique kategori IDs:', uniqueKategoriIds);

        const kategorisData: Kategori[] = uniqueKategoriIds
        .map(id => KATEGORI_MAP[id])
        .filter(Boolean)
        .sort((a, b) => a.urutan - b.urutan);

        console.log('✅ Kategoris:', kategorisData);

        setKategoris(kategorisData);
        
        const grouped = kategorisData.reduce((acc: Record<string, Kategori[]>, kategori) => {
        if (!acc[kategori.kelompok]) {
            acc[kategori.kelompok] = [];
        }
        acc[kategori.kelompok].push(kategori);
        return acc;
        }, {});
        
        console.log('📊 Grouped kategoris:', grouped);
        setGroupedKategoris(grouped);

        // ✅ FIX: Get target from user_targets table
        const { data: targetData } = await supabase
        .from('user_targets')
        .select('kampus_name, prodi_name')
        .eq('user_id', userData.user_id)
        .eq('tryout_id', tryoutId)
        .maybeSingle();

        console.log('🎯 Target data:', targetData);

        if (targetData) {
        setTargetInfo({
            kampusName: targetData.kampus_name,
            prodiName: targetData.prodi_name
        });
        } else {
        setTargetInfo(null); // ✅ Clear target if not found
        }

        // Get progress
        const progress: ProgressData = {};

        for (const kategori of kategorisData) {
        const { count: totalQuestions } = await supabase
            .from('questions')
            .select('*', { count: 'exact', head: true })
            .eq('tryout_id', tryoutId)
            .eq('kategori_id', kategori.id);

        const { data: sessions } = await supabase
            .from('tryout_sessions')
            .select('id, status')
            .eq('tryout_id', tryoutId)
            .eq('user_id', userData.user_id)
            .eq('kategori_id', kategori.id)
            .in('status', ['in_progress', 'completed']);

        let answeredCount = 0;
        let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';

        if (sessions && sessions.length > 0) {
            const completedSession = sessions.find(s => s.status === 'completed');
            const inProgressSession = sessions.find(s => s.status === 'in_progress');
            
            const activeSession = completedSession || inProgressSession;

            if (activeSession) {
            const { count } = await supabase
                .from('answers')
                .select('*', { count: 'exact', head: true })
                .eq('session_id', activeSession.id);

            answeredCount = count || 0;
            status = activeSession.status as 'in_progress' | 'completed';
            }
        }

        progress[kategori.id] = {
            answered: answeredCount,
            total: totalQuestions || 0,
            status
        };
        }

        console.log('📊 Progress:', progress);
        setProgressData(progress);

    } catch (error) {
        console.error('❌ Error fetching tryout data:', error);
    } finally {
        setIsLoading(false);
    }
    };

  useEffect(() => {
    if (tryoutId) {
      fetchData();
    }
  }, [tryoutId]);

  const refreshData = () => {
    fetchData();
  };

  return {
    tryout,
    kategoris,
    groupedKategoris,
    progressData,
    currentUser,
    targetInfo,
    isLoading,
    refreshData
  };
}
