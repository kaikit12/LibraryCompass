import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { auth } from '@/lib/firebase'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function authenticatedFetch(url: string, options: RequestInit = {}) {
  if (!auth?.currentUser) {
    throw new Error('User not authenticated');
  }

  const token = await auth.currentUser.getIdToken();
  
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}
