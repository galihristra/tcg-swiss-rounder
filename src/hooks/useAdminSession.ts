import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSession, onAuthStateChange } from '../lib/auth';

export function useAdminSession() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    getSession()
      .then(setSession)
      .catch((e) => console.error('Failed to get session', e));
    return onAuthStateChange(setSession);
  }, []);

  return { session, isAdmin: !!session };
}
