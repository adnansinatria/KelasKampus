// lib/tryoutAccess.ts
// Simple logging untuk tryout access

export function logAccessAttempt(
  userId: string,
  tryoutId: string,
  action: 'view' | 'start' | 'continue' | 'submit',
  success: boolean,
  metadata?: any
): void {
  console.log(`📝 [ACCESS LOG] ${action.toUpperCase()}`, {
    userId,
    tryoutId,
    success,
    timestamp: new Date().toISOString(),
    ...metadata,
  });

  // Optional: Save to database
  // await supabase.from('access_logs').insert([...])
}