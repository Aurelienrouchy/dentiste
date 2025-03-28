// import { useState, useEffect } from "react";
// import { useAuth } from "@/lib/hooks/useAuth";
// import { AdminService } from "@/lib/services/admin.service";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
//   AlertDialogTrigger,
// } from "@/components/ui/alert-dialog";
// import { toast } from "sonner";
// import { Shield, Users, User, Search, FileText, Download } from "lucide-react";

// interface UserData {
//   uid: string;
//   email: string | undefined;
//   displayName: string | undefined;
//   metadata: {
//     creationTime: string | undefined;
//     lastSignInTime: string | undefined;
//   };
//   customClaims?: Record<string, unknown>;
// }

// export function AdminPage() {
//   const { user } = useAuth();
//   const [isAdmin, setIsAdmin] = useState(false);
//   const [users, setUsers] = useState<UserData[]>([]);
//   const [patients, setPatients] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [searchTerm, setSearchTerm] = useState("");

//   // Vérifier si l'utilisateur actuel est administrateur
//   useEffect(() => {
//     const checkAdminStatus = async () => {
//       if (!user) return;

//       try {
//         // Vérification basée sur les customClaims de l'utilisateur
//         const token = await user.getIdTokenResult();
//         setIsAdmin(!!token.claims.admin);
//       } catch (error) {
//         console.error("Erreur lors de la vérification du statut admin:", error);
//         setIsAdmin(false);
//       }
//     };

//     checkAdminStatus();
//   }, [user]);

//   // Charger les données administratives
//   useEffect(() => {
//     const loadAdminData = async () => {
//       if (!user || !isAdmin) return;

//       try {
//         setLoading(true);

//         // Charger les utilisateurs
//         const usersList = await AdminService.getAllUsers();
//         setUsers(usersList);

//         // Charger les patients
//         const patientsList = await AdminService.getAllPatients();
//         setPatients(patientsList);
//       } catch (error) {
//         console.error("Erreur lors du chargement des données admin:", error);
//         toast.error("Impossible de charger les données administratives");
//       } finally {
//         setLoading(false);
//       }
//     };

//     if (isAdmin) {
//       loadAdminData();
//     }
//   }, [isAdmin, user]);

//   // Filtrer les utilisateurs en fonction du terme de recherche
//   const filteredUsers = users.filter((user) => {
//     const searchLower = searchTerm.toLowerCase();
//     return (
//       user.email?.toLowerCase().includes(searchLower) ||
//       user.displayName?.toLowerCase().includes(searchLower) ||
//       user.uid.toLowerCase().includes(searchLower)
//     );
//   });

//   // Filtrer les patients en fonction du terme de recherche
//   const filteredPatients = patients.filter((patient) => {
//     const searchLower = searchTerm.toLowerCase();
//     return (
//       patient.firstName?.toLowerCase().includes(searchLower) ||
//       patient.lastName?.toLowerCase().includes(searchLower) ||
//       patient.email?.toLowerCase().includes(searchLower)
//     );
//   });

//   // Gérer la promotion d'un utilisateur en administrateur
//   const handlePromoteToAdmin = async (uid: string) => {
//     try {
//       await AdminService.setUserClaims(uid, { admin: true });
//       toast.success("L'utilisateur a été promu administrateur");

//       // Mettre à jour la liste des utilisateurs
//       setUsers(
//         users.map((u) =>
//           u.uid === uid
//             ? { ...u, customClaims: { ...(u.customClaims || {}), admin: true } }
//             : u
//         )
//       );
//     } catch (error) {
//       console.error("Erreur lors de la promotion de l'utilisateur:", error);
//       toast.error("Impossible de promouvoir l'utilisateur");
//     }
//   };

//   // Gérer la suppression d'un utilisateur
//   const handleDeleteUser = async (uid: string) => {
//     try {
//       await AdminService.deleteUserAndData(uid);
//       toast.success("L'utilisateur a été supprimé");

//       // Mettre à jour la liste des utilisateurs
//       setUsers(users.filter((u) => u.uid !== uid));
//     } catch (error) {
//       console.error("Erreur lors de la suppression de l'utilisateur:", error);
//       toast.error("Impossible de supprimer l'utilisateur");
//     }
//   };

//   // Gérer l'export des données d'un patient
//   const handleExportPatientData = async (patientId: string) => {
//     try {
//       const patientData = await AdminService.exportPatientData(patientId);

//       // Créer un blob et un lien de téléchargement
//       const dataStr = JSON.stringify(patientData, null, 2);
//       const blob = new Blob([dataStr], { type: "application/json" });
//       const url = URL.createObjectURL(blob);

//       // Créer un élément de lien temporaire pour le téléchargement
//       const a = document.createElement("a");
//       a.href = url;
//       a.download = `patient-${patientId}-export.json`;
//       document.body.appendChild(a);
//       a.click();

//       // Nettoyer
//       setTimeout(() => {
//         document.body.removeChild(a);
//         URL.revokeObjectURL(url);
//       }, 0);

//       toast.success("Données du patient exportées avec succès");
//     } catch (error) {
//       console.error("Erreur lors de l'export des données du patient:", error);
//       toast.error("Impossible d'exporter les données du patient");
//     }
//   };

//   // Si l'utilisateur n'est pas administrateur, afficher un message
//   if (!isAdmin) {
//     return (
//       <div className="container p-4 sm:p-6">
//         <Card className="w-full max-w-md mx-auto">
//           <CardHeader>
//             <CardTitle className="flex items-center gap-2">
//               <Shield className="h-5 w-5" />
//               Accès administrateur
//             </CardTitle>
//             <CardDescription>
//               Cette page est réservée aux administrateurs.
//             </CardDescription>
//           </CardHeader>
//           <CardContent>
//             <p className="text-sm text-muted-foreground">
//               Vous n'avez pas les droits nécessaires pour accéder à cette page.
//               Veuillez contacter un administrateur si vous pensez que cela est
//               une erreur.
//             </p>
//           </CardContent>
//         </Card>
//       </div>
//     );
//   }

//   return (
//     <div className="container p-4 sm:p-6">
//       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
//         <div>
//           <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
//             Administration
//           </h1>
//           <p className="text-sm sm:text-base text-muted-foreground">
//             Gérez les utilisateurs, patients et autres paramètres
//           </p>
//         </div>
//       </div>

//       <div className="flex items-center my-6">
//         <div className="relative flex-1 max-w-lg">
//           <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
//           <Input
//             type="search"
//             placeholder="Rechercher..."
//             className="pl-8 w-full"
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//           />
//         </div>
//       </div>

//       <Tabs defaultValue="users" className="w-full">
//         <TabsList className="mb-4">
//           <TabsTrigger value="users" className="flex items-center gap-2">
//             <Users className="h-4 w-4" />
//             Utilisateurs
//           </TabsTrigger>
//           <TabsTrigger value="patients" className="flex items-center gap-2">
//             <User className="h-4 w-4" />
//             Patients
//           </TabsTrigger>
//         </TabsList>

//         <TabsContent value="users">
//           <Card>
//             <CardHeader>
//               <CardTitle>Gestion des utilisateurs</CardTitle>
//               <CardDescription>
//                 Liste de tous les utilisateurs enregistrés
//               </CardDescription>
//             </CardHeader>
//             <CardContent>
//               {loading ? (
//                 <div className="text-center py-4">Chargement...</div>
//               ) : (
//                 <div className="rounded-md border">
//                   <Table>
//                     <TableHeader>
//                       <TableRow>
//                         <TableHead>Email</TableHead>
//                         <TableHead>Nom</TableHead>
//                         <TableHead>Date d'inscription</TableHead>
//                         <TableHead>Statut</TableHead>
//                         <TableHead>Actions</TableHead>
//                       </TableRow>
//                     </TableHeader>
//                     <TableBody>
//                       {filteredUsers.length === 0 ? (
//                         <TableRow>
//                           <TableCell
//                             colSpan={5}
//                             className="text-center h-24 text-muted-foreground"
//                           >
//                             Aucun utilisateur trouvé
//                           </TableCell>
//                         </TableRow>
//                       ) : (
//                         filteredUsers.map((user) => (
//                           <TableRow key={user.uid}>
//                             <TableCell>{user.email || "-"}</TableCell>
//                             <TableCell>{user.displayName || "-"}</TableCell>
//                             <TableCell>
//                               {user.metadata.creationTime
//                                 ? new Date(
//                                     user.metadata.creationTime
//                                   ).toLocaleDateString()
//                                 : "-"}
//                             </TableCell>
//                             <TableCell>
//                               {user.customClaims?.admin ? (
//                                 <span className="px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
//                                   Admin
//                                 </span>
//                               ) : (
//                                 <span className="px-2 py-1 rounded-full text-xs bg-muted text-muted-foreground">
//                                   Utilisateur
//                                 </span>
//                               )}
//                             </TableCell>
//                             <TableCell>
//                               <div className="flex gap-2">
//                                 {!user.customClaims?.admin && (
//                                   <AlertDialog>
//                                     <AlertDialogTrigger asChild>
//                                       <Button
//                                         variant="outline"
//                                         size="sm"
//                                         className="h-8 px-2"
//                                       >
//                                         Promouvoir
//                                       </Button>
//                                     </AlertDialogTrigger>
//                                     <AlertDialogContent>
//                                       <AlertDialogHeader>
//                                         <AlertDialogTitle>
//                                           Promouvoir en administrateur
//                                         </AlertDialogTitle>
//                                         <AlertDialogDescription>
//                                           Êtes-vous sûr de vouloir promouvoir{" "}
//                                           <strong>{user.email}</strong> au rang
//                                           d'administrateur ? Cela lui donnera un
//                                           accès complet à toutes les
//                                           fonctionnalités administratives.
//                                         </AlertDialogDescription>
//                                       </AlertDialogHeader>
//                                       <AlertDialogFooter>
//                                         <AlertDialogCancel>
//                                           Annuler
//                                         </AlertDialogCancel>
//                                         <AlertDialogAction
//                                           onClick={() =>
//                                             handlePromoteToAdmin(user.uid)
//                                           }
//                                         >
//                                           Confirmer
//                                         </AlertDialogAction>
//                                       </AlertDialogFooter>
//                                     </AlertDialogContent>
//                                   </AlertDialog>
//                                 )}

//                                 <AlertDialog>
//                                   <AlertDialogTrigger asChild>
//                                     <Button
//                                       variant="destructive"
//                                       size="sm"
//                                       className="h-8 px-2"
//                                     >
//                                       Supprimer
//                                     </Button>
//                                   </AlertDialogTrigger>
//                                   <AlertDialogContent>
//                                     <AlertDialogHeader>
//                                       <AlertDialogTitle>
//                                         Supprimer l'utilisateur
//                                       </AlertDialogTitle>
//                                       <AlertDialogDescription>
//                                         Êtes-vous sûr de vouloir supprimer{" "}
//                                         <strong>{user.email}</strong> ? Cette
//                                         action supprimera également toutes les
//                                         données associées à cet utilisateur.
//                                         Cette action est irréversible.
//                                       </AlertDialogDescription>
//                                     </AlertDialogHeader>
//                                     <AlertDialogFooter>
//                                       <AlertDialogCancel>
//                                         Annuler
//                                       </AlertDialogCancel>
//                                       <AlertDialogAction
//                                         onClick={() =>
//                                           handleDeleteUser(user.uid)
//                                         }
//                                       >
//                                         Supprimer
//                                       </AlertDialogAction>
//                                     </AlertDialogFooter>
//                                   </AlertDialogContent>
//                                 </AlertDialog>
//                               </div>
//                             </TableCell>
//                           </TableRow>
//                         ))
//                       )}
//                     </TableBody>
//                   </Table>
//                 </div>
//               )}
//             </CardContent>
//           </Card>
//         </TabsContent>

//         <TabsContent value="patients">
//           <Card>
//             <CardHeader>
//               <CardTitle>Gestion des patients</CardTitle>
//               <CardDescription>
//                 Liste de tous les patients enregistrés
//               </CardDescription>
//             </CardHeader>
//             <CardContent>
//               {loading ? (
//                 <div className="text-center py-4">Chargement...</div>
//               ) : (
//                 <div className="rounded-md border">
//                   <Table>
//                     <TableHeader>
//                       <TableRow>
//                         <TableHead>Nom</TableHead>
//                         <TableHead>Prénom</TableHead>
//                         <TableHead>Email</TableHead>
//                         <TableHead>Téléphone</TableHead>
//                         <TableHead>Actions</TableHead>
//                       </TableRow>
//                     </TableHeader>
//                     <TableBody>
//                       {filteredPatients.length === 0 ? (
//                         <TableRow>
//                           <TableCell
//                             colSpan={5}
//                             className="text-center h-24 text-muted-foreground"
//                           >
//                             Aucun patient trouvé
//                           </TableCell>
//                         </TableRow>
//                       ) : (
//                         filteredPatients.map((patient) => (
//                           <TableRow key={patient.id}>
//                             <TableCell>{patient.lastName}</TableCell>
//                             <TableCell>{patient.firstName}</TableCell>
//                             <TableCell>{patient.email || "-"}</TableCell>
//                             <TableCell>{patient.phoneNumber || "-"}</TableCell>
//                             <TableCell>
//                               <div className="flex gap-2">
//                                 <Button
//                                   variant="outline"
//                                   size="sm"
//                                   className="h-8 px-2 flex items-center gap-1"
//                                   onClick={() =>
//                                     handleExportPatientData(patient.id)
//                                   }
//                                 >
//                                   <Download className="h-3 w-3" />
//                                   Export
//                                 </Button>

//                                 <AlertDialog>
//                                   <AlertDialogTrigger asChild>
//                                     <Button
//                                       variant="destructive"
//                                       size="sm"
//                                       className="h-8 px-2"
//                                     >
//                                       Supprimer
//                                     </Button>
//                                   </AlertDialogTrigger>
//                                   <AlertDialogContent>
//                                     <AlertDialogHeader>
//                                       <AlertDialogTitle>
//                                         Supprimer le patient
//                                       </AlertDialogTitle>
//                                       <AlertDialogDescription>
//                                         Êtes-vous sûr de vouloir supprimer le
//                                         patient{" "}
//                                         <strong>
//                                           {patient.firstName} {patient.lastName}
//                                         </strong>{" "}
//                                         ? Cette action supprimera également
//                                         toutes les données associées à ce
//                                         patient. Cette action est irréversible.
//                                       </AlertDialogDescription>
//                                     </AlertDialogHeader>
//                                     <AlertDialogFooter>
//                                       <AlertDialogCancel>
//                                         Annuler
//                                       </AlertDialogCancel>
//                                       <AlertDialogAction>
//                                         Supprimer
//                                       </AlertDialogAction>
//                                     </AlertDialogFooter>
//                                   </AlertDialogContent>
//                                 </AlertDialog>
//                               </div>
//                             </TableCell>
//                           </TableRow>
//                         ))
//                       )}
//                     </TableBody>
//                   </Table>
//                 </div>
//               )}
//             </CardContent>
//           </Card>
//         </TabsContent>
//       </Tabs>
//     </div>
//   );
// }
