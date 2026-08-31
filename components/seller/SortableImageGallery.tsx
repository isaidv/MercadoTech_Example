"use client";

import { useRef } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, X } from "lucide-react";
import { ProductImage } from "@/components/shared/ProductImage";
import { cn } from "@/lib/utils";
import type { GalleryImageItem } from "@/types/product";

type SortableImageGalleryProps = {
  images: GalleryImageItem[];
  maxImages: number;
  onFilesSelected: (files: FileList) => void;
  onRemove: (id: string) => void;
  onReorder: (activeId: string, overId: string) => void;
};

const ANNOUNCEMENTS: Announcements = {
  onDragStart: () => "Se levantó la imagen para reordenarla.",
  onDragOver: ({ over }) => (over ? "La imagen se movió sobre una nueva posición." : "La imagen ya no está sobre una posición válida."),
  onDragEnd: ({ over }) => (over ? "La imagen se soltó en su nueva posición." : "La imagen volvió a su posición original."),
  onDragCancel: () => "Se canceló el reordenamiento de la imagen.",
};

function SortableThumbnail({ image, isCover, onRemove }: { image: GalleryImageItem; isCover: boolean; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: image.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "relative size-24 shrink-0 overflow-hidden rounded-md border-2",
        isCover ? "border-primary" : "border-border",
        isDragging && "opacity-50",
      )}
    >
      <ProductImage src={image.url} alt="" />
      {isCover ? (
        <span className="absolute inset-x-0 bottom-0 bg-primary/90 px-1 text-center text-[10px] font-medium text-primary-foreground">
          Portada
        </span>
      ) : null}
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Arrastrar para reordenar"
        className="absolute top-0.5 left-0.5 flex size-5 items-center justify-center rounded bg-background/80 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <GripVertical className="size-3.5" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Quitar imagen"
        className="absolute top-0.5 right-0.5 flex size-5 items-center justify-center rounded bg-background/80 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * Drag & drop #1 (Fase 3.7): miniaturas reordenables, la primera es la
 * portada. `PointerSensor` (mouse/touch) + `KeyboardSensor` (Tab llega al
 * handle, flechas mueven) con anuncios en español. Puro: no sube ni borra
 * nada él mismo — solo llama a los callbacks; quien orquesta Storage es
 * `hooks/useProductForm.ts`.
 */
export function SortableImageGallery({ images, maxImages, onFilesSelected, onRemove, onReorder }: SortableImageGalleryProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorder(String(active.id), String(over.id));
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        accessibility={{ announcements: ANNOUNCEMENTS }}
      >
        <SortableContext items={images.map((img) => img.id)} strategy={horizontalListSortingStrategy}>
          <div role="list" aria-label="Imágenes del producto, arrastrable con el mouse o el teclado" className="flex flex-wrap gap-2">
            {images.map((image, index) => (
              <SortableThumbnail key={image.id} image={image} isCover={index === 0} onRemove={() => onRemove(image.id)} />
            ))}

            {images.length < maxImages ? (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex size-24 shrink-0 flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary"
              >
                <Plus className="size-5" aria-hidden="true" />
                <span className="text-xs">Agregar</span>
              </button>
            ) : null}
          </div>
        </SortableContext>
      </DndContext>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        onChange={(event) => {
          if (event.target.files) onFilesSelected(event.target.files);
          event.target.value = "";
        }}
      />

      <p className="text-xs text-muted-foreground">
        Hasta {maxImages} imágenes (JPG, PNG o WEBP, 5 MB máx.). La primera es la portada.
      </p>
    </div>
  );
}
