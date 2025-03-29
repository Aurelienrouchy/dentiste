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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TemplateEditor } from "./TemplateEditor";
import {
  DocumentTemplate,
  TemplateService,
} from "@/lib/services/template.service";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useEffect } from "react";

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
  type: z.enum(["normal", "pdf"]),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

interface TemplateFormProps {
  template?: DocumentTemplate;
  onSave: (values: TemplateFormValues) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

export function TemplateForm({
  template,
  onSave,
  isLoading = false,
  error = null,
}: TemplateFormProps) {
  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      title: template?.title || "",
      description: template?.description || "",
      type: template?.type || "normal",
      content:
        template?.content ||
        `
<h2>Template de document</h2>
<p>Date: [date]</p>

<h3>Dentiste</h3>
<p>Dr. Aurelien Rouchy<br>
Rue Marcadet, 201<br>
75018 PARIS 18<br>
+33 7 73 78 56 85<br>
rouchy.aurelien@gmail.com</p>

<h3>Patient</h3>
<p>[nom_patient]<br>
Date de naissance: [date_naissance]</p>

<p>[transcription]</p>
      `.trim(),
    },
  });

  // Extraire et afficher les champs PDF lorsque le contenu change et que c'est un template PDF
  const content = form.watch("content");
  const templateType = form.watch("type");
  const isTemplateTypePdf = templateType === "pdf";

  useEffect(() => {
    if (isTemplateTypePdf && content) {
      const fields = TemplateService.extractPdfFields(content);
      console.log("Champs PDF détectés:", fields);
    }
  }, [content, isTemplateTypePdf]);

  const handleSubmit = async (values: TemplateFormValues) => {
    console.log(
      "Soumission du formulaire de template avec les valeurs:",
      values
    );

    // Si c'est un template PDF, extrait les champs
    if (values.type === "pdf") {
      const fields = TemplateService.extractPdfFields(values.content);
      console.log("Champs PDF extraits:", fields);

      // Ajout des champs à l'objet values avant de l'envoyer
      const valuesWithFields = {
        ...values,
        pdfFields: fields,
      };

      await onSave(valuesWithFields);
      console.log("Template sauvegardé avec succès");
      return;
    }

    try {
      await onSave(values);
      console.log("Template sauvegardé avec succès");
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du template:", error);
    }
  };

  const getTemplateContentPlaceholder = () => {
    if (isTemplateTypePdf) {
      return "Contenu du template PDF avec des champs dynamiques entre crochets comme [nom_patient], [date], etc.";
    }
    return "Contenu du template...";
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
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Type de template</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="normal" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Template standard
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="pdf" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Template PDF
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormDescription>
                    {isTemplateTypePdf
                      ? "Les templates PDF peuvent contenir des champs dynamiques entre crochets (ex: [nom_patient])."
                      : "Les templates standards sont utilisés pour la génération de documents."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contenu du template</FormLabel>
                  <FormControl>
                    <TemplateEditor
                      content={field.value}
                      onChange={field.onChange}
                      placeholder={getTemplateContentPlaceholder()}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isTemplateTypePdf && content && (
              <div className="bg-gray-50 p-3 rounded-md border">
                <h4 className="text-sm font-medium mb-2">Champs détectés:</h4>
                <div className="flex flex-wrap gap-2">
                  {TemplateService.extractPdfFields(content).map((field) => (
                    <div
                      key={field}
                      className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                    >
                      {field}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-end">
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {template ? "Mettre à jour" : "Créer le template"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
