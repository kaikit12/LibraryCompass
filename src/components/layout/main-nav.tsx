"use client"

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar'
import { Home, Book, Users } from 'lucide-react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

const links = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/books', label: 'Books', icon: Book },
  { href: '/readers', label: 'Readers', icon: Users },
]

export function MainNav() {
  const pathname = usePathname()

  return (
    <div className="p-2">
      <SidebarMenu>
        {links.map((link) => (
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
