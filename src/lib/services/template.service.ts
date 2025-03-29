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
  type?: "normal" | "pdf"; // Type de template: normal ou pdf
  pdfFields?: string[]; // Champs dynamiques disponibles dans le template PDF
}

export class TemplateService {
  static async getTemplates(userId: string): Promise<DocumentTemplate[]> {
    try {
      // Obtenir les templates système (communs à tous les utilisateurs)
      const systemTemplatesQuery = query(
        collection(db, "documentTemplates"),
        where("isSystem", "==", true),
        orderBy("title")
      );
      const systemTemplatesSnapshot = await getDocs(systemTemplatesQuery);

      // Obtenir les templates spécifiques à l'utilisateur
      const userTemplatesQuery = query(
        collection(db, "documentTemplates"),
        where("userId", "==", userId),
        orderBy("title")
      );
      const userTemplatesSnapshot = await getDocs(userTemplatesQuery);

      // Combiner les deux ensembles de templates
      const templates: DocumentTemplate[] = [];

      systemTemplatesSnapshot.forEach((doc) => {
        const data = doc.data();
        templates.push({
          id: doc.id,
          userId: data.userId,
          title: data.title,
          description: data.description,
          content: data.content,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
          isSystem: true,
          imageUrls: data.imageUrls || [],
          type: data.type || "normal",
          pdfFields: data.pdfFields || [],
        });
      });

      userTemplatesSnapshot.forEach((doc) => {
        const data = doc.data();
        templates.push({
          id: doc.id,
          userId: data.userId,
          title: data.title,
          description: data.description,
          content: data.content,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
          isSystem: false,
          imageUrls: data.imageUrls || [],
          type: data.type || "normal",
          pdfFields: data.pdfFields || [],
        });
      });

      return templates;
    } catch (error) {
      console.error("Erreur lors de la récupération des templates:", error);
      throw error;
    }
  }

  static async getPdfTemplates(userId: string): Promise<DocumentTemplate[]> {
    try {
      const templates = await this.getTemplates(userId);
      return templates.filter((template) => template.type === "pdf");
    } catch (error) {
      console.error("Erreur lors de la récupération des templates PDF:", error);
      throw error;
    }
  }

  static async getTemplate(
    templateId: string
  ): Promise<DocumentTemplate | null> {
    try {
      const templateDoc = await getDoc(
        doc(db, "documentTemplates", templateId)
      );

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
          type: data.type || "normal",
          pdfFields: data.pdfFields || [],
        };
      }

      return null;
    } catch (error) {
      console.error("Erreur lors de la récupération du template:", error);
      throw error;
    }
  }

  static async createTemplate(
    template: Omit<DocumentTemplate, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    try {
      console.log(
        "TemplateService.createTemplate - Début de la création du template:",
        template.title
      );
      console.log(
        "Contenu du template (premiers 200 caractères):",
        template.content.substring(0, 200) + "..."
      );

      // Extraire les URLs d'images du contenu HTML
      const imageUrls =
        template.imageUrls || this.extractImageUrls(template.content);
      console.log("Images extraites:", imageUrls);

      const newTemplate = {
        ...template,
        imageUrls,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      console.log("Prêt à ajouter le document à Firestore avec ces données:", {
        title: newTemplate.title,
        description: newTemplate.description,
        userId: newTemplate.userId,
        imageUrls: newTemplate.imageUrls,
      });

      const docRef = await addDoc(
        collection(db, "documentTemplates"),
        newTemplate
      );
      console.log("Document ajouté avec succès avec l'ID:", docRef.id);
      return docRef.id;
    } catch (error) {
      console.error("Erreur détaillée lors de la création du template:", error);
      throw error;
    }
  }

  static async updateTemplate(
    templateId: string,
    template: Partial<Omit<DocumentTemplate, "id" | "createdAt" | "updatedAt">>
  ): Promise<boolean> {
    try {
      const templateRef = doc(db, "documentTemplates", templateId);

      // Si le contenu a été mis à jour, extraire les nouvelles URLs d'images
      let imageUrls = template.imageUrls;
      if (template.content) {
        imageUrls = this.extractImageUrls(template.content);
      }

      await updateDoc(templateRef, {
        ...template,
        imageUrls,
        updatedAt: serverTimestamp(),
      });

      return true;
    } catch (error) {
      console.error("Erreur lors de la mise à jour du template:", error);
      throw error;
    }
  }

  static async deleteTemplate(templateId: string): Promise<boolean> {
    try {
      // Récupérer le template pour avoir les URLs des images
      const template = await this.getTemplate(templateId);

      // Supprimer les images stockées dans Firebase Storage
      if (template && template.imageUrls && template.imageUrls.length > 0) {
        await Promise.all(
          template.imageUrls.map((url) => {
            // Extraire le chemin de l'URL
            const imagePath = this.getImagePathFromUrl(url);
            if (imagePath) {
              const imageRef = ref(storage, imagePath);
              return deleteObject(imageRef).catch((error) => {
                console.warn(`Impossible de supprimer l'image ${url}:`, error);
              });
            }
            return Promise.resolve();
          })
        );
      }

      // Supprimer le document du template
      await deleteDoc(doc(db, "documentTemplates", templateId));
      return true;
    } catch (error) {
      console.error("Erreur lors de la suppression du template:", error);
      throw error;
    }
  }

  /**
   * Télécharge une image dans Firebase Storage et retourne l'URL
   * @param file Fichier image à télécharger
   * @param userId ID de l'utilisateur
   * @returns URL de l'image téléchargée
   */
  static async uploadImage(file: File, userId: string): Promise<string> {
    try {
      console.log("Début du téléchargement d'image:", {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      });

      // Générer un nom de fichier unique
      const fileName = `${Date.now()}_${uuidv4()}_${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      console.log("Nom de fichier généré:", fileName);

      // Créer une référence à l'emplacement où sera stockée l'image
      const storagePath = `templates/${userId}/${fileName}`;
      console.log("Chemin de stockage:", storagePath);
      const imageRef = ref(storage, storagePath);

      // Télécharger le fichier
      console.log("Début du téléchargement vers Firebase Storage...");
      const snapshot = await uploadBytes(imageRef, file);
      console.log("Téléchargement terminé:", snapshot.metadata);

      // Obtenir l'URL de téléchargement
      console.log("Récupération de l'URL de téléchargement...");
      const downloadUrl = await getDownloadURL(snapshot.ref);
      console.log("URL de téléchargement obtenue:", downloadUrl);

      return downloadUrl;
    } catch (error) {
      console.error(
        "Erreur détaillée lors du téléchargement de l'image:",
        error
      );
      throw error;
    }
  }

  /**
   * Extrait les URLs d'images d'un contenu HTML
   * @param content Contenu HTML du template
   * @returns Liste des URLs d'images trouvées
   */
  private static extractImageUrls(content: string): string[] {
    if (!content || typeof content !== "string") {
      console.error("Contenu invalide dans extractImageUrls:", content);
      return [];
    }

    try {
      console.log(
        "Extraction des URLs d'images à partir du contenu:",
        content.substring(0, 100) + "..."
      );
      const urls: string[] = [];
      const regex = /<img[^>]+src="([^">]+)"/g;
      let match;

      while ((match = regex.exec(content)) !== null) {
        if (match[1]) {
          if (!match[1].startsWith("data:")) {
            // Ignorer les images en base64
            console.log("URL d'image trouvée:", match[1]);
            urls.push(match[1]);
          } else {
            console.log("Image en base64 ignorée");
          }
        }
      }

      console.log(`Total des URLs d'images extraites: ${urls.length}`);
      return urls;
    } catch (error) {
      console.error("Erreur lors de l'extraction des URLs d'images:", error);
      return [];
    }
  }

  /**
   * Extrait le chemin de l'image à partir de son URL
   * @param url URL de l'image stockée dans Firebase Storage
   * @returns Chemin de l'image dans Firebase Storage
   */
  private static getImagePathFromUrl(url: string): string | null {
    try {
      // Exemple d'URL Firebase Storage:
      // https://firebasestorage.googleapis.com/v0/b/dentiste-12345.appspot.com/o/templates%2Fuser123%2Fimage.jpg?alt=media&token=abc-xyz

      const pathRegex = /\/o\/([^?]+)\?/;
      const match = url.match(pathRegex);

      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }

      return null;
    } catch (error) {
      console.error("Erreur lors de l'extraction du chemin de l'image:", error);
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
    } catch (error) {
      console.error(
        "Erreur lors de l'extraction des champs du template PDF:",
        error
      );
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
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      return template.content;
    }
  }
}
