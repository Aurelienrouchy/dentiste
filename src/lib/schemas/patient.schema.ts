import * as z from "zod";

// Schema for birth date
export const patientBirthDateSchema = z.object({
  day: z
    .string()
    .min(1, { message: "Le jour est requis" })
    .max(2, { message: "Format de jour invalide" })
    .regex(/^(0?[1-9]|[12][0-9]|3[01])$/, { message: "Jour invalide (1-31)" }),
  month: z
    .string()
    .min(1, { message: "Le mois est requis" })
    .max(2, { message: "Format de mois invalide" })
    .regex(/^(0?[1-9]|1[0-2])$/, { message: "Mois invalide (1-12)" }),
  year: z
    .string()
    .min(4, { message: "L'année doit contenir 4 chiffres" })
    .max(4, { message: "L'année doit contenir 4 chiffres" })
    .regex(/^(19|20)\d{2}$/, { message: "Année invalide (1900-2099)" }),
});

// Schema for patient form validation
export const patientFormSchema = z.object({
  gender: z.enum(["Madame", "Monsieur", "Non spécifié"] as const, {
    required_error: "La civilité est requise",
    invalid_type_error: "Civilité invalide",
  }),
  lastName: z
    .string()
    .min(1, { message: "Le nom est requis" })
    .max(100, { message: "Le nom est trop long (max 100 caractères)" }),
  firstName: z
    .string()
    .min(1, { message: "Le prénom est requis" })
    .max(100, { message: "Le prénom est trop long (max 100 caractères)" }),
  birthDate: patientBirthDateSchema,
  email: z
    .string()
    .email({ message: "Format d'email invalide" })
    .or(z.literal(""))
    .optional(),
  phoneNumber: z
    .string()
    .regex(/^(\+\d{1,3}[ -]?)?(\(?\d{1,4}\)?[ -]?)?[\d -]{7,}$/, {
      message: "Format de numéro de téléphone invalide",
    })
    .or(z.literal(""))
    .optional(),
  anonymizationCode: z.string().optional(),
  visibility: z
    .enum(["public", "private"], {
      required_error: "La visibilité est requise",
      invalid_type_error: "Visibilité invalide",
    })
    .default("public"),
});

// Infer the patient form type from the schema
export type PatientFormSchemaType = z.infer<typeof patientFormSchema>;

// Schema for patient search
export const patientSearchSchema = z.object({
  searchTerm: z.string().optional(),
  filters: z
    .object({
      gender: z
        .enum(["Madame", "Monsieur", "Non spécifié", "Tous"] as const)
        .optional(),
      visibility: z.enum(["public", "private", "Tous"] as const).optional(),
    })
    .optional(),
});

// Schema for patient ID validation
export const patientIdSchema = z.object({
  id: z.string().min(1, { message: "ID de patient invalide" }),
});
