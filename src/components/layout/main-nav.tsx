"use client"

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem
} from '@/components/ui/sidebar'
import { Home, Book, Users, BarChart3 } from 'lucide-react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/auth-context'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible'
import * as React from 'react'

const mainLinks = [
  { href: '/', label: 'Dashboard', icon: Home, roles: ['admin', 'librarian'] },
  { href: '/books', label: 'Books', icon: Book, roles: ['admin', 'librarian', 'reader'] },
  { href: '/readers', label: 'Readers', icon: Users, roles: ['admin', 'librarian'] },
]

const reportLinks = [
    { href: '/reports/revenue', label: 'Revenue', roles: ['admin', 'librarian'] },
]

export function MainNav() {
  const pathname = usePathname()
  const { user } = useAuth();
  const [isReportsOpen, setIsReportsOpen] = React.useState(pathname.includes('/reports'));


  const availableMainLinks = user?.role
    ? mainLinks.filter(link => link.roles.includes(user.role))
    : [];

  const availableReportLinks = user?.role
    ? reportLinks.filter(link => link.roles.includes(user.role))
    : [];


  return (
    <div className="p-2">
      <SidebarMenu>
        {availableMainLinks.map((link) => (
          <SidebarMenuItem key={link.href}>
            <SidebarMenuButton
              asChild
              isActive={pathname === link.href}
              tooltip={link.label}
            >
              <Link href={link.href}>
                <link.icon className="h-4 w-4" />
                <span>{link.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
         {availableReportLinks.length > 0 && (
            <Collapsible open={isReportsOpen} onOpenChange={setIsReportsOpen}>
                <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                        <SidebarMenuButton>
                            <BarChart3 className="h-4 w-4" />
                            <span>Reports</span>
                        </SidebarMenuButton>
                    </CollapsibleTrigger>
                </SidebarMenuItem>
                <CollapsibleContent>
                    <SidebarMenuSub>
                        {availableReportLinks.map((link) => (
                             <SidebarMenuSubItem key={link.href}>
                                <SidebarMenuSubButton asChild isActive={pathname === link.href}>
                                     <Link href={link.href}>
                                        <span>{link.label}</span>
                                    </Link>
                                </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                        ))}
                    </SidebarMenuSub>
                </CollapsibleContent>
            </Collapsible>
         )}
      </SidebarMenu>
    </div>
  )
}
