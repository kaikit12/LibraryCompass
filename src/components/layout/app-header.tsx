"use client"

import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export function AppHeader() {
  const { isMobile, state } = useSidebar()
  
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
      <div className={cn(
        "flex items-center",
        !isMobile && state === 'expanded' && 'hidden' 
      )}>
        <SidebarTrigger />
      </div>
      {/* You can add other header elements here, like a global search or user menu */}
    </header>
  )
}
