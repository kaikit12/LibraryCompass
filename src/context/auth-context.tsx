
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
            setLoading(false);
            // If Firebase is not configured, don't attempt to use auth.
            // You might want to show a message to the user here.
            return;
        }
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
                    // This case might happen if the Firestore doc wasn't created properly
                    // Or if it was deleted. We log them out.
                    await signOut(auth);
                    setUser(null);
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

    const login = (email: string, pass: string) => {
        if (!auth) return Promise.reject(new Error("Firebase is not configured."));
        return signInWithEmailAndPassword(auth, email, pass);
    };

    const register = async (name: string, email: string, pass: string, phone: string) => {
        if (!auth || !db) return Promise.reject(new Error("Firebase is not configured."));

        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const firebaseUser = userCredential.user;
        
        // Send email verification
        await sendEmailVerification(firebaseUser);
        
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

        return userCredential;
    };

    const loginWithGoogle = async () => {
        if (!auth || !db) throw new Error("Firebase is not configured.");

        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const googleUser = result.user;
        
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
