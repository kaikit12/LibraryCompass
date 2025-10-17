import type { Metadata } from 'next';
import './globals.css';
import { Inter } from 'next/font/google';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { AuthProvider } from '@/context/auth-context';
import { ThemeProvider } from '@/context/theme-context';
import { AuthGuard } from '@/components/auth/auth-guard';
import { AppHeader } from '@/components/layout/app-header';
import { AppFooter } from '@/components/layout/app-footer';
import { ConnectionStatus } from '@/components/ui/connection-status';
import { FirebaseInitializer } from '@/components/firebase-initializer';
import { FirebaseDebugPanel } from '@/components/debug/firebase-debug';
import { AuthStatusIndicator } from '@/components/ui/auth-status';
import { FirebaseErrorBoundary } from '@/components/error-boundary';
import { GoogleRedirectHandler } from '@/components/auth/google-redirect-handler';

// Initialize ultimate Firebase error suppressor
import '@/lib/ultimate-suppressor';
import '@/lib/global-error-handler';


export const metadata: Metadata = {
  title: 'Library Compass',
  description: 'A web app for library management, streamlining books, readers, and borrow/return records.',
};

const inter = Inter({ subsets: ['latin', 'vietnamese'], weight: ['400','500','600','700','800'], variable: '--font-inter' });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Fonts are loaded via next/font */}
      </head>
      <body className={cn('font-body antialiased', inter.variable)}>
        <FirebaseErrorBoundary>
          <ThemeProvider>
            <FirebaseInitializer />
            <GoogleRedirectHandler />
            <AuthProvider>
                <AuthGuard>
                    <SidebarProvider>
                        <AppSidebar />
                        <SidebarInset>
                          <AppHeader />
                          <div className="flex-1 p-4 md:p-6 lg:p-8">
                            {/* Debug panels - hidden in production */}
                            {process.env.NODE_ENV === 'development' && (
                              <>
                                {/* <FirebaseDebugPanel />
                                <ConnectionStatus />
                                <AuthStatusIndicator /> */}
                              </>
                            )}
                            {children}
                          </div>
                          <AppFooter />
                        </SidebarInset>
                    </SidebarProvider>
                </AuthGuard>
            </AuthProvider>
          </ThemeProvider>
        </FirebaseErrorBoundary>
        <Toaster />
      </body>
    </html>
  );
}
