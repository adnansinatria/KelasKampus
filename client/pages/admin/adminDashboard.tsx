// src/pages/admin/adminDashboard.tsx
import { Users, Sprout, CreditCard, TrendingUp, Clock, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

interface DashboardStats {
  totalUsers: number;
  activeTryouts: number;
  monthlyRevenue: number;
  totalRevenue: number;
}

interface Activity {
  id: string;
  type: 'user' | 'transaction' | 'tryout' | 'session';
  message: string;
  timestamp: string;
  iconBg: string;
  iconColor: string;
}

interface ChartData {
  day: string;
  value: number;
}

interface MonthlyData {
  month: string;
  value: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeTryouts: 0,
    monthlyRevenue: 0,
    totalRevenue: 0,
  });

  const [activities, setActivities] = useState<Activity[]>([]);
  const [weeklyData, setWeeklyData] = useState<ChartData[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [hoveredWeekIndex, setHoveredWeekIndex] = useState<number | null>(null);
  const [hoveredMonthIndex, setHoveredMonthIndex] = useState<number | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([
        fetchStats(),
        fetchActivities(),
        fetchWeeklyData(),
        fetchMonthlyData(),
      ]);
    } catch (error) {
      console.error("Dashboard load error:", error);
      toast.error("Gagal memuat data dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // ✅ Only count students (exclude admin)
      const { count: totalUsers } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .neq("role", "admin");

      const { count: activeTryouts } = await supabase
        .from("tryouts")
        .select("*", { count: "exact", head: true });

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const { data: monthlyTransactions } = await supabase
        .from("transactions")
        .select("amount")
        .eq("status", "success")
        .gte("created_at", startOfMonth)
        .lte("created_at", endOfMonth);

      const monthlyRevenue = monthlyTransactions?.reduce((sum, t) => sum + t.amount, 0) || 0;

      const { data: allTransactions } = await supabase
        .from("transactions")
        .select("amount")
        .eq("status", "success");

      const totalRevenue = allTransactions?.reduce((sum, t) => sum + t.amount, 0) || 0;

      setStats({
        totalUsers: totalUsers || 0,
        activeTryouts: activeTryouts || 0,
        monthlyRevenue,
        totalRevenue,
      });
    } catch (error) {
      console.error("Fetch stats error:", error);
    }
  };

  const fetchWeeklyData = async () => {
    try {
      const days = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
      const weekData: ChartData[] = [];

      const today = new Date();
      const currentDayOfWeek = today.getDay();
      const daysBackToMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;

      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - daysBackToMonday + i);
        const startOfDay = new Date(date.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(date.setHours(23, 59, 59, 999)).toISOString();

        const { count } = await supabase
          .from("tryout_sessions")
          .select("*", { count: "exact", head: true })
          .gte("created_at", startOfDay)
          .lte("created_at", endOfDay);

        weekData.push({
          day: days[i],
          value: count || 0,
        });
      }

      setWeeklyData(weekData);
    } catch (error) {
      console.error("Fetch weekly data error:", error);
    }
  };

  const fetchMonthlyData = async () => {
    try {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthData: MonthlyData[] = [];

      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).toISOString();

        const { data: transactions } = await supabase
          .from("transactions")
          .select("amount")
          .eq("status", "success")
          .gte("created_at", startOfMonth)
          .lte("created_at", endOfMonth);

        const revenue = transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;

        monthData.push({
          month: months[date.getMonth()],
          value: revenue,
        });
      }

      setMonthlyData(monthData);
    } catch (error) {
      console.error("Fetch monthly data error:", error);
    }
  };

  const fetchActivities = async () => {
    try {
      const activityList: Activity[] = [];

      const { data: recentUsers } = await supabase
        .from("users")
        .select("nama_lengkap, created_at")
        .order("created_at", { ascending: false })
        .limit(2);

      recentUsers?.forEach((user) => {
        activityList.push({
          id: `user-${user.created_at}`,
          type: "user",
          message: `User ${user.nama_lengkap} baru bergabung`,
          timestamp: getRelativeTime(user.created_at),
          iconBg: "bg-[#DBEAFE]",
          iconColor: "text-[#155DFC]",
        });
      });

      const { data: recentTransactions } = await supabase
        .from("transactions")
        .select(`
          created_at,
          users:user_id (nama_lengkap),
          packages:package_id (name)
        `)
        .eq("status", "success")
        .order("created_at", { ascending: false })
        .limit(2);

      recentTransactions?.forEach((transaction: any) => {
        activityList.push({
          id: `transaction-${transaction.created_at}`,
          type: "transaction",
          message: `${transaction.users?.nama_lengkap || "User"} membeli paket ${transaction.packages?.name || "Premium"}`,
          timestamp: getRelativeTime(transaction.created_at),
          iconBg: "bg-[#DCFCE7]",
          iconColor: "text-[#00A63E]",
        });
      });

      const { data: recentTryouts } = await supabase
        .from("tryouts")
        .select("title, created_at")
        .order("created_at", { ascending: false })
        .limit(1);

      recentTryouts?.forEach((tryout) => {
        activityList.push({
          id: `tryout-${tryout.created_at}`,
          type: "tryout",
          message: `Tryout baru ditambahkan: ${tryout.title}`,
          timestamp: getRelativeTime(tryout.created_at),
          iconBg: "bg-[#F3E8FF]",
          iconColor: "text-[#9810FA]",
        });
      });

      const { data: recentSessions } = await supabase
        .from("tryout_sessions")
        .select(`
          created_at,
          users:user_id (nama_lengkap),
          tryouts:tryout_id (title)
        `)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(2);

      recentSessions?.forEach((session: any) => {
        activityList.push({
          id: `session-${session.created_at}`,
          type: "session",
          message: `${session.users?.nama_lengkap || "User"} menyelesaikan ${session.tryouts?.title || "Tryout"}`,
          timestamp: getRelativeTime(session.created_at),
          iconBg: "bg-[#FEF3C7]",
          iconColor: "text-[#D97706]",
        });
      });

      activityList.sort((a, b) => parseRelativeTime(a.timestamp) - parseRelativeTime(b.timestamp));
      setActivities(activityList.slice(0, 5));
    } catch (error) {
      console.error("Fetch activities error:", error);
    }
  };

  const getRelativeTime = (dateStr: string): string => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInHours < 1) return "Baru saja";
    if (diffInHours < 24) return `${diffInHours} jam lalu`;
    if (diffInDays < 7) return `${diffInDays} hari lalu`;
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  };

  const parseRelativeTime = (timeStr: string): number => {
    if (timeStr === "Baru saja") return 0;
    const match = timeStr.match(/(\d+)\s+(jam|hari)/);
    if (match) {
      const value = parseInt(match[1]);
      return match[2] === "jam" ? value : value * 24;
    }
    return 999;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("id-ID").format(num);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#295782]"></div>
        </div>
      </AdminLayout>
    );
  }

  const maxWeekly = Math.max(...weeklyData.map(d => d.value), 1);
  const maxMonthly = Math.max(...monthlyData.map(d => d.value), 1);

  // ✅ Helper function untuk format Y-axis
  const formatYAxis = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${Math.round(value / 1000)}K`;
    return Math.round(value).toString();
  };

  return (
    <AdminLayout>
      <div className="max-w-[1363px] mx-auto px-4 md:px-6 py-4">
        {/* Dashboard Title */}
        <div className="mb-4">
          <h1 className="text-xl md:text-2xl font-bold text-[#1E293B] mb-1">Dashboard Utama</h1>
          <p className="text-sm text-[#64748B]">Pantau aktivitas platform dan performa tryout di seluruh pengguna.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="bg-white rounded-[14px] shadow-sm p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-[#64748B] mb-1">Total Pengguna Aktif</p>
                <p className="text-lg font-bold text-[#1E293B]">{formatNumber(stats.totalUsers)}</p>
              </div>
              <div className="w-8 h-8 rounded-[10px] bg-[#295782] flex items-center justify-center">
                <Users className="w-4 h-4 text-white" strokeWidth={1.33} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[14px] shadow-sm p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-[#64748B] mb-1">Tryout Aktif Saat Ini</p>
                <p className="text-lg font-bold text-[#1E293B]">{stats.activeTryouts}</p>
              </div>
              <div className="w-8 h-8 rounded-[10px] bg-[#295782] flex items-center justify-center">
                <Sprout className="w-4 h-4 text-white" strokeWidth={1.33} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[14px] shadow-sm p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-[#64748B] mb-1">Transaksi Bulan Ini</p>
                <p className="text-lg font-bold text-[#1E293B]">{formatPrice(stats.monthlyRevenue)}</p>
              </div>
              <div className="w-8 h-8 rounded-[10px] bg-[#295782] flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-white" strokeWidth={1.33} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[14px] shadow-sm p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-[#64748B] mb-1">Pendapatan Total</p>
                <p className="text-lg font-bold text-[#1E293B]">{formatPrice(stats.totalRevenue)}</p>
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
              <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-[10px] text-[#6B7280] pr-2">
                <span>1200</span>
                <span>900</span>
                <span>600</span>
                <span>300</span>
                <span>0</span>
              </div>
              
              <div className="ml-8 h-full relative">
                <svg className="w-full h-[calc(100%-24px)]" viewBox="0 0 100 80" preserveAspectRatio="none">
                  <line x1="0" y1="0" x2="100" y2="0" stroke="#E5E7EB" strokeWidth="0.5" strokeDasharray="3,3" vectorEffect="non-scaling-stroke"/>
                  <line x1="0" y1="20" x2="100" y2="20" stroke="#E5E7EB" strokeWidth="0.5" strokeDasharray="3,3" vectorEffect="non-scaling-stroke"/>
                  <line x1="0" y1="40" x2="100" y2="40" stroke="#E5E7EB" strokeWidth="0.5" strokeDasharray="3,3" vectorEffect="non-scaling-stroke"/>
                  <line x1="0" y1="60" x2="100" y2="60" stroke="#E5E7EB" strokeWidth="0.5" strokeDasharray="3,3" vectorEffect="non-scaling-stroke"/>
                  <line x1="0" y1="80" x2="100" y2="80" stroke="#E5E7EB" strokeWidth="0.5" strokeDasharray="3,3" vectorEffect="non-scaling-stroke"/>

                  {weeklyData.map((_, idx) => {
                    const x = (idx / (weeklyData.length - 1)) * 100;
                    return (
                      <line key={idx} x1={x} y1="0" x2={x} y2="80" stroke="#E5E7EB" strokeWidth="0.5" strokeDasharray="3,3" vectorEffect="non-scaling-stroke"/>
                    );
                  })}

                  <polyline
                    points={weeklyData.map((item, idx) => {
                      const x = (idx / (weeklyData.length - 1)) * 100;
                      const y = 80 - ((item.value / maxWeekly) * 80);
                      return `${x},${y}`;
                    }).join(' ')}
                    fill="none"
                    stroke="#295782"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  />

                  {weeklyData.map((item, idx) => {
                    const x = (idx / (weeklyData.length - 1)) * 100;
                    const y = 80 - ((item.value / maxWeekly) * 80);
                    return (
                      <g key={idx}>
                        <circle
                          cx={x}
                          cy={y}
                          r="4"
                          fill="transparent"
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={() => setHoveredWeekIndex(idx)}
                          onMouseLeave={() => setHoveredWeekIndex(null)}
                        />
                        <circle
                          cx={x}
                          cy={y}
                          r={hoveredWeekIndex === idx ? "2.5" : "1.5"}
                          fill="#155EEF"
                          stroke="#155EEF"
                          strokeWidth="1"
                          vectorEffect="non-scaling-stroke"
                          style={{ transition: 'all 0.2s', cursor: 'pointer' }}
                        />
                      </g>
                    );
                  })}
                </svg>

                {hoveredWeekIndex !== null && (
                  <div 
                    className="absolute bg-white border-2 border-[#295782] text-xs px-3 py-2 rounded-lg shadow-xl z-20"
                    style={{
                      left: `${(hoveredWeekIndex / (weeklyData.length - 1)) * 100}%`,
                      top: '10%',
                      transform: 'translateX(-50%)',
                      pointerEvents: 'none'
                    }}
                  >
                    <div className="font-bold text-[#1E293B]">{weeklyData[hoveredWeekIndex].day}</div>
                    <div className="text-[#295782] font-semibold">{weeklyData[hoveredWeekIndex].value} sesi tryout</div>
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                      <div className="border-[6px] border-transparent border-t-[#295782]"></div>
                    </div>
                  </div>
                )}

                <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-[#6B7280] pt-1">
                  {weeklyData.map((item, idx) => (
                    <span key={idx}>{item.day}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ✅ Bar Chart with TRULY Dynamic Y-axis */}
          <div className="bg-white rounded-[14px] shadow-sm p-4">
            <div className="mb-3">
              <h3 className="text-lg font-bold text-[#1E293B] mb-0.5">Grafik Pendapatan Bulanan</h3>
              <p className="text-xs text-[#6B7280]">Trend pendapatan 6 bulan terakhir</p>
            </div>
            <div className="h-40 relative">
              {/* ✅ TRULY Dynamic Y-axis labels */}
              <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-[10px] text-[#6B7280] pr-2">
                <span>{formatYAxis(maxMonthly)}</span>
                <span>{formatYAxis(maxMonthly * 0.75)}</span>
                <span>{formatYAxis(maxMonthly * 0.5)}</span>
                <span>{formatYAxis(maxMonthly * 0.25)}</span>
                <span>0</span>
              </div>
              
              <div className="ml-10 h-full relative">
                <div className="absolute inset-0 bottom-6">
                  <div className="h-full flex flex-col justify-between">
                    {[0, 1, 2, 3, 4].map((idx) => (
                      <div key={idx} className="border-t border-dashed border-[#E5E7EB]"></div>
                    ))}
                  </div>
                  <div className="absolute inset-0 flex justify-between">
                    {monthlyData.map((_, idx) => (
                      <div key={idx} className="border-l border-dashed border-[#E5E7EB] flex-1"></div>
                    ))}
                  </div>
                </div>

                <div className="h-[calc(100%-24px)] flex items-end justify-between gap-1 relative z-10">
                  {monthlyData.map((item, idx) => {
                    const height = maxMonthly > 0 ? (item.value / maxMonthly) * 100 : 0;
                    
                    return (
                      <div 
                        key={idx} 
                        className="flex-1 relative"
                        style={{ height: '100%' }}
                        onMouseEnter={() => setHoveredMonthIndex(idx)}
                        onMouseLeave={() => setHoveredMonthIndex(null)}
                      >
                        <div 
                          className="absolute bottom-0 w-full bg-[#295782] rounded-t-md transition-all cursor-pointer"
                          style={{ 
                            height: `${height}%`, 
                            minHeight: item.value > 0 ? '8px' : '0px',
                            backgroundColor: hoveredMonthIndex === idx ? '#1e4060' : '#295782'
                          }}
                        />

                        {hoveredMonthIndex === idx && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-white border-2 border-[#295782] text-xs px-3 py-2 rounded-lg shadow-xl z-20 whitespace-nowrap">
                            <div className="font-bold text-[#1E293B]">Pendapatan {item.month}</div>
                            <div className="text-[#295782] font-semibold">{formatPrice(item.value)}</div>
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2">
                              <div className="border-[6px] border-transparent border-t-[#295782]"></div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-[#6B7280] pt-1">
                  {monthlyData.map((item, idx) => (
                    <span key={idx} className="flex-1 text-center">{item.month}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Activity and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-[14px] shadow-sm p-4">
            <h3 className="text-lg font-bold text-[#1E293B] mb-3">Aktivitas Terbaru</h3>
            <div className="space-y-2">
              {activities.length === 0 ? (
                <p className="text-sm text-[#64748B] text-center py-4">Belum ada aktivitas</p>
              ) : (
                activities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className={`w-6 h-6 rounded-lg ${activity.iconBg} flex items-center justify-center flex-shrink-0`}>
                      {activity.type === 'user' && <Users className={`w-3 h-3 ${activity.iconColor}`} strokeWidth={1} />}
                      {activity.type === 'transaction' && <CreditCard className={`w-3 h-3 ${activity.iconColor}`} strokeWidth={1} />}
                      {activity.type === 'session' && <Clock className={`w-3 h-3 ${activity.iconColor}`} strokeWidth={1} />}
                      {activity.type === 'tryout' && (
                        <svg className={`w-3 h-3 ${activity.iconColor}`} viewBox="0 0 12 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6 4.43747V11.4375" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M1.5 9.93747C1.36739 9.93747 1.24021 9.88479 1.14645 9.79102C1.05268 9.69726 1 9.57008 1 9.43747V2.93747C1 2.80486 1.05268 2.67768 1.14645 2.58392C1.24021 2.49015 1.36739 2.43747 1.5 2.43747H4C4.53043 2.43747 5.03914 2.64818 5.41421 3.02326C5.78929 3.39833 6 3.90704 6 4.43747C6 3.90704 6.21071 3.39833 6.58579 3.02326C6.96086 2.64818 7.46957 2.43747 8 2.43747H10.5C10.6326 2.43747 10.7598 2.49015 10.8536 2.58392C10.9473 2.67768 11 2.80486 11 2.93747V9.43747C11 9.57008 10.9473 9.69726 10.8536 9.79102C10.7598 9.88479 10.6326 9.93747 10.5 9.93747H7.5C7.10218 9.93747 6.72064 10.0955 6.43934 10.3768C6.15804 10.6581 6 11.0396 6 11.4375C6 11.0396 5.84196 10.6581 5.56066 10.3768C5.27936 10.0955 4.89782 9.93747 4.5 9.93747H1.5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#1E293B] leading-tight">{activity.message}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock className="w-2.5 h-2.5 text-[#64748B]" strokeWidth={0.83} />
                        <span className="text-xs text-[#64748B]">{activity.timestamp}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-[14px] shadow-sm p-4">
            <h3 className="text-lg font-bold text-[#1E293B] mb-4">Aksi Cepat</h3>
            <div className="space-y-3">
              <Link 
                to="/admin-tryout/new"
                className="w-full bg-[#295782] text-white rounded-lg py-2.5 px-4 flex items-center justify-center gap-4 hover:bg-[#295782]/90 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" strokeWidth={1.33} />
                Tambah Tryout Baru
              </Link>
              <Link
                to="/admin-transaksi?action=add"
                className="w-full bg-[#295782] text-white rounded-lg py-2.5 px-4 flex items-center justify-center gap-4 hover:bg-[#295782]/90 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" strokeWidth={1.33} />
                Tambah Paket Premium
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
