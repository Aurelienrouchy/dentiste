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
import { TemplateEditor } from "./TemplateEditor";
import { DocumentTemplate } from "@/lib/services/template.service";

const templateSchema = z.object({
  title: z
    .string()
    .min(3, { message: "Le titre doit contenir au moins 3 caractères" }),
  description: z.string().min(10, {
    message: "La description doit contenir au moins 10 caractères",
  }),
  content: z
    .string()
    .min(20, { message: "Le contenu doit contenir au moins 20 caractères" })
    .refine((val) => val.includes("[transcription]"), {
      message: "Le contenu doit inclure la balise [transcription]",
    }),
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

  const handleSubmit = async (values: TemplateFormValues) => {
    console.log(
      "Soumission du formulaire de template avec les valeurs:",
      values
    );
    try {
      await onSave(values);
      console.log("Template sauvegardé avec succès");
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du template:", error);
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
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contenu du template</FormLabel>
                  <FormControl>
                    <TemplateEditor
                      content={field.value}
                      onChange={field.onChange}
                      placeholder="Contenu du template..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
