// client/pages/Dashboard.tsx

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileText, CheckCircle, Clock, ArrowRight, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import { toast } from "react-hot-toast";
import Header from "@/components/Header";

interface UserProfile {
  nama: string;
  inisial: string;
}

interface Transaction {
  id: string;
  package_name: string;
  amount: number;
  status: string;
  created_at: string;
}

const decodeToken = (jwt: string) => {
  try { 
    return JSON.parse(atob(jwt.split('.')[1])); 
  } catch (e) { 
    return null; 
  }
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [tryoutCount, setTryoutCount] = useState<number | null>(null);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, [navigate]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      console.log("⏱️ [START] Loading dashboard data...");
      const startTime = Date.now();

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      let currentUserId: string | null = null;

      if (sessionError || !session) {
        const token = localStorage.getItem("auth_token");
        if (!token) {
          navigate("/signin", { replace: true });
          return;
        }

        const payload = decodeToken(token);
        if (!payload) {
          localStorage.removeItem("auth_token");
          navigate("/signin", { replace: true });
          return;
        }

        currentUserId = payload.user_id;

        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("nama_lengkap, username, photo_profile")
          .eq("user_id", payload.user_id)
          .single();

        if (userData) {
          setUserPhoto(userData.photo_profile || null);
        }
          
        if (userError) {
          console.error("Error fetching user:", userError);
        }

        const nama = userData?.nama_lengkap || payload.nama_lengkap || payload.email?.split("@")[0] || "Pengguna";
        const inisial = nama.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();
        setUser({ nama, inisial });
      } else {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (!authUser) {
          navigate("/signin", { replace: true });
          return;
        }

        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("user_id, nama_lengkap, photo_profile")
          .eq("auth_id", authUser.id)
          .single();

        if (userError || !userData) {
          console.error("Error fetching user:", userError);
          navigate("/signin", { replace: true });
          return;
        }

        currentUserId = userData.user_id;
        setUserPhoto(userData.photo_profile || null);

        let nama = userData.nama_lengkap || authUser.user_metadata?.nama_lengkap || authUser.user_metadata?.full_name;

        if (!nama) {
          nama = authUser.email?.split("@")[0] || "Pengguna";
        }

        const inisial = nama.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();
        setUser({ nama, inisial });
      }

      setUserId(currentUserId);

      // Load stats, activities, and transactions
      await Promise.all([
        fetchDashboardStats(currentUserId),
        fetchRecentActivities(currentUserId), // ✅ Pass currentUserId agar query akurat
        loadRecentTransactions(currentUserId),
      ]);

      console.log(`⏱️ [END] Dashboard loaded in ${Date.now() - startTime}ms`);

    } catch (err) {
      console.error("Gagal mengambil data dashboard:", err);
      localStorage.removeItem("auth_token");
      navigate("/signin", { replace: true });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDashboardStats = async (currentUserId: string | null) => {
    try {
      console.log("📊 Fetching dashboard stats...");

      if (!currentUserId) {
        setTryoutCount(0);
        return;
      }

      const { data: sessions, error } = await supabase
        .from("tryout_sessions")
        .select("tryout_id, kategori_id, status")
        .eq("user_id", currentUserId)
        .eq("status", "completed");

      if (error) {
        console.error("❌ Error fetching sessions:", error);
        setTryoutCount(0);
        return;
      }

      if (!sessions || sessions.length === 0) {
        setTryoutCount(0);
        return;
      }

      // Group by tryout_id
      const tryoutGroups: Record<string, Set<string>> = {};
      for (const s of sessions) {
        if (!s.tryout_id) continue;
        if (!tryoutGroups[s.tryout_id]) {
          tryoutGroups[s.tryout_id] = new Set<string>();
        }
        if (s.kategori_id) {
          tryoutGroups[s.tryout_id].add(s.kategori_id);
        }
      }

      let fullyCompletedCount = 0;
      const tryoutIds = Object.keys(tryoutGroups);

      for (const tryoutId of tryoutIds) {
        const completedCategories = tryoutGroups[tryoutId];

        const { data: questions } = await supabase
          .from("questions")
          .select("kategori_id")
          .eq("tryout_id", tryoutId);

        if (!questions || questions.length === 0) continue;

        const totalCategories = new Set(
          questions.map(q => q.kategori_id).filter(Boolean)
        );

        const isComplete = Array.from(totalCategories).every(cat =>
          completedCategories.has(cat)
        );

        if (isComplete) {
          fullyCompletedCount++;
        }
      }

      setTryoutCount(fullyCompletedCount);

    } catch (err: any) {
      console.error("❌ Error:", err);
      setTryoutCount(0);
    }
  };

  // ✅ UPDATED: Fetch langsung dari Supabase untuk support IRT (irt_theta)
  const fetchRecentActivities = async (currentUserId: string | null) => {
    try {
      console.log("📋 Fetching recent activities via Supabase Query...");
      const startTime = Date.now();

      if (!currentUserId) return;

      // Query langsung ke tabel tryout_sessions untuk mendapatkan irt_theta
      const { data, error } = await supabase
        .from("tryout_sessions")
        .select(`
          id, tryout_id, kategori_id, status, 
          score, irt_theta, raw_score, total_questions, percentage_score,
          started_at, completed_at, updated_at,
          tryout:tryouts (nama_tryout)
        `)
        .eq("user_id", currentUserId)
        .order("updated_at", { ascending: false })
        .limit(5);

      if (error) {
        console.error("❌ Error fetching activities:", error);
        return;
      }

      if (Array.isArray(data)) {
        const mapped = data.map((session: any) => {
          const tryoutName = session.tryout?.nama_tryout || "Tryout";
          const kategoriName = session.kategori_id ? ` - ${getKategoriName(session.kategori_id)}` : "";
          const title = `${tryoutName}${kategoriName}`;
          
          const date = humanizeDate(session.updated_at || session.completed_at || session.started_at);
          const status = session.status === 'completed' ? "Selesai" : "Berlangsung";
          
          let score = "";
          
          // ✅ LOGIKA SKOR IRT
          if (session.status === 'completed') {
            // Prioritaskan menampilkan Theta jika ada
            if (session.irt_theta !== null && session.irt_theta !== undefined) {
              score = `Theta: ${Number(session.irt_theta).toFixed(2)}`;
            } 
            // Fallback ke percentage_score dari backend
            else if (session.percentage_score !== null) {
              score = `Skor: ${Math.round(session.percentage_score)}`;
            } 
            // Fallback terakhir ke score manual
            else if (session.score !== null) {
              score = `Skor: ${session.score}`;
            }
          } else {
            // Logika Progress untuk yang belum selesai
            const rawScore = session.raw_score || 0; // Kadang raw_score dipakai sbg answered count sementara di logic lama
            // Kita hitung progress kasar jika data tersedia, atau default kosong
            // Note: Field answered_count mungkin tidak ada di query ini, jadi kita skip detail progress bar jika tidak ada
            score = "Lanjutkan";
          }

          const iconBg = status === "Selesai" 
            ? "linear-gradient(135deg, rgba(0, 0, 0, 0.00) 0%, #A4F4CF 100%)" 
            : "linear-gradient(135deg, rgba(0, 0, 0, 0.00) 0%, #FFD6A7 100%)";
          
          const icon = status === "Selesai" 
            ? <CheckCircle className="w-5 h-5 text-[#334155]" /> 
            : <Clock className="w-5 h-5 text-[#334155]" />;
          
          const action = status === "Selesai" ? "Review Hasil" : "Lanjutkan";
          
          return {
            id: session.id, // session.id dari query DB
            tryoutId: session.tryout_id,
            sessionId: session.id,
            kategoriId: session.kategori_id,
            title,
            date,
            status,
            score,
            icon,
            action,
            iconBg,
            statusColor: status === "Selesai" 
              ? "bg-[#89B1C7]" 
              : "bg-[#F3F4F6] border border-[#E5E7EB] text-[#314158]",
          };
        });
        
        setActivities(mapped);
        console.log(`✅ Activities loaded in ${Date.now() - startTime}ms`);
      }
    } catch (err) {
      console.error("❌ Error fetching activities:", err);
      setActivities([]);
    }
  };

  const loadRecentTransactions = async (currentUserId: string | null) => {
    try {
      console.log('🔍 Fetching recent transactions...');

      if (!currentUserId) {
        console.warn('⚠️ User ID not found');
        return;
      }

      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          packages:package_id (
            name,
            price
          )
        `)
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) {
        console.error('❌ Transactions error:', error);
        return;
      }

      const transformed = (data || []).map((t: any) => ({
        id: t.id,
        package_name: t.packages?.name || '-',
        amount: t.amount,
        status: t.status,
        created_at: t.created_at
      }));

      console.log('✅ Recent transactions loaded:', transformed);
      setRecentTransactions(transformed);

    } catch (error) {
      console.error('❌ Error loading transactions:', error);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getKategoriName = (kategoriId: string): string => {
    const kategoriMap: Record<string, string> = {
      'kpu': 'Kemampuan Penalaran Umum',
      'ppu': 'Pengetahuan dan Pemahaman Umum',
      'pk': 'Pemahaman Kuantitatif',
      'pm': 'Penalaran Matematika',
      'lit-id': 'Literasi Bahasa Indonesia',
      'lit-en': 'Literasi Bahasa Inggris',
      'kmbm': 'Kemampuan Memahami Bacaan dan Menulis',
    };
    return kategoriMap[kategoriId] || kategoriId;
  };

  function humanizeDate(dateStr: string) {
    try {
      const d = new Date(dateStr);
      const diff = Date.now() - d.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      if (days === 0) return "Hari ini";
      if (days === 1) return "1 hari yang lalu";
      return `${days} hari yang lalu`;
    } catch (e) {
      return "-";
    }
  }

  const handleActivityClick = (activity: any) => {
    if (activity.status === "Selesai") {
      navigate(`/tryout/${activity.tryoutId}/result?session=${activity.sessionId}`);
    } else {
      const params = new URLSearchParams();
      params.set('session', activity.sessionId);
      if (activity.kategoriId) params.set('kategori', activity.kategoriId);
      navigate(`/tryout/${activity.tryoutId}/exam?${params.toString()}`);
    }
  };

  if (!user || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#EFF6FB]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#295782] mx-auto mb-4"></div>
          <p className="text-[#64748B] text-sm">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header 
        userName={user.nama}
        userPhoto={userPhoto}
        activeMenu="dashboard"
        variant="default"
      />

      <main className="flex-1 bg-[#EFF6FB] px-4 md:px-8 py-4 md:py-6 space-y-4">
        {/* Hero Banner */}
        <div className="relative h-[120px] md:h-[140px] rounded-2xl bg-gradient-to-b from-[#89B0C7] to-[#6B94B5] shadow-lg overflow-hidden p-4 md:p-6 flex items-center justify-between">
          <div className="relative z-10 flex-1 max-w-[480px]">
            <h2 className="text-lg md:text-xl font-bold text-white mb-1">
              Selamat Datang, {user.nama}!
            </h2>
            <p className="text-xs md:text-sm text-white/90 mb-3">
              Siap lanjut tryout hari ini? Mari mulai persiapan UTBK terbaikmu!
            </p>
            <Button 
              onClick={() => navigate('/packages')}
              className="bg-white text-[#89B0C7] font-semibold px-4 py-1.5 text-sm rounded-xl shadow-md hover:bg-white/95 transition-all"
            >
              Beli Paket
            </Button>
          </div>
          <img 
            src="https://api.builder.io/api/v1/image/assets/TEMP/ab9e7e72930d26b30d78c7d637c199045db33620?width=320" 
            alt="Students studying" 
            className="hidden lg:block w-[120px] h-[85px] rounded-xl shadow-md" 
          />
        </div>

        {/* Stats Card */}
        <div className="flex justify-center">
          <div className="relative w-full max-w-[520px] h-[90px] md:h-[100px] rounded-xl bg-gradient-to-b from-[#16A34A] to-[#15803D] shadow-md p-4 overflow-hidden">
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <div className="text-2xl md:text-3xl font-bold text-white mb-0.5">{tryoutCount ?? '...'}</div>
                <div className="text-sm text-white/90">Tryout yang telah diselesaikan</div>
                <div className="text-xs text-white/70 mt-0.5">🏆 Terus semangat belajar!</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/20 shadow-md flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Activity & Tryout Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          {/* Left Column: Aktivitas Terakhir */}
          <div className="lg:col-span-2 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base md:text-lg font-bold text-[#1D293D]">Aktivitas Terakhir</h3>
                <button 
                  onClick={() => navigate('/tryout')}
                  className="text-xs text-[#89B0C7] font-medium hover:underline"
                >
                  Lihat Semua
                </button>
              </div>
              <div className="space-y-3">
                {activities.length > 0 ? (
                  activities.map((activity) => (
                    <div 
                      key={activity.id} 
                      className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-xl shadow-sm flex items-center justify-center" 
                          style={{ background: activity.iconBg }}
                        >
                          {activity.icon}
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-[#1D293D] mb-0.5">{activity.title}</h4>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-[#62748E]">{activity.date}</span>
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] ${activity.statusColor}`}>
                              {activity.status}
                            </span>
                            {activity.score && (
                              <span className="text-[#314158] font-semibold">{activity.score}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleActivityClick(activity)}
                        className="flex items-center gap-1 text-xs text-[#89B0C7] font-medium hover:underline"
                      >
                        {activity.action}
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center text-gray-500 text-sm">
                    Belum ada aktivitas. Mulai tryout pertamamu!
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Right Column: Tryout Info Box */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col" style={{ minHeight: '340px' }}>
            <div className="flex-1 flex flex-col items-center justify-center px-8 pt-12 pb-6">
              <div className="w-24 h-24 rounded-[28px] bg-gradient-to-br from-[#E8F1F8] to-[#F8FBFF] shadow-sm flex items-center justify-center mb-6">
                <FileText className="w-11 h-11 text-[#6B94B5] stroke-[1.5]" />
              </div>
              <p className="text-base text-[#64748B] leading-relaxed font-normal text-center">
                Lihat dan mulai tryout terbaru
              </p>
            </div>
            <div className="px-8 pb-8">
              <Button 
                onClick={() => navigate('/tryout')}
                className="w-full bg-[#295782] hover:bg-[#234668] text-white font-semibold text-base rounded-xl py-4 shadow-md transition-all hover:shadow-lg"
              >
                Lihat Semua Tryout
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-b from-[#F8FAFC] to-[#F1F5F9]/50 border-t border-[#E2E8F0] px-4 md:px-8 py-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-[#45556C]">
          <p>© 2025 Kelas Kampus. Semua hak cipta dilindungi.</p>
          <div className="flex items-center gap-4">
            <button className="hover:text-[#295782]">Bantuan</button>
            <button className="hover:text-[#295782]">Kebijakan Privasi</button>
            <button className="hover:text-[#295782]">Syarat Layanan</button>
            <button className="hover:text-[#295782]">Kontak</button>
          </div>
        </div>
      </footer>
    </div>
  );
}