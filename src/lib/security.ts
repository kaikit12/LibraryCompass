import { FirebaseError } from './types';
/**
 * Security utilities for protecting sensitive data
 */

// Environment validation
export function validateEnvironment() {
  const requiredEnvVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
  ];

  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Sanitize error messages for production
export function sanitizeError(error: unknown): string {
  if (process.env.NODE_ENV === 'production') {
    // Don't expose detailed error messages in production
    return 'An error occurred. Please try again later.';
  }
  
  return (error as FirebaseError)?.message || (error as Error)?.message || 'Unknown error';
}

// Rate limiting helper
export function createRateLimitError() {
  return new Response(
    JSON.stringify({ 
      error: 'Too many requests. Please try again later.',
      retryAfter: 900 
    }),
    { 
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': '900'
      }
    }
  );
}

// CORS helper for API routes
export function addCorsHeaders(response: Response) {
  response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

// Input validation
interface ValidationRule {
  required?: boolean;
  type?: string;
  minLength?: number;
  maxLength?: number;
}

interface ValidationSchema {
  [key: string]: ValidationRule;
}

export function validateInput(data: any, schema: ValidationSchema): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (const [key, rule] of Object.entries(schema)) {
    const value = data?.[key];
    
    if (rule.required && (!value || value.toString().trim() === '')) {
      errors.push(`${key} is required`);
    }
    
    if (rule.type && typeof value !== rule.type && value !== undefined) {
      errors.push(`${key} must be of type ${rule.type}`);
    }
    
    if (rule.minLength && value && value.length < rule.minLength) {
      errors.push(`${key} must be at least ${rule.minLength} characters`);
    }
    
    if (rule.maxLength && value && value.length > rule.maxLength) {
      errors.push(`${key} must be no more than ${rule.maxLength} characters`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}