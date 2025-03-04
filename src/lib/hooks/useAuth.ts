import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase/config";
import {
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export interface User extends FirebaseUser {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  uid: string;
  emailVerified: boolean;
}

interface UserProfile {
  id: string;
  email: string;
  displayName?: string | null;
  photoURL?: string | null;
  createdAt: Date;
  lastLogin: Date;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

interface UseAuthReturn extends AuthState {
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<User>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // L'utilisateur est connecté
        setState({
          user: user as User,
          loading: false,
          error: null,
        });

        // Mettre à jour le timestamp de dernière connexion
        try {
          const userRef = doc(db, "users", user.uid);
          await setDoc(
            userRef,
            { lastLogin: serverTimestamp() },
            { merge: true }
          );
        } catch (error) {
          console.error(
            "Erreur lors de la mise à jour du timestamp de connexion:",
            error
          );
        }
      } else {
        // L'utilisateur est déconnecté
        setState({
          user: null,
          loading: false,
          error: null,
        });
      }
    });

    // Nettoyer l'abonnement lors du démontage du composant
    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<User> => {
    try {
      setState({ ...state, loading: true, error: null });
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      return userCredential.user as User;
    } catch (error: any) {
      let errorMessage = "Une erreur est survenue lors de la connexion";
      if (
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password"
      ) {
        errorMessage = "Email ou mot de passe incorrect";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage =
          "Trop de tentatives de connexion, veuillez réessayer plus tard";
      }
      setState({ ...state, loading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    displayName?: string
  ): Promise<User> => {
    try {
      setState({ ...state, loading: true, error: null });
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user as User;

      // Créer le profil utilisateur dans Firestore
      const userProfile: UserProfile = {
        id: user.uid,
        email: user.email || email,
        displayName: displayName || user.displayName,
        photoURL: user.photoURL,
        createdAt: new Date(),
        lastLogin: new Date(),
      };

      await setDoc(doc(db, "users", user.uid), {
        ...userProfile,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      });

      return user;
    } catch (error: any) {
      let errorMessage =
        "Une erreur est survenue lors de la création du compte";
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "Cet email est déjà utilisé";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Le mot de passe est trop faible";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Email invalide";
      }
      setState({ ...state, loading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
      throw error;
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    try {
      setState({ ...state, loading: true, error: null });
      await sendPasswordResetEmail(auth, email);
      setState({ ...state, loading: false });
    } catch (error: any) {
      let errorMessage =
        "Une erreur est survenue lors de la réinitialisation du mot de passe";
      if (error.code === "auth/user-not-found") {
        errorMessage = "Aucun compte ne correspond à cet email";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Email invalide";
      }
      setState({ ...state, loading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  };

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };
}
