
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    User as FirebaseUser
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { Reader } from '@/lib/types';
import { useRouter } from 'next/navigation';

interface AuthContextType {
    user: (Reader & { uid: string }) | null;
    loading: boolean;
    login: (email: string, pass: string) => Promise<any>;
    register: (name: string, email: string, pass: string) => Promise<any>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<(Reader & { uid: string }) | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // User is signed in, get their data from Firestore from 'users' collection
                const userRef = doc(db, 'users', firebaseUser.uid);
                const docSnap = await getDoc(userRef);
                if (docSnap.exists()) {
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

        return () => unsubscribe();
    }, []);

    const login = (email: string, pass: string) => {
        return signInWithEmailAndPassword(auth, email, pass);
    };

    const register = async (name: string, email: string, pass:string) => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const firebaseUser = userCredential.user;
        
        // Create a document in Firestore in the 'users' collection for the new user
        await setDoc(doc(db, "users", firebaseUser.uid), {
            uid: firebaseUser.uid,
            name: name,
            email: email,
            role: 'reader', // Default role
            booksOut: 0,
            borrowedBooks: [],
            borrowingHistory: [],
            lateFees: 0
        });

        return userCredential;
    };
    
    const logout = async () => {
        await signOut(auth);
        router.push('/login');
    };

    const value = {
        user,
        loading,
        login,
        register,
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
