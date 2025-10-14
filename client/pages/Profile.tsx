import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

export default function Profile() {
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [school, setSchool] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem("sb_token");
        if (!token) {
          navigate("/signin");
          return;
        }
        const res = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) {
          localStorage.removeItem("sb_token");
          navigate("/signin");
          return;
        }
        const json = await res.json();
        const user = json.data ?? json.user ?? null;
        setProfile(user);
        const metaName = user?.user_metadata?.full_name ?? user?.full_name ?? "";
        setFullName(metaName);
        setPhone(user?.phone ?? "");
        setSchool(user?.school ?? "");
      } catch (e) {
        localStorage.removeItem("sb_token");
        navigate("/signin");
      }
    };
    load();
  }, [navigate]);

  const handleEdit = () => {
    setEditing(true);
  };

  const handleSave = async () => {
    try {
      const userId = profile?.user?.id ?? profile?.id ?? null;
      if (!userId) throw new Error("User ID not found");

      const payload: any = { id: userId, full_name: fullName, phone, school, updated_at: new Date() };
      // 'returning' is not a valid option in current supabase-js typings; remove it
      await supabase.from("profiles").upsert(payload);

      setProfile((p: any) => {
        const copy = { ...p };
        if (copy.user) copy.user.user_metadata = { ...(copy.user.user_metadata || {}), full_name: fullName };
        copy.full_name = fullName;
        copy.phone = phone;
        copy.school = school;
        return copy;
      });

      setEditing(false);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Gagal menyimpan profil");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E6F3FF] to-[#F8FBFF] flex flex-col">
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
              <span className="text-[12px] font-semibold text-[#89B0C7]">JA</span>
            </div>
            <span className="text-[14px] text-white hidden md:inline">Jakk Here</span>
            <ChevronDown className="w-3 h-3 text-white" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 top-full mt-2 w-[200px] bg-white rounded-2xl border border-[#F3F4F6] shadow-2xl py-2 z-50">
              <Link
                to="/"
                className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
              >
                <span className="text-[20px]">🏠</span>
                <span className="text-[14px] text-[#1D293D]">Landing Page</span>
              </Link>
              <button onClick={() => { setShowProfileMenu(false); navigate('/dashboard'); }} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors w-full">
                <span className="text-[20px]">📊</span>
                <span className="text-[14px] text-[#1D293D]">Dashboard</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 md:px-12 py-8 md:py-12">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-[28px] md:text-[30px] font-bold text-[#1D293D]">Profil Akun</h2>
            <p className="text-[13px] text-[#62748E]">Kelola informasi akunmu dan preferensi pengguna.</p>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 border border-[#EEF6FB] max-w-[760px] mx-auto">
            <div className="flex flex-col items-center gap-3 mb-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-b from-[#89B0C7] to-[#89B1C7] flex items-center justify-center relative">
                <img src="https://api.builder.io/api/v1/image/assets/TEMP/00e767a086f506c449b1a0677aa1455acdeff93b?width=96" alt="avatar" className="w-12 h-12 rounded-full" />
                <button className="absolute bottom-0 right-0 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center text-[10px]">📷</button>
              </div>
              <button className="text-sm text-[#62748E] hover:text-[#295782]">Ubah Foto</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-[11px] font-semibold text-[#1D293D] block mb-2">Nama Lengkap</label>
                {editing ? (
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-10" />
                ) : (
                  <div className="h-10 rounded-md bg-[#F1F5F9] flex items-center px-3 text-[14px]">{profile?.user?.user_metadata?.full_name ?? profile?.full_name ?? "Jakk Here"}</div>
                )}
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#1D293D] block mb-2">Email</label>
                <div className="h-10 rounded-md bg-[#F1F5F9] flex items-center px-3 text-[14px]">{profile?.user?.email ?? profile?.email ?? "jakk.here@example.com"}</div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#1D293D] block mb-2">Nomor HP</label>
                {editing ? (
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-10" placeholder="+62 812-3456-7890" />
                ) : (
                  <div className="h-10 rounded-md bg-[#F1F5F9] flex items-center px-3 text-[14px]">{profile?.phone ?? "+62 812-3456-7890"}</div>
                )}
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#1D293D] block mb-2">Asal Sekolah</label>
                {editing ? (
                  <Input value={school} onChange={(e) => setSchool(e.target.value)} className="h-10" placeholder="SMA Negeri 1 Jakarta" />
                ) : (
                  <div className="h-10 rounded-md bg-[#F1F5F9] flex items-center px-3 text-[14px]">{profile?.school ?? "SMA Negeri 1 Jakarta"}</div>
                )}
              </div>
            </div>

            <div className="flex justify-center">
              {!editing ? (
                <Button onClick={handleEdit} className="bg-[#295782] text-white hover:bg-[#295782]/90 px-8 rounded-xl shadow-md">
                  <span className="mr-2">✏️</span> Edit Profil
                </Button>
              ) : (
                <div className="flex gap-3">
                  <Button onClick={() => setEditing(false)} className="bg-[#E5E7EB] text-[#314158] hover:bg-[#D1D5DB] px-6 rounded-xl">
                    Batal
                  </Button>
                  <Button onClick={handleSave} className="bg-[#00A63E] text-white hover:bg-[#00A63E]/90 px-6 rounded-xl shadow-md">
                    <span className="mr-2">✓</span> Selesai
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-[#EEF6FB] max-w-[760px] mx-auto mt-6">
            <h3 className="text-[16px] font-semibold text-[#1D293D] mb-4">Pengaturan Akun</h3>

            <div className="space-y-3">
              <button className="w-full text-left flex items-start gap-3 p-4 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-[#E5E7EB]">
                <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center text-[18px]">🔒</div>
                <div className="flex-1">
                  <div className="font-semibold text-[14px] text-[#1D293D]">Ganti Password</div>
                  <div className="text-[12px] text-[#62748E]">Ubah kata sandi akun Anda</div>
                </div>
              </button>

              <button className="w-full text-left flex items-start gap-3 p-4 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-[#E5E7EB]">
                <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center text-[18px]">⚙️</div>
                <div className="flex-1">
                  <div className="font-semibold text-[14px] text-[#1D293D]">Kelola Keamanan Akun</div>
                  <div className="text-[12px] text-[#62748E]">Atur keamanan dan verifikasi</div>
                </div>
              </button>

              <button className="w-full text-left flex items-start gap-3 p-4 rounded-xl hover:bg-red-50 transition-colors border border-transparent hover:border-red-200">
                <div className="w-10 h-10 rounded-xl bg-[#FEF2F2] flex items-center justify-center text-[18px]">🗑️</div>
                <div className="flex-1">
                  <div className="font-semibold text-[14px] text-[#E7000B]">Hapus Akun</div>
                  <div className="text-[12px] text-[#62748E]">Hapus akun secara permanen</div>
                </div>
              </button>
            </div>
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