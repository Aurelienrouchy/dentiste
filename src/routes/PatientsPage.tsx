import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  UserPlus,
  Search,
  FileText,
  Calendar,
  Phone,
  Pencil,
  Trash2,
  Plus,
  User,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { PatientService } from "@/lib/services/patient.service";
import { Patient, PatientFormValues } from "@/lib/types/patient";
import { PatientForm } from "@/components/patients/PatientForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export function PatientsPage() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | undefined>(
    undefined
  );
  const [searchTerm, setSearchTerm] = useState("");

  // Récupère les patients
  useEffect(() => {
    async function loadPatients() {
      if (!user) return;

      try {
        setIsLoading(true);
        const loadedPatients = await PatientService.getPatients(user.uid);
        setPatients(loadedPatients);
      } catch (error) {
        console.error("Erreur lors du chargement des patients:", error);
        toast.error("Impossible de charger les patients");
      } finally {
        setIsLoading(false);
      }
    }

    loadPatients();
  }, [user]);

  // Ouvre le formulaire d'ajout de patient
  const handleAddPatient = () => {
    setSelectedPatient(undefined);
    setIsDialogOpen(true);
  };

  // Ouvre le formulaire d'édition de patient
  const handleEditPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsDialogOpen(true);
  };

  // Gère la soumission du formulaire patient (ajout ou mise à jour)
  const handleSubmitPatient = async (data: PatientFormValues) => {
    if (!user) return;

    try {
      setIsSubmitting(true);

      if (selectedPatient) {
        // Mise à jour
        await PatientService.updatePatient(selectedPatient.id, data, user.uid);
        toast.success("Patient mis à jour avec succès");

        // Mettre à jour l'état local
        setPatients((prevPatients) =>
          prevPatients.map((p) =>
            p.id === selectedPatient.id
              ? { ...selectedPatient, ...data, updatedAt: new Date() }
              : p
          )
        );
      } else {
        // Ajout
        const newPatientId = await PatientService.addPatient(data, user.uid);
        toast.success("Patient ajouté avec succès");

        // Ajouter à l'état local
        const newPatient: Patient = {
          id: newPatientId,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: user.uid,
        };
        setPatients((prevPatients) => [...prevPatients, newPatient]);
      }

      setIsDialogOpen(false);
    } catch (error) {
      console.error("Erreur lors de l'enregistrement du patient:", error);
      toast.error(
        "Une erreur est survenue lors de l'enregistrement du patient"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Gère la suppression d'un patient
  const handleDeletePatient = async (patientId: string) => {
    if (!user) return;

    try {
      await PatientService.deletePatient(patientId, user.uid);
      setPatients((prevPatients) =>
        prevPatients.filter((p) => p.id !== patientId)
      );
      toast.success("Patient supprimé avec succès");
    } catch (error) {
      console.error("Erreur lors de la suppression du patient:", error);
      toast.error("Impossible de supprimer le patient");
    }
  };

  // Formater la date de naissance
  const formatBirthDate = (birthDate: {
    day: string;
    month: string;
    year: string;
  }) => {
    if (!birthDate.day || !birthDate.month || !birthDate.year) return "-";
    return `${birthDate.day}/${birthDate.month}/${birthDate.year}`;
  };

  // Filtrer les patients en fonction de la recherche
  const filteredPatients = patients.filter((patient) => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      patient.firstName.toLowerCase().includes(searchTermLower) ||
      patient.lastName.toLowerCase().includes(searchTermLower) ||
      (patient.email &&
        patient.email.toLowerCase().includes(searchTermLower)) ||
      (patient.phoneNumber &&
        patient.phoneNumber.toLowerCase().includes(searchTermLower))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Patients</h1>
          <p className="text-muted-foreground">
            Gérez vos patients et leurs dossiers
          </p>
        </div>
        <Button onClick={handleAddPatient}>
          <UserPlus className="h-4 w-4 mr-2" />
          Nouveau patient
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Rechercher un patient..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline">Filtres</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des patients</CardTitle>
          <CardDescription>Tous vos patients enregistrés</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-4">Chargement...</div>
          ) : filteredPatients.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <User className="h-12 w-12 text-gray-400 mb-4" />
              {searchTerm ? (
                <p className="text-muted-foreground">
                  Aucun patient ne correspond à votre recherche
                </p>
              ) : (
                <>
                  <p className="font-medium mb-1">Aucun patient trouvé</p>
                  <p className="text-muted-foreground mb-4">
                    Commencez par ajouter un patient à votre liste
                  </p>
                  <Button onClick={handleAddPatient}>
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter un patient
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPatients.map((patient) => (
                <div key={patient.id} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">
                        {patient.gender === "Madame" && "Mme "}
                        {patient.gender === "Monsieur" && "M. "}
                        {patient.lastName} {patient.firstName}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        ID: {patient.id.substring(0, 8)} • Né
                        {patient.gender === "Madame" ? "e" : ""} le{" "}
                        {formatBirthDate(patient.birthDate)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-2" />
                        Dossier
                      </Button>
                      <Button variant="outline" size="sm">
                        <Calendar className="h-4 w-4 mr-2" />
                        RDV
                      </Button>
                      <Button variant="outline" size="sm">
                        <Phone className="h-4 w-4 mr-2" />
                        Contact
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditPatient(patient)}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Modifier
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Supprimer le patient
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Êtes-vous sûr de vouloir supprimer{" "}
                              {patient.firstName} {patient.lastName} ? Cette
                              action est irréversible.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeletePatient(patient.id)}
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rendez-vous à venir</CardTitle>
          <CardDescription>
            Prochains rendez-vous avec vos patients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aucun rendez-vous à venir
          </p>
        </CardContent>
      </Card>

      {/* Formulaire d'ajout/modification de patient */}
      <PatientForm
        patient={selectedPatient}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSubmit={handleSubmitPatient}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
