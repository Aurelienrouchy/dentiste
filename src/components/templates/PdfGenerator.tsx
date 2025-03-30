import { useState, useEffect, useRef } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  FileDown,
  Eye,
  ImagePlus,
  Trash2,
  Settings2,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import {
  DocumentTemplate,
  TemplateService,
} from "@/lib/services/template.service";
import { useAuth } from "@/lib/hooks/useAuth";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
// @ts-expect-error - Le module n'a pas de types TS correctement définis
import html2pdf from "html2pdf.js";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";

// Type pour le champ de formulaire dynamique
type DynamicField = Record<string, z.ZodType<unknown>>;

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
  const { user } = useAuth();
  const [selectedTemplate, setSelectedTemplate] =
    useState<DocumentTemplate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // États pour le logo et les annexes
  const [, setLogo] = useState<File | null>(null); // On garde setLogo pour future utilisation
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [annexes, setAnnexes] = useState<File[]>([]);
  const [annexeUrls, setAnnexeUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Informations du praticien
  const [practitionerSettings, setPractitionerSettings] = useState({
    useLogo: false,
    useInfo: false,
    name: "",
    address: "",
    phone: "",
    email: "",
    customInfo: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const annexeInputRef = useRef<HTMLInputElement>(null);

  // Créer un schéma dynamique basé sur le template sélectionné
  const getValidationSchema = () => {
    const baseSchema = createPdfSchema;

    if (!selectedTemplate?.pdfFields?.length) {
      return baseSchema;
    }

    // Ajouter les champs dynamiques du template au schéma
    const dynamicFields: DynamicField = {};
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

  // Chargement des settings du praticien depuis localStorage
  useEffect(() => {
    if (user) {
      const savedSettings = localStorage.getItem(
        `practitioner_settings_${user.uid}`
      );
      const savedLogoUrl = localStorage.getItem(
        `practitioner_logo_${user.uid}`
      );

      if (savedSettings) {
        setPractitionerSettings(JSON.parse(savedSettings));
      }

      if (savedLogoUrl) {
        setLogoUrl(savedLogoUrl);
      }
    }
  }, [user]);

  // Sauvegarde des settings du praticien
  const savePractitionerSettings = () => {
    if (user) {
      localStorage.setItem(
        `practitioner_settings_${user.uid}`,
        JSON.stringify(practitionerSettings)
      );

      if (logoUrl) {
        localStorage.setItem(`practitioner_logo_${user.uid}`, logoUrl);
      }

      setIsSettingsOpen(false);
    }
  };

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

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);

    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Vérification du type
      if (!file.type.startsWith("image/")) {
        setUploadError("Le fichier doit être une image");
        return;
      }

      // Vérification de la taille (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setUploadError("L'image ne doit pas dépasser 2MB");
        return;
      }

      setLogo(file);

      try {
        setIsUploading(true);
        if (user) {
          const imageUrl = await TemplateService.uploadImage(file, user.uid);
          setLogoUrl(imageUrl);
          setPractitionerSettings((prev) => ({ ...prev, useLogo: true }));
        }
      } catch (error) {
        console.error("Erreur lors de l'upload du logo:", error);
        setUploadError("Impossible d'uploader le logo");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleAddAnnexe = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);

    if (e.target.files && e.target.files.length > 0) {
      try {
        setIsUploading(true);

        const newAnnexes = [...annexes];
        const newAnnexeUrls = [...annexeUrls];

        for (let i = 0; i < e.target.files.length; i++) {
          const file = e.target.files[i];

          // Vérification du type
          if (!file.type.startsWith("image/")) {
            setUploadError("Les fichiers doivent être des images");
            continue;
          }

          // Vérification de la taille (max 5MB)
          if (file.size > 5 * 1024 * 1024) {
            setUploadError("Les images ne doivent pas dépasser 5MB");
            continue;
          }

          newAnnexes.push(file);

          if (user) {
            const imageUrl = await TemplateService.uploadImage(file, user.uid);
            newAnnexeUrls.push(imageUrl);
          }
        }

        setAnnexes(newAnnexes);
        setAnnexeUrls(newAnnexeUrls);
      } catch (error) {
        console.error("Erreur lors de l'upload des annexes:", error);
        setUploadError("Impossible d'uploader les annexes");
      } finally {
        setIsUploading(false);
        if (annexeInputRef.current) {
          annexeInputRef.current.value = "";
        }
      }
    }
  };

  const removeAnnexe = (index: number) => {
    const newAnnexes = [...annexes];
    const newAnnexeUrls = [...annexeUrls];

    newAnnexes.splice(index, 1);
    newAnnexeUrls.splice(index, 1);

    setAnnexes(newAnnexes);
    setAnnexeUrls(newAnnexeUrls);
  };

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

      // Extraire les valeurs des champs dynamiques sans l'ID du template
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { templateId: _, ...fieldValues } = values;

      // Générer le contenu HTML avec les valeurs des champs
      const generatedHtml = TemplateService.generatePdfFromTemplate(
        selectedTemplate,
        fieldValues as Record<string, string>
      );

      // Ajouter le logo et les informations si activés
      let headerHtml = "";

      if (practitionerSettings.useLogo && logoUrl) {
        headerHtml += `<div style="text-align: right; margin-bottom: 20px;"><img src="${logoUrl}" alt="Logo" style="max-height: 100px; max-width: 200px;"/></div>`;
      }

      if (practitionerSettings.useInfo) {
        const infoHtml = `
          <div style="margin-bottom: 20px; font-size: 0.9em;">
            ${practitionerSettings.name ? `<p style="margin: 0;"><strong>${practitionerSettings.name}</strong></p>` : ""}
            ${practitionerSettings.address ? `<p style="margin: 0;">${practitionerSettings.address}</p>` : ""}
            ${practitionerSettings.phone ? `<p style="margin: 0;">Tél: ${practitionerSettings.phone}</p>` : ""}
            ${practitionerSettings.email ? `<p style="margin: 0;">Email: ${practitionerSettings.email}</p>` : ""}
            ${practitionerSettings.customInfo ? `<p style="margin: 0;">${practitionerSettings.customInfo}</p>` : ""}
          </div>
        `;
        headerHtml += infoHtml;
      }

      // Ajouter les annexes si présentes
      let annexesHtml = "";

      if (annexeUrls.length > 0) {
        annexesHtml = `
          <div style="page-break-before: always;">
            <h2>Annexes</h2>
            ${annexeUrls
              .map(
                (url, index) =>
                  `<div style="margin-bottom: 20px; text-align: center;">
                <p><strong>Annexe ${index + 1}</strong></p>
                <img src="${url}" alt="Annexe ${index + 1}" style="max-width: 100%; max-height: 800px;"/>
              </div>`
              )
              .join("")}
          </div>
        `;
      }

      // Assembler le HTML final
      const finalHtml = headerHtml + generatedHtml + annexesHtml;

      // Créer un élément pour le rendu du PDF
      const element = document.createElement("div");
      element.className = "pdf-export";
      element.innerHTML = finalHtml;
      document.body.appendChild(element);

      // Configuration pour html2pdf
      const opt = {
        margin: [15, 15, 15, 15],
        filename: `${selectedTemplate.title}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
          compress: false,
          precision: 16,
        },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      };

      // Générer et télécharger le PDF
      await html2pdf().set(opt).from(element).save();

      // Nettoyer
      document.body.removeChild(element);

      // Réinitialiser les annexes après génération
      setAnnexes([]);
      setAnnexeUrls([]);
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { templateId: _, ...fieldValues } = values;

      // Générer le contenu HTML avec les valeurs des champs
      const generatedHtml = TemplateService.generatePdfFromTemplate(
        selectedTemplate,
        fieldValues as Record<string, string>
      );

      // Ajouter le logo et les informations si activés
      let headerHtml = "";

      if (practitionerSettings.useLogo && logoUrl) {
        headerHtml += `<div style="text-align: right; margin-bottom: 20px;"><img src="${logoUrl}" alt="Logo" style="max-height: 100px; max-width: 200px;"/></div>`;
      }

      if (practitionerSettings.useInfo) {
        const infoHtml = `
          <div style="margin-bottom: 20px; font-size: 0.9em;">
            ${practitionerSettings.name ? `<p style="margin: 0;"><strong>${practitionerSettings.name}</strong></p>` : ""}
            ${practitionerSettings.address ? `<p style="margin: 0;">${practitionerSettings.address}</p>` : ""}
            ${practitionerSettings.phone ? `<p style="margin: 0;">Tél: ${practitionerSettings.phone}</p>` : ""}
            ${practitionerSettings.email ? `<p style="margin: 0;">Email: ${practitionerSettings.email}</p>` : ""}
            ${practitionerSettings.customInfo ? `<p style="margin: 0;">${practitionerSettings.customInfo}</p>` : ""}
          </div>
        `;
        headerHtml += infoHtml;
      }

      // Ajouter les annexes si présentes
      let annexesHtml = "";

      if (annexeUrls.length > 0) {
        annexesHtml = `
          <div style="border-top: 1px solid #ccc; margin-top: 30px; padding-top: 20px;">
            <h2>Annexes</h2>
            ${annexeUrls
              .map(
                (url, index) =>
                  `<div style="margin-bottom: 20px; text-align: center;">
                <p><strong>Annexe ${index + 1}</strong></p>
                <img src="${url}" alt="Annexe ${index + 1}" style="max-width: 100%; max-height: 400px;"/>
              </div>`
              )
              .join("")}
          </div>
        `;
      }

      // Assembler le HTML final
      const finalHtml = headerHtml + generatedHtml + annexesHtml;

      setPreviewHtml(finalHtml);
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Générer un PDF</CardTitle>
              <CardDescription>
                Sélectionnez un template et remplissez les champs pour générer
                un PDF
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSettingsOpen(true)}
            >
              <Settings2 className="h-4 w-4 mr-2" />
              Paramètres
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {uploadError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{uploadError}</AlertDescription>
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
                        value={field.value as string}
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
                  name={
                    field as keyof z.infer<
                      ReturnType<typeof getValidationSchema>
                    >
                  }
                  render={({ field: formField }) => (
                    <FormItem>
                      <FormLabel>{field}</FormLabel>
                      <FormControl>
                        <Input
                          {...formField}
                          value={formField.value as string}
                          placeholder={`Valeur pour ${field}`}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}

              {/* Annexes section */}
              <div className="mt-6">
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center gap-2 cursor-pointer">
                      <h3 className="text-md font-medium">
                        Ajouter des annexes
                      </h3>
                      <ImagePlus className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="space-y-4">
                      <div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => annexeInputRef.current?.click()}
                          disabled={isUploading}
                          className="w-full"
                        >
                          {isUploading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <ImagePlus className="mr-2 h-4 w-4" />
                          )}
                          Sélectionner des images
                        </Button>
                        <input
                          type="file"
                          ref={annexeInputRef}
                          onChange={handleAddAnnexe}
                          accept="image/*"
                          multiple
                          className="hidden"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Format: JPG, PNG, GIF. Taille max: 5MB par image
                        </p>
                      </div>

                      {annexeUrls.length > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                          {annexeUrls.map((url, index) => (
                            <div
                              key={index}
                              className="relative border rounded-md overflow-hidden group"
                            >
                              <img
                                src={url}
                                alt={`Annexe ${index + 1}`}
                                className="w-full h-24 object-cover"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                                onClick={() => removeAnnexe(index)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1">
                                Annexe {index + 1}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>

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

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white">
          <DialogHeader>
            <DialogTitle>Paramètres de génération de PDF</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="uselogo" className="font-medium">
                  Utiliser mon logo
                </Label>
                <Switch
                  id="uselogo"
                  checked={practitionerSettings.useLogo}
                  onCheckedChange={(checked: boolean) =>
                    setPractitionerSettings((prev) => ({
                      ...prev,
                      useLogo: checked,
                    }))
                  }
                />
              </div>

              {practitionerSettings.useLogo && (
                <div className="mt-2 space-y-2">
                  {logoUrl && (
                    <div className="flex items-center gap-4">
                      <img
                        src={logoUrl}
                        alt="Logo"
                        className="h-16 w-auto object-contain border rounded p-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setLogo(null);
                          setLogoUrl(null);
                        }}
                      >
                        Supprimer
                      </Button>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      "Choisir un logo"
                    )}
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <p className="text-xs text-muted-foreground">
                    Format: JPG, PNG. Taille max: 2MB
                  </p>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="useinfo" className="font-medium">
                  Ajouter mes informations
                </Label>
                <Switch
                  id="useinfo"
                  checked={practitionerSettings.useInfo}
                  onCheckedChange={(checked: boolean) =>
                    setPractitionerSettings((prev) => ({
                      ...prev,
                      useInfo: checked,
                    }))
                  }
                />
              </div>

              {practitionerSettings.useInfo && (
                <div className="space-y-3 mt-2">
                  <div className="grid w-full gap-1.5">
                    <Label htmlFor="name">Nom / Cabinet</Label>
                    <Input
                      id="name"
                      value={practitionerSettings.name}
                      onChange={(e) =>
                        setPractitionerSettings((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="Dr. Aurelien Rouchy"
                    />
                  </div>

                  <div className="grid w-full gap-1.5">
                    <Label htmlFor="address">Adresse</Label>
                    <Textarea
                      id="address"
                      value={practitionerSettings.address}
                      onChange={(e) =>
                        setPractitionerSettings((prev) => ({
                          ...prev,
                          address: e.target.value,
                        }))
                      }
                      placeholder="Rue Marcadet, 201&#10;75018 PARIS 18"
                      rows={2}
                    />
                  </div>

                  <div className="grid w-full gap-1.5">
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input
                      id="phone"
                      value={practitionerSettings.phone}
                      onChange={(e) =>
                        setPractitionerSettings((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                      placeholder="+33 7 73 78 56 85"
                    />
                  </div>

                  <div className="grid w-full gap-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={practitionerSettings.email}
                      onChange={(e) =>
                        setPractitionerSettings((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      placeholder="rouchy.aurelien@gmail.com"
                    />
                  </div>

                  <div className="grid w-full gap-1.5">
                    <Label htmlFor="customInfo">
                      Informations supplémentaires
                    </Label>
                    <Textarea
                      id="customInfo"
                      value={practitionerSettings.customInfo}
                      onChange={(e) =>
                        setPractitionerSettings((prev) => ({
                          ...prev,
                          customInfo: e.target.value,
                        }))
                      }
                      placeholder="N° RPPS, site web, etc."
                      rows={2}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
              Annuler
            </Button>
            <Button onClick={savePractitionerSettings}>Enregistrer</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-white">
          <DialogTitle>Aperçu du PDF</DialogTitle>
          {previewHtml && (
            <div
              className="pdf-preview bg-white p-4 border rounded w-[21cm] mx-auto"
              style={{ minHeight: "29.7cm" }}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
