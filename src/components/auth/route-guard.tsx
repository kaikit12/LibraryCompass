/**
 * Enhanced Route Protection Component
 * - Role-based access control
 * - Session validation
 * - Redirect handling
 */

"use client";

import { useAuth } from '@/context/secure-auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface RouteGuardProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'reader' | 'librarian';
  requireEmailVerification?: boolean;
  fallbackPath?: string;
}

export function RouteGuard({
  children,
  requiredRole,
  requireEmailVerification = false,
  fallbackPath = '/login'
}: RouteGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (loading) return;

    // Not logged in
    if (!user) {
      router.push(fallbackPath);
      return;
    }

    // Email verification check
    if (requireEmailVerification && !user.emailVerified) {
      router.push('/verify-email');
      return;
    }

    // Role-based access check
    if (requiredRole && user.role !== requiredRole) {
      // Check if user has sufficient privileges
      const roleHierarchy = ['reader', 'librarian', 'admin'];
      const userRoleIndex = roleHierarchy.indexOf(user.role);
      const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);
      
      if (userRoleIndex < requiredRoleIndex) {
        router.push('/unauthorized');
        return;
      }
    }

    setIsAuthorized(true);
  }, [user, loading, requiredRole, requireEmailVerification, router, fallbackPath]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Checking authorization...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Higher-order component for page-level protection
export function withRouteGuard<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<RouteGuardProps, 'children'>
) {
  return function GuardedComponent(props: P) {
    return (
      <RouteGuard {...options}>
        <Component {...props} />
      </RouteGuard>
    );
  };
}

// Admin route protection
export function AdminGuard({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard 
      requiredRole="admin" 
      requireEmailVerification={true}
      fallbackPath="/login"
    >
      {children}
    </RouteGuard>
  );
}

// Librarian+ route protection
export function LibrarianGuard({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard 
      requiredRole="librarian" 
      requireEmailVerification={true}
      fallbackPath="/login"
    >
      {children}
    </RouteGuard>
  );
}

// User route protection (any authenticated user)
export function UserGuard({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard 
      requireEmailVerification={true}
      fallbackPath="/login"
    >
      {children}
    </RouteGuard>
  );
}