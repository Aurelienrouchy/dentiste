import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PatientFormValues, Patient, PatientGender, PatientBirthDate } from '@/lib/types/patient';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

// Validation du formulaire patient
const patientSchema = z.object({
  gender: z.enum(['Madame', 'Monsieur', 'Non spécifié'] as const),
  lastName: z.string().min(1, { message: 'Le nom est requis' }),
  firstName: z.string().min(1, { message: 'Le prénom est requis' }),
  birthDate: z.object({
    day: z.string().regex(/^(0?[1-9]|[12][0-9]|3[01])$/, { message: 'Jour invalide' }),
    month: z.string().regex(/^(0?[1-9]|1[0-2])$/, { message: 'Mois invalide' }),
    year: z.string().regex(/^\d{4}$/, { message: 'Année invalide' })
  }),
  email: z.string().email({ message: 'Email invalide' }).or(z.string().length(0)),
  phoneNumber: z.string().min(10, { message: 'Numéro de téléphone invalide' }).or(z.string().length(0)),
  anonymizationCode: z.string().optional(),
  visibility: z.enum(['public', 'private'] as const).default('public')
});

interface PatientFormProps {
  patient?: Patient;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PatientFormValues) => Promise<void>;
  isSubmitting?: boolean;
}

export function PatientForm({ 
  patient, 
  isOpen, 
  onClose,
  onSubmit,
  isSubmitting = false
}: PatientFormProps) {
  const isEditing = !!patient;
  
  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: patient ? {
      gender: patient.gender,
      lastName: patient.lastName,
      firstName: patient.firstName,
      birthDate: patient.birthDate,
      email: patient.email || '',
      phoneNumber: patient.phoneNumber || '',
      anonymizationCode: patient.anonymizationCode || '',
      visibility: patient.visibility || 'public'
    } : {
      gender: 'Non spécifié',
      lastName: '',
      firstName: '',
      birthDate: { day: '', month: '', year: '' },
      email: '',
      phoneNumber: '',
      anonymizationCode: '',
      visibility: 'public'
    }
  });

  // Réinitialiser le formulaire lorsque le patient change
  useEffect(() => {
    if (isOpen) {
      if (patient) {
        form.reset({
          gender: patient.gender,
          lastName: patient.lastName,
          firstName: patient.firstName,
          birthDate: patient.birthDate,
          email: patient.email || '',
          phoneNumber: patient.phoneNumber || '',
          anonymizationCode: patient.anonymizationCode || '',
          visibility: patient.visibility || 'public'
        });
      } else {
        form.reset({
          gender: 'Non spécifié',
          lastName: '',
          firstName: '',
          birthDate: { day: '', month: '', year: '' },
          email: '',
          phoneNumber: '',
          anonymizationCode: '',
          visibility: 'public'
        });
      }
    }
  }, [patient, isOpen, form]);

  async function handleSubmit(data: PatientFormValues) {
    await onSubmit(data);
    form.reset();
  }

  // Générer les options pour les jours, mois et années
  const days = Array.from({ length: 31 }, (_, i) => {
    const day = i + 1;
    return <option key={day} value={day}>{day}</option>;
  });

  const months = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    return <option key={month} value={month}>{month}</option>;
  });

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 120 }, (_, i) => {
    const year = currentYear - i;
    return <option key={year} value={year}>{year}</option>;
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Modifier le patient' : 'Ajouter un nouveau patient'}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Modifiez les informations du patient ci-dessous.'
              : 'Entrez les informations du nouveau patient ci-dessous.'}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Civilité */}
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Civilité</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-row space-x-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Madame" id="madame" />
                        <Label htmlFor="madame">Madame</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Monsieur" id="monsieur" />
                        <Label htmlFor="monsieur">Monsieur</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Non spécifié" id="non-specifie" />
                        <Label htmlFor="non-specifie">Non spécifié</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Nom et prénom */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du patient</FormLabel>
                    <FormControl>
                      <Input placeholder="Nom" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prénom du patient</FormLabel>
                    <FormControl>
                      <Input placeholder="Prénom" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Date de naissance */}
            <FormLabel>Date de naissance du patient</FormLabel>
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="birthDate.day"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={field.value}
                        onChange={field.onChange}
                      >
                        <option value="">Jour</option>
                        {days}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="birthDate.month"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={field.value}
                        onChange={field.onChange}
                      >
                        <option value="">Mois</option>
                        {months}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="birthDate.year"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={field.value}
                        onChange={field.onChange}
                      >
                        <option value="">Année</option>
                        {years}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Numéro de téléphone */}
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numéro de téléphone</FormLabel>
                  <FormControl>
                    <Input placeholder="+33 X XX XX XX XX" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Code d'anonymisation */}
            <FormField
              control={form.control}
              name="anonymizationCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code d'anonymisation patient</FormLabel>
                  <FormControl>
                    <Input placeholder="Code d'anonymisation" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Visibilité */}
            <FormField
              control={form.control}
              name="visibility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Visibilité au sein du cabinet</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez la visibilité" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="public">Visible par tout le cabinet</SelectItem>
                      <SelectItem value="private">Visible uniquement par moi</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Enregistrement...' : isEditing ? 'Mettre à jour' : 'Ajouter'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 