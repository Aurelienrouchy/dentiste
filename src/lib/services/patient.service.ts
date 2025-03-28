import { db } from "@/lib/firebase/config";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { Patient, PatientFormValues } from "@/lib/types/patient";

const COLLECTION_NAME = "patients";

export class PatientService {
  /**
   * Récupère tous les patients pour un utilisateur donné (cabinet)
   * @param userId ID de l'utilisateur (cabinet)
   * @returns Liste des patients
   */
  static async getPatients(userId: string): Promise<Patient[]> {
    try {
      // Requête pour récupérer les patients créés par l'utilisateur courant
      const userPatientsQuery = query(
        collection(db, COLLECTION_NAME),
        where("createdBy", "==", userId)
      );

      const querySnapshot = await getDocs(userPatientsQuery);
      const patients: Patient[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        patients.push({
          id: doc.id,
          ...data,
          createdAt: (data.createdAt as Timestamp).toDate(),
          updatedAt: (data.updatedAt as Timestamp).toDate(),
        } as Patient);
      });

      return patients;
    } catch (error) {
      console.error("Erreur lors de la récupération des patients:", error);
      throw error;
    }
  }

  /**
   * Récupère un patient par son ID
   * @param patientId ID du patient
   * @param userId ID de l'utilisateur (cabinet) pour vérification
   * @returns Le patient trouvé ou null
   */
  static async getPatientById(
    patientId: string,
    userId: string
  ): Promise<Patient | null> {
    try {
      const patientRef = doc(db, COLLECTION_NAME, patientId);
      const patientSnap = await getDoc(patientRef);

      if (patientSnap.exists()) {
        const data = patientSnap.data();

        // Vérifier que le patient appartient au bon utilisateur (cabinet)
        if (data.createdBy !== userId) {
          return null;
        }

        return {
          id: patientSnap.id,
          ...data,
          createdAt: (data.createdAt as Timestamp).toDate(),
          updatedAt: (data.updatedAt as Timestamp).toDate(),
        } as Patient;
      }

      return null;
    } catch (error) {
      console.error("Erreur lors de la récupération du patient:", error);
      throw error;
    }
  }

  /**
   * Ajoute un nouveau patient
   * @param patientData Données du patient à ajouter
   * @param userId ID de l'utilisateur (cabinet) qui crée le patient
   * @returns L'ID du patient créé
   */
  static async addPatient(
    patientData: PatientFormValues,
    userId: string
  ): Promise<string> {
    try {
      const patientWithMeta = {
        ...patientData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: userId,
      };

      const docRef = await addDoc(
        collection(db, COLLECTION_NAME),
        patientWithMeta
      );
      return docRef.id;
    } catch (error) {
      console.error("Erreur lors de l'ajout du patient:", error);
      throw error;
    }
  }

  /**
   * Mise à jour d'un patient existant
   * @param patientId ID du patient à mettre à jour
   * @param patientData Nouvelles données du patient
   * @param userId ID de l'utilisateur (cabinet) pour vérification
   * @returns true si la mise à jour a réussi
   */
  static async updatePatient(
    patientId: string,
    patientData: PatientFormValues,
    userId: string
  ): Promise<boolean> {
    try {
      // Vérifier que le patient appartient au bon utilisateur (cabinet)
      const patient = await this.getPatientById(patientId, userId);
      if (!patient) {
        throw new Error("Patient non trouvé ou accès non autorisé");
      }

      const patientRef = doc(db, COLLECTION_NAME, patientId);

      await updateDoc(patientRef, {
        ...patientData,
        updatedAt: serverTimestamp(),
      });

      return true;
    } catch (error) {
      console.error("Erreur lors de la mise à jour du patient:", error);
      throw error;
    }
  }

  /**
   * Supprime un patient
   * @param patientId ID du patient à supprimer
   * @param userId ID de l'utilisateur (cabinet) pour vérification
   * @returns true si la suppression a réussi
   */
  static async deletePatient(
    patientId: string,
    userId: string
  ): Promise<boolean> {
    try {
      // Vérifier que le patient appartient au bon utilisateur (cabinet)
      const patient = await this.getPatientById(patientId, userId);
      if (!patient) {
        throw new Error("Patient non trouvé ou accès non autorisé");
      }

      const patientRef = doc(db, COLLECTION_NAME, patientId);
      await deleteDoc(patientRef);
      return true;
    } catch (error) {
      console.error("Erreur lors de la suppression du patient:", error);
      throw error;
    }
  }
}
