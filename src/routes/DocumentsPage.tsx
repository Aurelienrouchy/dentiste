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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Mic,
  FileText,
  FileDown,
  RefreshCw,
  Save,
  XCircle,
  CheckCircle2,
  FileSymlink,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDocuments, documentTypes } from "@/lib/hooks/useDocuments";
import { useAIService } from "@/lib/services/ai.service";
import { PatientService } from "@/lib/services/patient.service";
import { useAuth } from "@/lib/hooks/useAuth";
import { Patient } from "@/lib/types/patient";
import { Textarea } from "../components/ui/textarea";
import { SimplifiedMobileRecord } from "@/components/SimplifiedMobileRecord";

// Schéma de validation pour le formulaire
const formSchema = z.object({
  patientId: z.string().min(1, { message: "Veuillez sélectionner un patient" }),
  documentType: z
    .string()
    .min(1, { message: "Veuillez sélectionner un type de document" }),
});

// Composant principal de la page Documents
export function DocumentsPage() {
  const [activeTab, setActiveTab] = useState("generation");
  const [selectedDocType, setSelectedDocType] = useState(documentTypes[0]);
  const [generatedDocument, setGeneratedDocument] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const [documentTemplate, setDocumentTemplate] = useState("");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Utiliser les hooks personnalisés
  const { user } = useAuth();
  const documentsService = useDocuments();
  const {
    isRecording,
    recordingTime,
    isProcessing,
    startRecording,
    stopRecording,
    resetTranscript,
    formatTime,
    hasApiKey,
    transcribeAudio,
  } = useAIService();

  // Charger les patients depuis la base de données
  useEffect(() => {
    async function loadPatients() {
      if (!user) return;

      try {
        setIsLoadingPatients(true);
        const loadedPatients = await PatientService.getPatients(user.uid);
        setPatients(loadedPatients);
      } catch (error) {
        console.error("Erreur lors du chargement des patients:", error);
      } finally {
        setIsLoadingPatients(false);
      }
    }

    loadPatients();
  }, [user]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patientId: "",
      documentType: documentTypes[0].id,
    },
  });

  // Variables dérivées des hooks
  const selectedPatient = patients.find(
    (p) => p.id === form.watch("patientId")
  );
  const isGeneratingDocument = isProcessing || documentsService.isGenerating;
  const hasCustomTemplates =
    documentsService.customTemplates &&
    documentsService.customTemplates.length > 0;

  // Mettre à jour le template lorsque le patient ou le type de document change
  useEffect(() => {
    if (selectedPatient) {
      updateDocumentTemplate();
    }
  }, [selectedPatient, selectedDocType]);

  // Générer le template par défaut
  const updateDocumentTemplate = () => {
    if (!selectedPatient) return;

    const today = new Date().toLocaleDateString("fr-FR");
    const patientName = `${selectedPatient.lastName} ${selectedPatient.firstName}`;
    const birthDate = selectedPatient.birthDate
      ? new Date(
          Number(selectedPatient.birthDate.year),
          Number(selectedPatient.birthDate.month) - 1,
          Number(selectedPatient.birthDate.day)
        ).toLocaleDateString("fr-FR")
      : "Non renseignée";

    let template = "";

    switch (selectedDocType.id) {
      case "compte-rendu-operatoire":
        template = `Compte-Rendu Opératoire
Date de l'opération : ${today}

Dentiste
Dr. Aurelien Rouchy
Rue Marcadet, 201
75018 PARIS 18
+33 7 73 78 56 85
rouchy.aurelien@gmail.com

Patient
${patientName}
Date de naissance : ${birthDate}

[transcription]`;
        break;

      case "ordonnance":
        template = `Ordonnance
Date : ${today}

Dentiste
Dr. Aurelien Rouchy
Rue Marcadet, 201
75018 PARIS 18
+33 7 73 78 56 85
rouchy.aurelien@gmail.com

Patient
${patientName}
Date de naissance : ${birthDate}

[transcription]`;
        break;

      case "certificat-medical-presence":
        template = `Certificat Médical de Présence
Date : ${today}

Dentiste
Dr. Aurelien Rouchy
Rue Marcadet, 201
75018 PARIS 18
+33 7 73 78 56 85
rouchy.aurelien@gmail.com

Patient
${patientName}
Date de naissance : ${birthDate}

Je soussigné Dr. Aurelien Rouchy certifie avoir reçu en consultation ce jour ${patientName}.

[transcription]`;
        break;

      default:
        template = `Document Médical
Date : ${today}

Dentiste
Dr. Aurelien Rouchy
Rue Marcadet, 201
75018 PARIS 18
+33 7 73 78 56 85
rouchy.aurelien@gmail.com

Patient
${patientName}
Date de naissance : ${birthDate}

[transcription]`;
    }

    setDocumentTemplate(template);
  };

  // Charger les documents archivés lorsque l'onglet change
  useEffect(() => {
    if (activeTab === "archive") {
      documentsService.getArchivedDocuments();
    }
  }, [activeTab]);

  // Réinitialiser le message de succès après un certain temps
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  // Fonction pour gérer la dictée vocale
  const handleDictation = async () => {
    if (!hasApiKey()) {
      console.error(
        "Clé API OpenAI non configurée dans les variables d'environnement."
      );
      return;
    }

    if (isRecording) {
      // Toujours utiliser Whisper pour la transcription
      const audioBlob = await stopRecording("whisper");
      if (audioBlob) {
        const result = await transcribeAudio(audioBlob, "whisper");
        setTranscript(result.text);
      }
    } else {
      await startRecording();
    }
  };

  // Fonction pour générer un document à partir de la transcription
  const handleGenerateDocument = async () => {
    if (!transcript) {
      return;
    }

    if (!hasApiKey()) {
      console.error(
        "Clé API OpenAI non configurée dans les variables d'environnement."
      );
      return;
    }

    const patientId = form.getValues("patientId");
    const documentType = form.getValues("documentType");
    // Toujours utiliser GPT-4 pour la génération de documents
    const documentModel = "gpt4";

    const patientName = selectedPatient
      ? `${selectedPatient.lastName} ${selectedPatient.firstName}`
      : "";

    // Remplacer le marqueur [transcription] par la transcription réelle
    // On utilise une regex pour s'assurer que toutes les occurrences sont remplacées
    const fullPrompt = documentTemplate.replace(
      /\[transcription\]/g,
      transcript
    );

    // Afficher directement le document généré avec le template et la transcription
    // sans passer par l'API si l'utilisateur le souhaite
    setGeneratedDocument(fullPrompt);

    // Générer le document final via l'API
    const generatedDoc = await documentsService.generateDocument(
      patientId,
      patientName,
      documentType,
      fullPrompt, // Utiliser le template personnalisé avec la transcription
      documentModel,
      "Dr. Aurelien Rouchy"
    );

    if (generatedDoc) {
      setGeneratedDocument(generatedDoc.content);
    }
  };

  // Fonction pour sauvegarder le document généré
  const handleSaveDocument = async () => {
    if (!generatedDocument || !documentsService.selectedDocument) {
      return;
    }

    const success = await documentsService.saveDocument(
      documentsService.selectedDocument
    );

    if (success) {
      setShowSuccess(true);
      // Réinitialiser le formulaire après 1.5 secondes
      setTimeout(() => {
        resetForm();
      }, 1500);
    }
  };

  // Fonction pour télécharger le document généré
  const handleDownloadDocument = () => {
    if (!documentsService.selectedDocument) {
      return;
    }

    documentsService.downloadDocument(documentsService.selectedDocument);
  };

  // Réinitialiser le formulaire et les données
  const resetForm = () => {
    resetTranscript();
    setGeneratedDocument("");
    documentsService.setSelectedDocument(null);
  };

  // Mettre à jour le document généré quand le template change
  useEffect(() => {
    if (transcript && documentTemplate.includes("[transcription]")) {
      const updatedTemplate = documentTemplate.replace(
        /\[transcription\]/g,
        transcript
      );
      setGeneratedDocument(updatedTemplate);
    }
  }, [documentTemplate, transcript]);

  const handleMobileAudioReceived = async (audioBlob: Blob) => {
    try {
      const result = await transcribeAudio(audioBlob, "whisper");
      setTranscript(result.text);

      // Générer un document à partir de la transcription si un template existe
      if (result.text && documentTemplate) {
        const updatedTemplate = documentTemplate.replace(
          /\[transcription\]/g,
          result.text
        );
        setGeneratedDocument(updatedTemplate);

        // Mettre à jour le document sélectionné
        if (documentsService.selectedDocument) {
          // Au lieu d'essayer de mettre à jour le contenu directement
          // On met simplement à jour le document généré dans l'interface
          setGeneratedDocument(updatedTemplate);
        }
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la transcription"
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">
            Génération et gestion des documents médicaux
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsItem value="generation">Génération de documents</TabsItem>
          <TabsItem value="archive">Documents archivés</TabsItem>
        </TabsList>

        <TabsContent value="generation" className="space-y-4">
          {showSuccess && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Document sauvegardé avec succès !
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert className="bg-red-50 border-red-200">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Générer un nouveau document</CardTitle>
              <CardDescription>
                Sélectionnez un patient et un type de document à générer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <FormField
                    control={form.control}
                    name="patientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Patient</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-white">
                              <SelectValue placeholder="Sélectionner un patient" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-white">
                            {isLoadingPatients ? (
                              <SelectItem value="loading" disabled>
                                Chargement des patients...
                              </SelectItem>
                            ) : patients.length === 0 ? (
                              <SelectItem value="empty" disabled>
                                Aucun patient disponible
                              </SelectItem>
                            ) : (
                              patients.map((patient) => (
                                <SelectItem key={patient.id} value={patient.id}>
                                  {patient.gender === "Madame" && "Mme "}
                                  {patient.gender === "Monsieur" && "M. "}
                                  {patient.lastName} {patient.firstName}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="documentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type de document</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            const found = documentTypes.find(
                              (d) => d.id === value
                            );
                            if (found) {
                              setSelectedDocType(found);
                            }
                          }}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-white">
                              <SelectValue placeholder="Sélectionner un type de document" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-white">
                            {documentTypes.map((docType) => (
                              <SelectItem key={docType.id} value={docType.id}>
                                {docType.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium mb-2">
                      {selectedDocType.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {selectedDocType.description}
                    </p>

                    {hasCustomTemplates && (
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                        <p className="text-sm text-blue-700 flex items-center">
                          <FileSymlink className="h-4 w-4 mr-2" />
                          Vous avez des templates personnalisés disponibles dans
                          le menu de sélection des types de documents.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="border rounded-lg p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Dictée vocale</h4>
                      <div className="flex items-center gap-2">
                        {isRecording && (
                          <Badge
                            variant="outline"
                            className="bg-red-50 text-red-600"
                          >
                            {formatTime(recordingTime)}
                          </Badge>
                        )}
                        <SimplifiedMobileRecord
                          onAudioReceived={handleMobileAudioReceived}
                        />
                        <Button
                          variant={isRecording ? "destructive" : "default"}
                          size="sm"
                          onClick={handleDictation}
                          disabled={
                            isProcessing || form.getValues("patientId") === ""
                          }
                        >
                          <Mic className="h-4 w-4 mr-2" />
                          {isRecording ? "Arrêter" : "Dicter"}
                        </Button>
                      </div>
                    </div>

                    {isProcessing && !transcript && (
                      <div className="flex items-center justify-center p-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        <span className="ml-2 text-sm text-muted-foreground">
                          Traitement en cours...
                        </span>
                      </div>
                    )}

                    {transcript && (
                      <div className="mt-4">
                        <h4 className="font-medium mb-2">Transcription</h4>
                        <div className="border rounded-md p-3 bg-muted/50">
                          <Textarea
                            className="min-h-[100px] text-sm"
                            value={transcript}
                            onChange={(e) => {
                              setTranscript(e.target.value);
                              // Mettre à jour le document généré en temps réel
                              const updatedTemplate = documentTemplate.replace(
                                /\[transcription\]/g,
                                e.target.value
                              );
                              setGeneratedDocument(updatedTemplate);
                            }}
                            placeholder="Transcription..."
                          />
                        </div>
                        <div className="flex justify-end mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="mr-2"
                            onClick={resetTranscript}
                            disabled={isProcessing}
                          >
                            <RefreshCw className="h-3.5 w-3.5 mr-1" />
                            Réinitialiser
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleGenerateDocument}
                            disabled={isProcessing || !transcript}
                          >
                            <FileText className="h-3.5 w-3.5 mr-1" />
                            Générer
                          </Button>
                        </div>
                      </div>
                    )}

                    {generatedDocument && (
                      <div className="mt-4">
                        <h4 className="font-medium mb-2">Document généré</h4>
                        <div className="border rounded-md p-3 bg-white">
                          <pre className="text-sm whitespace-pre-wrap">
                            {generatedDocument}
                          </pre>
                        </div>
                        <div className="flex justify-end mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="mr-2"
                            onClick={handleDownloadDocument}
                            disabled={isGeneratingDocument}
                          >
                            <FileDown className="h-3.5 w-3.5 mr-1" />
                            Télécharger
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveDocument}
                            disabled={isGeneratingDocument}
                          >
                            <Save className="h-3.5 w-3.5 mr-1" />
                            Sauvegarder
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Form>
            </CardContent>
          </Card>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
            <p className="text-sm text-blue-700">
              <span className="font-medium">Information : </span>
              La transcription audio utilise le modèle Whisper et la génération
              de documents utilise GPT-4 pour garantir les meilleurs résultats.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="archive" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Documents archivés</CardTitle>
              <CardDescription>
                Accédez à vos documents générés précédemment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {documentsService.documents.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Aucun document archivé
                  </p>
                ) : (
                  documentsService.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-2 hover:bg-accent/50 rounded-md cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{doc.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Généré le {doc.createdAt.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          documentsService.setSelectedDocument(doc)
                        }
                      >
                        Voir
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {documentsService.selectedDocument && (
            <Dialog
              open={!!documentsService.selectedDocument}
              onOpenChange={(open) =>
                !open && documentsService.setSelectedDocument(null)
              }
            >
              <DialogContent className="bg-white sm:max-w-[700px]">
                <DialogHeader>
                  <DialogTitle>
                    {documentsService.selectedDocument.title}
                  </DialogTitle>
                </DialogHeader>
                <div className="border rounded-md p-4 my-4 bg-white">
                  <pre className="text-sm whitespace-pre-wrap">
                    {documentsService.selectedDocument.content}
                  </pre>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    className="mr-2"
                    onClick={() =>
                      documentsService.downloadDocument(
                        documentsService.selectedDocument!
                      )
                    }
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    Télécharger
                  </Button>
                  <Button
                    onClick={() => documentsService.setSelectedDocument(null)}
                  >
                    Fermer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
