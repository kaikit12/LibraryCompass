"use client"

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar'
import { Home, Book, Users } from 'lucide-react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/auth-context'

const links = [
  { href: '/', label: 'Dashboard', icon: Home, roles: ['admin', 'librarian', 'reader'] },
  { href: '/books', label: 'Books', icon: Book, roles: ['admin', 'librarian', 'reader'] },
  { href: '/readers', label: 'Readers', icon: Users, roles: ['admin', 'librarian'] },
]

export function MainNav() {
  const pathname = usePathname()
  const { user } = useAuth();

  const availableLinks = links.filter(link => user?.role && link.roles.includes(user.role));

  return (
    <div className="p-2">
      <SidebarMenu>
        {availableLinks.map((link) => (
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
      </SidebarMenu>
    </div>
  )
}
