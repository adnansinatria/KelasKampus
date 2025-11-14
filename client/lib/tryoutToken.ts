// lib/tryoutToken.ts
// Simple token management untuk tryout access (NO uuid dependency)

interface AccessToken {
  token: string;
  user_id: string;
  tryout_id: string;
  created_at: number;
  expires_at: number;
}

interface TryoutSession {
  session_id: string;
  user_id: string;
  tryout_id: string;
  started_at: number;
  duration_minutes: number;
}

// ✅ Generate unique ID (without uuid library)
function generateUniqueId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// ✅ Generate access token
export function generateAccessToken(userId: string, tryoutId: string): AccessToken {
  const now = Date.now();
  const token = {
    token: `tryout_${generateUniqueId()}`,
    user_id: userId,
    tryout_id: tryoutId,
    created_at: now,
    expires_at: now + (30 * 60 * 1000), // 30 minutes
  };

  // Store in localStorage
  localStorage.setItem(`tryout_access_${tryoutId}`, JSON.stringify(token));
  
  return token;
}

// ✅ Verify access token
export function verifyAccessToken(token: string): { user_id: string; tryout_id: string } | null {
  try {
    const stored = Object.keys(localStorage).find(key => {
      if (key.startsWith('tryout_access_')) {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        return data.token === token;
      }
      return false;
    });

    if (!stored) return null;

    const data: AccessToken = JSON.parse(localStorage.getItem(stored) || '{}');
    
    // Check expiry
    if (Date.now() > data.expires_at) {
      localStorage.removeItem(stored);
      return null;
    }

    return {
      user_id: data.user_id,
      tryout_id: data.tryout_id,
    };
  } catch {
    return null;
  }
}

// ✅ Create tryout session
export function createTryoutSession(
  verified: { user_id: string; tryout_id: string },
  durationMinutes: number
): TryoutSession {
  const session: TryoutSession = {
    session_id: `session_${generateUniqueId()}`,
    user_id: verified.user_id,
    tryout_id: verified.tryout_id,
    started_at: Date.now(),
    duration_minutes: durationMinutes,
  };

  // Store in sessionStorage
  sessionStorage.setItem(`tryout_session_${verified.tryout_id}`, JSON.stringify(session));
  
  return session;
}

// ✅ Get session
export function getTryoutSession(tryoutId: string): TryoutSession | null {
  try {
    const stored = sessionStorage.getItem(`tryout_session_${tryoutId}`);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

// ✅ Clear session
export function clearTryoutSession(tryoutId: string): void {
  sessionStorage.removeItem(`tryout_session_${tryoutId}`);
}