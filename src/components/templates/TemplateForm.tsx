import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CanvasEditor } from "./CanvasEditor";
import {
  DocumentTemplate,
  TemplateService,
} from "@/lib/services/template.service";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";

const templateSchema = z.object({
  title: z
    .string()
    .min(3, { message: "Le titre doit contenir au moins 3 caractères" }),
  description: z.string().min(10, {
    message: "La description doit contenir au moins 10 caractères",
  }),
  content: z
    .string()
    .min(20, { message: "Le contenu doit contenir au moins 20 caractères" }),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

interface CanvasElement {
  id: string;
  type: "text" | "image" | "variable" | "logo";
  x: number;
  y: number;
  width?: number;
  height?: number;
  content: string;
  style?: {
    fontSize?: number;
    fontWeight?: string;
    color?: string;
    fontFamily?: string;
  };
  isVariable?: boolean;
  isLogo?: boolean;
  isEditing?: boolean;
}

interface TemplateFormProps {
  initialData?: DocumentTemplate | null;
  onSubmit: (
    values: TemplateFormValues & { pdfFields?: string[] }
  ) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export function TemplateForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  error = null,
}: TemplateFormProps) {
  const [canvasElements, setCanvasElements] = useState<CanvasElement[]>([]);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const { user } = useAuth();

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      content:
        initialData?.content ||
        `
<div class="canvas-template" data-canvas-json="[]">
  <!-- Template de document par défaut -->
</div>
      `.trim(),
    },
  });

  // Charger le logo depuis localStorage
  useEffect(() => {
    if (user) {
      const savedLogoUrl = localStorage.getItem(
        `practitioner_logo_${user.uid}`
      );
      if (savedLogoUrl) {
        setLogoUrl(savedLogoUrl);
      }
    }
  }, [user]);

  // Initialiser les éléments du canvas au chargement initial
  useEffect(() => {
    try {
      // Si l'on a des données initiales et que c'est un template existant,
      // essayer de parser le contenu pour récupérer les éléments du canvas
      if (initialData?.id) {
        // Tenter d'extraire les éléments du canvas depuis le contenu
        const canvasDataMatch = initialData.content.match(
          /data-canvas-json="([^"]*)"/
        );

        if (canvasDataMatch && canvasDataMatch[1]) {
          try {
            const decodedJson = decodeURIComponent(canvasDataMatch[1]);
            const parsedElements = JSON.parse(decodedJson) as CanvasElement[];

            if (Array.isArray(parsedElements) && parsedElements.length > 0) {
              setCanvasElements(parsedElements);
              return; // Si on a réussi à récupérer les éléments, on arrête là
            }
          } catch {
            // Ignorer l'erreur
          }
        }

        // Fallback: créer un élément texte basique si le parsing a échoué
        setCanvasElements([
          {
            id: `element-${Date.now()}`,
            type: "text",
            x: 50,
            y: 50,
            content: "Template existant",
            style: {
              fontSize: 24,
              fontWeight: "bold",
              color: "#000000",
            },
          },
        ]);
      }
    } catch {
      // Ignorer l'erreur
    }
  }, [initialData]);

  const handleCanvasElementsChange = (elements: CanvasElement[]) => {
    setCanvasElements(elements);

    // Récupérer toutes les variables depuis les éléments
    const variables = elements
      .filter((el) => el.isVariable)
      .map((el) => {
        // Extraire le nom de la variable des crochets [nom_variable]
        const match = el.content.match(/\[(.+?)\]/);
        return match ? match[1] : null;
      })
      .filter(Boolean) as string[];

    // Mettre à jour le contenu du formulaire sans créer une boucle infinie
    // On utilise setTimeout pour s'assurer que cette mise à jour est asynchrone
    setTimeout(() => {
      const htmlContent = `
      <div class="canvas-template" data-canvas-json="${encodeURIComponent(JSON.stringify(elements))}">
        ${elements.map(generateElementHtml).join("\n")}
        <!-- Variables: ${variables.join(", ")} -->
      </div>
      `;

      form.setValue("content", htmlContent, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: false,
      });
    }, 0);
  };

  // Fonction auxiliaire pour générer l'HTML à partir d'un élément de canvas
  const generateElementHtml = (element: CanvasElement): string => {
    const commonStyles = `position:absolute;left:${element.x}px;top:${element.y}px;`;

    if (element.type === "text" || element.type === "variable") {
      const fontSize = element.style?.fontSize || 16;
      const fontWeight = element.style?.fontWeight || "normal";
      const color = element.style?.color || "#000000";
      const fontStyle =
        element.style?.fontWeight === "italic" ? "italic" : "normal";

      const styles = `${commonStyles}font-size:${fontSize}px;font-weight:${fontWeight};color:${color};font-style:${fontStyle};white-space:pre-wrap;`;

      return `<div style="${styles}">${element.content}</div>`;
    } else if (element.type === "image" && element.content) {
      const width = element.width ? `width:${element.width}px;` : "";
      const height = element.height ? `height:${element.height}px;` : "";

      const styles = `${commonStyles}${width}${height}max-width:100%;`;

      return `<img src="${element.content}" alt="Image" style="${styles}" />`;
    }

    return "";
  };

  const handleSubmit = async (values: TemplateFormValues) => {
    // Extraire les champs
    const fields = TemplateService.extractPdfFields(values.content);

    // Ajout des champs à l'objet values avant de l'envoyer
    const valuesWithFields = {
      ...values,
      pdfFields: fields,
    };

    try {
      await onSubmit(valuesWithFields);
    } catch {
      // Ignorer l'erreur (déjà gérée par le composant parent)
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <Card>
          <CardContent className="space-y-4 pt-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre du template</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Exemple: Compte-rendu opératoire"
                      {...field}
                      className="bg-white"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Description du template et cas d'utilisation"
                      {...field}
                      className="min-h-[80px] bg-white"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={() => (
                <FormItem>
                  <FormLabel>Édition visuelle</FormLabel>
                  <FormControl>
                    <CanvasEditor
                      initialElements={canvasElements}
                      onChange={handleCanvasElementsChange}
                      availableVariables={[
                        "nom_patient",
                        "date_naissance",
                        "date",
                        "contenu",
                        "adresse",
                        "telephone",
                        "email",
                      ]}
                      logoUrl={logoUrl}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch("content") && (
              <div className="bg-gray-50 p-3 rounded-md border">
                <h4 className="text-sm font-medium mb-2">Champs détectés:</h4>
                <div className="flex flex-wrap gap-2">
                  {TemplateService.extractPdfFields(form.watch("content")).map(
                    (field) => (
                      <div
                        key={field}
                        className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                      >
                        {field}
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between space-x-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? "Mettre à jour" : "Créer le template"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
