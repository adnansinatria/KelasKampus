// pages/PaymentInstruction.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CreditCard, RefreshCw, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Header from '@/components/Header';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

declare global {
  interface Window { snap: any; }
}

export default function PaymentInstruction() {
  const navigate = useNavigate();
  const location = useLocation();
  const [transaction, setTransaction] = useState<any>(null);

  useEffect(() => {
    const clientKey = import.meta.env.VITE_MIDTRANS_CLIENT_KEY;
    const script = document.createElement('script');
    script.src = "https://app.sandbox.midtrans.com/snap/snap.js";
    script.setAttribute('data-client-key', clientKey);
    script.async = true;
    document.body.appendChild(script);

    const data = location.state?.transaction;
    if (data) {
      setTransaction(data);
    } else {
      // Jika reload, coba cek localStorage atau redirect
      navigate('/packages');
    }

    return () => { document.body.removeChild(script); }
  }, [location, navigate]);

  const handlePayNow = () => {
    if (window.snap && transaction?.snap_token) {
      window.snap.pay(transaction.snap_token, {
        onSuccess: () => { toast.success('Berhasil!'); navigate('/dashboard'); },
        onPending: () => { toast.info('Menunggu pembayaran...'); },
        onError: () => { toast.error('Gagal memproses pembayaran'); },
      });
    } else {
        toast.error("Token pembayaran hilang. Silakan buat transaksi ulang.");
    }
  };

  const handleCheckStatus = async () => {
    const { data } = await supabase.from('transactions').select('status').eq('id', transaction.id).single();
    if (data?.status === 'success') {
      toast.success('Pembayaran Diterima! Paket aktif.');
      navigate('/dashboard');
    } else if (data?.status === 'failed' || data?.status === 'expire') {
        toast.error('Transaksi kadaluarsa/gagal.');
        navigate('/packages');
    } else {
      toast.info('Status masih Pending. Silakan lakukan pembayaran.');
    }
  };

  if (!transaction) return null;

  return (
    <div className="min-h-screen bg-[#EFF6FB]">
      <Header userName="User" /> 

      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CreditCard className="w-10 h-10 text-[#295782]" />
        </div>
        
        <h1 className="text-2xl font-bold text-[#1E293B] mb-2">Selesaikan Pembayaran</h1>
        <p className="text-gray-600 mb-8">Klik tombol di bawah untuk membuka metode pembayaran.</p>

        <Card className="p-8 bg-white shadow-lg rounded-2xl">
          <p className="text-sm text-gray-500 mb-2">Total Tagihan</p>
          <p className="text-4xl font-bold text-[#295782] mb-8">
            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(transaction.amount)}
          </p>

          <div className="space-y-4">
            <Button onClick={handlePayNow} className="w-full py-6 text-lg bg-[#295782] hover:bg-[#1e4060]">
              Bayar Sekarang
            </Button>
            
            <Button onClick={handleCheckStatus} variant="outline" className="w-full py-6">
              <RefreshCw className="w-4 h-4 mr-2" /> Cek Status Otomatis
            </Button>

            <Button onClick={() => navigate('/dashboard')} variant="ghost" className="w-full text-gray-500">
               Kembali ke Dashboard
            </Button>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 rounded-lg text-xs text-yellow-700 text-left">
            <p><strong>Catatan:</strong></p>
            <ul className="list-disc ml-4 mt-1 space-y-1">
                <li>Klik "Bayar Sekarang" untuk memilih QRIS / Transfer Bank.</li>
                <li>Setelah bayar, status akan otomatis berubah dalam beberapa detik.</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}