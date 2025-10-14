// 📁 client/stores/tryoutStore.ts

import { create } from 'zustand';

// 👈 (Opsional tapi direkomendasikan) Buat tipe data untuk sebuah soal
interface Question {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  answer: string;
}

// Perbarui interface utama
interface TryoutState {
  tryoutInfo: {
    id: string | null;
    name: string;
    tanggal: string;
  };
  isInfoAdded: boolean;
  // 👇 BARU: Tambahkan state untuk menyimpan soal berdasarkan kategori
  questionsByCategory: {
    [kategoriId: string]: Question[]; // Contoh: { 'kpu': [soal1, soal2], 'lit-id': [soal3] }
  };
  setTryoutInfo: (info: TryoutState['tryoutInfo']) => void;
  setIsInfoAdded: (status: boolean) => void;
  // 👇 BARU: Tambahkan fungsi untuk menyimpan soal ke kategori tertentu
  setQuestionsForCategory: (kategoriId: string, questions: Question[]) => void;
  resetTryout: () => void;
}

const useTryoutStore = create<TryoutState>((set) => ({
  tryoutInfo: { id: null, name: "", tanggal: "" },
  isInfoAdded: false,
  // 👇 BARU: Inisialisasi state soal sebagai objek kosong
  questionsByCategory: {},

  setTryoutInfo: (info) => set({ tryoutInfo: info }),
  setIsInfoAdded: (status) => set({ isInfoAdded: status }),

  // 👇 BARU: Implementasi fungsi untuk menyimpan soal
  setQuestionsForCategory: (kategoriId, questions) =>
    set((state) => ({
      questionsByCategory: {
        ...state.questionsByCategory, // Salin semua soal yang sudah ada
        [kategoriId]: questions,      // Timpa atau tambahkan soal untuk kategori ini
      },
    })),

  resetTryout: () => set({
    tryoutInfo: { id: null, name: "", tanggal: "" },
    isInfoAdded: false,
    questionsByCategory: {}, // Jangan lupa reset soal juga
  }),
}));

export default useTryoutStore;