'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardPage() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace(isAdmin() ? '/dashboard/admin' : '/dashboard/teacher');
    }
  }, [user, loading, isAdmin, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
