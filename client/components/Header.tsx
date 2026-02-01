// components/Header.tsx

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, Coins } from "lucide-react"; // Import Coins icon
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
  const [userTokens, setUserTokens] = useState<number>(0); // State untuk token

  // Fetch Token saat komponen dimuat
  useEffect(() => {
    fetchUserTokens();
    
    // Opsional: Subscribe realtime jika ingin update langsung tanpa refresh
    // Tapi fetch biasa sudah cukup untuk awal
  }, []);

  const fetchUserTokens = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data } = await supabase
        .from('users')
        .select('tokens')
        .eq('user_id', session.user.id)
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
    <header className="bg-white shadow-sm sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo Section */}
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <div className="w-10 h-10 flex items-center justify-center">
                <img 
                    src="/Kelas-Kampus.png" 
                    alt="Kelas Kampus Logo" 
                    className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-base font-bold text-gray-800">Kelas Kampus</h1>
                <p className="text-[10px] text-gray-500">Tryout Indonesia</p>
              </div>
            </Link>
          </div>

          {/* Right Section: Token & Profile */}
          <div className="flex items-center gap-4">
            
            {/* 🔥 TAMPILAN TOKEN (BARU) 🔥 */}
            <div className="hidden sm:flex items-center gap-2 bg-yellow-50 px-3 py-1.5 rounded-full border border-yellow-200">
              <Coins className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-bold text-yellow-700">
                {userTokens} Token
              </span>
            </div>

            {/* Profile Menu */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-2 bg-[#B8D4E1] hover:bg-[#A3C5D5] px-3 py-1.5 rounded-full transition"
              >
                {userPhoto ? (
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                      <img
                      src={userPhoto}
                      alt={userName}
                      className={`w-full h-full ${
                          userPhoto.includes('googleusercontent.com') ? 'object-contain' : 'object-cover'
                      }`}
                      />
                  </div>
                  ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                      <span className="text-white text-sm font-bold">{userInitial}</span>
                  </div>
                  )}
                <span className="text-xs font-medium text-gray-700 max-w-[80px] truncate">{userName}</span>
                <ChevronDown className="w-3 h-3 text-gray-600" />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50 border border-gray-200">
                  {/* Mobile Token View (Show inside menu on mobile) */}
                  <div className="sm:hidden px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-sm text-gray-600">Token Saya</span>
                    <span className="text-sm font-bold text-yellow-600 flex items-center gap-1">
                      <Coins className="w-3 h-3" /> {userTokens}
                    </span>
                  </div>

                  <Link
                    to="/profile"
                    className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    Profil Saya
                  </Link>
                  <Link
                    to="/packages"
                    className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    Beli Paket
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}