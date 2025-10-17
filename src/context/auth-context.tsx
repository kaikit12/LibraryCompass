
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    sendEmailVerification,
    sendPasswordResetEmail
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, query, collection, where, getDocs, runTransaction, increment, deleteDoc } from 'firebase/firestore';
import type { Reader } from '@/lib/types';
import { useRouter } from 'next/navigation';

interface AuthContextType {
    user: (Reader & { uid: string }) | null;
    loading: boolean;
    login: (email: string, pass: string) => Promise<unknown>;
    loginWithGoogle: () => Promise<void>;
    register: (name: string, email: string, pass: string, phone: string) => Promise<unknown>;
    resetPassword: (email: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<(Reader & { uid: string }) | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (!auth) {
            console.log('[Auth Context] Firebase auth not available');
            setLoading(false);
            return;
        }

        console.log('[Auth Context] Setting up auth state listener');
        
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser && db) {
                // User is signed in, get their data from Firestore from 'users' collection
                const userRef = doc(db, 'users', firebaseUser.uid);
                const docSnap = await getDoc(userRef);
                if (docSnap.exists()) {
                    // Update emailVerified status in Firestore
                    await setDoc(userRef, { emailVerified: firebaseUser.emailVerified }, { merge: true });
                    setUser({ id: docSnap.id, uid: firebaseUser.uid, ...docSnap.data() } as Reader & { uid: string });
                } else {
                    // Firestore profile missing. Don't force sign-out — this creates a race
                    // where onAuthStateChanged fires before our registration / Google sign-in
                    // routines have a chance to create the user document. Instead, set a
                    // minimal user object derived from the Firebase Auth user and allow
                    // the calling flow (register/loginWithGoogle) to create the Firestore
                    // profile as needed.
                    const minimalUser: Partial<Reader & { uid: string }> = {
                        id: firebaseUser.uid,
                        uid: firebaseUser.uid,
                        name: (firebaseUser.displayName as string) || 'Người dùng',
                        email: firebaseUser.email || '',
                        role: 'reader',
                        booksOut: 0,
                        borrowedBooks: [],
                        borrowingHistory: [],
                        lateFees: 0
                    };
                    setUser(minimalUser as Reader & { uid: string });
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        // Check email verification status periodically (every 3 seconds)
        // This allows auto-login when user verifies email on another device
        const verificationCheckInterval = setInterval(async () => {
            const currentUser = auth.currentUser;
            
            // Stop checking if user is already verified or not logged in
            if (!currentUser || currentUser.emailVerified) {
                clearInterval(verificationCheckInterval);
                return;
            }
            
            if (currentUser && !currentUser.emailVerified) {
                // Reload user to get updated emailVerified status
                await currentUser.reload();
                
                // If email is now verified, update Firestore and stop polling
                if (currentUser.emailVerified && db) {
                    const userRef = doc(db, 'users', currentUser.uid);
                    await setDoc(userRef, { emailVerified: true }, { merge: true });
                    const docSnap = await getDoc(userRef);
                    if (docSnap.exists()) {
                        setUser({ id: docSnap.id, uid: currentUser.uid, ...docSnap.data() } as Reader & { uid: string });
                    }
                    
                    // Stop the interval once verified
                    clearInterval(verificationCheckInterval);
                }
            }
        }, 3000); // Check every 3 seconds

        return () => {
            unsubscribe();
            clearInterval(verificationCheckInterval);
        };
    }, []);

    const login = async (email: string, pass: string) => {
        console.log('[Auth Context] Login attempt for:', email);
        
        if (!auth) {
            console.error('[Auth Context] Firebase auth not available');
            return Promise.reject(new Error("Firebase is not configured."));
        }
        
        try {
            console.log('[Auth Context] Attempting Firebase login...');
            const result = await signInWithEmailAndPassword(auth, email, pass);
            console.log('[Auth Context] Login successful for user:', result.user.uid);
            return result;
        } catch (error: any) {
            console.error('[Auth Context] Login failed:', error.code, error.message);
            throw error;
        }
    };

    const register = async (name: string, email: string, pass: string, phone: string) => {
        if (!auth || !db) return Promise.reject(new Error("Firebase is not configured."));
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const firebaseUser = userCredential.user;

        // Send email verification
        await sendEmailVerification(firebaseUser);

        // Wait for client auth to reflect the new user (avoid Firestore race)
        const waitForAuth = async (uid: string, timeout = 5000) => {
            const start = Date.now();
            while (Date.now() - start < timeout) {
                if (auth.currentUser && auth.currentUser.uid === uid) return true;
                await new Promise(res => setTimeout(res, 200));
            }
            return false;
        };

        const authReady = await waitForAuth(firebaseUser.uid, 5000);
        if (!authReady) {
            // Not fatal but warn — trying to continue may hit rules if request.auth is not present
            console.warn('Auth session not ready after registration; continuing but Firestore writes may fail.');
        }

        // Generate sequential member ID using transaction to prevent race condition
        const counterRef = doc(db, 'counters', 'memberId');

        let newMemberId: number = 1;

        await runTransaction(db, async (transaction) => {
            const counterDoc = await transaction.get(counterRef);

            if (!counterDoc.exists()) {
                // Initialize counter if it doesn't exist
                newMemberId = 1;
                transaction.set(counterRef, { value: 1 });
            } else {
                // Increment counter
                newMemberId = (counterDoc.data().value || 0) + 1;
                transaction.update(counterRef, { value: increment(1) });
            }
        });

        // Create a document in Firestore in the 'users' collection for the new user
        try {
            await setDoc(doc(db, "users", firebaseUser.uid), {
                uid: firebaseUser.uid,
                memberId: newMemberId, // Sequential member ID
                name: name,
                email: email,
                phone: phone, // Save phone number
                role: 'reader', // Default role
                emailVerified: false, // Initial verification status
                booksOut: 0,
                borrowedBooks: [],
                borrowingHistory: [],
                lateFees: 0
            });
        } catch (err: unknown) {
            console.error('Error creating Firestore user doc after registration:', err);
            // Surface a clearer error to the caller
            throw new Error((err as any)?.message || 'Failed to create user profile in Firestore. Check Firestore rules and authentication.');
        }

        return userCredential;
    };

    const loginWithGoogle = async () => {
        console.log('[Auth Context] Google login attempt started');
        
        if (!auth || !db) {
            console.error('[Auth Context] Firebase not configured for Google login');
            throw new Error("Firebase is not configured.");
        }

        try {
            console.log('[Auth Context] Setting up Google provider');
            const provider = new GoogleAuthProvider();
            
            // Add required scopes
            provider.addScope('email');
            provider.addScope('profile');
            
            console.log('[Auth Context] Calling signInWithPopup');
            const result = await signInWithPopup(auth, provider);
            const googleUser = result.user;
            
            console.log('[Auth Context] Google login successful for:', googleUser.email);

            // Wait for auth state to reflect the Google sign-in
            const waitForAuth = async (uid: string, timeout = 5000) => {
                const start = Date.now();
                while (Date.now() - start < timeout) {
                    if (auth.currentUser && auth.currentUser.uid === uid) return true;
                    await new Promise(res => setTimeout(res, 200));
                }
                return false;
            };

            const authReady = await waitForAuth(googleUser.uid, 5000);
            if (!authReady) console.warn('Auth session not ready after Google sign-in; Firestore writes may fail.');

            // Check if user exists in Firestore by email
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('email', '==', googleUser.email));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                // User exists with this email - link accounts
                const existingUserDoc = querySnapshot.docs[0];
                const existingUserId = existingUserDoc.id;

                // Update the existing user document with Google UID if different
                if (existingUserId !== googleUser.uid) {
                    // Copy data to new UID-based document
                    const existingData = existingUserDoc.data();
                    await setDoc(doc(db, 'users', googleUser.uid), {
                        ...existingData,
                        uid: googleUser.uid,
                    });

                    // Delete the old document to prevent duplicates
                    await deleteDoc(existingUserDoc.ref);
                }
            } else {
                // New Google user - create account (Google accounts are pre-verified)
                // Generate sequential member ID using transaction
                const counterRef = doc(db, 'counters', 'memberId');

                let newMemberId: number = 1;

                await runTransaction(db, async (transaction) => {
                    const counterDoc = await transaction.get(counterRef);

                    if (!counterDoc.exists()) {
                        newMemberId = 1;
                        transaction.set(counterRef, { value: 1 });
                    } else {
                        newMemberId = (counterDoc.data().value || 0) + 1;
                        transaction.update(counterRef, { value: increment(1) });
                    }
                });

                await setDoc(doc(db, 'users', googleUser.uid), {
                    uid: googleUser.uid,
                    memberId: newMemberId, // Sequential member ID
                    name: googleUser.displayName || 'Google User',
                    email: googleUser.email!,
                    phone: '',
                    role: 'reader',
                    emailVerified: googleUser.emailVerified, // Google accounts are usually verified
                    booksOut: 0,
                    borrowedBooks: [],
                    borrowingHistory: [],
                    lateFees: 0
                });
            }
            
            console.log('[Auth Context] Google login process completed successfully');
        } catch (error: any) {
            console.error('[Auth Context] Google login failed:', error.code, error.message);
            throw error;
        }
    };
    
    const logout = async () => {
        if (!auth) return;
        await signOut(auth);
        router.push('/login');
    };

    const resetPassword = async (email: string) => {
        if (!auth) throw new Error("Firebase is not configured.");
        await sendPasswordResetEmail(auth, email);
    };

    const value = {
        user,
        loading,
        login,
        loginWithGoogle,
        register,
        resetPassword,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
