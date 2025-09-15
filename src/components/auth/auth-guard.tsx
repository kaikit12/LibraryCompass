
"use client";

import { useAuth } from "@/context/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "../ui/skeleton";

const authRoutes = ["/login", "/register"];
const publicRoutePatterns = [
    /^\/books\/[a-zA-Z0-9]+$/, // Matches /books/{id}
]

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return; // Wait for loading to finish

    const isAuthRoute = authRoutes.includes(pathname);
    const isPublicPatternRoute = publicRoutePatterns.some(pattern => pattern.test(pathname));
    const isProtectedRoute = !isAuthRoute && !isPublicPatternRoute;

    // If the user is not logged in and is trying to access a protected route, redirect to login.
    if (!user && isProtectedRoute) {
      router.push("/login");
    } 
    
    // If the user is logged in and is on an auth route (/login, /register), redirect them to the appropriate page.
    else if (user && isAuthRoute) {
      if (user.role === 'reader') {
        router.push("/my-books");
      } else {
        router.push("/");
      }
    }
  }, [user, loading, router, pathname]);

  const isAuthRoute = authRoutes.includes(pathname);
  const isPublicPatternRoute = publicRoutePatterns.some(pattern => pattern.test(pathname));
  const isProtectedRoute = !isAuthRoute && !isPublicPatternRoute;

  // While loading, or if we are about to redirect, show a loading skeleton.
  if (loading || (!user && isProtectedRoute) || (user && isAuthRoute)) {
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

  // If we are authenticated and on a protected route, or unauthenticated on a public route, show the children.
  return <>{children}</>;
}
