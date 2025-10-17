import { NextRequest, NextResponse } from 'next/server';
import { validateInput, sanitizeError } from '@/lib/security';

// API Route protection middleware
export function withApiProtection(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Add security headers
      const response = await handler(req);
      
      // Ensure response is NextResponse and add security headers
      if (response instanceof NextResponse) {
        addSecurityHeaders(response);
        return response;
      }
      
      // If it's not a NextResponse, wrap it
      const wrappedResponse = NextResponse.json({ success: false, error: 'Invalid response type' }, { status: 500 });
      addSecurityHeaders(wrappedResponse);
      return wrappedResponse;
      
    } catch (error) {
      console.error('API Error:', error);
      
      const errorResponse = NextResponse.json(
        { 
          success: false, 
          error: sanitizeError(error),
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
      
      addSecurityHeaders(errorResponse);
      return errorResponse;
    }
  };
}

function addSecurityHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  
  // CORS headers
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
}

// Authentication middleware for API routes
export function withAuth(handler: (req: NextRequest) => Promise<NextResponse>) {
  return withApiProtection(async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Extract authorization header
      const authHeader = req.headers.get('authorization');
      const token = authHeader?.replace('Bearer ', '');
      
      if (!token) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Authentication required' 
          },
          { status: 401 }
        );
      }

      // TODO: Verify Firebase ID token here if needed
      // This would require Firebase Admin SDK setup
      
      return handler(req);
      
    } catch (error) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication failed' 
        },
        { status: 401 }
      );
    }
  });
}

// Input validation middleware
export function withValidation(schema: any) {
  return (handler: (req: NextRequest, data: any) => Promise<NextResponse>) => {
    return withApiProtection(async (req: NextRequest): Promise<NextResponse> => {
      try {
        const data = await req.json();
        const validation = validateInput(data, schema);
        
        if (!validation.isValid) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Validation failed',
              details: validation.errors 
            },
            { status: 400 }
          );
        }
        
        return handler(req, data);
        
      } catch (error) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid request body' 
          },
          { status: 400 }
        );
      }
    });
  };
}

// Rate limiting middleware (simple implementation)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function withRateLimit(maxRequests = 60, windowMs = 60000) {
  return (handler: (req: NextRequest) => Promise<NextResponse>) => {
    return withApiProtection(async (req: NextRequest): Promise<NextResponse> => {
      const forwarded = req.headers.get('x-forwarded-for');
      const ip = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown';
      
      const key = `${ip}:${req.nextUrl.pathname}`;
      const now = Date.now();
      
      const record = requestCounts.get(key);
      
      if (!record) {
        requestCounts.set(key, { count: 1, resetTime: now + windowMs });
      } else if (now > record.resetTime) {
        requestCounts.set(key, { count: 1, resetTime: now + windowMs });
      } else if (record.count >= maxRequests) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Rate limit exceeded' 
          },
          { 
            status: 429,
            headers: {
              'Retry-After': Math.ceil((record.resetTime - now) / 1000).toString()
            }
          }
        );
      } else {
        record.count++;
      }
      
      return handler(req);
    });
  };
}