import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  Timestamp,
  DocumentData
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Patient, PatientFormValues } from '@/lib/types/patient';

// Conversion des timestamps Firestore en objets Date
const convertTimestamps = (data: DocumentData): any => {
  const result = { ...data };
  for (const key in result) {
    if (result[key] instanceof Timestamp) {
      result[key] = result[key].toDate();
    }
  }
  return result;
};

// Collection des patients par utilisateur
const getPatientsCollection = (userId: string) => {
  return collection(db, 'users', userId, 'patients');
};

// Récupérer tous les patients d'un utilisateur
export const getPatients = async (userId: string): Promise<Patient[]> => {
  try {
    const patientQuery = query(
      getPatientsCollection(userId),
      orderBy('lastName'),
      orderBy('firstName')
    );
    
    const snapshot = await getDocs(patientQuery);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...convertTimestamps(data)
      } as Patient;
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des patients:', error);
    throw error;
  }
};

// Récupérer un patient spécifique
export const getPatient = async (userId: string, patientId: string): Promise<Patient | null> => {
  try {
    const patientDoc = doc(getPatientsCollection(userId), patientId);
    const snapshot = await getDoc(patientDoc);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    const data = snapshot.data();
    return {
      id: snapshot.id,
      ...convertTimestamps(data)
    } as Patient;
  } catch (error) {
    console.error(`Erreur lors de la récupération du patient ${patientId}:`, error);
    throw error;
  }
};

// Ajouter un nouveau patient
export const addPatient = async (userId: string, patientData: PatientFormValues): Promise<Patient> => {
  try {
    const newPatient = {
      ...patientData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userId
    };
    
    const docRef = await addDoc(getPatientsCollection(userId), newPatient);
    
    return {
      id: docRef.id,
      ...patientData,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId
    } as Patient;
  } catch (error) {
    console.error('Erreur lors de l\'ajout du patient:', error);
    throw error;
  }
};

// Mettre à jour un patient existant
export const updatePatient = async (
  userId: string, 
  patientId: string, 
  patientData: Partial<PatientFormValues>
): Promise<void> => {
  try {
    const patientRef = doc(getPatientsCollection(userId), patientId);
    
    await updateDoc(patientRef, {
      ...patientData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error(`Erreur lors de la mise à jour du patient ${patientId}:`, error);
    throw error;
  }
};

// Supprimer un patient
export const deletePatient = async (userId: string, patientId: string): Promise<void> => {
  try {
    const patientRef = doc(getPatientsCollection(userId), patientId);
    await deleteDoc(patientRef);
  } catch (error) {
    console.error(`Erreur lors de la suppression du patient ${patientId}:`, error);
    throw error;
  }
};

// Rechercher des patients
export const searchPatients = async (
  userId: string, 
  searchTerm: string
): Promise<Patient[]> => {
  try {
    // Récupérer tous les patients puis filtrer côté client
    // Note: Firebase ne supporte pas la recherche plein texte native
    const patients = await getPatients(userId);
    
    const lowercaseSearchTerm = searchTerm.toLowerCase();
    
    return patients.filter(patient => {
      return (
        patient.firstName.toLowerCase().includes(lowercaseSearchTerm) ||
        patient.lastName.toLowerCase().includes(lowercaseSearchTerm) ||
        patient.email.toLowerCase().includes(lowercaseSearchTerm) ||
        patient.phoneNumber.includes(searchTerm)
      );
    });
  } catch (error) {
    console.error('Erreur lors de la recherche de patients:', error);
    throw error;
  }
}; 