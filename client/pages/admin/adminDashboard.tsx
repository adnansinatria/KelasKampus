import { Users, Sprout, CreditCard, TrendingUp, Clock, Plus } from "lucide-react";
import { Link } from "react-router-dom";

export default function Index() {

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
              <a href="/admin" className="text-sm font-medium text-[#295782] hover:text-[#295782]/80 transition-colors">Dashboard</a>
              <a href="#" className="text-sm font-medium text-[#64748B] hover:text-[#295782] transition-colors">Pengguna</a>
              <Link to="/admin-tryout" 
              className="text-sm font-medium text-[#64748B] hover:text-[#295782] transition-colors"
              > Tryout
              </Link>
              <a href="#" className="text-sm font-medium text-[#64748B] hover:text-[#295782] transition-colors">Transaksi</a>
              <a href="#" className="text-sm font-medium text-[#64748B] hover:text-[#295782] transition-colors">Pengaturan</a>
            </nav>

            {/* Mobile Navigation - showing only on small screens */}
            <nav className="flex md:hidden items-center gap-4 text-xs">
              <a href="/" className="font-medium text-[#295782]">Dashboard</a>
              <a href="#" className="font-medium text-[#64748B]">Pengguna</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-[1363px] mx-auto px-4 md:px-6 py-4">
        {/* Dashboard Title */}
        <div className="mb-4">
          <h1 className="text-xl md:text-2xl font-bold text-[#1E293B] mb-1">Dashboard Utama</h1>
          <p className="text-sm text-[#64748B]">Pantau aktivitas platform dan performa tryout di seluruh pengguna.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Card 1 */}
          <div className="bg-white rounded-[14px] shadow-sm p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-[#64748B] mb-1">Total Pengguna Aktif</p>
                <p className="text-lg font-bold text-[#1E293B]">12.340</p>
              </div>
              <div className="w-8 h-8 rounded-[10px] bg-[#295782] flex items-center justify-center">
                <Users className="w-4 h-4 text-white" strokeWidth={1.33} />
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-[14px] shadow-sm p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-[#64748B] mb-1">Tryout Aktif Saat Ini</p>
                <p className="text-lg font-bold text-[#1E293B]">56</p>
              </div>
              <div className="w-8 h-8 rounded-[10px] bg-[#295782] flex items-center justify-center">
                <Sprout className="w-4 h-4 text-white" strokeWidth={1.33} />
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-[14px] shadow-sm p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-[#64748B] mb-1">Transaksi Bulan Ini</p>
                <p className="text-lg font-bold text-[#1E293B]">Rp 15.200.000</p>
              </div>
              <div className="w-8 h-8 rounded-[10px] bg-[#295782] flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-white" strokeWidth={1.33} />
              </div>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white rounded-[14px] shadow-sm p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-[#64748B] mb-1">Pendapatan Total</p>
                <p className="text-lg font-bold text-[#1E293B]">Rp 245.600.000</p>
              </div>
              <div className="w-8 h-8 rounded-[10px] bg-[#295782] flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" strokeWidth={1.33} />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Line Chart */}
          <div className="bg-white rounded-[14px] shadow-sm p-4">
            <div className="mb-3">
              <h3 className="text-lg font-bold text-[#1E293B] mb-0.5">Grafik Aktivitas Tryout</h3>
              <p className="text-xs text-[#6B7280]">Partisipasi mingguan (7 hari terakhir)</p>
            </div>
            <div className="h-40 relative">
              <svg className="w-full h-full" viewBox="0 0 618 161" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M64.9473 125.963H612.504" stroke="#E5E7EB" strokeDasharray="3 3"/>
                <path d="M64.9473 95.9625H612.504" stroke="#E5E7EB" strokeDasharray="3 3"/>
                <path d="M64.9473 65.9625H612.504" stroke="#E5E7EB" strokeDasharray="3 3"/>
                <path d="M64.9473 35.9625H612.504" stroke="#E5E7EB" strokeDasharray="3 3"/>
                <path d="M64.9473 5.96251H612.504" stroke="#E5E7EB" strokeDasharray="3 3"/>
                <path d="M64.9473 5.96251V125.963" stroke="#E5E7EB" strokeDasharray="3 3"/>
                <path d="M156.207 5.96251V125.963" stroke="#E5E7EB" strokeDasharray="3 3"/>
                <path d="M247.466 5.96251V125.963" stroke="#E5E7EB" strokeDasharray="3 3"/>
                <path d="M338.726 5.96251V125.963" stroke="#E5E7EB" strokeDasharray="3 3"/>
                <path d="M429.985 5.96251V125.963" stroke="#E5E7EB" strokeDasharray="3 3"/>
                <path d="M521.244 5.96251V125.963" stroke="#E5E7EB" strokeDasharray="3 3"/>
                <path d="M612.504 5.96251V125.963" stroke="#E5E7EB" strokeDasharray="3 3"/>
                <text fill="#6B7280" xmlSpace="preserve" style={{whiteSpace: 'pre'}} fontFamily="Montserrat" fontSize="10"><tspan x="55.924" y="140.699">Sen</tspan></text>
                <text fill="#6B7280" xmlSpace="preserve" style={{whiteSpace: 'pre'}} fontFamily="Montserrat" fontSize="10"><tspan x="148.922" y="140.699">Sel</tspan></text>
                <text fill="#6B7280" xmlSpace="preserve" style={{whiteSpace: 'pre'}} fontFamily="Montserrat" fontSize="10"><tspan x="238.345" y="140.699">Rab</tspan></text>
                <text fill="#6B7280" xmlSpace="preserve" style={{whiteSpace: 'pre'}} fontFamily="Montserrat" fontSize="10"><tspan x="328.301" y="140.699">Kam</tspan></text>
                <text fill="#6B7280" xmlSpace="preserve" style={{whiteSpace: 'pre'}} fontFamily="Montserrat" fontSize="10"><tspan x="420.019" y="140.699">Jum</tspan></text>
                <text fill="#6B7280" xmlSpace="preserve" style={{whiteSpace: 'pre'}} fontFamily="Montserrat" fontSize="10"><tspan x="512.133" y="140.699">Sab</tspan></text>
                <text fill="#6B7280" xmlSpace="preserve" style={{whiteSpace: 'pre'}} fontFamily="Montserrat" fontSize="10"><tspan x="600.416" y="140.699">Min</tspan></text>
                <text fill="#6B7280" xmlSpace="preserve" style={{whiteSpace: 'pre'}} fontFamily="Montserrat" fontSize="10"><tspan x="50.7043" y="129.149">0</tspan></text>
                <text fill="#6B7280" xmlSpace="preserve" style={{whiteSpace: 'pre'}} fontFamily="Montserrat" fontSize="10"><tspan x="38.0872" y="99.1489">300</tspan></text>
                <text fill="#6B7280" xmlSpace="preserve" style={{whiteSpace: 'pre'}} fontFamily="Montserrat" fontSize="10"><tspan x="38.2141" y="69.1489">600</tspan></text>
                <text fill="#6B7280" xmlSpace="preserve" style={{whiteSpace: 'pre'}} fontFamily="Montserrat" fontSize="10"><tspan x="38.2141" y="39.1489">900</tspan></text>
                <text fill="#6B7280" xmlSpace="preserve" style={{whiteSpace: 'pre'}} fontFamily="Montserrat" fontSize="10"><tspan x="33.7511" y="11.6489">1200</tspan></text>
                <path d="M64.9482 83.9625C95.3676 78.4625 125.788 72.9625 156.207 67.9625C186.628 62.9625 217.047 53.9625 247.467 53.9625C277.887 53.9625 308.307 60.9625 338.727 60.9625C369.146 60.9625 399.566 46.1295 429.986 36.9625C460.406 27.7955 490.825 5.96251 521.246 5.96251C551.665 5.96251 582.086 18.4625 612.505 30.9625" stroke="#295782" strokeWidth="2"/>
                <circle cx="64.9478" cy="83.9625" r="3" fill="#155EEF" stroke="#155EEF" strokeWidth="2"/>
                <circle cx="156.208" cy="67.9625" r="3" fill="#155EEF" stroke="#155EEF" strokeWidth="2"/>
                <circle cx="247.466" cy="53.9625" r="3" fill="#155EEF" stroke="#155EEF" strokeWidth="2"/>
                <circle cx="338.726" cy="60.9625" r="3" fill="#155EEF" stroke="#155EEF" strokeWidth="2"/>
                <circle cx="429.986" cy="36.9625" r="3" fill="#155EEF" stroke="#155EEF" strokeWidth="2"/>
                <circle cx="521.245" cy="5.96251" r="3" fill="#155EEF" stroke="#155EEF" strokeWidth="2"/>
                <circle cx="612.504" cy="30.9625" r="3" fill="#155EEF" stroke="#155EEF" strokeWidth="2"/>
              </svg>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="bg-white rounded-[14px] shadow-sm p-4">
            <div className="mb-3">
              <h3 className="text-lg font-bold text-[#1E293B] mb-0.5">Grafik Pendapatan Bulanan</h3>
              <p className="text-xs text-[#6B7280]">Trend pendapatan 6 bulan terakhir</p>
            </div>
            <div className="h-40 relative">
              <svg className="w-full h-full" viewBox="0 0 618 161" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M65.4473 125.963H613.004" stroke="#E5E7EB" strokeDasharray="3 3"/>
                <path d="M65.4473 95.9625H613.004" stroke="#E5E7EB" strokeDasharray="3 3"/>
                <path d="M65.4473 65.9625H613.004" stroke="#E5E7EB" strokeDasharray="3 3"/>
                <path d="M65.4473 35.9625H613.004" stroke="#E5E7EB" strokeDasharray="3 3"/>
                <path d="M65.4473 5.96251H613.004" stroke="#E5E7EB" strokeDasharray="3 3"/>
                <path d="M111.077 5.96251V125.963" stroke="#E5E7EB" strokeDasharray="3 3"/>
                <path d="M202.336 5.96251V125.963" stroke="#E5E7EB" strokeDasharray="3 3"/>
                <path d="M293.596 5.96251V125.963" stroke="#E5E7EB" strokeDasharray="3 3"/>
                <path d="M384.855 5.96251V125.963" stroke="#E5E7EB" strokeDasharray="3 3"/>
                <path d="M476.115 5.96251V125.963" stroke="#E5E7EB" strokeDasharray="3 3"/>
                <path d="M567.374 5.96251V125.963" stroke="#E5E7EB" strokeDasharray="3 3"/>
                <path d="M65.4473 5.96251V125.963" stroke="#E5E7EB" strokeDasharray="3 3"/>
                <path d="M613.004 5.96251V125.963" stroke="#E5E7EB" strokeDasharray="3 3"/>
                <text fill="#6B7280" xmlSpace="preserve" style={{whiteSpace: 'pre'}} fontFamily="Montserrat" fontSize="10"><tspan x="102.62" y="140.699">Jan</tspan></text>
                <text fill="#6B7280" xmlSpace="preserve" style={{whiteSpace: 'pre'}} fontFamily="Montserrat" fontSize="10"><tspan x="193.586" y="140.699">Feb</tspan></text>
                <text fill="#6B7280" xmlSpace="preserve" style={{whiteSpace: 'pre'}} fontFamily="Montserrat" fontSize="10"><tspan x="284.47" y="140.699">Mar</tspan></text>
                <text fill="#6B7280" xmlSpace="preserve" style={{whiteSpace: 'pre'}} fontFamily="Montserrat" fontSize="10"><tspan x="376.569" y="140.699">Apr</tspan></text>
                <text fill="#6B7280" xmlSpace="preserve" style={{whiteSpace: 'pre'}} fontFamily="Montserrat" fontSize="10"><tspan x="466.164" y="140.699">May</tspan></text>
                <text fill="#6B7280" xmlSpace="preserve" style={{whiteSpace: 'pre'}} fontFamily="Montserrat" fontSize="10"><tspan x="558.83" y="140.699">Jun</tspan></text>
                <text fill="#6B7280" xmlSpace="preserve" style={{whiteSpace: 'pre'}} fontFamily="Montserrat" fontSize="10"><tspan x="42.3074" y="129.149">0M</tspan></text>
                <text fill="#6B7280" xmlSpace="preserve" style={{whiteSpace: 'pre'}} fontFamily="Montserrat" fontSize="10"><tspan x="33.9288" y="99.1489">8.5M</tspan></text>
                <text fill="#6B7280" xmlSpace="preserve" style={{whiteSpace: 'pre'}} fontFamily="Montserrat" fontSize="10"><tspan x="38.1967" y="69.1489">17M</tspan></text>
                <text fill="#6B7280" xmlSpace="preserve" style={{whiteSpace: 'pre'}} fontFamily="Montserrat" fontSize="10"><tspan x="28.0011" y="39.1489">25.5M</tspan></text>
                <text fill="#6B7280" xmlSpace="preserve" style={{whiteSpace: 'pre'}} fontFamily="Montserrat" fontSize="10"><tspan x="35.7742" y="11.6489">34M</tspan></text>
                <rect x="74.5732" y="60.6684" width="73" height="65.2946" rx="3" fill="#295782"/>
                <rect x="165.833" y="48.3155" width="73" height="77.6475" rx="3" fill="#295782"/>
                <rect x="257.092" y="56.0802" width="73" height="69.8828" rx="3" fill="#295782"/>
                <rect x="348.352" y="37.0213" width="73" height="88.9417" rx="3" fill="#295782"/>
                <rect x="439.611" y="25.0213" width="73" height="100.942" rx="3" fill="#295782"/>
                <rect x="530.87" y="11.6096" width="73" height="114.353" rx="3" fill="#295782"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Activity and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent Activity */}
          <div className="bg-white rounded-[14px] shadow-sm p-4">
            <h3 className="text-lg font-bold text-[#1E293B] mb-3">Aktivitas Terbaru</h3>
            <div className="space-y-2">
              {/* Activity 1 */}
              <div className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="w-6 h-6 rounded-lg bg-[#DBEAFE] flex items-center justify-center flex-shrink-0">
                  <Users className="w-3 h-3 text-[#155DFC]" strokeWidth={1} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#1E293B] leading-tight">User JakkHere baru menyelesaikan Tryout UTBK 2024</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock className="w-2.5 h-2.5 text-[#64748B]" strokeWidth={0.83} />
                    <span className="text-xs text-[#64748B]">2 jam lalu</span>
                  </div>
                </div>
              </div>

              {/* Activity 2 */}
              <div className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="w-6 h-6 rounded-lg bg-[#DCFCE7] flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-3 h-3 text-[#00A63E]" strokeWidth={1} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#1E293B] leading-tight">Pembelian paket Juara Kampus berhasil</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock className="w-2.5 h-2.5 text-[#64748B]" strokeWidth={0.83} />
                    <span className="text-xs text-[#64748B]">4 jam lalu</span>
                  </div>
                </div>
              </div>

              {/* Activity 3 */}
              <div className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="w-6 h-6 rounded-lg bg-[#F3E8FF] flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-[#9810FA]" viewBox="0 0 12 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 4.43747V11.4375" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M1.5 9.93747C1.36739 9.93747 1.24021 9.88479 1.14645 9.79102C1.05268 9.69726 1 9.57008 1 9.43747V2.93747C1 2.80486 1.05268 2.67768 1.14645 2.58392C1.24021 2.49015 1.36739 2.43747 1.5 2.43747H4C4.53043 2.43747 5.03914 2.64818 5.41421 3.02326C5.78929 3.39833 6 3.90704 6 4.43747C6 3.90704 6.21071 3.39833 6.58579 3.02326C6.96086 2.64818 7.46957 2.43747 8 2.43747H10.5C10.6326 2.43747 10.7598 2.49015 10.8536 2.58392C10.9473 2.67768 11 2.80486 11 2.93747V9.43747C11 9.57008 10.9473 9.69726 10.8536 9.79102C10.7598 9.88479 10.6326 9.93747 10.5 9.93747H7.5C7.10218 9.93747 6.72064 10.0955 6.43934 10.3768C6.15804 10.6581 6 11.0396 6 11.4375C6 11.0396 5.84196 10.6581 5.56066 10.3768C5.27936 10.0955 4.89782 9.93747 4.5 9.93747H1.5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#1E293B] leading-tight">Tryout baru ditambahkan: Literasi Bahasa Indonesia</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock className="w-2.5 h-2.5 text-[#64748B]" strokeWidth={0.83} />
                    <span className="text-xs text-[#64748B]">6 jam lalu</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-[14px] shadow-sm p-4">
            <h3 className="text-lg font-bold text-[#1E293B] mb-4">Aksi Cepat</h3>
            <div className="space-y-3">
              <button className="w-full bg-[#295782] text-white rounded-lg py-2.5 px-4 flex items-center justify-center gap-4 hover:bg-[#295782]/90 transition-colors text-sm font-medium">
                <Plus className="w-4 h-4" strokeWidth={1.33} />
                Tambah Tryout Baru
              </button>
              <button className="w-full bg-[#295782] text-white rounded-lg py-2.5 px-4 flex items-center justify-center gap-4 hover:bg-[#295782]/90 transition-colors text-sm font-medium">
                <Plus className="w-4 h-4" strokeWidth={1.33} />
                Tambah Paket Premium
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
