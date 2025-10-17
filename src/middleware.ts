import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rate limiting map to store request counts
const rateLimit = new Map<string, { count: number; resetTime: number }>()

// Security configurations
const RATE_LIMIT_MAX = 100 // requests per window
const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 minutes

function getRateLimitKey(ip: string, pathname: string): string {
  return `${ip}:${pathname}`
}

function isRateLimited(key: string): boolean {
  const now = Date.now()
  const record = rateLimit.get(key)

  if (!record) {
    rateLimit.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return false
  }

  if (now > record.resetTime) {
    rateLimit.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return false
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return true
  }

  record.count++
  return false
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown'

  // Apply rate limiting to API routes
  if (pathname.startsWith('/api/')) {
    const key = getRateLimitKey(ip, pathname)
    
    if (isRateLimited(key)) {
      return new NextResponse(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '900', // 15 minutes
          },
        }
      )
    }

    // Add security headers to API responses
    const response = NextResponse.next()
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    
    return response
  }

  // Security headers for all other routes
  const response = NextResponse.next()
  
  // Prevent caching of sensitive pages
  if (pathname.includes('admin') || pathname.includes('settings') || pathname.includes('my-')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
  }

  return response
}

export const config = {
  matcher: [
    '/api/:path*',
    '/admin/:path*',
    '/settings/:path*',
    '/my-books/:path*'
  ],
}