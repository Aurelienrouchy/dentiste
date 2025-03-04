import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, FileText, Pencil, Trash2, AlertCircle, Copy, AlignLeft, AlignCenter, Printer } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TemplateForm } from '@/components/templates/TemplateForm';
import { TemplateService, DocumentTemplate } from '@/lib/services/template.service';
import { useAuth } from '@/lib/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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

// Utiliser TabsItem pour remplacer TabsTrigger
function TabsItem({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <button
      data-state={value}
      className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow"
    >
      {children}
    </button>
  );
}

export function TemplatesPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('mes-templates');
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
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
    } catch (err) {
      console.error("Erreur lors du chargement des templates:", err);
      setError("Impossible de charger les templates. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Filtrer les templates selon l'onglet actif
  const filteredTemplates = templates.filter(t => {
    if (activeTab === 'mes-templates') {
      return !t.isSystem;
    } else {
      return t.isSystem;
    }
  });
  
  // Créer un nouveau template
  const handleCreateTemplate = async (values: any) => {
    if (!user) {
      console.error("Tentative de création de template sans utilisateur connecté");
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
        content: values.content.length > 100 ? values.content.substring(0, 100) + "..." : values.content
      });
      await TemplateService.createTemplate({
        userId: user.uid,
        title: values.title,
        description: values.description,
        content: values.content,
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
  const handleUpdateTemplate = async (values: any) => {
    if (!user || !selectedTemplate) return;
    
    try {
      setIsProcessing(true);
      setError(null);
      await TemplateService.updateTemplate(selectedTemplate.id, {
        title: values.title,
        description: values.description,
        content: values.content,
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates de documents</h1>
          <p className="text-muted-foreground">
            Créez et gérez vos templates personnalisés
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Créer un template
        </Button>
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsItem value="mes-templates">Mes templates</TabsItem>
          <TabsItem value="templates-système">Templates système</TabsItem>
        </TabsList>
        
        <TabsContent value="mes-templates" className="space-y-4">
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
                  <h3 className="text-lg font-medium mb-2">Aucun template personnalisé</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Vous n'avez pas encore créé de templates personnalisés. Commencez par en créer un.
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
              {filteredTemplates.map(template => (
                <Card key={template.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{template.title}</CardTitle>
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
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedTemplate(template);
                        setIsEditing(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Modifier
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-destructive"
                      onClick={() => {
                        setSelectedTemplate(template);
                        setIsConfirmDeleteOpen(true);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Supprimer
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="templates-système" className="space-y-4">
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
                  <h3 className="text-lg font-medium mb-2">Aucun template système</h3>
                  <p className="text-sm text-muted-foreground">
                    Il n'y a pas encore de templates système disponibles.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map(template => (
                <Card key={template.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{template.title}</CardTitle>
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
            Voulez-vous dupliquer le template "{selectedTemplate?.title}" ? 
            Une copie sera créée dans vos templates personnalisés.
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
            <Button 
              onClick={handleDuplicateTemplate}
              disabled={isProcessing}
            >
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
              Cette action ne peut pas être annulée. Le template "{selectedTemplate?.title}" sera 
              définitivement supprimé.
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