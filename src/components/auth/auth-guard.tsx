
"use client";

import { useAuth } from "@/context/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "../ui/skeleton";

const authRoutes = ["/login", "/register"];
const publicRoutePatterns = [
    /^\/books\/[a-zA-Z0-9]+$/, // Matches /books/{id}
];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isAuthRoute = authRoutes.includes(pathname);
  const isPublicPatternRoute = publicRoutePatterns.some(pattern => pattern.test(pathname));

  useEffect(() => {
    // This effect handles redirection logic ONLY for protected routes and auth routes.
    // It deliberately ignores public pattern routes.
    if (loading || isPublicPatternRoute) {
      return; // Do nothing if loading or on a public page like /books/[id]
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
  }, [user, loading, router, pathname, isAuthRoute, isPublicPatternRoute]);

  // --- Render Logic ---

  // 1. If it's a public pattern route, render it immediately. No loading skeletons.
  if (isPublicPatternRoute) {
    return <>{children}</>;
  }

  // 2. While loading, or if a redirect is about to happen for a protected/auth route, show a skeleton.
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

  // 3. If everything is fine (e.g., user is logged in on a protected route), render the children.
  return <>{children}</>;
}
