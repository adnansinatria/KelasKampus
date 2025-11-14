import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Copy, ArrowRight, Upload, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Header from '@/components/Header';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export default function PaymentInstruction() {
  const navigate = useNavigate();
  const location = useLocation();

  const [transaction, setTransaction] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    loadTransactionData();
  }, [navigate]);

  const loadTransactionData = () => {
    let transactionData = location.state?.transaction;
    let paymentMethodData = location.state?.paymentMethod;
    
    if (!transactionData) {
      const savedData = localStorage.getItem('current_transaction');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        transactionData = parsed.transaction;
        paymentMethodData = parsed.paymentMethod;
        console.log('✅ Loaded from localStorage:', transactionData);
      }
    } else {
      console.log('✅ Loaded from location.state:', transactionData);
    }

    if (!transactionData) {
      console.error('❌ No transaction data');
      toast.error('Data transaksi tidak ditemukan');
      navigate('/packages');
      return;
    }

    setTransaction(transactionData);
    setPaymentMethod(paymentMethodData);
    loadUserData();
  };

  const loadUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const { data: userData } = await supabase
            .from("users")
            .select("user_id, nama_lengkap, email, photo_profile")
            .eq("auth_id", authUser.id)
            .single();

          if (userData) {
            setCurrentUser({
              user_id: userData.user_id,
              nama: userData.nama_lengkap || authUser.user_metadata?.nama_lengkap || authUser.email?.split("@")[0] || "User",
              email: userData.email || authUser.email,
              photo: userData.photo_profile
            });
            return;
          }
        }
      } else {
        const token = localStorage.getItem("auth_token");
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const { data: userData } = await supabase
            .from("users")
            .select("user_id, nama_lengkap, email, photo_profile")
            .eq("user_id", payload.user_id)
            .single();

          if (userData) {
            setCurrentUser({
              user_id: userData.user_id,
              nama: userData.nama_lengkap || payload.nama_lengkap || "User",
              email: userData.email || payload.email,
              photo: userData.photo_profile
            });
            return;
          }
        }
      }

      setCurrentUser({ user_id: "temp", nama: "User", email: "user@example.com" });
    } catch (error) {
      console.error('Error loading user:', error);
      setCurrentUser({ user_id: "temp", nama: "User", email: "user@example.com" });
    }
  };

  const getPaymentInfo = () => {
    switch (paymentMethod) {
      case 'e_wallet':
        return {
          title: 'Transfer ke E-Wallet',
          accounts: [
            { name: 'GoPay', number: '0812-3456-7890', holder: 'Kelas Kampus' },
            { name: 'OVO', number: '0812-3456-7890', holder: 'Kelas Kampus' },
            { name: 'DANA', number: '0812-3456-7890', holder: 'Kelas Kampus' }
          ]
        };
      case 'bank_transfer':
        return {
          title: 'Transfer ke Rekening Bank',
          accounts: [
            { name: 'BCA', number: '1234567890', holder: 'Kelas Kampus' },
            { name: 'Mandiri', number: '9876543210', holder: 'Kelas Kampus' },
            { name: 'BNI', number: '5555666677', holder: 'Kelas Kampus' }
          ]
        };
      case 'virtual_account':
        return {
          title: 'Virtual Account Number',
          accounts: [
            { name: 'VA Number', number: '88770012345678', holder: 'Atas Nama: ' + (currentUser?.nama || 'User') }
          ]
        };
      case 'saldo_kampus':
        return {
          title: 'Pembayaran Saldo',
          accounts: [
            { name: 'Saldo Kelas Kampus', number: 'Otomatis terpotong', holder: 'dari akun Anda' }
          ]
        };
      default:
        return { title: 'Informasi Pembayaran', accounts: [] };
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} berhasil disalin!`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 5MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast.error('File harus berupa gambar');
        return;
      }

      setProofFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // ✅ UPDATED: Upload ke Supabase Storage + Update Database (FIXED)
  const handleUploadProof = async () => {
    if (!proofFile) {
        toast.error('Pilih file bukti pembayaran terlebih dahulu');
        return;
    }

    if (!transaction?.id) {
        toast.error('ID transaksi tidak ditemukan');
        return;
    }

    try {
        setIsUploading(true);

        // 1. Upload file ke Supabase Storage
        const fileExt = proofFile.name.split('.').pop();
        const fileName = `${transaction.id}_${Date.now()}.${fileExt}`;
        
        // ✅ FIX 1: Hapus prefix folder, langsung nama file saja
        const filePath = fileName; // ❌ OLD: `payment-proofs/${fileName}`

        console.log('📤 Uploading file to:', filePath);

        const { data: uploadData, error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(filePath, proofFile, {
            cacheControl: '3600',
            upsert: false
        });

        if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Upload gagal: ${uploadError.message}`);
        }

        console.log('✅ Upload success:', uploadData);

        // 2. Get public URL
        const { data: { publicUrl } } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(filePath);

        console.log('🔗 Public URL:', publicUrl);

        // ✅ FIX 2: Tambahkan .select() dan proper error handling
        const { data: updatedTransaction, error: updateError } = await supabase
        .from('transactions')
        .update({
            payment_proof: publicUrl,
            updated_at: new Date().toISOString()
        })
        .eq('id', transaction.id)
        .select()
        .single();

        if (updateError) {
        console.error('Update error:', updateError);
        
        // Rollback: Hapus file yang sudah diupload
        await supabase.storage
            .from('payment-proofs')
            .remove([filePath]);
        
        throw new Error(`Gagal update transaksi: ${updateError.message}`);
        }

        console.log('✅ Transaction updated:', updatedTransaction);

        // 4. Update localStorage
        const existingTransactions = JSON.parse(localStorage.getItem('package_transactions') || '[]');
        const updatedTransactions = existingTransactions.map((t: any) => {
        if (t.id === transaction.id) {
            return { 
            ...t, 
            payment_proof: publicUrl,
            proof_uploaded: true,
            proof_uploaded_at: new Date().toISOString()
            };
        }
        return t;
        });
        localStorage.setItem('package_transactions', JSON.stringify(updatedTransactions));
        localStorage.removeItem('current_transaction');

        toast.success('Bukti pembayaran berhasil diupload!');
        toast.info('Admin akan memverifikasi dalam 1x24 jam');
        
        setTimeout(() => {
        navigate('/dashboard');
        }, 2000);

    } catch (error: any) {
        console.error('Upload error:', error);
        toast.error(error.message || 'Gagal upload bukti pembayaran');
    } finally {
        setIsUploading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: "currency",
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (!transaction) {
    return (
      <div className="min-h-screen bg-[#EFF6FB] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#295782] mx-auto mb-4"></div>
          <p className="text-[#64748B]">Memuat data transaksi...</p>
        </div>
      </div>
    );
  }

  const paymentInfo = getPaymentInfo();

  return (
    <div className="min-h-screen bg-[#EFF6FB]">
      <Header 
        userName={currentUser?.nama || "User"}
        userPhoto={currentUser?.photo || null}
        activeMenu="package"
        variant="default"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Success Message */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-[#1E293B] mb-2">
            Transaksi Berhasil Dibuat!
          </h1>
          <p className="text-sm text-[#64748B]">
            Silakan lakukan pembayaran sesuai instruksi di bawah
          </p>
        </div>

        {/* Payment Instructions */}
        <Card className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-[#1E293B] mb-4">
            {paymentInfo.title}
          </h2>

          <div className="space-y-4">
            {paymentInfo.accounts.map((account, idx) => (
              <div key={idx} className="p-4 bg-[#F8FAFC] rounded-xl border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-[#1E293B]">
                    {account.name}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopy(account.number, account.name)}
                    className="h-7 px-2"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                <p className="text-lg font-bold text-[#295782] mb-1 font-mono">
                  {account.number}
                </p>
                <p className="text-xs text-[#64748B]">
                  {account.holder}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 bg-[#FFF7ED] border border-[#FB923C] rounded-xl">
            <p className="text-sm text-[#EA580C] font-medium mb-2">
              ⚠️ Penting:
            </p>
            <ul className="text-xs text-[#475569] space-y-1">
              <li>• Transfer tepat sesuai nominal: <span className="font-bold">{formatPrice(transaction?.amount || 0)}</span></li>
              <li>• Simpan bukti transfer untuk verifikasi</li>
              <li>• Admin akan memverifikasi dalam 1x24 jam</li>
              <li>• Cek status transaksi di menu Profile → Transaksi</li>
            </ul>
          </div>
        </Card>

        {/* Upload Proof Section */}
        <Card className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-[#1E293B] mb-4">
            Upload Bukti Pembayaran
          </h2>

          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-[#295782] transition-colors">
              <input
                type="file"
                id="proof-upload"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="proof-upload" className="cursor-pointer">
                {proofPreview ? (
                  <div className="space-y-3">
                    <img 
                      src={proofPreview} 
                      alt="Preview" 
                      className="max-h-48 mx-auto rounded-lg border border-gray-200"
                    />
                    <p className="text-sm text-[#16A34A] font-medium flex items-center justify-center gap-2">
                      <Check className="w-4 h-4" />
                      {proofFile?.name}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        setProofFile(null);
                        setProofPreview('');
                      }}
                    >
                      Ganti File
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-16 h-16 bg-[#F0F7FF] rounded-full flex items-center justify-center mx-auto">
                      <Upload className="w-8 h-8 text-[#295782]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#1E293B] mb-1">
                        Klik untuk upload bukti transfer
                      </p>
                      <p className="text-xs text-[#64748B]">
                        Format: JPG, PNG (Max. 5MB)
                      </p>
                    </div>
                  </div>
                )}
              </label>
            </div>

            <Button
              onClick={handleUploadProof}
              disabled={!proofFile || isUploading}
              className="w-full py-6 bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold rounded-xl shadow-lg transition-all disabled:opacity-50"
            >
              {isUploading ? 'Mengupload...' : 'Kirim Bukti Pembayaran'}
            </Button>

            <Button
              onClick={() => {
                localStorage.removeItem('current_transaction');
                navigate('/dashboard');
              }}
              variant="ghost"
              className="w-full text-sm text-[#295782] hover:text-[#1e4060] font-medium"
            >
              Kembali ke Dashboard
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
