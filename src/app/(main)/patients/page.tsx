"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { PatientService } from "@/lib/services/patient.service";
import { Patient, PatientFormValues } from "@/lib/types/patient";
import { Button } from "@/components/ui/button";
import { PatientForm } from "@/components/patients/PatientForm";
import { Pencil, Trash2, Plus, User } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default function PatientsPage() {
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
        await PatientService.updatePatient(selectedPatient.id, data);
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
    try {
      await PatientService.deletePatient(patientId);
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
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Patients</CardTitle>
            <CardDescription>
              Gérez vos patients et leurs informations
            </CardDescription>
          </div>
          <Button onClick={handleAddPatient}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un patient
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Rechercher un patient..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Prénom</TableHead>
                  <TableHead>Date de naissance</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Visibilité</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell className="font-medium">
                      {patient.gender === "Madame" && "Mme "}
                      {patient.gender === "Monsieur" && "M. "}
                      {patient.lastName}
                    </TableCell>
                    <TableCell>{patient.firstName}</TableCell>
                    <TableCell>{formatBirthDate(patient.birthDate)}</TableCell>
                    <TableCell>{patient.email || "-"}</TableCell>
                    <TableCell>{patient.phoneNumber || "-"}</TableCell>
                    <TableCell>
                      {patient.visibility === "public" ? (
                        <Badge variant="secondary">Cabinet</Badge>
                      ) : (
                        <Badge>Privé</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditPatient(patient)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-white">
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
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
