'use client';

import { AuthProvider } from '@/lib/useAuthEnhanced';
import { ThemeProvider } from '@/lib/ThemeContext';

export default function Providers({ children }) {
  return (
    <ThemeProvider>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}
