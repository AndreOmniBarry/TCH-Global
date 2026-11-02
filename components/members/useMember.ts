'use client';

import { useCallback, useEffect, useState } from 'react';

export type MemberInfo = { id: string; name: string; email: string; newsletter: boolean; phone?: string; createdAt: string; wrapped?: boolean; kids?: { id: string; name: string; age: number }[]; teen?: { birthYear: number; guardianEmail: string } };

export function useMember() {
  const [member, setMember] = useState<MemberInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try {
      const r = await fetch('/api/auth/me', { cache: 'no-store' });
      setMember((await r.json()).member ?? null);
    } catch {
      setMember(null);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return { member, loading, refresh, setMember };
}
