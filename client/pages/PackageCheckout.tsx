// pages/PackageCheckout.tsx
// ✅ FINAL VERSION - Direct Supabase insert, match admin pattern

import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Check, CheckCircle2, Wallet, Building2, CreditCard, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
  benefits: string[];
  is_popular: boolean;
}

export default function PackageCheckout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const packageData = location.state?.package as Package;

  const [paymentMethod, setPaymentMethod] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const paymentMethods = [
    {
      id: 'e_wallet',
      name: 'E-Wallet (OVO, GoPay, DANA, ShopeePay)',
      icon: <Wallet className="w-5 h-5" />,
      bgColor: 'bg-[#295782]/10'
    },
    {
      id: 'bank_transfer',
      name: 'Transfer Bank (BCA, Mandiri, BNI, BRI)',
      icon: <Building2 className="w-5 h-5" />,
      bgColor: 'bg-[#295782]/10'
    },
    {
      id: 'virtual_account',
      name: 'Virtual Account',
      icon: <CreditCard className="w-5 h-5" />,
      bgColor: 'bg-[#295782]/10'
    },
    {
      id: 'saldo_kampus',
      name: 'Saldo Kelas Kampus',
      icon: <Coins className="w-5 h-5" />,
      bgColor: 'bg-[#295782]/10'
    }
  ];

  useEffect(() => {
    if (!packageData) {
      toast.error('Data paket tidak ditemukan');
      navigate('/packages');
      return;
    }

    loadUserData();
  }, [packageData, navigate]);

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

  const calculateDiscount = () => {
    return packageData.original_price - packageData.price;
  };

  const calculateDiscountPercentage = () => {
    return Math.round((calculateDiscount() / packageData.original_price) * 100);
  };



// pages/PackageCheckout.tsx
// ✅ MINIMAL VERSION - Hanya field yang pasti ada

const handleSubmit = async () => {
  if (!paymentMethod) {
    toast.error('Pilih metode pembayaran terlebih dahulu');
    return;
  }

  if (!agreeTerms) {
    toast.error('Anda harus menyetujui Syarat & Ketentuan');
    return;
  }

  if (!currentUser || !currentUser.user_id || currentUser.user_id === 'temp-id') {
    toast.error('User tidak terautentikasi. Silakan login kembali.');
    return;
  }

  try {
    setIsSubmitting(true);
    console.log('💳 Creating transaction...');

    // ✅ MINIMAL PAYLOAD - Hanya core fields
    const transactionPayload = {
      user_id: currentUser.user_id,
      package_id: packageData.id,
      payment_method: paymentMethod,
      amount: Number(packageData.price),
      status: 'pending',
      created_at: new Date().toISOString(),
      // ❌ HAPUS: discount dan original_price (column tidak ada)
    };

    console.log('📝 Transaction payload:', transactionPayload);

    // ✅ INSERT ke table "transactions"
    const { data: transactionData, error: transactionError } = await supabase
      .from('transactions')
      .insert([transactionPayload])
      .select()
      .single();

    if (transactionError) {
      console.error('❌ Transaction error:', transactionError);
      throw new Error(transactionError.message || 'Gagal membuat transaksi');
    }

    if (!transactionData) {
      throw new Error('Transaksi berhasil dibuat tetapi tidak ada data yang dikembalikan');
    }

    console.log('✅ Transaction created:', transactionData);

    // ✅ Save to localStorage
    localStorage.setItem('current_transaction', JSON.stringify({
      transaction: transactionData,
      paymentMethod,
      packageData
    }));

    toast.success('Transaksi berhasil dibuat! Silakan lakukan pembayaran.');

    // ✅ Navigate to payment instruction
    setTimeout(() => {
      navigate('/packages/payment-instruction', {
        state: {
          transaction: transactionData,
          paymentMethod,
          packageData
        }
      });
    }, 1500);

  } catch (error: any) {
    console.error('❌ Checkout error:', error);
    toast.error(error.message || 'Gagal memproses transaksi');
  } finally {
    setIsSubmitting(false);
  }
};


  const handleCancel = () => {
    if (confirm('Batalkan transaksi ini?')) {
      navigate('/packages');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (!packageData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e6f3ff] via-[#f8fbff] to-white">
      <Header 
        userName={currentUser?.nama || 'User'}
        userPhoto={currentUser?.photo}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1d293d] mb-2">
            Transaksi Paket
          </h1>
          <p className="text-[#62748e]">
            Selesaikan pembayaran untuk mengaktifkan paket tryout Anda
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Payment Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Package Selected Card */}
            <Card className="p-6">
              <h2 className="text-lg font-bold text-[#1d293d] mb-4">
                Paket yang Dipilih
              </h2>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold text-[#295782] mb-2">
                    {packageData.name}
                  </h3>
                  <p className="text-sm text-[#62748e]">
                    Akses {packageData.tryout_count} tryout premium + analisis mendalam
                  </p>
                </div>
                <div className="text-right">
                  {packageData.original_price > packageData.price && (
                    <p className="text-sm text-gray-400 line-through">
                      {formatPrice(packageData.original_price)}
                    </p>
                  )}
                  <p className="text-2xl font-bold text-[#295782]">
                    {formatPrice(packageData.price)}
                  </p>
                  {packageData.original_price > packageData.price && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-semibold">
                      -{calculateDiscountPercentage()}% OFF
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-6 border-t">
                <ul className="space-y-2">
                  {packageData.benefits.slice(0, 3).map((benefit, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-[#62748e]">
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            {/* Payment Method Card */}
            <Card className="p-6">
              <h2 className="text-lg font-bold text-[#1d293d] mb-4">
                Pilih Metode Pembayaran
              </h2>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                <div className="space-y-3">
                  {paymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className={`relative flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        paymentMethod === method.id
                          ? 'border-[#295782] bg-[#295782]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      } ${method.bgColor}`}
                      onClick={() => setPaymentMethod(method.id)}
                    >
                      <RadioGroupItem value={method.id} id={method.id} />
                      <div className="flex items-center gap-3 flex-1">
                        {method.icon}
                        <Label
                          htmlFor={method.id}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {method.name}
                        </Label>
                      </div>
                      {paymentMethod === method.id && (
                        <CheckCircle2 className="w-5 h-5 text-[#295782]" />
                      )}
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </Card>
          </div>

          {/* Right: Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-6">
              <h2 className="text-lg font-bold text-[#1d293d] mb-4">
                Detail Transaksi
              </h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-[#62748e]">Harga Paket</span>
                  <span className="font-medium">{formatPrice(packageData.original_price)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#62748e]">Diskon ({calculateDiscountPercentage()}%)</span>
                  <span className="font-medium text-green-600">
                    -{formatPrice(calculateDiscount())}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#62748e]">Biaya Lainnya</span>
                  <span className="font-medium">Rp 0</span>
                </div>
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between">
                    <span className="font-bold text-[#1d293d]">Total Pembayaran</span>
                    <span className="font-bold text-xl text-[#295782]">
                      {formatPrice(packageData.price)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="terms"
                    checked={agreeTerms}
                    onCheckedChange={(checked) => setAgreeTerms(checked as boolean)}
                    className="mt-0.5"
                  />
                  <label htmlFor="terms" className="text-sm text-[#62748e] cursor-pointer">
                    Saya setuju dengan{' '}
                    <a href="#" className="text-[#295782] underline">
                      Syarat & Ketentuan
                    </a>
                    {' '}yang berlaku
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleSubmit}
                  disabled={!paymentMethod || !agreeTerms || isSubmitting}
                  className="w-full py-6 bg-[#295782] hover:bg-[#1e4060] text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Memproses...
                    </div>
                  ) : (
                    'Bayar Sekarang'
                  )}
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="w-full py-6 border-[#295782] text-[#295782] hover:bg-[#295782] hover:text-white font-semibold rounded-xl"
                  disabled={isSubmitting}
                >
                  Batal / Kembali
                </Button>
              </div>

              <p className="text-xs text-center text-[#62748e] mt-4">
                🔒 Transaksi Anda dijamin aman & terenkripsi.
              </p>
            </Card>
          </div>
        </div>
      </div>

      <div className="border-t mt-16 py-8 text-center text-sm text-[#62748e]">
        <p>© 2025 Kelas Kampus. All rights reserved.</p>
      </div>
    </div>
  );
}