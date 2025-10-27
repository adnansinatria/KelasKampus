import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import ChangePasswordModal from "@/components/ChangePasswordModal";
import DeleteAccountModal from "@/components/DeleteAccountModal";

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [school, setSchool] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Photo upload states
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // State for provinsi & kota
  const [provinsiList, setProvinsiList] = useState<any[]>([]);
  const [kotaList, setKotaList] = useState<any[]>([]);
  const [selectedProvinsi, setSelectedProvinsi] = useState<number | null>(null);
  const [selectedKota, setSelectedKota] = useState<number | null>(null);

  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
          localStorage.removeItem("sb_token");
          localStorage.removeItem("auth_token");
          navigate("/signin");
          return;
        }

        // Load user data from users table by auth_id
        const { data: userData } = await supabase
          .from("users")
          .select("*")
          .eq("auth_id", user.id)
          .single();

        // Load siswa data by user_id from users table
        let siswaData = null;
        if (userData?.user_id) {
          const { data } = await supabase
            .from("siswa")
            .select("*")
            .eq("user_id", userData.user_id)
            .single();
          
          siswaData = data;
        }

        const fullNameValue = userData?.nama_lengkap || user.email?.split("@")[0] || "";

        const profileData = {
          user: user,
          userData: userData,
          email: user.email,
          fullname: fullNameValue,
          username: userData?.username || "",
          photo_profile: userData?.photo_profile || null,
          phone: siswaData?.no_hp || "",
          school: siswaData?.asal_sekolah || "",
        };

        setProfile(profileData);
        setFullName(profileData.fullname);
        setUsername(profileData.username);
        setPhone(profileData.phone);
        setSchool(profileData.school);
        setSelectedProvinsi(siswaData?.provinsi_id || null);
        setSelectedKota(siswaData?.kota_id || null);

        // Load provinsi list
        loadProvinsiList();

        // Load kota list if provinsi selected
        if (siswaData?.provinsi_id) {
          loadKotaList(siswaData.provinsi_id);
        }

      } catch (e) {
        console.error("Load profile error:", e);
        localStorage.removeItem("sb_token");
        localStorage.removeItem("auth_token");
        navigate("/signin");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate]);

  const loadProvinsiList = async () => {
    const { data, error } = await supabase
      .from("provinsi")
      .select("*")
      .order("nama");
    
    if (!error && data) {
      setProvinsiList(data);
    }
  };

  const loadKotaList = async (provinsiId: number) => {
    const { data, error } = await supabase
      .from("kota")
      .select("*")
      .eq("provinsi_id", provinsiId)
      .order("nama");
    
    if (!error && data) {
      setKotaList(data);
    }
  };

  const handleProvinsiChange = (provinsiId: number) => {
    setSelectedProvinsi(provinsiId);
    setSelectedKota(null);
    setKotaList([]);
    if (provinsiId) {
      loadKotaList(provinsiId);
    }
  };

  const handleEdit = () => {
    setEditing(true);
  };

  // Handle photo file selection
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Hanya file gambar yang diperbolehkan');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran file maksimal 2MB');
      return;
    }

    setPhotoFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Upload photo to Supabase Storage
  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile) return null;

    try {
      setUploadingPhoto(true);
      const authUserId = profile?.user?.id;
      
      // Generate unique filename
      const fileExt = photoFile.name.split('.').pop();
      const fileName = `${authUserId}-${Date.now()}.${fileExt}`;
      const filePath = `${authUserId}/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, photoFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      console.error('Upload error:', error);
      alert('Gagal upload foto: ' + error.message);
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!confirm("Yakin ingin menghapus foto profil?")) return;

    try {
      setUploadingPhoto(true);
      
      const authUserId = profile?.user?.id;
      const { data: userData } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", authUserId)
        .single();

      if (!userData) throw new Error("User not found");

      // Update photo_profile to null
      const { error } = await supabase
        .from("users")
        .update({ 
          photo_profile: null,
          updated_at: new Date().toISOString() 
        })
        .eq("id", userData.id);

      if (error) throw error;

      setProfile((p: any) => ({
        ...p,
        photo_profile: null
      }));

      alert("Foto profil berhasil dihapus!");
    } catch (err: any) {
      console.error(err);
      alert("Gagal menghapus foto: " + err.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Save photo only
  const handleSavePhoto = async () => {
    if (!photoFile) return;

    try {
      const authUserId = profile?.user?.id;
      if (!authUserId) throw new Error("Auth user ID not found");

      const { data: userData } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", authUserId)
        .single();

      if (!userData) throw new Error("User not found");

      // Upload photo
      const photoUrl = await uploadPhoto();
      if (!photoUrl) return;

      // Update only photo_profile
      const { error } = await supabase
        .from("users")
        .update({ 
          photo_profile: photoUrl,
          updated_at: new Date().toISOString() 
        })
        .eq("id", userData.id);

      if (error) throw error;

      setProfile((p: any) => ({
        ...p,
        photo_profile: photoUrl
      }));

      // Reset photo upload states
      setPhotoFile(null);
      setPhotoPreview(null);

      alert("Foto profil berhasil diperbarui!");
    } catch (err: any) {
      console.error(err);
      alert("Gagal menyimpan foto: " + err.message);
    }
  };

    const handleSave = async () => {
    try {
      const authUserId = profile?.user?.id;
      if (!authUserId) throw new Error("Auth user ID not found");

      // Get users.user_id from auth_id
      const { data: userData } = await supabase
        .from("users")
        .select("id, user_id")
        .eq("auth_id", authUserId)
        .single();

      if (!userData?.user_id) throw new Error("User ID not found in users table");

      // Save username, nama_lengkap to users table (WITHOUT photo)
      const { error: userError } = await supabase
        .from("users")
        .update({ 
          username,
          nama_lengkap: fullName,
          updated_at: new Date().toISOString() 
        })
        .eq("id", userData.id);

      if (userError) throw userError;

      // Save to siswa table
      const siswaPayload = {
        user_id: userData.user_id,
        no_hp: phone,
        asal_sekolah: school,
        provinsi_id: selectedProvinsi,
        kota_id: selectedKota,
        updated_at: new Date().toISOString()
      };

      const { error: siswaError } = await supabase
        .from("siswa")
        .upsert(siswaPayload, { onConflict: 'user_id' });

      if (siswaError) throw siswaError;

      setProfile((p: any) => ({
        ...p,
        fullname: fullName,
        username,
        phone,
        school
      }));

      setEditing(false);
      alert("Profil berhasil disimpan!");
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Gagal menyimpan profil");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#E8F4F8] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2D5F7C] mx-auto mb-3"></div>
          <p className="text-[#2D5F7C] text-sm">Memuat profil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E8F4F8]">
      <Header userName={username || fullName || "User"} activeMenu="profile" variant="minimal" />

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Profil Akun</h2>
          <p className="text-sm text-gray-600">Kelola informasi akunmu dan preferensi pengguna.</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* Profile Picture */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative mb-3">
              {photoPreview ? (
                <img 
                  src={photoPreview} 
                  alt="Preview" 
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : profile?.photo_profile ? (
                <img 
                  src={profile.photo_profile} 
                  alt="Profile" 
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">
                    {(username || fullName)?.charAt(0)?.toUpperCase() || "U"}
                  </span>
                </div>
              )}
              
              {/* Edit button */}
              <input
                type="file"
                id="photo-upload"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <label
                htmlFor="photo-upload"
                className="absolute bottom-0 right-0 w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 cursor-pointer"
              >
                <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </label>
            </div>

            {/* Photo Action Buttons */}
            {photoPreview ? (
              // Show save/cancel when photo is selected
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setPhotoFile(null);
                    setPhotoPreview(null);
                  }}
                  className="text-xs px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Batal
                </button>
                <button
                  onClick={handleSavePhoto}
                  disabled={uploadingPhoto}
                  className="text-xs px-3 py-1.5 bg-[#2D5F7C] text-white rounded-lg hover:bg-[#234B61] transition disabled:bg-gray-400"
                >
                  {uploadingPhoto ? "Mengupload..." : "Simpan Foto"}
                </button>
              </div>
            ) : (
              // Show upload/delete when no preview
              <div className="flex items-center gap-2">
                {profile?.photo_profile && (
                  <>
                    <button
                      onClick={handleDeletePhoto}
                      disabled={uploadingPhoto}
                      className="text-xs text-red-600 hover:text-red-800 cursor-pointer disabled:text-gray-400"
                    >
                      Hapus Foto
                    </button>
                  </>
                )}
              </div>
            )}

            {uploadingPhoto && (
              <p className="text-xs text-blue-600 mt-1">Memproses...</p>
            )}
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Username & Nama Lengkap */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Username
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-gray-100 rounded-lg border-none focus:ring-2 focus:ring-blue-400 outline-none"
                    placeholder="username_unik"
                  />
                ) : (
                  <div className="w-full px-3 py-2 text-sm bg-gray-100 rounded-lg text-gray-800">
                    {username || "-"}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Nama Lengkap
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-gray-100 rounded-lg border-none focus:ring-2 focus:ring-blue-400 outline-none"
                    placeholder="Nama Lengkap Anda"
                  />
                ) : (
                  <div className="w-full px-3 py-2 text-sm bg-gray-100 rounded-lg text-gray-800">
                    {fullName || "-"}
                  </div>
                )}
              </div>
            </div>

            {/* Email & Nomor HP */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Email
                </label>
                <div className="w-full px-3 py-2 text-sm bg-gray-200 rounded-lg text-gray-500 cursor-not-allowed">
                  {profile?.email || "-"}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Nomor HP
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-gray-100 rounded-lg border-none focus:ring-2 focus:ring-blue-400 outline-none"
                    placeholder="+62 812-3456-7890"
                  />
                ) : (
                  <div className="w-full px-3 py-2 text-sm bg-gray-100 rounded-lg text-gray-800">
                    {phone || "-"}
                  </div>
                )}
              </div>
            </div>

            {/* Provinsi & Kota */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Provinsi
                </label>
                {editing ? (
                  <select
                    value={selectedProvinsi || ""}
                    onChange={(e) => handleProvinsiChange(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-gray-100 rounded-lg border-none focus:ring-2 focus:ring-blue-400 outline-none"
                  >
                    <option value="">Pilih Provinsi</option>
                    {provinsiList.map((prov) => (
                      <option key={prov.id} value={prov.id}>
                        {prov.nama}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full px-3 py-2 text-sm bg-gray-100 rounded-lg text-gray-800">
                    {provinsiList.find(p => p.id === selectedProvinsi)?.nama || "-"}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Kota/Kabupaten
                </label>
                {editing ? (
                  <select
                    value={selectedKota || ""}
                    onChange={(e) => setSelectedKota(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-gray-100 rounded-lg border-none focus:ring-2 focus:ring-blue-400 outline-none disabled:bg-gray-200"
                    disabled={!selectedProvinsi}
                  >
                    <option value="">
                      {selectedProvinsi ? "Pilih Kota/Kabupaten" : "Pilih provinsi dulu"}
                    </option>
                    {kotaList.map((kota) => (
                      <option key={kota.id} value={kota.id}>
                        {kota.nama}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full px-3 py-2 text-sm bg-gray-100 rounded-lg text-gray-800">
                    {kotaList.find(k => k.id === selectedKota)?.nama || "-"}
                  </div>
                )}
              </div>
            </div>

            {/* Asal Sekolah */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Asal Sekolah
              </label>
              {editing ? (
                <input
                  type="text"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-gray-100 rounded-lg border-none focus:ring-2 focus:ring-blue-400 outline-none"
                  placeholder="SMA Negeri 1 Jakarta"
                />
              ) : (
                <div className="w-full px-3 py-2 text-sm bg-gray-100 rounded-lg text-gray-800">
                  {school || "-"}
                </div>
              )}
            </div>

            {/* Action Button */}
            <div className="flex justify-start space-x-2 pt-3">
              {!editing ? (
                <button
                  onClick={handleEdit}
                  className="flex items-center space-x-1.5 bg-[#2D5F7C] hover:bg-[#234B61] text-white px-4 py-2 text-sm rounded-lg transition"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <span>Edit Profil</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setPhotoFile(null);
                      setPhotoPreview(null);
                    }}
                    className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={uploadingPhoto}
                    className="px-4 py-2 text-sm bg-[#2D5F7C] text-white rounded-lg hover:bg-[#234B61] transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {uploadingPhoto ? "Mengupload..." : "Simpan"}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Settings Section - sama seperti sebelumnya */}
          <div className="mt-6 pt-6 border-t">
            <h3 className="text-base font-bold text-gray-800 mb-3">Pengaturan Akun</h3>
            <div className="space-y-2">
              <button 
                onClick={() => setShowChangePasswordModal(true)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <h4 className="text-sm font-semibold text-gray-800">Ganti Password</h4>
                    <p className="text-xs text-gray-500">Ubah kata sandi akun Anda</p>
                  </div>
                </div>
              </button>

              <button 
                onClick={() => setShowDeleteAccountModal(true)}
                className="w-full flex items-center justify-between p-3 bg-red-50 rounded-lg hover:bg-red-100 transition"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <h4 className="text-sm font-semibold text-red-600">Hapus Akun</h4>
                    <p className="text-xs text-red-500">Hapus akun secara permanen</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-8">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-2">
            <p className="text-xs text-gray-600">
              © 2025 Kelas Kampus. Semua hak cipta dilindungi.
            </p>
            <div className="flex space-x-4 text-xs text-gray-600">
              <a href="#" className="hover:text-gray-800">Bantuan</a>
              <a href="#" className="hover:text-gray-800">Kebijakan Privasi</a>
              <a href="#" className="hover:text-gray-800">Syarat Layanan</a>
              <a href="#" className="hover:text-gray-800">Kontak</a>
            </div>
          </div>
        </div>
      </footer>
      <ChangePasswordModal 
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      />
      
      <DeleteAccountModal 
        isOpen={showDeleteAccountModal}
        onClose={() => setShowDeleteAccountModal(false)}
      />
    </div>
  );
}
