"use client"
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger
} from '@/components/ui/sidebar'
import { MainNav } from './main-nav'
import { Compass } from 'lucide-react'
import { useSidebar } from '../ui/sidebar'
import { cn } from '@/lib/utils'

export function AppSidebar() {
  const { state } = useSidebar();
  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-between">
          <div className={cn("flex items-center gap-2 overflow-hidden", state === "collapsed" && "w-0")}>
              <div className="p-2 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Compass className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-semibold font-headline text-sidebar-foreground whitespace-nowrap">
                  Library Compass
              </h1>
          </div>
          <SidebarTrigger />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <MainNav />
      </SidebarContent>
      <SidebarFooter className="p-4 text-xs text-sidebar-foreground/60">
        <div className={cn("text-center", state === "collapsed" && "hidden")}>
         © {new Date().getFullYear()} Library Compass
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
