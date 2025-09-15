
"use client";

import { useAuth } from "@/context/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "../ui/skeleton";

const publicRoutes = ["/login", "/register"];
const publicRoutePatterns = [
    /^\/books\/[a-zA-Z0-9]+$/, // Matches /books/{id}
]

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return; // Wait for loading to finish

    const isPublicRoute = publicRoutes.includes(pathname) || publicRoutePatterns.some(pattern => pattern.test(pathname));

    // If the user is not logged in and is trying to access a protected route, redirect to login.
    if (!user && !isPublicRoute) {
      router.push("/login");
    } 
    
    // If the user is logged in and is on a public route (excluding book details), redirect them to the appropriate page.
    else if (user && publicRoutes.includes(pathname)) {
      if (user.role === 'reader') {
        router.push("/books");
      } else {
        router.push("/");
      }
    }
  }, [user, loading, router, pathname]);

  // While loading, or if we are about to redirect, show a loading skeleton.
  const isPublicRouteCheck = publicRoutes.includes(pathname) || publicRoutePatterns.some(pattern => pattern.test(pathname));
  if (loading || (!user && !isPublicRouteCheck) || (user && publicRoutes.includes(pathname))) {
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
