import { QRCodeSVG } from "qrcode.react"; // ou une autre bibliothèque de QR code

interface QRCodeGeneratorProps {
  recordId: string;
}

// Définir la fonction en dehors du composant pour pouvoir l'exporter
export function generateQRCodeUrl(id: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/mobile-record?sessionId=${id}`;
}

export function QRCodeGenerator({ recordId }: QRCodeGeneratorProps) {
  const url = generateQRCodeUrl(recordId);

  return (
    <div>
      <h3>Scannez pour accéder à l'enregistrement</h3>
      <QRCodeSVG value={url} size={200} />
      <p>URL: {url}</p>
    </div>
  );
}
