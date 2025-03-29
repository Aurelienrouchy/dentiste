import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsItem } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  FileText,
  Pencil,
  Trash2,
  AlertCircle,
  Copy,
  FileDown,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TemplateForm } from "@/components/templates/TemplateForm";
import {
  TemplateService,
  DocumentTemplate,
} from "@/lib/services/template.service";
import { useAuth } from "@/lib/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PdfGenerator } from "@/components/templates/PdfGenerator";

export function TemplatesPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("mes-templates");
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [pdfTemplates, setPdfTemplates] = useState<DocumentTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<DocumentTemplate | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Charger les templates
  useEffect(() => {
    if (!user) return;

    loadTemplates();
  }, [user]);

  const loadTemplates = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);
      const loadedTemplates = await TemplateService.getTemplates(user.uid);
      setTemplates(loadedTemplates);
      // Filtrer les templates PDF
      const pdfTemplatesList = loadedTemplates.filter((t) => t.type === "pdf");
      setPdfTemplates(pdfTemplatesList);
    } catch (err) {
      console.error("Erreur lors du chargement des templates:", err);
      setError("Impossible de charger les templates. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrer les templates selon l'onglet actif
  const filteredTemplates = templates.filter((t) => {
    if (activeTab === "mes-templates") {
      return !t.isSystem && (t.type === "normal" || !t.type);
    } else if (activeTab === "templates-systeme") {
      return t.isSystem && (t.type === "normal" || !t.type);
    } else {
      return false;
    }
  });

  // Créer un nouveau template
  const handleCreateTemplate = async (values: {
    title: string;
    description: string;
    content: string;
    type: "normal" | "pdf";
    pdfFields?: string[];
  }) => {
    if (!user) {
      console.error(
        "Tentative de création de template sans utilisateur connecté"
      );
      return;
    }

    console.log("Début de création du template:", values);

    try {
      setIsProcessing(true);
      setError(null);
      console.log("Appel à TemplateService.createTemplate avec les valeurs:", {
        userId: user.uid,
        title: values.title,
        description: values.description,
        content:
          values.content.length > 100
            ? values.content.substring(0, 100) + "..."
            : values.content,
        type: values.type,
        pdfFields: values.pdfFields,
      });
      await TemplateService.createTemplate({
        userId: user.uid,
        title: values.title,
        description: values.description,
        content: values.content,
        type: values.type,
        pdfFields: values.pdfFields || [],
      });
      console.log("Template créé avec succès");
      setIsCreating(false);
      loadTemplates();
    } catch (err) {
      console.error("Erreur détaillée lors de la création du template:", err);
      setError("Impossible de créer le template. Veuillez réessayer.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Mettre à jour un template existant
  const handleUpdateTemplate = async (values: {
    title: string;
    description: string;
    content: string;
    type: "normal" | "pdf";
    pdfFields?: string[];
  }) => {
    if (!user || !selectedTemplate) return;

    try {
      setIsProcessing(true);
      setError(null);
      await TemplateService.updateTemplate(selectedTemplate.id, {
        title: values.title,
        description: values.description,
        content: values.content,
        type: values.type,
        pdfFields: values.pdfFields || [],
      });
      setIsEditing(false);
      setSelectedTemplate(null);
      loadTemplates();
    } catch (err) {
      console.error("Erreur lors de la mise à jour du template:", err);
      setError("Impossible de mettre à jour le template. Veuillez réessayer.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Supprimer un template
  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      setIsProcessing(true);
      setError(null);
      await TemplateService.deleteTemplate(selectedTemplate.id);
      setIsConfirmDeleteOpen(false);
      setSelectedTemplate(null);
      loadTemplates();
    } catch (err) {
      console.error("Erreur lors de la suppression du template:", err);
      setError("Impossible de supprimer le template. Veuillez réessayer.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Dupliquer un template
  const handleDuplicateTemplate = async () => {
    if (!user || !selectedTemplate) return;

    try {
      setIsProcessing(true);
      setError(null);
      await TemplateService.createTemplate({
        userId: user.uid,
        title: `${selectedTemplate.title} (copie)`,
        description: selectedTemplate.description,
        content: selectedTemplate.content,
        type: selectedTemplate.type || "normal",
        pdfFields: selectedTemplate.pdfFields || [],
      });
      setIsDuplicating(false);
      setSelectedTemplate(null);
      loadTemplates();
    } catch (err) {
      console.error("Erreur lors de la duplication du template:", err);
      setError("Impossible de dupliquer le template. Veuillez réessayer.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Templates</h1>
          <p className="text-muted-foreground">
            Gérez vos templates de documents et générez des PDF personnalisés
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau template
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsItem value="mes-templates">Mes templates</TabsItem>
          <TabsItem value="templates-systeme">Templates système</TabsItem>
          <TabsItem value="pdf-templates">PDF Templates</TabsItem>
        </TabsList>

        <TabsContent value="mes-templates">
          {isLoading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              </CardContent>
            </Card>
          ) : filteredTemplates.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <FileText className="h-10 w-10 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    Aucun template personnalisé
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Vous n'avez pas encore créé de templates personnalisés.
                    Commencez par en créer un.
                  </p>
                  <Button onClick={() => setIsCreating(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Créer un template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">
                        {template.title}
                      </CardTitle>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedTemplate(template);
                            setIsEditing(true);
                          }}
                          title="Modifier"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedTemplate(template);
                            setIsDuplicating(true);
                          }}
                          title="Dupliquer"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedTemplate(template);
                            setIsConfirmDeleteOpen(true);
                          }}
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {new Date(template.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <Badge
                        variant={
                          template.type === "pdf" ? "secondary" : "outline"
                        }
                      >
                        {template.type === "pdf" ? "PDF" : "Standard"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates-systeme">
          {isLoading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              </CardContent>
            </Card>
          ) : filteredTemplates.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <FileText className="h-10 w-10 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    Aucun template système
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Il n'y a pas encore de templates système disponibles.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">
                        {template.title}
                      </CardTitle>
                      <Badge variant="secondary">Système</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <CardDescription className="line-clamp-2">
                      {template.description}
                    </CardDescription>
                  </CardContent>
                  <div className="p-4 pt-0 flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTemplate(template);
                        setIsDuplicating(true);
                      }}
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      Dupliquer
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pdf-templates">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Templates PDF disponibles</CardTitle>
                  <CardDescription>
                    Vos templates PDF personnalisés pour générer des documents
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-4">
                      Chargement des templates...
                    </div>
                  ) : pdfTemplates.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground mb-4">
                        Vous n'avez pas encore créé de templates PDF.
                      </p>
                      <Button onClick={() => setIsCreating(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Créer un template PDF
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pdfTemplates.map((template) => (
                        <Card key={template.id} className="overflow-hidden">
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-lg">
                                {template.title}
                              </CardTitle>
                              <div className="flex space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedTemplate(template);
                                    setIsEditing(true);
                                  }}
                                  title="Modifier"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedTemplate(template);
                                    setIsDuplicating(true);
                                  }}
                                  title="Dupliquer"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedTemplate(template);
                                    setIsConfirmDeleteOpen(true);
                                  }}
                                  title="Supprimer"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <CardDescription>
                              {template.description}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <FileDown className="h-4 w-4 mr-2 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                  {template.pdfFields?.length || 0} champs
                                  dynamiques
                                </span>
                              </div>
                              <Badge variant="secondary">PDF</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div>
              <PdfGenerator templates={pdfTemplates} isLoading={isLoading} />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Formulaire de création de template */}
      <Dialog
        open={isCreating}
        onOpenChange={(open) => !open && setIsCreating(false)}
      >
        <DialogContent className="bg-white sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Créer un nouveau template</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <TemplateForm
              onSave={handleCreateTemplate}
              isLoading={isProcessing}
              error={error}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Formulaire d'édition de template */}
      <Dialog
        open={isEditing}
        onOpenChange={(open) => {
          if (!open) {
            setIsEditing(false);
            setSelectedTemplate(null);
          }
        }}
      >
        <DialogContent className="bg-white sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Modifier le template</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {selectedTemplate && (
              <TemplateForm
                template={selectedTemplate}
                onSave={handleUpdateTemplate}
                isLoading={isProcessing}
                error={error}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation de duplication */}
      <Dialog
        open={isDuplicating}
        onOpenChange={(open) => {
          if (!open) {
            setIsDuplicating(false);
            setSelectedTemplate(null);
          }
        }}
      >
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Dupliquer le template</DialogTitle>
          </DialogHeader>
          <p className="py-4">
            Voulez-vous dupliquer le template "{selectedTemplate?.title}" ? Une
            copie sera créée dans vos templates personnalisés.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDuplicating(false);
                setSelectedTemplate(null);
              }}
            >
              Annuler
            </Button>
            <Button onClick={handleDuplicateTemplate} disabled={isProcessing}>
              {isProcessing ? "Duplication..." : "Dupliquer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation de suppression */}
      <AlertDialog
        open={isConfirmDeleteOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsConfirmDeleteOpen(false);
            setSelectedTemplate(null);
          }
        }}
      >
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action ne peut pas être annulée. Le template "
              {selectedTemplate?.title}" sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTemplate}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground"
            >
              {isProcessing ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
