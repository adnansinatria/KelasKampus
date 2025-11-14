// pages/PackageList.tsx
// ✅ FIXED VERSION - No status filter, match admin pattern

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Header from '@/components/Header';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface Package {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price: number;
  duration: number;
  tryout_count: number;
  benefits: string[] | string;
  is_popular: boolean;
  created_at: string;
}

export default function PackageList() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    loadPackages();
    loadUserData();
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
            return;
          }
        }
      }

      setCurrentUser({
        user_id: 'temp-id',
        nama: 'User',
        email: 'user@example.com',
        photo: null
      });
    } catch (error) {
      console.error('Error loading user data:', error);
      setCurrentUser({
        user_id: 'temp-id',
        nama: 'User',
        email: 'user@example.com',
        photo: null
      });
    }
  };

  // ✅ FIXED: Pattern dari admin - tanpa filter status
  const loadPackages = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Fetching packages from Supabase...');

      // ✅ DIRECT SUPABASE (sama seperti adminPaketTransaksi.tsx)
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .order('price', { ascending: true });  // ✅ Tanpa .eq('status', 'active')

      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }

      console.log('✅ Raw packages data:', data);
      console.log('✅ Packages count:', data?.length || 0);

      if (!data || data.length === 0) {
        console.warn('⚠️ No packages found in database');
        setPackages([]);
        return;
      }

      // ✅ Process benefits (handle both string and array)
      const processedPackages = data.map(pkg => {
        let benefits = [];
        
        // Handle benefits parsing
        if (typeof pkg.benefits === 'string') {
          try {
            benefits = JSON.parse(pkg.benefits);
          } catch (e) {
            // If not valid JSON, split by comma or newline
            benefits = pkg.benefits.split(/[,\n]/).map((b: string) => b.trim()).filter(Boolean);
          }
        } else if (Array.isArray(pkg.benefits)) {
          benefits = pkg.benefits;
        }

        return {
          ...pkg,
          benefits,
          // Ensure numbers are parsed correctly
          price: Number(pkg.price),
          original_price: Number(pkg.original_price),
          tryout_count: Number(pkg.tryout_count),
          duration: Number(pkg.duration),
          is_popular: Boolean(pkg.is_popular)
        };
      });

      console.log('✅ Processed packages:', processedPackages);
      setPackages(processedPackages);

    } catch (error: any) {
      console.error('❌ Error loading packages:', error);
      toast.error(error.message || 'Gagal memuat paket');
      setPackages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuyPackage = (pkg: Package) => {
    navigate(`/packages/${pkg.id}/checkout`, { state: { package: pkg } });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#e6f3ff] via-[#f8fbff] to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#295782] mx-auto mb-4"></div>
          <p className="text-[#62748e] font-medium text-lg">Memuat paket...</p>
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
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[#1d293d] mb-4">
            Pilih Paket Belajarmu
          </h1>
          <p className="text-lg text-[#62748e] max-w-2xl mx-auto">
            Tingkatkan persiapan UTBK-mu dengan paket tryout premium. Pilih paket yang sesuai dengan kebutuhanmu!
          </p>
        </div>

        {/* Package Cards Grid */}
        {packages.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-white rounded-2xl shadow-sm p-12 max-w-md mx-auto">
              <svg className="w-20 h-20 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-[#62748e] text-lg font-medium mb-2">
                Belum ada paket tersedia saat ini
              </p>
              <p className="text-[#62748e] text-sm">
                Silakan hubungi admin untuk menambahkan paket
              </p>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="mt-4 border-[#295782] text-[#295782]"
              >
                Refresh Halaman
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {packages.map((pkg) => (
              <Card
                key={pkg.id}
                className={`relative overflow-hidden hover:shadow-2xl transition-all duration-300 ${
                  pkg.is_popular ? 'border-2 border-[#295782] shadow-xl' : ''
                }`}
              >
                {pkg.is_popular && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] text-white px-4 py-1 text-xs font-bold uppercase flex items-center gap-1 rounded-bl-xl">
                    <Star className="w-3 h-3" />
                    Paling Populer
                  </div>
                )}

                <div className="p-8">
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-[#1d293d] mb-2">
                      {pkg.name}
                    </h3>
                    <p className="text-sm text-[#62748e]">
                      {pkg.tryout_count}x TryOut Premium
                    </p>
                  </div>

                  <div className="mb-6">
                    {pkg.original_price > pkg.price && (
                      <p className="text-sm text-gray-400 line-through mb-1">
                        {formatPrice(pkg.original_price)}
                      </p>
                    )}
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-[#295782]">
                        {formatPrice(pkg.price)}
                      </span>
                      {pkg.original_price > pkg.price && (
                        <span className="text-sm bg-red-100 text-red-600 px-2 py-1 rounded-full font-semibold">
                          -{Math.round(((pkg.original_price - pkg.price) / pkg.original_price) * 100)}% OFF
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 my-6"></div>

                  <ul className="space-y-3 mb-8">
                    {pkg.benefits.map((benefit: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-[#62748e]">
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handleBuyPackage(pkg)}
                    className={`w-full py-6 text-base font-semibold rounded-xl transition-all shadow-md hover:shadow-lg ${
                      pkg.is_popular
                        ? 'bg-gradient-to-r from-[#295782] to-[#1e4060] hover:from-[#1e4060] hover:to-[#295782]'
                        : 'bg-[#295782] hover:bg-[#1e4060]'
                    }`}
                  >
                    Beli Sekarang
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-16 text-center">
          <p className="text-[#62748e] mb-4">Butuh bantuan memilih paket?</p>
          <Button 
            variant="outline" 
            className="border-[#295782] text-[#295782] hover:bg-[#295782] hover:text-white"
          >
            Hubungi kami
          </Button>
        </div>
      </div>

      <div className="border-t mt-16 py-8 text-center text-sm text-[#62748e]">
        <p>© 2025 Kelas Kampus. All rights reserved.</p>
      </div>
    </div>
  );
}