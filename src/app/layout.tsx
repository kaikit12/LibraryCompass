import type { Metadata } from 'next';
import './globals.css';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { AuthProvider } from '@/context/auth-context';
import { AuthGuard } from '@/components/auth/auth-guard';
import { AppHeader } from '@/components/layout/app-header';


export const metadata: Metadata = {
  title: 'Library Compass',
  description: 'A web app for library management, streamlining books, readers, and borrow/return records.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap" rel="stylesheet" />
      </head>
      <body className={cn('font-body antialiased')}>
        <AuthProvider>
            <AuthGuard>
                <SidebarProvider>
                    <AppSidebar />
                    <SidebarInset>
                      <AppHeader />
                      <div className="p-4 sm:p-6 md:p-8">
                        {children}
                      </div>
                    </SidebarInset>
                </SidebarProvider>
            </AuthGuard>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
