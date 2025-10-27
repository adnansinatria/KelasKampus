// src/components/AdminLayout.tsx
import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // Helper function untuk cek active route
  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path);
  };

  // Fungsi untuk handle logout jika diperlukan di masa depan
  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    navigate("/signin", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E6F3FF] via-[#F0F7FF] to-[#F8FBFF]">
      {/* Header */}
      <header className="bg-white/95 border-b border-gray-200">
        <div className="max-w-[1363px] mx-auto px-12">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link to="/admin" className="flex items-center gap-2 md:gap-3 hover:opacity-90 transition-opacity">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-b from-[#89B0C7] to-[#89B1C7] shadow-lg flex items-center justify-center flex-shrink-0">
                <img
                  src="https://api.builder.io/api/v1/image/assets/TEMP/0718bd4f94bf824464459174b94b8323644342a4?width=112"
                  alt="Kelas Kampus"
                  className="w-12 h-12 md:w-14 md:h-14 rounded-full"
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm md:text-base font-bold text-[#1D293D] leading-5 md:leading-6 truncate">
                  Kelas Kampus
                </h1>
                <p className="text-xs text-[#62748E] leading-4 truncate">
                  Tryout Indonesia
                </p>
              </div>
            </Link>

            {/* Navigation - Desktop */}
            <nav className="hidden md:flex items-center gap-6">
              <Link
                to="/admin"
                className={`text-sm font-medium transition-colors ${
                  isActive("/admin") && !isActive("/admin-")
                    ? "text-[#295782]"
                    : "text-[#64748B] hover:text-[#295782]"
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/admin-users"
                className={`text-sm font-medium transition-colors ${
                  isActive("/admin-users")
                    ? "text-[#295782]"
                    : "text-[#64748B] hover:text-[#295782]"
                }`}
              >
                Pengguna
              </Link>
              <Link
                to="/admin-tryout"
                className={`text-sm font-medium transition-colors ${
                  isActive("/admin-tryout")
                    ? "text-[#295782]"
                    : "text-[#64748B] hover:text-[#295782]"
                }`}
              >
                Tryout
              </Link>
              <Link
                to="/admin-transaksi"
                className={`text-sm font-medium transition-colors ${
                  isActive("/admin-transaksi")
                    ? "text-[#295782]"
                    : "text-[#64748B] hover:text-[#295782]"
                }`}
              >
                Transaksi
              </Link>
              <Link
                to="/admin-pengaturan"
                className={`text-sm font-medium transition-colors ${
                  isActive("/admin-settings")
                    ? "text-[#295782]"
                    : "text-[#64748B] hover:text-[#295782]"
                }`}
              >
                Pengaturan
              </Link>
            </nav>

            {/* Navigation - Mobile */}
            <nav className="flex md:hidden items-center gap-4 text-xs">
              <Link
                to="/admin"
                className={`font-medium ${
                  isActive("/admin") && !isActive("/admin-")
                    ? "text-[#295782]"
                    : "text-[#64748B]"
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/admin-tryout"
                className={`font-medium ${
                  isActive("/admin-tryout") ? "text-[#295782]" : "text-[#64748B]"
                }`}
              >
                Tryout
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      {children}
    </div>
  );
}
