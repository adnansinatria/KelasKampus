import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Request password reset for:", email);
  };

  return (
    <div className="min-h-screen bg-[#89B0C7] flex items-center justify-center p-4 md:p-8 lg:p-12">
      <div className="w-full max-w-md bg-white rounded-lg overflow-hidden shadow-xl p-8">
        <h1 className="text-2xl font-bold mb-2">Lupa Password</h1>
        <p className="text-sm text-gray-600 mb-6">Masukkan email Anda untuk menerima instruksi reset password.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="Masukkan Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-[42px] rounded-[10px] border-[1.5px] border-[#CEDEE8] text-[13px] placeholder:text-black/27"
          />

          <Button type="submit" className="w-full h-[44px] bg-[#295782] text-white rounded-[8px]">Kirim Instruksi</Button>
        </form>

        <div className="mt-6 text-sm">
          <Link to="/signin" className="text-[#295782] font-medium">Kembali ke Masuk</Link>
        </div>
      </div>
    </div>
  );
}
