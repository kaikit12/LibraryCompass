
"use client";

import { useAuth } from "@/context/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "../ui/skeleton";

const authRoutes = ["/login", "/register", "/forgot-password"];

export function AuthGuard({ children, requiredRole }: { children: React.ReactNode; requiredRole?: string[] }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isAuthRoute = authRoutes.includes(pathname);

  useEffect(() => {
    if (loading) {
      return; // Do nothing while loading
    }

    const isProtectedRoute = !isAuthRoute;

    // If user is not logged in and tries to access a protected route, redirect to login
    if (!user && isProtectedRoute) {
      router.push("/login");
    }

    // If user is logged in and tries to access an auth route (login/register), redirect away
    if (user && isAuthRoute) {
      if (user.role === 'reader') {
        router.push("/my-books");
      } else {
        router.push("/");
      }
    }

    // If a page declares requiredRole and the current user does not have one of those roles, redirect.
    if (!loading && user && requiredRole && !requiredRole.includes(user.role)) {
      router.push('/');
    }
  }, [user, loading, router, pathname, isAuthRoute]);


  // While loading, or if a redirect is about to happen, show a skeleton.
  if (loading || (!user && !isAuthRoute) || (user && isAuthRoute)) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="space-y-4 p-8">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-10 w-32 mt-4" />
        </div>
      </div>
    );
  }

  // If everything is fine, render the children.
  return <>{children}</>;
}
