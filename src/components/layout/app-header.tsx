"use client"

import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { NotificationPopover } from "./notification-popover"
import { ThemeToggle } from "./theme-toggle"
import { useAuth } from "@/context/auth-context"

export function AppHeader() {
  const { isMobile, state } = useSidebar()
  const { user } = useAuth();
  
  return (
    <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
      <div className={cn(
        "flex items-center",
        !isMobile && state === 'expanded' && 'hidden' 
      )}>
        <SidebarTrigger />
      </div>
      <div className="flex-1">
        {/* Placeholder for future elements like breadcrumbs or global search */}
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        {user && <NotificationPopover userId={user.id} />}
      </div>
    </header>
  )
}
