/**
 * Enhanced Authentication Context with Security Improvements
 * - Rate limiting for login attempts
 * - Session timeout handling
 * - Enhanced error handling
 * - Security event logging
 */

"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    sendEmailVerification,
    sendPasswordResetEmail,
    User as FirebaseUser
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import type { Reader } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { sanitizeError } from '@/lib/security';

interface AuthContextType {
    user: (Reader & { uid: string }) | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; requiresTwoFA?: boolean; error?: string }>;
    loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
    register: (name: string, email: string, password: string, phone: string) => Promise<{ success: boolean; error?: string }>;
    resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
    refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Rate limiting configuration
const LOGIN_ATTEMPTS_LIMIT = 5;
const LOGIN_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<(Reader & { uid: string }) | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // Security: Check for rate limiting
    const isRateLimited = (email: string): boolean => {
        const attempts = loginAttempts.get(email);
        if (!attempts) return false;
        
        const now = Date.now();
        if (now - attempts.lastAttempt > LOGIN_COOLDOWN_MS) {
            loginAttempts.delete(email);
            return false;
        }
        
        return attempts.count >= LOGIN_ATTEMPTS_LIMIT;
    };

    // Security: Record login attempt
    const recordLoginAttempt = (email: string, success: boolean) => {
        const now = Date.now();
        const attempts = loginAttempts.get(email) || { count: 0, lastAttempt: now };
        
        if (success) {
            loginAttempts.delete(email);
        } else {
            attempts.count++;
            attempts.lastAttempt = now;
            loginAttempts.set(email, attempts);
        }
    };

    // Security: Log security events
    const logSecurityEvent = async (eventType: string, details: unknown = {}) => {
        try {
            if (!db || !auth.currentUser) return;
            
            const securityLogRef = doc(db, 'security_logs', `${Date.now()}_${Math.random()}`);
            await setDoc(securityLogRef, {
                eventType,
                userId: auth.currentUser.uid,
                userEmail: auth.currentUser.email,
                timestamp: serverTimestamp(),
                details,
                userAgent: navigator.userAgent,
                ip: 'client-side' // Will be filled by server if needed
            });
        } catch (error) {
            console.warn('Failed to log security event:', sanitizeError(error));
        }
    };

    // Enhanced user data refresh
    const refreshUserData = useCallback(async () => {
        if (!auth.currentUser || !db) return;
        
        try {
            const userRef = doc(db, 'users', auth.currentUser.uid);
            const docSnap = await getDoc(userRef);
            
            if (docSnap.exists()) {
                const userData = docSnap.data();
                
                // Update email verification status
                await setDoc(userRef, { 
                    emailVerified: auth.currentUser.emailVerified,
                    lastActive: serverTimestamp()
                }, { merge: true });
                
                // Type assertion fix needed - temporarily disabled
                // setUser({ 
                //     ...userData,
                //     id: docSnap.id, 
                //     uid: auth.currentUser.uid, 
                //     emailVerified: auth.currentUser.emailVerified
                // } as Reader & { uid: string });
                
                setUser({
                    ...userData as Reader,
                    id: docSnap.id, 
                    uid: auth.currentUser.uid, 
                    emailVerified: auth.currentUser.emailVerified
                } as Reader & { uid: string });
            }
        } catch (error) {
            console.error('Failed to refresh user data:', sanitizeError(error));
        }
    }, []);

    useEffect(() => {
        if (!auth) {
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
            try {
                if (firebaseUser && db) {
                    await refreshUserData();
                } else {
                    setUser(null);
                }
            } catch (error) {
                console.error('Auth state change error:', sanitizeError(error));
                setUser(null);
            } finally {
                setLoading(false);
            }
        });

        // Session timeout check (30 minutes of inactivity)
        let sessionTimeoutId: NodeJS.Timeout;
        
        const resetSessionTimer = () => {
            clearTimeout(sessionTimeoutId);
            sessionTimeoutId = setTimeout(async () => {
                if (auth.currentUser) {
                    await logSecurityEvent('session_timeout');
                    await signOut(auth);
                }
            }, 30 * 60 * 1000); // 30 minutes
        };

        // Reset timer on user activity
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        activityEvents.forEach(event => {
            document.addEventListener(event, resetSessionTimer, true);
        });

        resetSessionTimer();

        return () => {
            unsubscribe();
            clearTimeout(sessionTimeoutId);
            activityEvents.forEach(event => {
                document.removeEventListener(event, resetSessionTimer, true);
            });
        };
    }, [refreshUserData]);

    const login = async (email: string, password: string): Promise<{ success: boolean; requiresTwoFA?: boolean; error?: string }> => {
        if (!auth) {
            return { success: false, error: "Authentication service not available" };
        }

        // Check rate limiting
        if (isRateLimited(email)) {
            return { 
                success: false, 
                error: "Too many login attempts. Please try again later." 
            };
        }

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            
            // Check for 2FA requirement
            const userRef = doc(db, 'users', userCredential.user.uid);
            const userDoc = await getDoc(userRef);
            const userData = userDoc.data();
            
            if (userData?.twoFactorEnabled) {
                // Don't complete login yet - require 2FA verification
                await signOut(auth); // Sign out temporarily
                return { 
                    success: false, 
                    requiresTwoFA: true,
                    error: "Two-factor authentication required" 
                };
            }
            
            recordLoginAttempt(email, true);
            await logSecurityEvent('login_success', { email });
            
            return { success: true };
            
        } catch (error: unknown) {
            recordLoginAttempt(email, false);
            await logSecurityEvent('login_failed', { email, error: sanitizeError(error) });
            
            return { 
                success: false, 
                error: sanitizeError(error)
            };
        }
    };

    const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
        if (!auth || !db) {
            return { success: false, error: "Authentication service not available" };
        }

        try {
            const provider = new GoogleAuthProvider();
            provider.addScope('email');
            provider.addScope('profile');
            
            const result = await signInWithPopup(auth, provider);
            const firebaseUser = result.user;

            // Check if user exists in Firestore
            const userRef = doc(db, 'users', firebaseUser.uid);
            const docSnap = await getDoc(userRef);

            if (!docSnap.exists()) {
                // Create new user profile
                const counterRef = doc(db, 'counters', 'memberId');
                
                await runTransaction(db, async (transaction) => {
                    const counterDoc = await transaction.get(counterRef);
                    const currentCount = counterDoc.exists() ? counterDoc.data().count : 0;
                    const newMemberId = currentCount + 1;

                    transaction.set(counterRef, { count: newMemberId }, { merge: true });
                    
                    transaction.set(userRef, {
                        name: firebaseUser.displayName || 'Google User',
                        email: firebaseUser.email,
                        role: 'reader',
                        memberId: newMemberId,
                        emailVerified: firebaseUser.emailVerified,
                        booksOut: 0,
                        borrowedBooks: [],
                        borrowingHistory: [],
                        lateFees: 0,
                        createdAt: serverTimestamp(),
                        lastActive: serverTimestamp(),
                        loginMethod: 'google'
                    });
                });
            }

            await logSecurityEvent('google_login_success', { email: firebaseUser.email });
            return { success: true };
            
        } catch (error: unknown) {
            await logSecurityEvent('google_login_failed', { error: sanitizeError(error) });
            return { 
                success: false, 
                error: sanitizeError(error)
            };
        }
    };

    const register = async (name: string, email: string, password: string, phone: string): Promise<{ success: boolean; error?: string }> => {
        if (!auth || !db) {
            return { success: false, error: "Authentication service not available" };
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const firebaseUser = userCredential.user;

            // Send email verification
            await sendEmailVerification(firebaseUser);

            // Generate sequential member ID
            const counterRef = doc(db, 'counters', 'memberId');
            
            await runTransaction(db, async (transaction) => {
                const counterDoc = await transaction.get(counterRef);
                const currentCount = counterDoc.exists() ? counterDoc.data().count : 0;
                const newMemberId = currentCount + 1;

                transaction.set(counterRef, { count: newMemberId }, { merge: true });
                
                transaction.set(doc(db, 'users', firebaseUser.uid), {
                    name,
                    email,
                    phone,
                    role: 'reader',
                    memberId: newMemberId,
                    emailVerified: false,
                    booksOut: 0,
                    borrowedBooks: [],
                    borrowingHistory: [],
                    lateFees: 0,
                    createdAt: serverTimestamp(),
                    lastActive: serverTimestamp(),
                    loginMethod: 'email'
                });
            });

            await logSecurityEvent('registration_success', { email });
            return { success: true };
            
        } catch (error: unknown) {
            await logSecurityEvent('registration_failed', { email, error: sanitizeError(error) });
            return { 
                success: false, 
                error: sanitizeError(error)
            };
        }
    };

    const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
        if (!auth) {
            return { success: false, error: "Authentication service not available" };
        }

        try {
            await sendPasswordResetEmail(auth, email);
            await logSecurityEvent('password_reset_requested', { email });
            return { success: true };
            
        } catch (error: unknown) {
            await logSecurityEvent('password_reset_failed', { email, error: sanitizeError(error) });
            return { 
                success: false, 
                error: sanitizeError(error)
            };
        }
    };

    const logout = async (): Promise<void> => {
        if (!auth) return;
        
        try {
            await logSecurityEvent('logout');
            await signOut(auth);
        } catch (error) {
            console.error('Logout error:', sanitizeError(error));
        }
    };

    const value: AuthContextType = {
        user,
        loading,
        login,
        loginWithGoogle,
        register,
        resetPassword,
        logout,
        refreshUserData,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export { AuthContext };