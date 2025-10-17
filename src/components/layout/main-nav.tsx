"use client"

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem
} from '@/components/ui/sidebar'
import { Home, Book, Users, BarChart3, BookHeart, Settings, UserCog, Mail, CheckCircle } from 'lucide-react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/auth-context'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible'
import * as React from 'react'

const mainLinks = [
  { href: '/', label: 'Bảng điều khiển', icon: Home, roles: ['admin', 'librarian'] },
  { href: '/books', label: 'Kho sách', icon: Book, roles: ['admin', 'librarian', 'reader'] },
  { href: '/books/condition', label: 'Quản lý tình trạng', icon: CheckCircle, roles: ['admin', 'librarian'] },
  { href: '/my-books', label: 'Trang cá nhân', icon: BookHeart, roles: ['admin', 'librarian', 'reader'] },
  { href: '/readers', label: 'Bạn đọc', icon: Users, roles: ['admin', 'librarian'] },
  { href: '/admin/emails', label: 'Thông báo email', icon: Mail, roles: ['admin', 'librarian'] },
  { href: '/settings', label: 'Cài đặt tài khoản', icon: UserCog, roles: ['admin', 'librarian', 'reader'] },
  { href: '/custom', label: 'Tùy chỉnh hệ thống', icon: Settings, roles: ['admin'] },
]

const reportLinks = [
  { href: '/reports', label: 'Tổng quan', roles: ['admin', 'librarian'] },
  { href: '/reports/revenue', label: 'Doanh thu', roles: ['admin'] }, // Only admin
]

export function MainNav() {
  const pathname = usePathname()
  const { user } = useAuth();
  const [isReportsOpen, setIsReportsOpen] = React.useState(pathname.includes('/reports'));


  const availableMainLinks = user?.role
    ? mainLinks.filter(link => link.roles.includes(user.role!))
    : [];

  const availableReportLinks = user?.role
    ? reportLinks.filter(link => link.roles.includes(user.role!))
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
                            <span>Báo cáo</span>
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
