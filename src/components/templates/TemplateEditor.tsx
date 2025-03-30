import React, { useRef, useEffect } from "react";

interface TemplateEditorProps {
  content: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function TemplateEditor({
  content,
  onChange,
  placeholder = "Contenu du template...",
}: TemplateEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    if (!editorRef.current) return;

    // Initialiser le contenu
    if (!isUpdatingRef.current) {
      editorRef.current.innerHTML = content;
    }

    // Rendre l'élément éditable
    editorRef.current.contentEditable = "true";

    // Gérer les changements
    const handleInput = () => {
      if (editorRef.current) {
        isUpdatingRef.current = true;
        onChange(editorRef.current.innerHTML);
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 0);
      }
    };

    editorRef.current.addEventListener("input", handleInput);

    return () => {
      if (editorRef.current) {
        editorRef.current.removeEventListener("input", handleInput);
      }
    };
  }, [onChange]);

  // Mise à jour du contenu si modifié de l'extérieur
  useEffect(() => {
    if (
      editorRef.current &&
      !isUpdatingRef.current &&
      editorRef.current.innerHTML !== content
    ) {
      editorRef.current.innerHTML = content;
    }
  }, [content]);

  return (
    <div className="border rounded-md bg-white">
      <div
        ref={editorRef}
        className="p-6 min-h-[400px] prose max-w-none outline-none"
        data-placeholder={placeholder}
      />
      <div className="p-2 border-t bg-gray-50 text-xs text-muted-foreground">
        <p>
          Utilisez <code className="bg-muted rounded px-1">[nom_variable]</code>{" "}
          pour insérer des variables comme [nom_patient], [date], etc.
        </p>
      </div>
    </div>
  );
}
