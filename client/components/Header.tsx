import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("sb_token");
    navigate("/signin");
  };

  const userInitial = userName?.charAt(0)?.toUpperCase() || "U";

  return (
    <header className="bg-white shadow-sm">
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
              <span className="text-xs font-medium text-gray-700">{userName}</span>
              <ChevronDown className="w-3 h-3 text-gray-600" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg py-1 z-50 border border-gray-200">
                <Link
                  to="/profile"
                  className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100"
                  onClick={() => setShowProfileMenu(false)}
                >
                  Profil Saya
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
    </header>
  );
}
