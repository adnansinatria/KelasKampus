import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, Coins } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface HeaderProps {
  userName?: string;
  userPhoto?: string;
  activeMenu?: "dashboard" | "tryout" | "leaderboard" | "profile" | "package";
  variant?: "default" | "minimal";
}

export default function Header({ userName = "User", userPhoto, activeMenu, variant = "default" }: HeaderProps) {
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [userTokens, setUserTokens] = useState<number>(0);

  useEffect(() => {
    // 1. Ambil data awal
    fetchUserTokens();

    // 2. Setup Realtime Listener
    // Supabase akan memberi tahu frontend jika kolom 'tokens' berubah
    const channel = supabase
      .channel('realtime-tokens')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          // Filter: Hanya dengarkan perubahan pada user yang sedang login
          filter: `auth_id=eq.${supabase.auth.getSession().then(({data}) => data.session?.user.id)}` 
        },
        (payload) => {
          console.log('🔔 Token update received:', payload);
          // Jika ada perubahan pada token, update state
          if (payload.new && typeof payload.new.tokens === 'number') {
            setUserTokens(payload.new.tokens);
          }
        }
      )
      .subscribe();

    // Cleanup saat pindah halaman
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchUserTokens = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      // Ambil token dari tabel users berdasarkan auth_id
      const { data } = await supabase
        .from('users')
        .select('tokens')
        .eq('auth_id', session.user.id) // Pastikan pakai auth_id agar konsisten
        .single();
      
      if (data) {
        setUserTokens(data.tokens || 0);
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("sb_token");
    navigate("/signin");
  };

  const userInitial = userName?.charAt(0)?.toUpperCase() || "U";

  return (
    <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-40 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo Section */}
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center gap-3 group">
              <div className="w-10 h-10 transition-transform group-hover:scale-105">
                <img 
                  src="/Kelas-Kampus.png" 
                  alt="Kelas Kampus Logo" 
                  className="w-full h-full object-contain" 
                />
              </div>
              <div className="leading-tight">
                <h1 className="text-lg font-extrabold text-[#295782] tracking-tight">Kelas Kampus</h1>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Tryout Indonesia</p>
              </div>
            </Link>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4 md:gap-6">
            
            {/* 🔥 TAMPILAN TOKEN (REALTIME) 🔥 */}
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-2xl border border-blue-100 shadow-inner group transition-all hover:bg-blue-100/50">
              <img 
                src="/token.png" 
                alt="Token" 
                className="w-6 h-6 transition-transform group-hover:rotate-12" 
              />
              <span className="text-sm font-bold text-[#295782]">
                {userTokens}
              </span>
            </div>

            {/* Profile Menu - Lebih Clean */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2.5 p-1 pr-3 bg-gray-50 hover:bg-gray-100 rounded-full transition-all border border-gray-200 shadow-sm"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden shadow-sm border border-gray-200">
                  {userPhoto ? (
                    <img 
                      src={userPhoto} 
                      alt={userName}
                      className={`w-full h-full ${
                        userPhoto.includes('googleusercontent.com') ? 'object-contain' : 'object-cover'
                      }`} 
                    />
                  ) : (
                    <div className="w-full h-full bg-[#295782] text-white flex items-center justify-center text-xs font-bold">
                      {userInitial}
                    </div>
                  )}
                </div>
                
                {/* BAGIAN INI SUDAH DIPERBAIKI: Menghapus 'hidden xs:block' */}
                <span className="text-xs font-bold text-gray-700 max-w-[100px] truncate">
                  {userName}
                </span>
                
                <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu - Logika Tetap Sama */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-3 w-52 bg-white rounded-2xl shadow-xl py-2 z-50 border border-gray-100 animate-in fade-in zoom-in duration-200">
                  {/* Mobile Token View */}
                  <div className="sm:hidden px-4 py-3 border-b border-gray-50 flex items-center justify-between bg-blue-50/30">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Token Saya</span>
                    <span className="text-sm font-black text-[#295782] flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-yellow-500" /> {userTokens}
                    </span>
                  </div>

                  <div className="p-1">
                    <Link
                      to="/profile"
                      className="block px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                      onClick={() => setShowProfileMenu(false)}
                    >
                      Profil Saya
                    </Link>
                    <Link
                      to="/packages"
                      className="block px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                      onClick={() => setShowProfileMenu(false)}
                    >
                      Beli Paket
                    </Link>
                    <div className="my-1 border-t border-gray-50" />
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
  }
