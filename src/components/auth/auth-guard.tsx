"use client";

import { useAuth } from "@/context/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Skeleton } from "../ui/skeleton";

const publicRoutes = ["/login", "/register"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    // If loading is finished and there's no user, redirect
    if (!loading) {
      if (!user && !publicRoutes.includes(pathname)) {
        router.push("/login");
      } else if (user && publicRoutes.includes(pathname)) {
        router.push("/");
      } else {
        setIsVerifying(false);
      }
    }
  }, [user, loading, router, pathname]);

  if (isVerifying || loading) {
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

  return <>{children}</>;
}