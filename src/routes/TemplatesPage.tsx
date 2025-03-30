import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  AlertCircle,
  Copy,
  FileDown,
  ArrowLeft,
  Edit,
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
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<DocumentTemplate | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  // Nouvel état pour gérer l'affichage de l'éditeur ou de la liste
  const [showEditor, setShowEditor] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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
    } catch {
      setError("Impossible de charger les templates. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  // Créer ou mettre à jour un template
  const handleSaveTemplate = async (values: {
    title: string;
    description: string;
    content: string;
    pdfFields?: string[];
  }) => {
    if (!user) {
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      if (isEditing && selectedTemplate) {
        // Mise à jour d'un template existant
        await TemplateService.updateTemplate(
          selectedTemplate.id,
          {
            title: values.title,
            description: values.description,
            content: values.content,
            pdfFields: values.pdfFields || [],
          },
          user.uid
        );
      } else {
        // Création d'un nouveau template
        await TemplateService.createTemplate({
          userId: user.uid,
          title: values.title,
          description: values.description,
          content: values.content,
          pdfFields: values.pdfFields || [],
        });
      }

      setShowEditor(false);
      setIsEditing(false);
      setSelectedTemplate(null);
      await loadTemplates();
    } catch (err) {
      console.error("Erreur lors de la sauvegarde du template:", err);
      setError(
        `Impossible de ${isEditing ? "modifier" : "créer"} le template. Veuillez réessayer.`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Gérer la suppression d'un template
  const handleDeleteTemplate = async () => {
    if (!selectedTemplate || !user) return;
    try {
      setIsProcessing(true);
      setError(null);
      const success = await TemplateService.deleteTemplate(
        selectedTemplate.id,
        user.uid
      );
      if (success) {
        setIsConfirmDeleteOpen(false);
        setSelectedTemplate(null);
        await loadTemplates();
      } else {
        setError("Le template n'a pas pu être supprimé. Veuillez réessayer.");
      }
    } catch (err) {
      console.error("Erreur lors de la suppression:", err);
      setError("Erreur lors de la suppression du template");
    } finally {
      setIsProcessing(false);
    }
  };

  // Éditer un template existant
  const handleEditTemplate = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    setIsEditing(true);
    setShowEditor(true);
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
        pdfFields: selectedTemplate.pdfFields || [],
      });
      setIsDuplicating(false);
      setSelectedTemplate(null);
      await loadTemplates();
    } catch {
      setError("Impossible de dupliquer le template. Veuillez réessayer.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Afficher l'éditeur pour un nouveau template
  const handleNewTemplate = () => {
    setSelectedTemplate(null);
    setIsEditing(false);
    setShowEditor(true);
  };

  // Annuler la création du template
  const handleCancelTemplate = () => {
    setShowEditor(false);
    setIsEditing(false);
    setSelectedTemplate(null);
  };

  // Rendu conditionnel basé sur l'état showEditor
  if (showEditor) {
    return (
      <div className="container mx-auto py-6 max-w-7xl">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={handleCancelTemplate}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-3xl font-bold">
            {isEditing ? "Modifier le template" : "Créer un nouveau template"}
          </h1>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <TemplateForm
          initialData={isEditing ? selectedTemplate : null}
          onSubmit={handleSaveTemplate}
          onCancel={handleCancelTemplate}
          isLoading={isProcessing}
          error={error}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Templates PDF</h1>
          <p className="text-muted-foreground">
            Créez vos propres templates PDF et générez des documents
            personnalisés
          </p>
        </div>
        <Button onClick={handleNewTemplate}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau template
        </Button>
      </div>

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
              ) : templates.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-4">
                    Vous n'avez pas encore créé de templates PDF.
                  </p>
                  <Button onClick={handleNewTemplate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Créer un template PDF
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {templates.map((template) => (
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
                              onClick={() => handleEditTemplate(template)}
                              title="Modifier"
                            >
                              <Edit className="h-4 w-4" />
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
          <PdfGenerator templates={templates} isLoading={isLoading} />
        </div>
      </div>

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
