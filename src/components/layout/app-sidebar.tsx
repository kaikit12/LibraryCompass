"use client"
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton
} from '@/components/ui/sidebar'
import { MainNav } from './main-nav'
import { Compass, LogOut } from 'lucide-react'
import { useSidebar } from '../ui/sidebar'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/auth-context'
import { Avatar, AvatarFallback } from '../ui/avatar'

export function AppSidebar() {
  const { state } = useSidebar();
  const { user, logout } = useAuth();

  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

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
        </div>
      </SidebarHeader>
      <SidebarContent>
        <MainNav />
      </SidebarContent>
      <SidebarFooter className="p-4 flex flex-col gap-4">
        {user && (
            <div className={cn("flex items-center gap-3 overflow-hidden", state === "collapsed" && "justify-center")}>
                <Avatar>
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <div className={cn("flex flex-col", state === "collapsed" && "hidden")}>
                    <span className="text-sm font-semibold text-sidebar-foreground">{user.name}</span>
                    <span className="text-xs text-sidebar-foreground/70">{user.role}</span>
                </div>
            </div>
        )}
         <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={logout} tooltip="Logout" className="w-full">
                <LogOut />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
