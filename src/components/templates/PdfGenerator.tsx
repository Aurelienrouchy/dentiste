import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, FileDown, Eye } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import {
  DocumentTemplate,
  TemplateService,
} from "@/lib/services/template.service";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
// @ts-expect-error - Le module n'a pas de types TS correctement définis
import html2pdf from "html2pdf.js";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

// Schéma de validation pour le formulaire
const createPdfSchema = z.object({
  templateId: z.string({
    required_error: "Veuillez sélectionner un template",
  }),
  // Les champs dynamiques seront ajoutés dynamiquement
});

interface PdfGeneratorProps {
  templates: DocumentTemplate[];
  isLoading?: boolean;
}

export function PdfGenerator({
  templates,
  isLoading = false,
}: PdfGeneratorProps) {
  const [selectedTemplate, setSelectedTemplate] =
    useState<DocumentTemplate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Créer un schéma dynamique basé sur le template sélectionné
  const getValidationSchema = () => {
    const baseSchema = createPdfSchema;

    if (!selectedTemplate?.pdfFields?.length) {
      return baseSchema;
    }

    // Ajouter les champs dynamiques du template au schéma
    const dynamicFields: Record<string, z.ZodString> = {};
    selectedTemplate.pdfFields.forEach((field) => {
      dynamicFields[field] = z.string().optional();
    });

    return baseSchema.extend(dynamicFields);
  };

  const form = useForm<z.infer<ReturnType<typeof getValidationSchema>>>({
    resolver: zodResolver(getValidationSchema()),
    defaultValues: {
      templateId: "",
    },
  });

  // Mettre à jour le formulaire lorsqu'un template est sélectionné
  const templateId = form.watch("templateId");

  useEffect(() => {
    if (templateId && templateId !== selectedTemplate?.id) {
      const template = templates.find((t) => t.id === templateId);
      if (template) {
        setSelectedTemplate(template);

        // Réinitialiser les valeurs des champs dynamiques
        if (template.pdfFields?.length) {
          const defaultValues: Record<string, string> = {};
          template.pdfFields.forEach((field) => {
            defaultValues[field] = "";
          });
          form.reset({ templateId, ...defaultValues });
        }
      }
    }
  }, [templateId, templates, form]);

  const handleGeneratePdf = async (
    values: z.infer<ReturnType<typeof getValidationSchema>>
  ) => {
    if (!selectedTemplate) {
      setError("Aucun template sélectionné");
      return;
    }

    try {
      setError(null);
      setIsGenerating(true);

      // Extraire l'ID du template et les valeurs des champs dynamiques
      const { templateId: _, ...fieldValues } = values;

      // Générer le contenu HTML avec les valeurs des champs
      const generatedHtml = TemplateService.generatePdfFromTemplate(
        selectedTemplate,
        fieldValues as Record<string, string>
      );

      // Créer un élément pour le rendu du PDF
      const element = document.createElement("div");
      element.className = "pdf-export";
      element.innerHTML = generatedHtml;
      document.body.appendChild(element);

      // Configuration pour html2pdf
      const opt = {
        margin: [15, 15, 15, 15],
        filename: `${selectedTemplate.title}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };

      // Générer et télécharger le PDF
      await html2pdf().set(opt).from(element).save();

      // Nettoyer
      document.body.removeChild(element);
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      setError("Une erreur est survenue lors de la génération du PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreviewPdf = () => {
    if (!selectedTemplate) {
      setError("Aucun template sélectionné");
      return;
    }

    try {
      setError(null);

      // Extraire les valeurs des champs dynamiques
      const values = form.getValues();
      const { templateId: _, ...fieldValues } = values;

      // Générer le contenu HTML avec les valeurs des champs
      const generatedHtml = TemplateService.generatePdfFromTemplate(
        selectedTemplate,
        fieldValues as Record<string, string>
      );

      setPreviewHtml(generatedHtml);
      setIsPreviewOpen(true);
    } catch (error) {
      console.error("Erreur lors de la prévisualisation du PDF:", error);
      setError("Une erreur est survenue lors de la prévisualisation");
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Générer un PDF</CardTitle>
          <CardDescription>
            Sélectionnez un template et remplissez les champs pour générer un
            PDF
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleGeneratePdf)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="templateId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template PDF</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isLoading || templates.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un template" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedTemplate?.pdfFields?.map((field) => (
                <FormField
                  key={field}
                  control={form.control}
                  name={field as any}
                  render={({ field: formField }) => (
                    <FormItem>
                      <FormLabel>{field}</FormLabel>
                      <FormControl>
                        <Input
                          {...formField}
                          placeholder={`Valeur pour ${field}`}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePreviewPdf}
                  disabled={isGenerating || !selectedTemplate}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Aperçu
                </Button>
                <Button
                  type="submit"
                  disabled={isGenerating || !selectedTemplate}
                >
                  {isGenerating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="mr-2 h-4 w-4" />
                  )}
                  Générer PDF
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogTitle>Aperçu du PDF</DialogTitle>
          {previewHtml && (
            <div
              className="pdf-preview bg-white p-4 border rounded"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
