// client/lib/api.ts - REFACTORED VERSION

import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || 
                import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || 
                'http://localhost:54321/functions/v1';

console.log('🔗 API URL:', API_URL);

// ✅ Cache system
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class APICache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      console.log(`📦 Cache MISS for key: ${key}`);
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;
    const isExpired = age > this.CACHE_DURATION;

    if (isExpired) {
      console.log(`⏰ Cache EXPIRED for key: ${key} (age: ${age}ms)`);
      this.cache.delete(key);
      return null;
    }

    console.log(`✅ Cache HIT for key: ${key} (age: ${age}ms)`);
    return entry.data as T;
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
    console.log(`💾 Cache SET for key: ${key}`);
  }

  // ✅ CRITICAL: Global cache invalidation
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`🧹 Cache cleared (${size} entries removed)`);
  }

  clearKey(key: string): void {
    this.cache.delete(key);
    console.log(`🧹 Cache cleared for key: ${key}`);
  }

  // ✅ NEW: Clear specific patterns (useful for invalidating related data)
  clearPattern(pattern: string): void {
    let cleared = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        cleared++;
      }
    }
    console.log(`🧹 Cache pattern cleared: ${pattern} (${cleared} entries)`);
  }
}

const apiCache = new APICache();

// ✅ Helper untuk timeout
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 5000,
  operation: string = 'Operation'
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`${operation} timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutHandle);
    return result;
  } catch (error) {
    clearTimeout(timeoutHandle);
    throw error;
  }
}

/**
 * Make API call with authentication (TRYOUT ENDPOINTS - /tryouts prefix)
 */
async function apiCall(endpoint: string, options: RequestInit = {}, timeoutMs: number = 10000) {
  try {
    // ✅ Get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    console.log('🔐 Session status:', session ? 'EXISTS' : 'MISSING');
    
    if (sessionError) {
      console.error('❌ Session error:', sessionError);
      throw new Error('Failed to get session');
    }
    
    if (!session) {
      console.warn('⚠️ No session found, attempting refresh...');
      
      const { data: { session: refreshedSession }, error: refreshError } = 
        await supabase.auth.refreshSession();
      
      if (refreshError || !refreshedSession) {
        console.error('❌ Failed to refresh session:', refreshError);
        throw new Error('Not authenticated. Please login again.');
      }
      
      console.log('✅ Session refreshed successfully');
    }

    // ✅ Get final session
    const { data: { session: finalSession } } = await supabase.auth.getSession();
    
    if (!finalSession?.access_token) {
      console.error('❌ No access token found');
      throw new Error('Not authenticated');
    }

    // ✅ Add /tryouts prefix for tryout endpoints
    const url = `${API_URL}/tryouts${endpoint}`;
    
    console.log('🔄 API Call:', url);
    console.log('🔑 Token (first 20 chars):', finalSession.access_token.substring(0, 20) + '...');
    
    // ✅ Use timeout wrapper
    const response = await withTimeout(
      fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${finalSession.access_token}`,
          ...options.headers,
        },
      }),
      timeoutMs,
      `API Call ${endpoint}`
    );

    console.log('📊 Response status:', response.status);

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ API Error Response:', data);
      console.error('❌ Status:', response.status);
      throw new Error(data.message || `API call failed (${response.status})`);
    }

    console.log('✅ API Response:', data);
    return data;
    
  } catch (error: any) {
    console.error('❌ API Call Failed:', error);
    
    if (error.message.includes('timeout')) {
      throw new Error('Server lambat. Coba refresh halaman.');
    }
    
    if (error.message === 'Failed to fetch') {
      throw new Error('Tidak dapat terhubung ke server. Pastikan Edge Function sudah di-deploy.');
    }
    
    if (error.message.includes('Not authenticated')) {
      window.location.href = '/signin';
      throw new Error('Sesi berakhir. Silakan login kembali.');
    }
    
    throw error;
  }
}

/**
 * Make API call WITHOUT /tryouts prefix (untuk kampus, prodi, dashboard, etc)
 */
async function apiCallDirect(endpoint: string, options: RequestInit = {}, timeoutMs: number = 5000) {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    console.log('🔐 Session status:', session ? 'EXISTS' : 'MISSING');
    
    if (sessionError) {
      console.error('❌ Session error:', sessionError);
      throw new Error('Failed to get session');
    }
    
    if (!session) {
      console.warn('⚠️ No session found, attempting refresh...');
      
      const { data: { session: refreshedSession }, error: refreshError } = 
        await supabase.auth.refreshSession();
      
      if (refreshError || !refreshedSession) {
        console.error('❌ Failed to refresh session:', refreshError);
        throw new Error('Not authenticated. Please login again.');
      }
      
      console.log('✅ Session refreshed successfully');
    }

    const { data: { session: finalSession } } = await supabase.auth.getSession();
    
    if (!finalSession?.access_token) {
      console.error('❌ No access token found');
      throw new Error('Not authenticated');
    }

    // ✅ NO /tryouts prefix - direct to endpoint
    const url = `${API_URL}${endpoint}`;
    
    console.log('🔄 API Call (Direct):', url);
    console.log('🔑 Token (first 20 chars):', finalSession.access_token.substring(0, 20) + '...');
    
    // ✅ Use timeout wrapper
    const response = await withTimeout(
      fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${finalSession.access_token}`,
          ...options.headers,
        },
      }),
      timeoutMs,
      `API Call ${endpoint}`
    );

    console.log('📊 Response status:', response.status);

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ API Error Response:', data);
      console.error('❌ Status:', response.status);
      throw new Error(data.message || `API call failed (${response.status})`);
    }

    console.log('✅ API Response:', data);
    return data;
    
  } catch (error: any) {
    console.error('❌ API Call Failed:', error);
    
    if (error.message.includes('timeout')) {
      throw new Error('Server lambat. Coba refresh halaman.');
    }
    
    if (error.message === 'Failed to fetch') {
      throw new Error('Tidak dapat terhubung ke server. Pastikan Edge Function sudah di-deploy.');
    }
    
    if (error.message.includes('Not authenticated')) {
      window.location.href = '/signin';
      throw new Error('Sesi berakhir. Silakan login kembali.');
    }
    
    throw error;
  }
}

export const api = {
  // ✅ STUDENT METHODS
  
  getTryouts: async () => {
    return apiCall('/available');
  },

  getTryoutDetail: async (tryoutId: string) => {
    return apiCall(`/${tryoutId}/detail`);
  },

  getUserProgress: async (tryoutId: string) => {
    return apiCall(`/${tryoutId}/progress`);
  },

  createSession: async (body: {
    tryout_id: string;
    kategori_id?: string;
    target_kampus: string;
    target_jurusan: string;
  }) => {
    return apiCall('/sessions/create', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  getSession: async (sessionId: string) => {
    return apiCall(`/sessions/${sessionId}`);
  },

  getQuestions: async (sessionId: string) => {
    return apiCall(`/sessions/${sessionId}/questions`);
  },

  // OLD METHOD (Keep for backward compatibility if needed)
  saveAnswer: async (body: {
    session_id: string;
    question_id: string;
    selected_answer: string;
  }) => {
    return apiCall('/answers', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  // ✅ NEW: Save Answer ke tabel 'student_responses' (IRT Optimized)
  saveAnswerIRT: async (body: {
    session_id: string;
    question_id: string;
    selected_answer: string;
    is_correct: boolean;
    question_difficulty: number;
    question_discrimination: number;
  }) => {
    return supabase.from('student_responses').upsert(body, { 
      onConflict: 'session_id,question_id'
    });
  },

  updateTimer: async (sessionId: string, timeRemaining: number) => {
    return apiCall(`/sessions/${sessionId}/timer`, {
      method: 'PUT',
      body: JSON.stringify({ time_remaining: timeRemaining }),
    });
  },

  saveBookmarks: async (sessionId: string, bookmarkedQuestions: number[]) => {
    return apiCall(`/sessions/${sessionId}/bookmarks`, {
      method: 'PUT',
      body: JSON.stringify({ bookmarked_questions: bookmarkedQuestions }),
    });
  },

  getBookmarks: async (sessionId: string) => {
    return apiCall(`/sessions/${sessionId}/bookmarks`);
  },

  submitTryout: async (sessionId: string) => {
    // ✅ Clear cache setelah submit untuk memastikan data fresh
    const result = await apiCall(`/sessions/${sessionId}/submit`, {
      method: 'POST',
    });
    
    // Invalidate cache setelah submit sukses
    apiCache.clear();
    console.log('🧹 Cache cleared after tryout submission');
    
    return result;
  },

  /**
   * OLD: Calculate IRT score via REST API (Client/Server Hybrid)
   */
  calculateIRTScore: async (sessionId: string, userId: string) => {
    console.log(`🧮 Triggering IRT Calculation for session: ${sessionId}`);
    return apiCall('/irt/score', {
      method: 'POST',
      body: JSON.stringify({ sessionId, userId }),
    }, 15000);
  },

  // ✅ NEW: Panggil Edge Function 'calculate-irt' (Server-Side Pure)
  calculateIRTScoreServer: async (sessionId: string) => {
    console.log(`🧮 Triggering Server-Side IRT Calculation for: ${sessionId}`);
    
    // Panggil Edge Function
    const { data, error } = await supabase.functions.invoke('calculate-irt', {
      body: { session_id: sessionId },
    });

    if (error) {
      // ✅ Ekstrak pesan error sebenarnya dari response body Edge Function
      let detailMessage = error.message || 'Unknown error';
      try {
        const context = (error as any).context;
        if (context) {
          const text = await context.text?.();
          if (text) {
            const parsed = JSON.parse(text);
            detailMessage = parsed.error || parsed.message || text;
          }
        }
      } catch {
        // abaikan parse error, gunakan message asli
      }
      console.error('❌ Edge Function Error:', error);
      console.error('❌ Detail dari server:', detailMessage);
      console.error('❌ Session ID:', sessionId);
      console.error('👉 Cek: Supabase Dashboard → Edge Functions → calculate-irt → Logs');
      throw new Error(`IRT calculation failed: ${detailMessage}`);
    }

    console.log('✅ Server Result:', data);
    return data;
  },

  /**
   * Get IRT Report (Optional)
   */
  getIRTReport: async (sessionId: string) => {
    return apiCall(`/irt/report/${sessionId}`);
  },

  // ✅ KAMPUS/PRODI METHODS (tanpa /tryouts prefix + CACHE)
  
  getKampusList: async () => {
    const cacheKey = 'kampus_list';
    const cached = apiCache.get(cacheKey);
    if (cached) return cached;

    console.log("🔄 Fetching kampus from API (not in cache)...");
    const startTime = Date.now();
    const result = await apiCallDirect('/kampus', {}, 5000);
    apiCache.set(cacheKey, result);
    console.log(`✅ Kampus fetched and cached in ${Date.now() - startTime}ms`);
    return result;
  },

  getProgramStudiList: async (kampusId: string) => {
    const cacheKey = `prodi_${kampusId}`;
    const cached = apiCache.get(cacheKey);
    if (cached) return cached;

    console.log(`🔄 Fetching prodi for kampus ${kampusId} from API (not in cache)...`);
    const startTime = Date.now();
    const result = await apiCallDirect(`/program-studi?kampus_id=${kampusId}`, {}, 5000);
    apiCache.set(cacheKey, result);
    console.log(`✅ Prodi fetched and cached in ${Date.now() - startTime}ms`);
    return result;
  },

  getUserTarget: async (tryoutId: string) => {
    return apiCallDirect(`/user-targets/${tryoutId}`, {}, 5000);
  },

  saveUserTarget: async (body: {
    tryout_id: string;
    kampus_name: string;
    prodi_name: string;
  }) => {
    apiCache.clearKey(`prodi_${body.tryout_id}`);
    return apiCallDirect('/user-targets', {
      method: 'POST',
      body: JSON.stringify(body),
    }, 5000);
  },

  getDashboardStats: async () => {
    return apiCallDirect('/dashboard/stats', {}, 5000);
  },

  getRecentActivities: async () => {
    return apiCallDirect('/dashboard/activities', {}, 5000);
  },

  // ✅ ADMIN METHODS (dengan /tryouts prefix)
  
  adminGetTryouts: async () => {
    return apiCall('/tryouts', {}, 10000);
  },

  adminGetTryoutDetail: async (tryoutId: string) => {
    return apiCall(`/admin/tryouts/${tryoutId}`, {}, 10000);
  },

  adminGetTryoutQuestions: async (tryoutId: string) => {
    const endpoint = `/admin/tryouts/${tryoutId}/questions`;
    console.log("🔄 Fetching questions from:", endpoint);
    
    const result = await apiCall(endpoint, {}, 10000);
    
    if (result?.data && Array.isArray(result.data)) {
      const withPembahasan = result.data.filter((q: any) => q.pembahasan).length;
      console.log(`📚 Loaded ${result.data.length} questions, ${withPembahasan} with pembahasan`);
      
      if (result.data.length > 0) {
        const firstQ = result.data[0];
        console.log('📝 First question sample:', {
          id: firstQ.id,
          soal: firstQ.soal_text?.substring(0, 30),
          has_pembahasan: !!firstQ.pembahasan,
          pembahasan_preview: firstQ.pembahasan?.substring(0, 50) || 'TIDAK ADA',
          all_fields: Object.keys(firstQ),
        });
      }
    }
    
    return result;
  },

  adminCreateTryout: async (body: {
    nama_tryout: string;
    tanggal_ujian: string;
    kategori: string;
    durasi_menit: number;
    status: string;
  }) => {
    return apiCall('/tryouts', {
      method: 'POST',
      body: JSON.stringify(body),
    }, 10000);
  },

  adminUpdateTryout: async (tryoutId: string, body: any) => {
    return apiCall(`/tryouts?id=${tryoutId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }, 10000);
  },

  adminDeleteTryout: async (tryoutId: string) => {
    return apiCall(`/tryouts?id=${tryoutId}`, {
      method: 'DELETE',
    }, 10000);
  },

  adminBulkInsertQuestions: async (questions: any[]) => {
    console.log('📤 API: Bulk inserting questions:', questions.length);
    
    if (questions.length > 0) {
      const sample = questions[0];
      console.log('📝 API: Sample question to insert:', {
        soal_text: sample.soal_text?.substring(0, 50),
        has_pembahasan: !!sample.pembahasan,
        pembahasan_length: sample.pembahasan?.length || 0,
        pembahasan_preview: sample.pembahasan?.substring(0, 50) || 'TIDAK ADA',
        all_fields: Object.keys(sample),
      });
    }
    
    const withPembahasan = questions.filter(q => q.pembahasan).length;
    console.log(`✅ Sending ${withPembahasan} questions with pembahasan out of ${questions.length}`);
    
    const result = await apiCall('/questions', {
      method: 'POST',
      body: JSON.stringify({ questions }),
    }, 10000);
    
    console.log('✅ API: Insert successful, count:', result.count || result.data?.length || 0);
    
    return result;
  },

  adminDeleteQuestions: async (tryoutId: string) => {
    return apiCall(`/questions?tryout_id=${tryoutId}`, {
      method: 'DELETE',
    }, 10000);
  },

  // ✅ CRITICAL: Export cache methods untuk akses eksternal
  clearCache: () => {
    apiCache.clear();
  },

  clearCacheKey: (key: string) => {
    apiCache.clearKey(key);
  },

  clearCachePattern: (pattern: string) => {
    apiCache.clearPattern(pattern);
  },
};