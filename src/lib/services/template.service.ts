import { db, storage } from "@/lib/firebase/config";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { v4 as uuidv4 } from "uuid";

export interface DocumentTemplate {
  id: string;
  userId: string;
  title: string;
  description: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  isSystem?: boolean;
  imageUrls?: string[]; // URLs des images utilisées dans le template
  pdfFields?: string[]; // Champs dynamiques disponibles dans le template PDF
}

export class TemplateService {
  // Collection principale pour les templates système
  private static readonly SYSTEM_TEMPLATES_COLLECTION = "documentTemplates";
  // Collection pour les templates des utilisateurs
  private static readonly USER_TEMPLATES_COLLECTION = "userTemplates";

  static async getTemplates(userId: string): Promise<DocumentTemplate[]> {
    try {
      console.log("Début récupération templates pour", userId);

      // Obtenir les templates système (communs à tous les utilisateurs)
      const systemTemplatesQuery = query(
        collection(db, this.SYSTEM_TEMPLATES_COLLECTION),
        where("isSystem", "==", true),
        orderBy("title")
      );
      const systemTemplatesSnapshot = await getDocs(systemTemplatesQuery);
      console.log("Templates système trouvés:", systemTemplatesSnapshot.size);

      // Obtenir les templates spécifiques à l'utilisateur depuis sa sous-collection
      const userTemplatesQuery = query(
        collection(db, this.USER_TEMPLATES_COLLECTION, userId, "templates"),
        orderBy("title")
      );
      const userTemplatesSnapshot = await getDocs(userTemplatesQuery);
      console.log("Templates utilisateur trouvés:", userTemplatesSnapshot.size);

      // Combiner les deux ensembles de templates
      const templates: DocumentTemplate[] = [];

      systemTemplatesSnapshot.forEach((doc) => {
        try {
          const data = doc.data();
          templates.push({
            id: doc.id,
            userId: data.userId,
            title: data.title,
            description: data.description,
            content: data.content,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            isSystem: true,
            imageUrls: data.imageUrls || [],
            pdfFields: data.pdfFields || [],
          });
        } catch (err) {
          console.error("Erreur traitement template système:", doc.id, err);
        }
      });

      userTemplatesSnapshot.forEach((doc) => {
        try {
          const data = doc.data();
          console.log("Données brutes template utilisateur:", doc.id, data);
          templates.push({
            id: doc.id,
            userId: data.userId || userId, // Assurer que userId est toujours défini
            title: data.title || "Sans titre",
            description: data.description || "",
            content: data.content || "",
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            isSystem: false,
            imageUrls: data.imageUrls || [],
            pdfFields: data.pdfFields || [],
          });
        } catch (err) {
          console.error("Erreur traitement template utilisateur:", doc.id, err);
        }
      });

      console.log("Total templates récupérés:", templates.length);
      return templates;
    } catch (error) {
      console.error("Erreur récupération templates:", error);
      throw error;
    }
  }

  static async getPdfTemplates(userId: string): Promise<DocumentTemplate[]> {
    const templates = await this.getTemplates(userId);
    return templates;
  }

  static async getTemplate(
    templateId: string,
    userId?: string
  ): Promise<DocumentTemplate | null> {
    // Vérifier d'abord dans les templates système
    let templateDoc = await getDoc(
      doc(db, this.SYSTEM_TEMPLATES_COLLECTION, templateId)
    );

    // Si non trouvé et userId fourni, chercher dans les templates de l'utilisateur
    if (!templateDoc.exists() && userId) {
      templateDoc = await getDoc(
        doc(db, this.USER_TEMPLATES_COLLECTION, userId, "templates", templateId)
      );
    }

    if (templateDoc.exists()) {
      const data = templateDoc.data();
      return {
        id: templateDoc.id,
        userId: data.userId,
        title: data.title,
        description: data.description,
        content: data.content,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        isSystem: data.isSystem || false,
        imageUrls: data.imageUrls || [],
        pdfFields: data.pdfFields || [],
      };
    }

    return null;
  }

  static async createTemplate(
    template: Omit<DocumentTemplate, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    // Extraire les URLs d'images du contenu HTML
    const imageUrls =
      template.imageUrls || this.extractImageUrls(template.content);

    const newTemplate = {
      ...template,
      imageUrls,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Chemin de collection approprié en fonction du type de template
    let docRef;
    if (template.isSystem) {
      docRef = await addDoc(
        collection(db, this.SYSTEM_TEMPLATES_COLLECTION),
        newTemplate
      );
    } else {
      // Stocker dans la sous-collection de l'utilisateur
      docRef = await addDoc(
        collection(
          db,
          this.USER_TEMPLATES_COLLECTION,
          template.userId,
          "templates"
        ),
        newTemplate
      );
    }

    return docRef.id;
  }

  static async updateTemplate(
    templateId: string,
    updates: Partial<DocumentTemplate>,
    userId?: string
  ): Promise<boolean> {
    // Données à mettre à jour
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp(),
    };

    // Trouver où le template est stocké
    let templateRef;

    // Si c'est un template système
    if (updates.isSystem) {
      templateRef = doc(db, this.SYSTEM_TEMPLATES_COLLECTION, templateId);
    }
    // Si c'est un template utilisateur et que l'ID utilisateur est fourni
    else if (userId) {
      templateRef = doc(
        db,
        this.USER_TEMPLATES_COLLECTION,
        userId,
        "templates",
        templateId
      );
    }
    // Si nous ne savons pas où chercher, essayer de récupérer d'abord le template
    else {
      const template = await this.getTemplate(templateId);
      if (!template) {
        throw new Error(`Template ${templateId} non trouvé`);
      }

      if (template.isSystem) {
        templateRef = doc(db, this.SYSTEM_TEMPLATES_COLLECTION, templateId);
      } else {
        templateRef = doc(
          db,
          this.USER_TEMPLATES_COLLECTION,
          template.userId,
          "templates",
          templateId
        );
      }
    }

    await updateDoc(templateRef, updateData);
    return true;
  }

  static async deleteTemplate(
    templateId: string,
    userId?: string
  ): Promise<boolean> {
    // Récupérer le template pour avoir les URLs des images et savoir où il est stocké
    const template = await this.getTemplate(templateId, userId);
    if (!template) {
      return false;
    }

    // Supprimer les images stockées dans Firebase Storage
    if (template.imageUrls && template.imageUrls.length > 0) {
      await Promise.all(
        template.imageUrls.map((url) => {
          // Extraire le chemin de l'URL
          const imagePath = this.getImagePathFromUrl(url);
          if (imagePath) {
            const imageRef = ref(storage, imagePath);
            return deleteObject(imageRef).catch(() => {
              // Ignorer l'erreur et continuer
            });
          }
          return Promise.resolve();
        })
      );
    }

    // Supprimer le document du template
    if (template.isSystem) {
      await deleteDoc(doc(db, this.SYSTEM_TEMPLATES_COLLECTION, templateId));
    } else {
      await deleteDoc(
        doc(
          db,
          this.USER_TEMPLATES_COLLECTION,
          template.userId,
          "templates",
          templateId
        )
      );
    }

    return true;
  }

  /**
   * Télécharge une image dans Firebase Storage et retourne l'URL
   * @param file Fichier image à télécharger
   * @param userId ID de l'utilisateur
   * @returns URL de l'image téléchargée
   */
  static async uploadImage(file: File, userId: string): Promise<string> {
    // Générer un nom de fichier unique
    const fileName = `${Date.now()}_${uuidv4()}_${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;

    // Créer une référence à l'emplacement où sera stockée l'image
    const storagePath = `templates/${userId}/${fileName}`;
    const imageRef = ref(storage, storagePath);

    // Télécharger le fichier
    const snapshot = await uploadBytes(imageRef, file);

    // Obtenir l'URL de téléchargement
    const downloadUrl = await getDownloadURL(snapshot.ref);

    return downloadUrl;
  }

  /**
   * Extrait les URLs d'images du contenu HTML
   * @param htmlContent Contenu HTML
   * @returns Tableau d'URLs d'images
   */
  private static extractImageUrls(htmlContent: string): string[] {
    try {
      if (!htmlContent) return [];

      const imgRegex = /<img[^>]+src="([^">]+)"/g;
      const urls: string[] = [];
      let match;

      while ((match = imgRegex.exec(htmlContent)) !== null) {
        if (match[1] && match[1].startsWith("https://")) {
          urls.push(match[1]);
        }
      }

      return [...new Set(urls)]; // Éliminer les doublons
    } catch {
      return [];
    }
  }

  /**
   * Extrait le chemin de stockage à partir d'une URL Firebase Storage
   * @param url URL Firebase Storage
   * @returns Chemin de stockage
   */
  private static getImagePathFromUrl(url: string): string | null {
    try {
      // Format typique: https://firebasestorage.googleapis.com/v0/b/[bucket]/o/[encodedPath]?token=...
      const match = url.match(/\/o\/([^?]+)/);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
      return null;
    } catch {
      return null;
    }
  }

  // Extrait les champs dynamiques d'un template PDF
  static extractPdfFields(content: string): string[] {
    if (!content || typeof content !== "string") {
      return [];
    }

    try {
      const fieldRegex = /\[([^\]]+)\]/g;
      const fields = new Set<string>();
      let match;

      while ((match = fieldRegex.exec(content)) !== null) {
        if (match[1]) {
          fields.add(match[1]);
        }
      }

      return Array.from(fields);
    } catch {
      return [];
    }
  }

  // Génère un PDF à partir d'un template et de données
  static generatePdfFromTemplate(
    template: DocumentTemplate,
    fieldValues: Record<string, string>
  ): string {
    if (!template || !template.content) {
      return "";
    }

    try {
      let processedContent = template.content;

      // Remplacer les champs par leurs valeurs
      Object.entries(fieldValues).forEach(([field, value]) => {
        const regex = new RegExp(`\\[${field}\\]`, "g");
        processedContent = processedContent.replace(regex, value);
      });

      return processedContent;
    } catch {
      return template.content;
    }
  }
}
