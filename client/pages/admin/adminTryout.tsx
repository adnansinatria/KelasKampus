import { Search, ChevronDown, Eye, Edit2, Trash2, FileText, Upload } from "lucide-react";
import { Link } from "react-router-dom";

export default function Tryout() {
  // 🔹 PERUBAHAN: Properti terkait kategori dihapus dari data
  const tryouts = [
    {
      name: "Tryout SNBT 2025 #1",
      email: "ahmad.rizky@email.com",
      soal: 50,
      status: "Aktif",
      statusBg: "#DCFCE7",
      statusColor: "#016630",
      jadwal: "15 Des 2024",
    },
    {
      name: "Tryout SNBT 2025 #2",
      email: "siti.nurhaliza@email.com",
      soal: 50,
      status: "Aktif",
      statusBg: "#DCFCE7",
      statusColor: "#016630",
      jadwal: "12 Des 2024",
    },
    {
      name: "Tryout SNBT 2025 #5",
      email: "budi.santoso@email.com",
      soal: 50,
      status: "Nonaktif",
      statusBg: "#F3F4F6",
      statusColor: "#4A5565",
      jadwal: "10 Des 2024",
    },
    {
      name: "Tryout UTBK 2025 #6",
      email: "maya.sari@email.com",
      soal: 50,
      status: "Aktif",
      statusBg: "#DCFCE7",
      statusColor: "#016630",
      jadwal: "8 Des 2024",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E6F3FF] via-[#F0F7FF] to-[#F8FBFF]">
      {/* Header */}
      <header className="bg-white/95 border-b border-gray-200">
        <div className="max-w-[1363px] mx-auto px-12">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-b from-[#89B0C7] to-[#89B1C7] shadow-lg flex items-center justify-center flex-shrink-0">
                <img
                  src="https://api.builder.io/api/v1/image/assets/TEMP/0718bd4f94bf824464459174b94b8323644342a4?width=112"
                  alt="Kelas Kampus"
                  className="w-12 h-12 md:w-14 md:h-14 rounded-full"
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm md:text-base font-bold text-[#1D293D] leading-5 md:leading-6 truncate">Kelas Kampus</h1>
                <p className="text-xs text-[#62748E] leading-4 truncate">Tryout Indonesia</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <a href="/admin" className="text-sm font-medium text-[#64748B] hover:text-[#295782] transition-colors">Dashboard</a>
              <a href="#" className="text-sm font-medium text-[#64748B] hover:text-[#295782] transition-colors">Pengguna</a>
              <a href="/admin-tryout" className="text-sm font-medium text-[#295782] hover:text-[#295782]/80 transition-colors">Tryout</a>
              <a href="#" className="text-sm font-medium text-[#64748B] hover:text-[#295782] transition-colors">Transaksi</a>
              <a href="#" className="text-sm font-medium text-[#64748B] hover:text-[#295782] transition-colors">Pengaturan</a>
            </nav>

            {/* Mobile Navigation */}
            <nav className="flex md:hidden items-center gap-4 text-xs">
              <a href="/" className="font-medium text-[#64748B]">Dashboard</a>
              <a href="/tryout" className="font-medium text-[#295782]">Tryout</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-[1363px] mx-auto px-4 md:px-6 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#1E293B] mb-2">Manajemen Tryout</h1>
          <p className="text-sm text-[#64748B]">Kelola akun pengguna, status, dan aktivitas mereka.</p>
        </div>

        {/* Filter & Search Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex flex-wrap gap-4 flex-1">
              {/* 🔹 PERUBAHAN: Dropdown Kategori dihapus */}

              {/* Status Dropdown */}
              <button className="flex items-center justify-between gap-2 px-3 h-9 rounded-xl border border-gray-200 bg-[#F3F3F5] hover:bg-gray-100 transition-colors min-w-[150px]">
                <span className="text-sm text-[#717182]">Status</span>
                <ChevronDown className="w-4 h-4 text-[#717182] opacity-50" />
              </button>

              {/* Urutkan Dropdown */}
              <button className="flex items-center justify-between gap-2 px-3 h-9 rounded-xl border border-gray-200 bg-[#F3F3F5] hover:bg-gray-100 transition-colors min-w-[150px]">
                <span className="text-sm text-[#717182]">Urutkan</span>
                <ChevronDown className="w-4 h-4 text-[#717182] opacity-50" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-[400px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#99A1AF]" />
              <input
                type="text"
                placeholder="Cari tryout berdasarkan judul"
                className="w-full h-10 pl-10 pr-3 rounded-xl border border-gray-200 bg-[#F3F3F5] text-sm text-[#717182] placeholder:text-[#717182] focus:outline-none focus:ring-2 focus:ring-[#295782] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-8">
          {/* Table - Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-4 text-left text-sm font-medium text-[#1E293B]">Nama Tryout</th>
                  <th className="px-4 py-4 text-left text-sm font-medium text-[#1E293B]">Jumlah Soal</th>
                  {/* 🔹 PERUBAHAN: Header Kategori dihapus */}
                  <th className="px-4 py-4 text-left text-sm font-medium text-[#1E293B]">Status</th>
                  <th className="px-4 py-4 text-left text-sm font-medium text-[#1E293B]">Jadwal Ujian</th>
                  <th className="px-4 py-4 text-left text-sm font-medium text-[#1E293B]">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {tryouts.map((tryout, index) => (
                  <tr key={index} className={`border-b border-gray-100 ${index % 2 === 1 ? 'bg-[#F9FBFF]' : 'bg-white'}`}>
                    <td className="px-4 py-5">
                      <div>
                        <p className="text-sm font-bold text-[#1E293B]">{tryout.name}</p>
                        <p className="text-xs text-[#64748B]">{tryout.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-5">
                      <p className="text-sm text-[#1E293B]">{tryout.soal}</p>
                    </td>
                    {/* 🔹 PERUBAHAN: Kolom Kategori dihapus */}
                    <td className="px-4 py-5">
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-normal"
                        style={{
                          backgroundColor: tryout.statusBg,
                          color: tryout.statusColor
                        }}
                      >
                        {tryout.status}
                      </span>
                    </td>
                    <td className="px-4 py-5">
                      <p className="text-sm text-[#64748B]">{tryout.jadwal}</p>
                    </td>
                    <td className="px-4 py-5">
                      <div className="flex items-center gap-2">
                        <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
                          <Eye className="w-4 h-4 text-[#155EEF]" strokeWidth={1.33} />
                        </button>
                        <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
                          <Edit2 className="w-4 h-4 text-[#155EEF]" strokeWidth={1.33} />
                        </button>
                        <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
                          <Trash2 className="w-4 h-4 text-[#FB2C36]" strokeWidth={1.33} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table - Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {tryouts.map((tryout, index) => (
              <div key={index} className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-[#1E293B] mb-1">{tryout.name}</p>
                    <p className="text-xs text-[#64748B]">{tryout.email}</p>
                  </div>
                  <div className="flex gap-2 ml-2">
                    <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
                      <Eye className="w-4 h-4 text-[#155EEF]" />
                    </button>
                    <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
                      <Edit2 className="w-4 h-4 text-[#155EEF]" />
                    </button>
                    <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
                      <Trash2 className="w-4 h-4 text-[#FB2C36]" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[#64748B]">Soal: </span>
                    <span className="text-[#1E293B] font-medium">{tryout.soal}</span>
                  </div>
                  <div>
                    <span className="text-[#64748B]">Jadwal: </span>
                    <span className="text-[#64748B]">{tryout.jadwal}</span>
                  </div>
                  <div className="col-span-2 flex gap-2 mt-1">
                    {/* 🔹 PERUBAHAN: Badge Kategori dihapus */}
                    <span
                      className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs"
                      style={{
                        backgroundColor: tryout.statusBg,
                        color: tryout.statusColor
                      }}
                    >
                      {tryout.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 border-t border-gray-200">
            <p className="text-xs text-[#64748B]">Menampilkan xx dari xxx tryout</p>
            <div className="flex items-center gap-2">
              <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
                <ChevronDown className="w-4 h-4 rotate-90 text-gray-400" />
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#155EEF] bg-[#155EEF] text-white text-sm">1</button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm transition-colors">2</button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm transition-colors">3</button>
              <span className="text-[#64748B] px-2">...</span>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
                <ChevronDown className="w-4 h-4 -rotate-90 text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-[#1E293B] mb-1">Upload soal tryout</h3>
              <p className="text-sm text-[#64748B]">Unggah soal baru secara manual atau melalui file CSV.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <Link
                to="/admin-tryout/new"
                className="flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-gray-200 bg-[#64748B] text-white hover:bg-[#64748B]/90 transition-colors text-xs"
              >
                <FileText className="w-4 h-4" strokeWidth={1.33} />
                Upload Manual
              </Link>
              <Link
                to="/admin-tryout/import"
                className="flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg bg-[#295782] text-white hover:bg-[#295782]/90 transition-colors text-xs"
              >
                <Upload className="w-4 h-4" strokeWidth={1.33} />
                Import CSV
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}