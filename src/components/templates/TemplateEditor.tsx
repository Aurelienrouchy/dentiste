import React, { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Underline from "@tiptap/extension-underline";
import FontFamily from "@tiptap/extension-font-family";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Undo,
  Redo,
  Image as ImageIcon,
  Loader2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Printer,
  Palette,
  Divide,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { TemplateService } from "@/lib/services/template.service";
import { useAuth } from "@/lib/hooks/useAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
// @ts-expect-error - Le module n'a pas de types TS correctement définis
import html2pdf from "html2pdf.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TemplateEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

// Composant TabsTrigger personnalisé car il n'est pas exporté du module
function TabsTrigger({
  value,
  children,
  className = "",
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      data-state={value}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm ${className}`}
    >
      {children}
    </button>
  );
}

export function TemplateEditor({
  content,
  onChange,
  placeholder = "Commencez à rédiger votre template...",
}: TemplateEditorProps) {
  const { user } = useAuth();
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [isTableDialogOpen, setIsTableDialogOpen] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [imageUrl, setImageUrl] = useState("");
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState("url");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFontFamily, setSelectedFontFamily] = useState<string>("Inter");
  const [selectedHeadingLevel, setSelectedHeadingLevel] =
    useState<string>("paragraph");
  const [showColorPicker, setShowColorPicker] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextStyle,
      Color,
      Underline,
      FontFamily,
      HorizontalRule,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const addImage = async () => {
    if (!editor || !user) {
      console.error("Éditeur ou utilisateur non disponible");
      setUploadError(
        "Éditeur ou utilisateur non disponible. Veuillez vous reconnecter."
      );
      return;
    }

    console.log("Extension Image disponible:", !!editor.commands.setImage);

    if (activeTab === "url" && imageUrl) {
      try {
        console.log("Insertion d'image via URL:", imageUrl);
        // Utiliser la méthode setImage spécifique à l'extension Image
        editor
          .chain()
          .focus()
          .setImage({
            src: imageUrl,
            alt: "Image insérée",
          })
          .run();
        console.log("Image insérée avec succès via URL");
        setImageUrl("");
        setIsImageDialogOpen(false);
      } catch (error) {
        console.error("Erreur lors de l'insertion de l'image via URL:", error);
        setUploadError(
          "Erreur lors de l'insertion de l'image. Format d'URL invalide ou inaccessible."
        );
      }
    } else if (activeTab === "upload" && uploadedImage) {
      setIsUploading(true);
      setUploadError(null);

      try {
        console.log(
          "Préparation du téléchargement de l'image:",
          uploadedImage.name
        );
        // Télécharger l'image vers Firebase Storage
        const imageUrl = await TemplateService.uploadImage(
          uploadedImage,
          user.uid
        );
        console.log("Image téléchargée avec succès, URL reçue:", imageUrl);

        // Insérer l'image avec l'URL générée par Firebase en utilisant setImage
        console.log("Tentative d'insertion de l'image dans l'éditeur");
        editor
          .chain()
          .focus()
          .setImage({
            src: imageUrl,
            alt: "Image téléchargée",
          })
          .run();
        console.log("Image insérée avec succès dans l'éditeur");

        setUploadedImage(null);
        setIsImageDialogOpen(false);
      } catch (error) {
        console.error(
          "Erreur détaillée lors du téléchargement ou de l'insertion de l'image:",
          error
        );
        setUploadError(
          `Erreur: ${
            error instanceof Error ? error.message : "Problème inconnu"
          }`
        );
      } finally {
        setIsUploading(false);
      }
    } else {
      console.warn("Aucune image sélectionnée ou URL fournie");
      setUploadError(
        "Veuillez sélectionner une image ou fournir une URL valide."
      );
    }
  };

  const addTable = () => {
    if (!editor) return;

    editor
      .chain()
      .focus()
      .insertTable({ rows: tableRows, cols: tableCols, withHeaderRow: true })
      .run();

    setIsTableDialogOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Vérifier le type et la taille du fichier
      if (!file.type.startsWith("image/")) {
        setUploadError("Le fichier sélectionné n'est pas une image.");
        return;
      }

      // Limiter la taille à 5 Mo
      const maxSizeInBytes = 5 * 1024 * 1024; // 5 Mo
      if (file.size > maxSizeInBytes) {
        setUploadError(
          "L'image est trop volumineuse. La taille maximale est de 5 Mo."
        );
        return;
      }

      setUploadedImage(file);
    }
  };

  const exportToPDF = () => {
    if (!editor) return;

    const content = editor.getHTML();
    const element = document.createElement("div");
    element.className = "pdf-export";
    element.innerHTML = content;
    document.body.appendChild(element);

    const opt = {
      margin: [15, 15, 15, 15],
      filename: "template.pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    html2pdf()
      .set(opt)
      .from(element)
      .save()
      .then(() => {
        document.body.removeChild(element);
      });
  };

  const setHeading = (level: string) => {
    if (!editor) return;

    setSelectedHeadingLevel(level);

    if (level === "paragraph") {
      editor.chain().focus().setParagraph().run();
    } else if (level === "h1") {
      editor.chain().focus().toggleHeading({ level: 1 }).run();
    } else if (level === "h2") {
      editor.chain().focus().toggleHeading({ level: 2 }).run();
    } else if (level === "h3") {
      editor.chain().focus().toggleHeading({ level: 3 }).run();
    }
  };

  const setFontFamily = (family: string) => {
    if (!editor) return;
    editor.chain().focus().setFontFamily(family).run();
    setSelectedFontFamily(family);
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="border rounded-md bg-white">
      {/* Microsoft Word style ribbon */}
      <div className="border-b bg-gray-50">
        {/* Format de texte */}
        <div className="flex flex-wrap gap-1 p-2">
          <div className="flex items-center space-x-1 border-r pr-2">
            <Select value={selectedFontFamily} onValueChange={setFontFamily}>
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue placeholder="Police" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Inter">Inter</SelectItem>
                <SelectItem value="Arial">Arial</SelectItem>
                <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                <SelectItem value="Courier New">Courier New</SelectItem>
                <SelectItem value="Georgia">Georgia</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedHeadingLevel} onValueChange={setHeading}>
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue placeholder="Style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paragraph">Paragraphe</SelectItem>
                <SelectItem value="h1">Titre 1</SelectItem>
                <SelectItem value="h2">Titre 2</SelectItem>
                <SelectItem value="h3">Titre 3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-1 border-r pr-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={editor.isActive("bold") ? "bg-muted" : ""}
              title="Gras (Ctrl+B)"
            >
              <Bold className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={editor.isActive("italic") ? "bg-muted" : ""}
              title="Italique (Ctrl+I)"
            >
              <Italic className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={editor.isActive("underline") ? "bg-muted" : ""}
              title="Souligné (Ctrl+U)"
            >
              <UnderlineIcon className="h-4 w-4" />
            </Button>

            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                title="Couleur du texte"
                onClick={() => setShowColorPicker(!showColorPicker)}
              >
                <Palette className="h-4 w-4" />
              </Button>

              {showColorPicker && (
                <div className="absolute z-50 mt-1 p-2 bg-white border rounded-md shadow-lg">
                  <div className="grid grid-cols-5 gap-1">
                    {[
                      "#000000",
                      "#e60000",
                      "#0066cc",
                      "#008a00",
                      "#9933cc",
                      "#ff9900",
                      "#0099ff",
                      "#8e8e8e",
                      "#ffffff",
                      "#333333",
                    ].map((color) => (
                      <Button
                        key={color}
                        variant="ghost"
                        className="w-6 h-6 p-0"
                        style={{ backgroundColor: color }}
                        onClick={() => {
                          editor.chain().focus().setColor(color).run();
                          setShowColorPicker(false);
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-1 border-r pr-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
              className={
                editor.isActive({ textAlign: "left" }) ? "bg-muted" : ""
              }
              title="Aligner à gauche"
            >
              <AlignLeft className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                editor.chain().focus().setTextAlign("center").run()
              }
              className={
                editor.isActive({ textAlign: "center" }) ? "bg-muted" : ""
              }
              title="Centrer"
            >
              <AlignCenter className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
              className={
                editor.isActive({ textAlign: "right" }) ? "bg-muted" : ""
              }
              title="Aligner à droite"
            >
              <AlignRight className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                editor.chain().focus().setTextAlign("justify").run()
              }
              className={
                editor.isActive({ textAlign: "justify" }) ? "bg-muted" : ""
              }
              title="Justifier"
            >
              <AlignJustify className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center space-x-1 border-r pr-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={editor.isActive("bulletList") ? "bg-muted" : ""}
              title="Liste à puces"
            >
              <List className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={editor.isActive("orderedList") ? "bg-muted" : ""}
              title="Liste numérotée"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center space-x-1 border-r pr-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsImageDialogOpen(true)}
              title="Insérer une image"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsTableDialogOpen(true)}
              title="Insérer un tableau"
            >
              <TableIcon className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              title="Ligne horizontale"
            >
              <Divide className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center space-x-1 border-r pr-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={exportToPDF}
              title="Exporter en PDF"
            >
              <Printer className="h-4 w-4" />
            </Button>
          </div>

          <div className="ml-auto flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Annuler (Ctrl+Z)"
            >
              <Undo className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Rétablir (Ctrl+Y)"
            >
              <Redo className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Éditeur */}
      <div
        className="p-6 min-h-[400px] prose max-w-none"
        style={{ backgroundColor: "#ffffff" }}
      >
        <EditorContent editor={editor} className="outline-none" />
      </div>

      {/* Barre de statut */}
      <div className="p-2 border-t bg-gray-50 text-xs text-muted-foreground flex justify-between">
        <p>
          Utilisez{" "}
          <code className="bg-muted rounded px-1">[transcription]</code> pour
          indiquer où la transcription sera insérée.
        </p>
        <div>
          {editor?.storage?.characterCount?.characters() || 0} caractères
        </div>
      </div>

      {/* Dialogue pour insérer une image */}
      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Insérer une image</DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="url">URL</TabsTrigger>
              <TabsTrigger value="upload">Télécharger</TabsTrigger>
            </TabsList>
            <TabsContent value="url" className="pt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="imageUrl">URL de l'image</Label>
                  <Input
                    id="imageUrl"
                    placeholder="https://exemple.com/image.jpg"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="upload" className="pt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="imageFile">Fichier image</Label>
                  <Input
                    id="imageFile"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </div>
                {uploadedImage && (
                  <div className="text-sm">
                    Fichier sélectionné: {uploadedImage.name}
                  </div>
                )}
                {uploadError && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{uploadError}</AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsImageDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={addImage}
              disabled={
                isUploading ||
                (activeTab === "url" && !imageUrl) ||
                (activeTab === "upload" && !uploadedImage)
              }
            >
              {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Insérer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogue pour insérer un tableau */}
      <Dialog open={isTableDialogOpen} onOpenChange={setIsTableDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Insérer un tableau</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tableRows">Nombre de lignes</Label>
              <Input
                id="tableRows"
                type="number"
                min="1"
                max="10"
                value={tableRows}
                onChange={(e) => setTableRows(parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tableCols">Nombre de colonnes</Label>
              <Input
                id="tableCols"
                type="number"
                min="1"
                max="10"
                value={tableCols}
                onChange={(e) => setTableCols(parseInt(e.target.value))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsTableDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button onClick={addTable}>Insérer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
