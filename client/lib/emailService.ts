// src/lib/emailService.ts
import { Resend } from 'resend';

const resend = new Resend(import.meta.env.VITE_RESEND_API_KEY);

interface SendPaymentConfirmationEmailParams {
  userEmail: string;
  userName: string;
  packageName: string;
  amount: number;
  transactionId: string;
  validUntil: string;
}

export const sendPaymentConfirmationEmail = async ({
  userEmail,
  userName,
  packageName,
  amount,
  transactionId,
  validUntil,
}: SendPaymentConfirmationEmailParams) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Kelas Kampus <noreply@kelaskampus.com>',
      to: userEmail,
      subject: '✅ Pembayaran Berhasil Dikonfirmasi - Kelas Kampus',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #295782 0%, #1e4060 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .success-badge { background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; margin-bottom: 20px; }
            .info-box { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .info-row:last-child { border-bottom: none; }
            .label { color: #6b7280; font-weight: 500; }
            .value { color: #1e293b; font-weight: 600; }
            .button { background: #295782; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 20px; font-weight: 600; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; padding: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">🎉 Pembayaran Dikonfirmasi!</h1>
            </div>
            <div class="content">
              <div class="success-badge">✓ BERHASIL</div>
              
              <p style="font-size: 16px;">Halo <strong>${userName}</strong>,</p>
              
              <p>Selamat! Pembayaran Anda telah berhasil dikonfirmasi oleh tim kami. Anda sekarang memiliki akses penuh ke paket premium yang telah Anda pilih.</p>
              
              <div class="info-box">
                <h3 style="margin-top: 0; color: #295782;">Detail Pembelian</h3>
                <div class="info-row">
                  <span class="label">Paket</span>
                  <span class="value">${packageName}</span>
                </div>
                <div class="info-row">
                  <span class="label">Total Pembayaran</span>
                  <span class="value">${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)}</span>
                </div>
                <div class="info-row">
                  <span class="label">ID Transaksi</span>
                  <span class="value">#${transactionId}</span>
                </div>
                <div class="info-row">
                  <span class="label">Berlaku Hingga</span>
                  <span class="value">${validUntil}</span>
                </div>
              </div>
              
              <div style="text-align: center;">
                <a href="${window.location.origin}/paket-premium" class="button">Mulai Belajar Sekarang →</a>
              </div>
              
              <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">Jika Anda memiliki pertanyaan, jangan ragu untuk menghubungi tim support kami.</p>
            </div>
            <div class="footer">
              <p><strong>Kelas Kampus</strong><br>Platform Persiapan UTBK Terbaik</p>
              <p style="font-size: 12px; color: #9ca3af;">Email ini dikirim otomatis, mohon tidak membalas email ini.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('❌ Email send error:', error);
      return { success: false, error };
    }

    console.log('✅ Email sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Email service error:', error);
    return { success: false, error };
  }
};
