import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, FileText, CheckCircle, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase"; // Pastikan ini dikonfigurasi dengan benar

// Tipe data untuk pengguna agar lebih aman
interface UserProfile {
  nama: string;
  inisial: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [tryoutCount, setTryoutCount] = useState<number | null>(null);

  useEffect(() => {
    // Logika perlindungan rute dan pengambilan data
    const token = localStorage.getItem("auth_token");
    
    if (!token) {
      console.log("Token tidak ditemukan, mengarahkan ke halaman signin...");
      navigate("/signin", { replace: true });
      return;
    }

    const decodeToken = (jwt: string) => {
      try {
        return JSON.parse(atob(jwt.split('.')[1]));
      } catch (e) {
        return null;
      }
    };

    const loadDashboardData = async () => {
      try {
        await supabase.auth.setSession({ access_token: token, refresh_token: '' });
        
        const payload = decodeToken(token);
        if (!payload || !payload.sub) {
          throw new Error("Token tidak valid atau tidak memiliki user ID.");
        }

        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("nama_lengkap")
          .eq("user_id", payload.sub)
          .single();
        
        if (userError) throw userError;

        if (userData) {
          const nama = userData.nama_lengkap || "Pengguna";
          const inisial = nama.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
          setUser({ nama, inisial });
        }
        
        const { count } = await supabase.from("results").select("id", { head: true, count: "exact" });
        if (typeof count === "number") setTryoutCount(count);

        const { data: activitiesData } = await supabase
          .from("activities")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(6);
        
        const rows = activitiesData ?? [];
        const mapped = rows.map((r: any, idx: number) => {
          const title = r.title || r.name || r.tryout_name || "Tryout";
          const created = r.created_at || r.started_at || r.updated_at || null;
          const date = created ? humanizeDate(created) : "-";
          const status = r.status || (r.progress && r.progress < 100 ? "Berlangsung" : "Selesai");
          const score = r.score ? `Skor: ${r.score}` : r.progress ? `Progress: ${r.progress}%` : "";
          const iconBg = status === "Selesai" ? "linear-gradient(135deg, rgba(0, 0, 0, 0.00) 0%, #A4F4CF 100%)" : "linear-gradient(135deg, rgba(0, 0, 0, 0.00) 0%, #FFD6A7 100%)";
          const icon = status === "Selesai" ? <CheckCircle className="w-6 h-6 text-[#334155]" /> : <Clock className="w-6 h-6 text-[#334155]" />;
          const action = status === "Selesai" ? "Review Hasil" : "Lanjutkan";
          return {
            id: r.id ?? idx, title, date, status, score, icon, action, iconBg,
            statusColor: status === "Selesai" ? "bg-[#89B1C7]" : "bg-[#F3F4F6] border border-[#E5E7EB] text-[#314158]",
          };
        });
        setActivities(mapped);
        
      } catch (err) {
        console.error("Gagal mengambil data dashboard (kemungkinan token tidak valid):", err);
        localStorage.removeItem("auth_token");
        navigate("/signin", { replace: true });
      }
    };

    loadDashboardData();
  }, [navigate]);

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

  // Tampilkan loading state sampai data pengguna berhasil diambil
  if (!user) {
    return <div className="min-h-screen flex items-center justify-center bg-[#EFF6FB]">Loading Dashboard...</div>;
  }

  // Tampilan utama dashboard
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-white/95 border-b border-[#E2E8F0] px-6 md:px-12 py-4 md:py-5 flex items-center justify-between relative">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-[#89B0C7] to-[#89B1C7] shadow-lg flex items-center justify-center relative">
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/056e44ae50afd87b86caf37ee90c602560068704?width=112"
              alt="Logo"
              className="w-14 h-14 rounded-full absolute -left-1 -top-1"
            />
          </div>
          <div>
            <h1 className="text-[16px] font-bold text-[#1D293D]">Kelas Kampus</h1>
            <p className="text-[12px] text-[#62748E]">Tryout Indonesia</p>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-b from-[#89B0C7] to-[#89B1C7] shadow-lg hover:shadow-xl transition-shadow"
          >
            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
              <span className="text-[12px] font-semibold text-[#89B0C7]">{user.inisial}</span>
            </div>
            <span className="text-[14px] text-white hidden md:inline">{user.nama}</span>
            <ChevronDown className="w-3 h-3 text-white" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 top-full mt-2 w-[200px] bg-white rounded-2xl border border-[#F3F4F6] shadow-2xl py-2 z-50">
              <Link to="/" className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                <span className="text-[20px]">🏠</span>
                <span className="text-[14px] text-[#1D293D]">Landing Page</span>
              </Link>
              <button onClick={() => { setShowProfileMenu(false); navigate('/profile'); }} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors w-full">
                <span className="text-[20px]">👤</span>
                <span className="text-[14px] text-[#1D293D]">Akun</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 bg-[#EFF6FB] px-6 md:px-12 py-6 md:py-8 space-y-6">
        {/* Hero Banner */}
        <div className="relative h-[160px] rounded-3xl bg-gradient-to-b from-[#89B0C7] to-[#6B94B5] shadow-2xl overflow-hidden p-6 md:p-8 flex items-center justify-between">
          <div className="relative z-10 flex-1 max-w-[520px]">
            <h2 className="text-[24px] md:text-[30px] font-bold text-white mb-2">Selamat Datang, {user.nama}!</h2>
            <p className="text-[14px] md:text-[16px] text-white/90 mb-4">Siap lanjut tryout hari ini? Mari mulai persiapan UTBK terbaikmu!</p>
            <Button className="bg-white text-[#89B0C7] font-semibold px-6 py-2 rounded-2xl shadow-lg hover:bg-white/95">Mulai Tryout</Button>
          </div>
          <img src="https://api.builder.io/api/v1/image/assets/TEMP/ab9e7e72930d26b30d78c7d637c199045db33620?width=320" alt="Students studying" className="hidden lg:block w-[160px] h-[112px] rounded-2xl shadow-lg" />
        </div>

        {/* Stats Card */}
        <div className="flex justify-center">
          <div className="relative w-full max-w-[626px] h-[120px] rounded-2xl bg-gradient-to-b from-[#16A34A] to-[#15803D] shadow-xl p-6 overflow-hidden">
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <div className="text-[36px] font-bold text-white mb-1">{tryoutCount ?? '...'}</div>
                <div className="text-[16px] text-white/90">Tryout yang telah diikuti</div>
                <div className="text-[14px] text-white/70 mt-1">🏆 Terus semangat belajar!</div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/20 shadow-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Activity & Tryout Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-[20px] font-bold text-[#1D293D]">Aktivitas Terakhir</h3>
            <div className="space-y-4">
              {activities.length > 0 ? (
                activities.map((activity) => (
                  <div key={activity.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl shadow-sm flex items-center justify-center" style={{ background: activity.iconBg }}>
                        {activity.icon}
                      </div>
                      <div>
                        <h4 className="text-[14px] font-semibold text-[#1D293D] mb-1">{activity.title}</h4>
                        <div className="flex items-center gap-2 text-[12px]">
                          <span className="text-[#62748E]">{activity.date}</span>
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] ${activity.statusColor}`}>{activity.status}</span>
                          <span className="text-[#314158] font-semibold">{activity.score}</span>
                        </div>
                      </div>
                    </div>
                    <button className="flex items-center gap-1 text-[12px] text-[#89B0C7] font-medium hover:underline">{activity.action}<ArrowRight className="w-3 h-3" /></button>
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center text-gray-500">
                  Belum ada aktivitas. Mulai tryout pertamamu!
                </div>
              )}
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#89B0C7]/10 shadow-lg flex items-center justify-center">
              <FileText className="w-8 h-8 text-[#89B1C7]" />
            </div>
            <p className="text-[16px] text-[#45556C]">Lihat dan mulai tryout terbaru</p>
            <Button className="w-full bg-[#295782] hover:bg-[#295782]/90 text-white font-semibold rounded-2xl shadow-lg">Lihat Semua Tryout</Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-b from-[#F8FAFC] to-[#F1F5F9]/50 border-t border-[#E2E8F0] px-6 md:px-12 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-[14px] text-[#45556C]">
          <p>© 2025 Kelas Kampus. Semua hak cipta dilindungi.</p>
          <div className="flex items-center gap-6">
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