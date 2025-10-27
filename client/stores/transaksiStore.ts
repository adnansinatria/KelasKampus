// src/stores/paketTransaksiStore.ts

import { create } from 'zustand';

export interface Paket {
  id: string;
  name: string;
  price: number;
  duration: number;
  benefits: string[];
  tryout_count?: number;
  created_at?: string;
}

export interface Transaksi {
  id: string;
  user_name: string;
  user_email: string;
  payment_method: string;
  amount: number;
  status: 'success' | 'failed' | 'pending';
  created_at: string;
}

interface PaketTransaksiState {
  // Paket State
  pakets: Paket[];
  setPakets: (pakets: Paket[]) => void;

  // Transaksi State
  transaksis: Transaksi[];
  setTransaksis: (transaksis: Transaksi[]) => void;
}

const usePaketTransaksiStore = create<PaketTransaksiState>((set) => ({
  // Initial State
  pakets: [],
  transaksis: [],

  // Setters
  setPakets: (pakets) => set({ pakets }),
  setTransaksis: (transaksis) => set({ transaksis }),
}));

export default usePaketTransaksiStore;
