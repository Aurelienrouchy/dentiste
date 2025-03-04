import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User, 
  UserCredential,
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';

interface UserData {
  firstName?: string;
  lastName?: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  loading: boolean;
  signUp: (email: string, password: string, userData?: Partial<UserData>) => Promise<UserCredential>;
  signIn: (email: string, password: string) => Promise<UserCredential>;
  logOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Configuration de la persistance locale lors de l'initialisation
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        console.log("Persistance configurée: LOCAL");
      })
      .catch((error) => {
        console.error("Erreur de configuration de la persistance:", error);
      });
  }, []);

  async function createUserDataIfNotExists(user: User) {
    if (!user) return null;
    
    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        console.log("Création des données utilisateur dans Firestore...");
        const timestamp = serverTimestamp();
        const newUserData = {
          email: user.email,
          createdAt: timestamp,
          updatedAt: timestamp,
          firstName: user.displayName?.split(' ')[0] || "",
          lastName: user.displayName?.split(' ').slice(1).join(' ') || ""
        };
        
        await setDoc(userDocRef, newUserData);
        return newUserData;
      }
      
      return userDoc.data() as UserData;
    } catch (error) {
      console.error("Erreur lors de la création des données utilisateur:", error);
      return null;
    }
  }

  async function signUp(email: string, password: string, userData?: Partial<UserData>): Promise<UserCredential> {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Store additional user data in Firestore
    if (userCredential.user) {
      const userDocRef = doc(db, "users", userCredential.user.uid);
      const timestamp = serverTimestamp();
      
      const userDataToSave: any = {
        email,
        createdAt: timestamp,
        updatedAt: timestamp,
        ...userData
      };
      
      await setDoc(userDocRef, userDataToSave);
    }
    
    return userCredential;
  }

  async function signIn(email: string, password: string): Promise<UserCredential> {
    console.log("AuthContext: Tentative de connexion avec email:", email);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log("AuthContext: Connexion réussie:", result.user.email);
      
      // Créer automatiquement les données utilisateur si elles n'existent pas
      await createUserDataIfNotExists(result.user);
      
      return result;
    } catch (error: any) {
      console.error("AuthContext: Erreur lors de la connexion:", error);
      throw error; // Rethrow pour que l'appelant puisse le gérer
    }
  }

  async function logOut() {
    setUserData(null);
    return signOut(auth);
  }

  async function resetPassword(email: string) {
    return sendPasswordResetEmail(auth, email);
  }

  // Fetch user data from Firestore when the user changes
  async function fetchUserData(user: User) {
    if (!user) return null;
    
    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const data = userDoc.data() as UserData;
        setUserData(data);
        return data;
      } else {
        console.log("No user data found in Firestore");
        // Créer automatiquement les données utilisateur
        const createdData = await createUserDataIfNotExists(user);
        if (createdData) {
          setUserData(createdData as UserData);
        }
        return createdData;
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      return null;
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("État d'authentification changé:", user ? `Utilisateur connecté: ${user.email}` : "Utilisateur déconnecté");
      setCurrentUser(user);
      
      if (user) {
        await fetchUserData(user);
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userData,
    loading,
    signUp,
    signIn,
    logOut,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 