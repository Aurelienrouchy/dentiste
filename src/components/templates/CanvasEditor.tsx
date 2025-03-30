import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  Stage,
  Layer,
  Rect,
  Text,
  Image as KonvaImage,
  Group,
  Transformer,
} from "react-konva";
import Konva from "konva";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Trash2,
  Type,
  Image as ImageIcon,
  Check,
  X,
  Variable,
  LogIn,
  RotateCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HexColorPicker } from "react-colorful";

// A4 dimensions in pixels at 96 DPI
const A4_WIDTH = 794; // 210mm at 96 DPI
const A4_HEIGHT = 1123; // 297mm at 96 DPI

// Canvas element types
type ElementType = "text" | "image" | "variable" | "logo";

interface CanvasElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  content: string;
  style?: {
    fontSize?: number;
    fontWeight?: string;
    color?: string;
    fontFamily?: string;
  };
  isVariable?: boolean;
  isEditing?: boolean;
  isLogo?: boolean;
}

interface CanvasEditorProps {
  initialElements?: CanvasElement[];
  onChange: (elements: CanvasElement[]) => void;
  availableVariables?: string[];
  logoUrl?: string;
}

export function CanvasEditor({
  initialElements = [],
  onChange,
  availableVariables = [],
  logoUrl,
}: CanvasEditorProps) {
  const [elements, setElements] = useState<CanvasElement[]>(initialElements);
  const [activeElement, setActiveElement] = useState<CanvasElement | null>(
    null
  );
  const [isAdding, setIsAdding] = useState<ElementType | null>(null);
  const [color, setColor] = useState("#000000");
  const [isTransforming, setIsTransforming] = useState(false);

  // Utiliser une référence pour éviter trop de rendus
  const isUpdatingRef = useRef(false);
  const stageRef = useRef<Konva.Stage | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Element images cache
  const [imageCache, setImageCache] = useState<
    Record<string, HTMLImageElement>
  >({});

  // Initialiser les éléments si les initialElements changent
  useEffect(() => {
    if (initialElements.length > 0 && !isUpdatingRef.current) {
      setElements(initialElements);
    }
  }, [initialElements]);

  // When elements change, notify parent component
  useEffect(() => {
    if (!isUpdatingRef.current) {
      isUpdatingRef.current = true;
      onChange(elements);
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);
    }
  }, [elements, onChange]);

  // Update transformer when active element changes
  useEffect(() => {
    if (transformerRef.current && activeElement) {
      // Find the Konva node by element id
      const node = stageRef.current?.findOne(`#node-${activeElement.id}`);
      if (node) {
        transformerRef.current.nodes([node]);

        // Ne pas afficher le transformer pour les éléments de texte ou variable
        if (
          activeElement.type === "text" ||
          activeElement.type === "variable"
        ) {
          transformerRef.current.visible(false);
        } else {
          transformerRef.current.visible(true);
        }

        transformerRef.current.getLayer()?.batchDraw();
      }
    } else if (transformerRef.current) {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [activeElement]);

  // Load images when elements change
  useEffect(() => {
    elements.forEach((element) => {
      if (
        element.type === "image" &&
        element.content &&
        !imageCache[element.id]
      ) {
        const image = new window.Image();
        image.src = element.content;
        image.onload = () => {
          setImageCache((prev) => ({
            ...prev,
            [element.id]: image,
          }));
        };
      }
    });
  }, [elements, imageCache]);

  // Préchargement du logo
  useEffect(() => {
    if (logoUrl) {
      const logoImage = new window.Image();
      logoImage.src = logoUrl;
      logoImage.onload = () => {
        setImageCache((prev) => ({
          ...prev,
          logo: logoImage,
        }));
      };
    }
  }, [logoUrl]);

  // Handle canvas click - either add new element or select existing
  const handleCanvasClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      // Pour le debugging
      console.log("Canvas click", {
        target: e.target.getClassName(),
        isAdding,
        isStage: e.target instanceof Konva.Stage,
        isTransforming,
      });

      // Si en cours de transformation, ne rien faire
      if (isTransforming) {
        return;
      }

      // Cliquer sur le fond désélectionne l'élément actif
      if (
        (e.target instanceof Konva.Stage || e.target instanceof Konva.Rect) &&
        !isAdding
      ) {
        setActiveElement(null);
        return;
      }

      // Si on clique sur un autre élément alors qu'on était en train d'éditer,
      // on ne fait rien pour éviter de perdre les modifications
      if (
        !(e.target instanceof Konva.Stage || e.target instanceof Konva.Rect) &&
        !isAdding &&
        activeElement?.isEditing
      ) {
        return;
      }

      // Get stage position
      const stage = stageRef.current;
      if (!stage) return;

      const pointerPosition = stage.getPointerPosition();
      if (!pointerPosition) return;

      const x = pointerPosition.x;
      const y = pointerPosition.y;

      // If we're in add mode, create a new element
      if (isAdding) {
        let newElement: CanvasElement;

        if (isAdding === "logo" && logoUrl) {
          newElement = {
            id: `element-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            type: "image",
            x,
            y,
            content: logoUrl,
            width: 200,
            height: 100,
            isEditing: true,
            isLogo: true,
          };
        } else {
          newElement = {
            id: `element-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            type: isAdding,
            x,
            y,
            content: isAdding === "text" ? "Nouveau texte" : "",
            style: {
              fontSize: 16,
              fontWeight: "normal",
              color: "#000000",
              fontFamily: "Arial",
            },
            isEditing: true,
            width: isAdding === "image" ? 200 : undefined,
            height: isAdding === "image" ? 200 : undefined,
            isVariable: isAdding === "variable",
          };
        }

        setElements((prev) => [...prev, newElement]);
        setActiveElement(newElement);
        setIsAdding(null);
      }
    },
    [isAdding, isTransforming, logoUrl, activeElement]
  );

  // Handle selection of an element
  const handleElementSelect = useCallback(
    (element: CanvasElement) => {
      if (isAdding) return;
      setActiveElement({ ...element, isEditing: true });
    },
    [isAdding]
  );

  // Gestion du début de transformation (redimensionnement)
  const handleTransformStart = useCallback(() => {
    setIsTransforming(true);
  }, []);

  // Gestion de la fin de transformation
  const handleTransformEnd = useCallback(
    (e: Konva.KonvaEventObject<Event>, element: CanvasElement) => {
      // Les valeurs finales après transformation
      const node = e.target;

      setTimeout(() => {
        setIsTransforming(false);

        // Ne pas mettre à jour les dimensions pour le texte et les variables
        if (element.type === "text" || element.type === "variable") {
          const updatedElement = {
            ...element,
            x: node.x(),
            y: node.y(),
          };
          updateElement(updatedElement);
        } else {
          // Mettre à jour l'élément en fonction de sa nouvelle taille et position
          const updatedElement = {
            ...element,
            x: node.x(),
            y: node.y(),
            width: Math.round(node.width() * node.scaleX()),
            height: Math.round(node.height() * node.scaleY()),
          };

          // Reset scale
          node.scaleX(1);
          node.scaleY(1);

          // Appliquer les changements
          updateElement(updatedElement);
        }
      }, 10);
    },
    []
  );

  // Handle element transformation (drag, resize)
  const handleTransform = useCallback(
    (e: Konva.KonvaEventObject<Event>, element: CanvasElement) => {
      const node = e.currentTarget;

      // Update the element with new position
      const updatedElement = {
        ...element,
        x: node.x(),
        y: node.y(),
      };

      // Update the element
      updateElement(updatedElement);
    },
    []
  );

  // Handle image upload
  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !activeElement) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const target = event.target;
        if (target && target.result && activeElement.type === "image") {
          const updatedElement = {
            ...activeElement,
            content: target.result as string,
          };
          updateElement(updatedElement);
        }
      };
      reader.readAsDataURL(file);
    },
    [activeElement]
  );

  // Update element properties
  const updateElement = useCallback((updatedElement: CanvasElement) => {
    setElements((prevElements) =>
      prevElements.map((el) =>
        el.id === updatedElement.id ? updatedElement : el
      )
    );
    setActiveElement(updatedElement);
  }, []);

  // Delete the active element
  const deleteElement = useCallback(
    (e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      if (!activeElement) return;

      setElements((prev) => prev.filter((el) => el.id !== activeElement.id));
      setActiveElement(null);
    },
    [activeElement]
  );

  // Confirm element editing and save changes
  const confirmElementEdit = useCallback(
    (e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      if (!activeElement) return;

      const updatedElement = { ...activeElement, isEditing: false };
      updateElement(updatedElement);
    },
    [activeElement, updateElement]
  );

  // Cancel element editing
  const cancelElementEdit = useCallback(
    (e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      if (!activeElement) return;

      if (elements.find((el) => el.id === activeElement.id)) {
        // Element already exists, just cancel editing
        setActiveElement((prev) =>
          prev ? { ...prev, isEditing: false } : null
        );
      } else {
        // New element, remove it
        setElements((prev) => prev.filter((el) => el.id !== activeElement.id));
      }

      setActiveElement(null);
    },
    [activeElement, elements]
  );

  // Handle variable selection
  const handleVariableSelect = useCallback(
    (variableName: string) => {
      if (!activeElement) return;

      const updatedElement = {
        ...activeElement,
        content: `[${variableName}]`,
        isVariable: true,
      };

      updateElement(updatedElement);
    },
    [activeElement, updateElement]
  );

  // Ajouter un logo
  const handleAddLogo = useCallback(
    (e: React.MouseEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      if (!logoUrl) {
        console.error("Aucun logo configuré");
        return;
      }

      setIsAdding("logo");
    },
    [logoUrl]
  );

  // Render specific element types with Konva
  const renderKonvaElement = useCallback(
    (element: CanvasElement) => {
      const isSelected = activeElement?.id === element.id;

      if (element.type === "text" || element.type === "variable") {
        const fontSize = element.style?.fontSize || 16;
        const fontFamily = element.style?.fontFamily || "Arial";
        const fontStyle = element.style?.fontWeight || "normal";
        const fill = element.style?.color || "#000000";

        return (
          <Group
            key={element.id}
            id={`node-${element.id}`}
            x={element.x}
            y={element.y}
            draggable={isSelected}
            onClick={() => handleElementSelect(element)}
            onTap={() => handleElementSelect(element)}
            onDragEnd={(e) => handleTransform(e, element)}
            onTransformStart={handleTransformStart}
            onTransformEnd={(e) => handleTransformEnd(e, element)}
          >
            <Text
              text={element.content}
              fontSize={fontSize}
              fontFamily={fontFamily}
              fontStyle={fontStyle}
              fill={fill}
              wrap="word"
              width={element.width}
            />
          </Group>
        );
      } else if (element.type === "image" && element.content) {
        // Use the cached image if available
        const img =
          element.isLogo && logoUrl
            ? imageCache["logo"]
            : imageCache[element.id];

        if (!img) {
          return null;
        }

        return (
          <Group
            key={element.id}
            id={`node-${element.id}`}
            x={element.x}
            y={element.y}
            draggable={isSelected}
            onClick={() => handleElementSelect(element)}
            onTap={() => handleElementSelect(element)}
            onDragEnd={(e) => handleTransform(e, element)}
            onTransformStart={handleTransformStart}
            onTransformEnd={(e) => handleTransformEnd(e, element)}
            width={element.width || 100}
            height={element.height || 100}
          >
            <KonvaImage
              image={img}
              width={element.width || 100}
              height={element.height || 100}
            />
          </Group>
        );
      }

      return null;
    },
    [
      activeElement,
      imageCache,
      handleElementSelect,
      handleTransform,
      handleTransformStart,
      handleTransformEnd,
      logoUrl,
    ]
  );

  // Render the element editor based on element type
  const renderElementEditor = useCallback(() => {
    if (!activeElement) return null;

    // Common actions toolbar for all element types
    const EditorToolbar = (
      <div className="flex items-center justify-between bg-gray-100 p-2 rounded-t-md border-b">
        <div className="flex items-center space-x-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={deleteElement}
                className="h-8 w-8 text-red-600 hover:bg-red-100 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Supprimer</TooltipContent>
          </Tooltip>

          <div className="text-sm font-medium px-2">
            {activeElement.type === "text"
              ? "Édition de texte"
              : activeElement.type === "image"
                ? "Édition d'image"
                : activeElement.type === "variable"
                  ? "Édition de variable"
                  : ""}
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={cancelElementEdit}
                className="h-8 w-8 hover:bg-gray-200"
              >
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Annuler les modifications</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={confirmElementEdit}
                className="h-8 w-8 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
              >
                <Check className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Appliquer les modifications</TooltipContent>
          </Tooltip>
        </div>
      </div>
    );

    // Editor content based on element type
    let EditorContent;

    switch (activeElement.type) {
      case "text":
        EditorContent = (
          <div className="p-4 space-y-3">
            <Textarea
              value={activeElement.content}
              onChange={(e) =>
                updateElement({ ...activeElement, content: e.target.value })
              }
              rows={3}
              className="text-sm resize-none"
              placeholder="Entrez votre texte"
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">
                  Taille
                </label>
                <Select
                  value={activeElement.style?.fontSize?.toString() || "16"}
                  onValueChange={(val) =>
                    updateElement({
                      ...activeElement,
                      style: {
                        ...activeElement.style,
                        fontSize: parseInt(val),
                      },
                    })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Taille" />
                  </SelectTrigger>
                  <SelectContent>
                    {[8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48].map(
                      (size) => (
                        <SelectItem key={size} value={size.toString()}>
                          {size}px
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-gray-600 mb-1 block">
                  Style
                </label>
                <Select
                  value={activeElement.style?.fontWeight || "normal"}
                  onValueChange={(val) =>
                    updateElement({
                      ...activeElement,
                      style: { ...activeElement.style, fontWeight: val },
                    })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="bold">Gras</SelectItem>
                    <SelectItem value="italic">Italique</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-600 mb-1 block">
                Couleur
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full h-8 justify-start text-xs"
                    style={{ color: activeElement.style?.color || "#000000" }}
                  >
                    <div
                      className="w-3 h-3 mr-2 rounded-sm border"
                      style={{
                        backgroundColor:
                          activeElement.style?.color || "#000000",
                      }}
                    />
                    {activeElement.style?.color || "#000000"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3">
                  <HexColorPicker
                    color={activeElement.style?.color || "#000000"}
                    onChange={(newColor: string) => {
                      setColor(newColor);
                      updateElement({
                        ...activeElement,
                        style: { ...activeElement.style, color: newColor },
                      });
                    }}
                  />
                  <Input
                    value={color}
                    onChange={(e) => {
                      setColor(e.target.value);
                      updateElement({
                        ...activeElement,
                        style: {
                          ...activeElement.style,
                          color: e.target.value,
                        },
                      });
                    }}
                    className="mt-2 text-xs h-8"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {availableVariables.length > 0 && (
              <div>
                <label className="text-xs text-gray-600 mb-1 block">
                  Insérer une variable
                </label>
                <Select onValueChange={handleVariableSelect}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Choisir une variable" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVariables.map((variable) => (
                      <SelectItem key={variable} value={variable}>
                        {variable}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        );
        break;

      case "image":
        EditorContent = (
          <div className="p-4 space-y-3">
            {activeElement.content ? (
              <div className="text-center mb-3">
                <img
                  src={activeElement.content}
                  alt="Élément image"
                  className="max-h-32 mx-auto mb-2 object-contain"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs h-8"
                >
                  <RotateCw className="h-3 w-3 mr-1" />
                  Remplacer
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full text-xs h-8"
              >
                <ImageIcon className="h-3 w-3 mr-1" />
                Charger une image
              </Button>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs text-gray-600">Largeur</label>
                <span className="text-xs text-gray-600">
                  {activeElement.width || 200}px
                </span>
              </div>
              <Slider
                value={[activeElement.width || 200]}
                min={20}
                max={A4_WIDTH}
                step={1}
                onValueChange={(val: number[]) =>
                  updateElement({ ...activeElement, width: val[0] })
                }
                className="py-0"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs text-gray-600">Hauteur</label>
                <span className="text-xs text-gray-600">
                  {activeElement.height || 200}px
                </span>
              </div>
              <Slider
                value={[activeElement.height || 200]}
                min={20}
                max={A4_HEIGHT / 2}
                step={1}
                onValueChange={(val: number[]) =>
                  updateElement({ ...activeElement, height: val[0] })
                }
                className="py-0"
              />
            </div>
          </div>
        );
        break;

      case "variable":
        EditorContent = (
          <div className="p-4 space-y-3">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">
                Variable
              </label>
              <Select
                value={activeElement.content.replace(/(\[|\])/g, "")}
                onValueChange={(val) =>
                  updateElement({
                    ...activeElement,
                    content: `[${val}]`,
                  })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Choisir une variable" />
                </SelectTrigger>
                <SelectContent>
                  {availableVariables.map((variable) => (
                    <SelectItem key={variable} value={variable}>
                      {variable}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">
                  Taille
                </label>
                <Select
                  value={activeElement.style?.fontSize?.toString() || "16"}
                  onValueChange={(val) =>
                    updateElement({
                      ...activeElement,
                      style: {
                        ...activeElement.style,
                        fontSize: parseInt(val),
                      },
                    })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Taille" />
                  </SelectTrigger>
                  <SelectContent>
                    {[8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36].map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}px
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-gray-600 mb-1 block">
                  Style
                </label>
                <Select
                  value={activeElement.style?.fontWeight || "normal"}
                  onValueChange={(val) =>
                    updateElement({
                      ...activeElement,
                      style: { ...activeElement.style, fontWeight: val },
                    })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="bold">Gras</SelectItem>
                    <SelectItem value="italic">Italique</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-600 mb-1 block">
                Couleur
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full h-8 justify-start text-xs"
                    style={{ color: activeElement.style?.color || "#000000" }}
                  >
                    <div
                      className="w-3 h-3 mr-2 rounded-sm border"
                      style={{
                        backgroundColor:
                          activeElement.style?.color || "#000000",
                      }}
                    />
                    {activeElement.style?.color || "#000000"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3">
                  <HexColorPicker
                    color={activeElement.style?.color || "#000000"}
                    onChange={(newColor: string) => {
                      setColor(newColor);
                      updateElement({
                        ...activeElement,
                        style: { ...activeElement.style, color: newColor },
                      });
                    }}
                  />
                  <Input
                    value={color}
                    onChange={(e) => {
                      setColor(e.target.value);
                      updateElement({
                        ...activeElement,
                        style: {
                          ...activeElement.style,
                          color: e.target.value,
                        },
                      });
                    }}
                    className="mt-2 text-xs h-8"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        );
        break;

      default:
        return null;
    }

    return (
      <div className="mb-4 shadow-lg rounded-md bg-white border border-gray-200 overflow-hidden">
        {EditorToolbar}
        {EditorContent}
      </div>
    );
  }, [
    activeElement,
    updateElement,
    deleteElement,
    cancelElementEdit,
    confirmElementEdit,
    color,
    availableVariables,
    handleVariableSelect,
    handleImageUpload,
  ]);

  // Memoize the elements to improve performance
  const memoizedElements = useMemo(
    () => elements.map(renderKonvaElement),
    [elements, renderKonvaElement]
  );

  return (
    <div className="flex flex-col gap-4" ref={containerRef}>
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant={isAdding === "text" ? "default" : "outline"}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsAdding(isAdding === "text" ? null : "text");
                  }}
                  className="h-9 px-3"
                >
                  <Type className="h-4 w-4 mr-1" />
                  <span className="text-xs">Texte</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ajouter du texte</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant={isAdding === "image" ? "default" : "outline"}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsAdding(isAdding === "image" ? null : "image");
                  }}
                  className="h-9 px-3"
                >
                  <ImageIcon className="h-4 w-4 mr-1" />
                  <span className="text-xs">Image</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ajouter une image</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant={isAdding === "variable" ? "default" : "outline"}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsAdding(isAdding === "variable" ? null : "variable");
                  }}
                  disabled={availableVariables.length === 0}
                  className="h-9 px-3"
                >
                  <Variable className="h-4 w-4 mr-1" />
                  <span className="text-xs">Variable</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {availableVariables.length === 0
                  ? "Aucune variable disponible"
                  : "Ajouter une variable"}
              </TooltipContent>
            </Tooltip>

            {logoUrl && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant={isAdding === "logo" ? "default" : "outline"}
                    onClick={handleAddLogo}
                    className="h-9 px-3"
                  >
                    <LogIn className="h-4 w-4 mr-1" />
                    <span className="text-xs">Logo</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Ajouter le logo</TooltipContent>
              </Tooltip>
            )}

            {isAdding && (
              <div className="ml-2 text-sm text-blue-600 flex items-center">
                Cliquez sur le document pour placer l'élément
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Éditeur placé au-dessus du canvas lorsqu'un élément est actif */}
      {activeElement && renderElementEditor()}

      <div className="relative">
        <div
          className="mx-auto relative shadow-md"
          style={{ width: A4_WIDTH, height: A4_HEIGHT }}
        >
          <Stage
            width={A4_WIDTH}
            height={A4_HEIGHT}
            ref={stageRef}
            onMouseDown={handleCanvasClick}
            onTouchStart={handleCanvasClick}
            style={{
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
            }}
          >
            <Layer>
              {/* Render a background A4 rectangle */}
              <Rect
                x={0}
                y={0}
                width={A4_WIDTH}
                height={A4_HEIGHT}
                fill="white"
              />

              {/* Map through elements and render them */}
              {memoizedElements}

              {/* Transformer for resizing elements */}
              <Transformer
                ref={transformerRef}
                boundBoxFunc={(oldBox, newBox) => {
                  // Limit resize to minimum dimensions
                  if (newBox.width < 20 || newBox.height < 20) {
                    return oldBox;
                  }
                  return newBox;
                }}
                rotateEnabled={false}
                onTransformStart={handleTransformStart}
                enabledAnchors={[
                  "top-left",
                  "top-right",
                  "bottom-left",
                  "bottom-right",
                  "middle-left",
                  "middle-right",
                  "top-center",
                  "bottom-center",
                ]}
                anchorStroke="#0077FF"
                anchorFill="#FFFFFF"
                anchorSize={8}
                borderStroke="#0077FF"
                borderDash={[4, 4]}
                keepRatio={false}
              />
            </Layer>
          </Stage>
        </div>
      </div>
    </div>
  );
}
