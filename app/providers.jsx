'use client';

import { AuthProvider } from '@/lib/useAuthEnhanced';

export default function Providers({ children }) {
  return (
    <AuthProvider>{children}</AuthProvider>
  );
}
