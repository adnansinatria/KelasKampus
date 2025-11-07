// Kategori configuration untuk UTBK/SNBT
export interface KategoriInfo {
  id: string;
  nama: string;
  kode: string;
  durasi_menit: number;
  urutan: number;
  kelompok: 'TPS' | 'Literasi' | 'Matematika' | 'Sains' | 'Sosial';
}

export const KATEGORI_CONFIG: Record<string, KategoriInfo> = {
  // ============================================
  // TES POTENSI SKOLASTIK (TPS) - ALL ALIASES
  // ============================================
  'kemampuan_penalaran_umum': {
    id: 'kemampuan_penalaran_umum',
    nama: 'Kemampuan Penalaran Umum',
    kode: 'KPU',
    durasi_menit: 55,
    urutan: 1,
    kelompok: 'TPS'
  },
  'kpu': {
    id: 'kpu',
    nama: 'Kemampuan Penalaran Umum',
    kode: 'KPU',
    durasi_menit: 55,
    urutan: 1,
    kelompok: 'TPS'
  },

  'pengetahuan_pemahaman_umum': {
    id: 'pengetahuan_pemahaman_umum',
    nama: 'Pengetahuan dan Pemahaman Umum',
    kode: 'PPU',
    durasi_menit: 20,
    urutan: 2,
    kelompok: 'TPS'
  },
  'ppu': {
    id: 'ppu',
    nama: 'Pengetahuan dan Pemahaman Umum',
    kode: 'PPU',
    durasi_menit: 20,
    urutan: 2,
    kelompok: 'TPS'
  },

  'kemampuan_memahami_bacaan_menulis': {
    id: 'kemampuan_memahami_bacaan_menulis',
    nama: 'Kemampuan Memahami Bacaan dan Menulis',
    kode: 'KMBM',
    durasi_menit: 25,
    urutan: 3,
    kelompok: 'TPS'
  },
  'kmbm': {
    id: 'kmbm',
    nama: 'Kemampuan Memahami Bacaan dan Menulis',
    kode: 'KMBM',
    durasi_menit: 25,
    urutan: 3,
    kelompok: 'TPS'
  },
  'pbm': {
    id: 'pbm',
    nama: 'Pemahaman Bacaan dan Menulis',
    kode: 'PBM',
    durasi_menit: 25,
    urutan: 3,
    kelompok: 'TPS'
  },

  'pengetahuan_kuantitatif': {
    id: 'pengetahuan_kuantitatif',
    nama: 'Pengetahuan Kuantitatif',
    kode: 'PK',
    durasi_menit: 30,
    urutan: 4,
    kelompok: 'TPS'
  },
  'pk': {
    id: 'pk',
    nama: 'Pengetahuan Kuantitatif',
    kode: 'PK',
    durasi_menit: 30,
    urutan: 4,
    kelompok: 'TPS'
  },

  // ============================================
  // TES LITERASI BAHASA - ALL ALIASES
  // ============================================
  'literasi_bahasa_indonesia': {
    id: 'literasi_bahasa_indonesia',
    nama: 'Literasi dalam Bahasa Indonesia',
    kode: 'LBI',
    durasi_menit: 45,
    urutan: 5,
    kelompok: 'Literasi'
  },
  'lit-id': {
    id: 'lit-id',
    nama: 'Literasi dalam Bahasa Indonesia',
    kode: 'LBI',
    durasi_menit: 60,
    urutan: 5,
    kelompok: 'Literasi'
  },
  'bind': {
    id: 'bind',
    nama: 'Bahasa Indonesia',
    kode: 'BIND',
    durasi_menit: 60,
    urutan: 5,
    kelompok: 'Literasi'
  },

  'literasi_bahasa_inggris': {
    id: 'literasi_bahasa_inggris',
    nama: 'Literasi dalam Bahasa Inggris',
    kode: 'LBE',
    durasi_menit: 30,
    urutan: 6,
    kelompok: 'Literasi'
  },
  'lit-en': {
    id: 'lit-en',
    nama: 'Literasi dalam Bahasa Inggris',
    kode: 'LBE',
    durasi_menit: 60,
    urutan: 6,
    kelompok: 'Literasi'
  },
  'bing': {
    id: 'bing',
    nama: 'Bahasa Inggris',
    kode: 'BING',
    durasi_menit: 60,
    urutan: 6,
    kelompok: 'Literasi'
  },

  // ============================================
  // TES PENALARAN MATEMATIKA - ALL ALIASES
  // ============================================
  'penalaran_matematika': {
    id: 'penalaran_matematika',
    nama: 'Penalaran Matematika',
    kode: 'PM',
    durasi_menit: 50,
    urutan: 7,
    kelompok: 'Matematika'
  },
  'pm': {
    id: 'pm',
    nama: 'Penalaran Matematika',
    kode: 'PM',
    durasi_menit: 60,
    urutan: 7,
    kelompok: 'Matematika'
  },
  'matematika': {
    id: 'matematika',
    nama: 'Matematika',
    kode: 'MAT',
    durasi_menit: 75,
    urutan: 7,
    kelompok: 'Matematika'
  },
  'mat': {
    id: 'mat',
    nama: 'Matematika',
    kode: 'MAT',
    durasi_menit: 75,
    urutan: 7,
    kelompok: 'Matematika'
  },

  // ============================================
  // MATA PELAJARAN SAINTEK - ALL ALIASES
  // ============================================
  'fisika': {
    id: 'fisika',
    nama: 'Fisika',
    kode: 'FIS',
    durasi_menit: 60,
    urutan: 8,
    kelompok: 'Sains'
  },
  'fis': {
    id: 'fis',
    nama: 'Fisika',
    kode: 'FIS',
    durasi_menit: 60,
    urutan: 8,
    kelompok: 'Sains'
  },

  'kimia': {
    id: 'kimia',
    nama: 'Kimia',
    kode: 'KIM',
    durasi_menit: 60,
    urutan: 9,
    kelompok: 'Sains'
  },
  'kim': {
    id: 'kim',
    nama: 'Kimia',
    kode: 'KIM',
    durasi_menit: 60,
    urutan: 9,
    kelompok: 'Sains'
  },

  'biologi': {
    id: 'biologi',
    nama: 'Biologi',
    kode: 'BIO',
    durasi_menit: 60,
    urutan: 10,
    kelompok: 'Sains'
  },
  'bio': {
    id: 'bio',
    nama: 'Biologi',
    kode: 'BIO',
    durasi_menit: 60,
    urutan: 10,
    kelompok: 'Sains'
  },

  // ============================================
  // MATA PELAJARAN SOSHUM - ALL ALIASES
  // ============================================
  'ekonomi': {
    id: 'ekonomi',
    nama: 'Ekonomi',
    kode: 'EKO',
    durasi_menit: 60,
    urutan: 12,
    kelompok: 'Sosial'
  },
  'eko': {
    id: 'eko',
    nama: 'Ekonomi',
    kode: 'EKO',
    durasi_menit: 60,
    urutan: 12,
    kelompok: 'Sosial'
  },

  'geografi': {
    id: 'geografi',
    nama: 'Geografi',
    kode: 'GEO',
    durasi_menit: 60,
    urutan: 13,
    kelompok: 'Sosial'
  },
  'geo': {
    id: 'geo',
    nama: 'Geografi',
    kode: 'GEO',
    durasi_menit: 60,
    urutan: 13,
    kelompok: 'Sosial'
  },

  'sosiologi': {
    id: 'sosiologi',
    nama: 'Sosiologi',
    kode: 'SOS',
    durasi_menit: 60,
    urutan: 14,
    kelompok: 'Sosial'
  },
  'sos': {
    id: 'sos',
    nama: 'Sosiologi',
    kode: 'SOS',
    durasi_menit: 60,
    urutan: 14,
    kelompok: 'Sosial'
  },

  'sejarah': {
    id: 'sejarah',
    nama: 'Sejarah',
    kode: 'SEJ',
    durasi_menit: 60,
    urutan: 15,
    kelompok: 'Sosial'
  },
  'sej': {
    id: 'sej',
    nama: 'Sejarah',
    kode: 'SEJ',
    durasi_menit: 60,
    urutan: 15,
    kelompok: 'Sosial'
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get kategori info by ID (with normalization)
 */
export const getKategoriInfo = (kategoriId: string): KategoriInfo => {
  // Normalize ID (lowercase, trim)
  const normalizedId = kategoriId.toLowerCase().trim();
  
  // Direct match
  if (KATEGORI_CONFIG[normalizedId]) {
    return KATEGORI_CONFIG[normalizedId];
  }
  
  // Fallback: return formatted fallback
  return {
    id: kategoriId,
    nama: kategoriId
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase()),
    kode: kategoriId.substring(0, 3).toUpperCase(),
    durasi_menit: 60,
    urutan: 99,
    kelompok: 'TPS'
  };
};

/**
 * Get all categories by kelompok
 */
export const getKategoriByKelompok = (kelompok: string): KategoriInfo[] => {
  return Object.values(KATEGORI_CONFIG)
    .filter((k) => k.kelompok === kelompok)
    .sort((a, b) => a.urutan - b.urutan);
};

/**
 * Get kategori color by kelompok
 */
export const getKelompokColor = (kelompok: string): string => {
  const colors: Record<string, string> = {
    TPS: '#295782',
    Literasi: '#10B981',
    Matematika: '#F59E0B',
    Sains: '#8B5CF6',
    Sosial: '#EC4899',
  };
  return colors[kelompok] || '#6B7280';
};
