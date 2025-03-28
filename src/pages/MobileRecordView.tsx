import { useParams } from "@tanstack/react-router";

export function MobileRecordView() {
  // Assurez-vous de gérer le cas où recordId est undefined
  const { recordId } = useParams();

  // Ajoutez un contrôle pour éviter les erreurs si recordId est undefined
  if (!recordId) {
    return <div>ID d'enregistrement non spécifié</div>;
  }

  // Le reste de votre code...
  // Vérifiez toutes les utilisations de .from() qui pourraient causer l'erreur

  return <div>Enregistrement ID: {recordId}</div>;
}
