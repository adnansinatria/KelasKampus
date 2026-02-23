// client/pages/PackageCheckout.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Check, CheckCircle2, ShieldCheck, CreditCard, Tag, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import Header from '@/components/Header';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

declare global {
  interface Window {
    snap: any;
  }
}

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

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // --- STATE UNTUK PROMO ---
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [isCheckingPromo, setIsCheckingPromo] = useState(false);

  // Load Script Midtrans Snap
  useEffect(() => {
    const clientKey = import.meta.env.VITE_MIDTRANS_CLIENT_KEY;
    const script = document.createElement('script');
    script.src = "https://app.sandbox.midtrans.com/snap/snap.js"; 
    script.setAttribute('data-client-key', clientKey);
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    }
  }, []);

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
        setCurrentUser({
            user_id: session.user.id,
            nama: session.user.user_metadata?.nama_lengkap || session.user.email,
            email: session.user.email
        });
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  // --- LOGIKA VALIDASI PROMO ---
  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setIsCheckingPromo(true);

    try {
      // 1. Cari promo aktif di DB
      const { data: promo, error } = await supabase
        .from('promos')
        .select('*')
        .eq('code', promoCode.toUpperCase().trim())
        .eq('is_active', true)
        .single();

      if (error || !promo) throw new Error('Kode promo tidak valid atau tidak ditemukan');

      // 2. Cek apakah sudah kadaluarsa
      if (promo.valid_until && new Date(promo.valid_until) < new Date()) {
        throw new Error('Kode promo sudah kadaluarsa');
      }

      // 3. Cek batas penggunaan (Kuota)
      if (promo.max_usage > 0 && promo.current_usage >= promo.max_usage) {
        throw new Error('Kuota kode promo ini sudah habis');
      }

      // 4. Cek apakah user ini sudah pernah memakainya
      const { data: usage } = await supabase
        .from('promo_usages')
        .select('id')
        .eq('promo_id', promo.id)
        .eq('user_id', currentUser?.user_id)
        .maybeSingle();

      if (usage) throw new Error('Anda sudah pernah menggunakan kode promo ini');

      setAppliedPromo(promo);
      toast.success('Kode promo berhasil dipasang!');
      
    } catch (err: any) {
      toast.error(err.message);
      setAppliedPromo(null);
    } finally {
      setIsCheckingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCode('');
  };

  // --- LOGIKA KALKULASI HARGA ---
  const getCalculatedPrices = () => {
    let finalPrice = packageData.price;
    let promoDiscountAmount = 0;

    if (appliedPromo) {
      if (appliedPromo.discount_type === 'percentage') {
        promoDiscountAmount = (packageData.price * appliedPromo.discount_value) / 100;
      } else {
        // Diskon nominal tetap (fixed)
        promoDiscountAmount = appliedPromo.discount_value;
      }
      // Pastikan harga tidak minus
      finalPrice = Math.max(0, packageData.price - promoDiscountAmount);
    }

    return { finalPrice, promoDiscountAmount };
  };

  const { finalPrice, promoDiscountAmount } = getCalculatedPrices();

  // --- LOGIKA PEMBAYARAN ---
  const handlePayment = async () => {
    if (!agreeTerms) {
      toast.error('Anda harus menyetujui Syarat & Ketentuan');
      return;
    }
    if (!currentUser?.user_id) {
      toast.error('Silakan login kembali.');
      return;
    }

    try {
      setIsSubmitting(true);

      // JIKA HARGA JADI RP 0 (GRATIS 100%)
      if (finalPrice === 0) {
        toast.info("Memproses paket gratis Anda...");
        
        // 1. Bikin transaksi langsung berstatus 'success' di database
        const { data: trxData, error: trxError } = await supabase
          .from('transactions')
          .insert({
            user_id: currentUser.user_id,
            package_id: packageData.id,
            amount: 0,
            status: 'success',
            payment_method: 'Promo Gratis',
            promo_id: appliedPromo?.id,
            discount_amount: promoDiscountAmount
          })
          .select()
          .single();

        if (trxError) throw trxError;

        // 2. Catat penggunaan promo agar tidak bisa dipakai 2x
        if (appliedPromo) {
          await supabase.from('promo_usages').insert({
            promo_id: appliedPromo.id,
            user_id: currentUser.user_id,
            transaction_id: trxData.id
          });
          
          // Opsional: Anda mungkin butuh RPC atau Edge Function untuk menaikkan current_usage di tabel promos.
        }

        toast.success('Paket berhasil diaktifkan secara gratis!');
        navigate('/dashboard');
        return;
      }

      // JIKA MASIH ADA SISA BAYAR (MIDTRANS NORMAL)
      const payload = {
        user_id: currentUser.user_id,
        package_id: packageData.id,
        amount: finalPrice, // Harga setelah diskon
        promo_id: appliedPromo?.id || null, // Kirim ID promo
        discount_amount: promoDiscountAmount, // Kirim nominal diskon
        user_details: {
          name: currentUser.nama,
          email: currentUser.email
        }
      };
      
      const { data, error } = await supabase.functions.invoke('create-midtrans-transaction', {
        body: payload
      });

      if (error) throw new Error(error.message || 'Gagal membuat transaksi');

      const { token, transaction } = data;

      if (window.snap) {
        window.snap.pay(token, {
          onSuccess: function(result: any){
            toast.success('Pembayaran Berhasil!');
            navigate('/dashboard'); 
          },
          onPending: function(result: any){
            toast.info('Menunggu pembayaran...');
            navigate('/packages/payment-instruction', {
              state: { transaction: { ...transaction, snap_token: token } }
            });
          },
          onError: function(result: any){
            toast.error('Pembayaran gagal!');
          },
          onClose: function(){
            toast.warning('Pembayaran belum selesai.');
            navigate('/packages/payment-instruction', {
              state: { transaction: { ...transaction, snap_token: token } }
            });
          }
        });
      }

    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || 'Gagal memproses transaksi');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!packageData) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e6f3ff] via-[#f8fbff] to-white">
      <Header userName={currentUser?.nama || 'User'} userPhoto={currentUser?.photo} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1d293d] mb-2">Checkout Paket</h1>
          <p className="text-[#62748e]">Selesaikan pembayaran otomatis dengan aman</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Package Detail */}
            <Card className="p-6">
              <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-[#295782] mb-2">{packageData.name}</h2>
                    <p className="text-sm text-[#62748e]">Akses {packageData.tryout_count}x Tryout Premium</p>
                  </div>
                  <div className="text-right">
                    {packageData.original_price > packageData.price && (
                        <p className="text-sm text-gray-400 line-through">{formatPrice(packageData.original_price)}</p>
                    )}
                    <p className="text-2xl font-bold text-[#295782]">{formatPrice(packageData.price)}</p>
                  </div>
              </div>
              <div className="mt-6 pt-6 border-t">
                <ul className="space-y-2">
                  {packageData.benefits.slice(0, 3).map((benefit, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-[#62748e]">
                      <Check className="w-4 h-4 text-green-600 mt-0.5" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            {/* Payment Method */}
            <Card className="p-6">
              <h2 className="text-lg font-bold text-[#1d293d] mb-4">Metode Pembayaran</h2>
              <RadioGroup defaultValue="midtrans">
                <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-[#295782] bg-[#295782]/5 cursor-pointer">
                  <RadioGroupItem value="midtrans" id="midtrans" />
                  <div className="flex items-center gap-3 flex-1">
                    <CreditCard className="w-5 h-5 text-[#295782]" />
                    <Label htmlFor="midtrans" className="font-medium cursor-pointer">
                      {finalPrice === 0 ? 'Aktivasi Instan (Gratis)' : 'Pembayaran Otomatis (QRIS, VA, E-Wallet)'}
                    </Label>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-[#295782]" />
                </div>
              </RadioGroup>
              {finalPrice > 0 && (
                <p className="text-xs text-[#62748e] mt-3 ml-1">
                  * Anda akan diarahkan ke pop-up pembayaran aman Midtrans.
                </p>
              )}
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-6">
              <h2 className="text-lg font-bold text-[#1d293d] mb-4">Ringkasan</h2>
              
              {/* AREA INPUT PROMO */}
              <div className="mb-6 border-b pb-6">
                <Label className="text-sm font-semibold text-[#1d293d] mb-2 block">Punya Kode Promo?</Label>
                {!appliedPromo ? (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input 
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        placeholder="Masukkan kode..."
                        className="pl-9 uppercase"
                        disabled={isCheckingPromo}
                      />
                    </div>
                    <Button 
                      onClick={handleApplyPromo} 
                      disabled={!promoCode || isCheckingPromo}
                      variant="outline"
                      className="border-[#295782] text-[#295782] hover:bg-blue-50"
                    >
                      {isCheckingPromo ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Gunakan'}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-bold text-green-700 uppercase">{appliedPromo.code}</span>
                    </div>
                    <button onClick={handleRemovePromo} className="text-gray-400 hover:text-red-500 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* RINCIAN HARGA */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-[#62748e]">Harga Paket</span>
                  <span className="font-medium">{formatPrice(packageData.price)}</span>
                </div>
                
                {appliedPromo && (
                  <div className="flex justify-between text-sm text-green-600 font-medium">
                    <span>Diskon Promo</span>
                    <span>-{formatPrice(promoDiscountAmount)}</span>
                  </div>
                )}

                <div className="border-t pt-3 mt-3 flex justify-between">
                  <span className="font-bold text-[#1d293d]">Total Bayar</span>
                  <span className="font-bold text-xl text-[#295782]">{formatPrice(finalPrice)}</span>
                </div>
              </div>

              <div className="mb-6 flex items-start gap-2">
                <Checkbox id="terms" checked={agreeTerms} onCheckedChange={(c) => setAgreeTerms(c as boolean)} className="mt-0.5" />
                <label htmlFor="terms" className="text-sm text-[#62748e] cursor-pointer">
                  Saya setuju dengan Syarat & Ketentuan
                </label>
              </div>

              <Button 
                onClick={handlePayment} 
                disabled={!agreeTerms || isSubmitting} 
                className="w-full py-6 bg-[#295782] hover:bg-[#1e4060] text-white font-semibold rounded-xl"
              >
                {isSubmitting ? 'Memproses...' : finalPrice === 0 ? 'Aktifkan Gratis' : 'Bayar Sekarang'}
              </Button>
              
              <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-500">
                <ShieldCheck className="w-4 h-4" /> Pembayaran Aman & Terenkripsi
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}