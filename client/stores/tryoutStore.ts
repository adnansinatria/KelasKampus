import { create } from 'zustand';

interface Question {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  answer: string;
  pembahasan: string;
  image?: File | null;
  image_url?: string;
}

interface TryoutState {
  tryoutInfo: {
    id: string | null;
    name: string;
    tanggal: string;
    durasi: string;
  };
  isInfoAdded: boolean;
  questionsByCategory: {
    [kategoriId: string]: Question[];
  };
  setTryoutInfo: (info: TryoutState['tryoutInfo']) => void;
  setIsInfoAdded: (status: boolean) => void;
  setQuestionsForCategory: (kategoriId: string, questions: Question[]) => void;
  resetTryout: () => void;
}

const useTryoutStore = create<TryoutState>((set) => ({
  tryoutInfo: { id: null, name: "", tanggal: "", durasi: "" },
  isInfoAdded: false,
  questionsByCategory: {},

  setTryoutInfo: (info) => set({ tryoutInfo: info }),
  setIsInfoAdded: (status) => set({ isInfoAdded: status }),

  setQuestionsForCategory: (kategoriId, questions) =>
    set((state) => ({
      questionsByCategory: {
        ...state.questionsByCategory,
        [kategoriId]: questions,
      },
    })),

  resetTryout: () => set({
    tryoutInfo: { id: null, name: "", tanggal: "", durasi: "" },
    isInfoAdded: false,
    questionsByCategory: {},
  }),
}));

export default useTryoutStore;
