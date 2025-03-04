export type PatientGender = 'Madame' | 'Monsieur' | 'Non spécifié';

export interface PatientBirthDate {
  day: string;
  month: string;
  year: string;
}

export interface Patient {
  id: string;
  gender: PatientGender;
  lastName: string;
  firstName: string;
  birthDate: PatientBirthDate;
  email: string;
  phoneNumber: string;
  anonymizationCode?: string;
  visibility: 'public' | 'private';  // public: visible par tout le cabinet, private: uniquement par le créateur
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // UID de l'utilisateur (cabinet) qui a créé le patient 
}

export type PatientFormValues = Omit<Patient, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>; 