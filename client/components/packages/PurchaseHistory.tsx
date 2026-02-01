// pages/PurchaseHistory.tsx
// ✅ FIXED VERSION - Direct Supabase (sama seperti admin)

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Package, Calendar, CreditCard, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import toast from 'react-hot-toast';
import { Button } from '../ui/button';

interface Transaction {
  id: string;
  package_id: string;
  package_name: string;
  amount: number;
  payment_method: string;
  status: 'pending' | 'success' | 'failed';
  created_at: string;
}

export default function PurchaseHistory() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    loadUserData();
    loadTransactions();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const { data: userData } = await supabase
            .from('users')
            .select('user_id, nama_lengkap, email, photo_profile, username')
            .eq('auth_id', authUser.id)
            .single();

          if (userData) {
            setCurrentUser({
              user_id: userData.user_id,
              nama: userData.username || userData.nama_lengkap || authUser.email?.split('@')[0] || 'User',
              email: userData.email || authUser.email,
              photo: userData.photo_profile
            });
            return;
          }
        }
      } else {
        const token = localStorage.getItem('auth_token');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const { data: userData } = await supabase
            .from('users')
            .select('user_id, nama_lengkap, email, photo_profile, username')
            .eq('user_id', payload.user_id)
            .single();

          if (userData) {
            setCurrentUser({
              user_id: userData.user_id,
              nama: userData.username || userData.nama_lengkap || payload.email?.split('@')[0] || 'User',
              email: userData.email || payload.email,
              photo: userData.photo_profile
            });
          }
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  // ✅ FIXED: Direct Supabase query (sama seperti adminPaketTransaksi)
  const loadTransactions = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Fetching user transactions...');

      // Get current user ID
      const { data: { session } } = await supabase.auth.getSession();
      let userId = null;

      if (session) {
        const { data: userData } = await supabase
          .from('users')
          .select('user_id')
          .eq('auth_id', session.user.id)
          .single();
        userId = userData?.user_id;
      } else {
        const token = localStorage.getItem('auth_token');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          userId = payload.user_id;
        }
      }

      if (!userId) {
        console.warn('⚠️ User ID not found');
        setTransactions([]);
        return;
      }

      // ✅ DIRECT SUPABASE (sama seperti admin)
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          packages:package_id ( id, name, price )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }

      const transformedData = (data || []).map((t: any) => ({
        id: t.id,
        package_id: t.package_id,
        package_name: t.packages?.name || '-',
        amount: t.amount,
        payment_method: t.payment_method,
        status: t.status,
        created_at: t.created_at,
        snap_token: t.snap_token
      }));

      console.log('✅ Processed transactions:', transformedData);
      setTransactions(transformedData);

    } catch (error: any) {
      console.error('❌ Error loading transactions:', error);
      toast.error(error.message || 'Gagal memuat riwayat transaksi');
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700' },
      success: { label: 'Berhasil', className: 'bg-green-100 text-green-700' },
      failed: { label: 'Gagal', className: 'bg-red-100 text-red-700' }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#e6f3ff] via-[#f8fbff] to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#295782] mx-auto mb-4"></div>
          <p className="text-[#62748e] font-medium text-lg">Memuat riwayat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e6f3ff] via-[#f8fbff] to-white">
      <Header 
        userName={currentUser?.nama || 'User'}
        userPhoto={currentUser?.photo}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <button
          onClick={() => navigate('/packages')}
          className="flex items-center gap-2 text-[#62748e] hover:text-[#295782] mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Kembali ke Paket</span>
        </button>

        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1d293d] mb-2">
            Riwayat Pembelian
          </h1>
          <p className="text-[#62748e]">
            Daftar transaksi paket tryout Anda
          </p>
        </div>

        {/* Empty State */}
        {transactions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <FileText className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[#1d293d] mb-2">
              Belum Ada Transaksi
            </h3>
            <p className="text-[#62748e] mb-6">
              Anda belum melakukan pembelian paket. Mulai belajar sekarang!
            </p>
            <button
              onClick={() => navigate('/packages')}
              className="px-6 py-3 bg-[#295782] text-white rounded-xl font-semibold hover:bg-[#1e4060] transition-colors"
            >
              Lihat Paket
            </button>
          </div>
        ) : (
          /* Transaction List */
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <Card key={transaction.id} className="p-6 hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  {/* Left: Package Info */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 bg-[#295782]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Package className="w-6 h-6 text-[#295782]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#1d293d] mb-1">
                        {transaction.package_name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-[#62748e]">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(transaction.created_at)}
                        </div>
                        <div className="flex items-center gap-1">
                          <CreditCard className="w-4 h-4" />
                          {transaction.payment_method.replace('_', ' ').toUpperCase()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Status + Amount */}
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                    {getStatusBadge(transaction.status)}
                    <div className="text-right">
                      <p className="text-xs text-[#62748e] mb-1">Total Pembayaran</p>
                      <p className="text-xl font-bold text-[#295782]">
                        {formatPrice(transaction.amount)}
                      </p>
                    </div>

                    {/* ✅ TOMBOL BAYAR (Hanya jika Pending) */}
                    {transaction.status === 'pending' && (
                        <Button 
                            onClick={() => navigate('/packages/payment-instruction', {
                                state: { transaction: transaction }
                            })}
                            className="bg-[#295782] text-white hover:bg-[#1e4060]"
                        >
                            Bayar
                        </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t mt-16 py-8 text-center text-sm text-[#62748e]">
        <p>© 2025 Kelas Kampus. All rights reserved.</p>
      </div>
    </div>
  );
}