"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { OrderKanbanCard } from "@/components/seller/OrderKanbanCard";
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS } from "@/lib/constants/orders";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/lib/constants/roles";
import type { SellerOrder } from "@/types/order";

type OrdersKanbanProps = {
  columns: Record<OrderStatus, SellerOrder[]>;
  onMove: (orderId: string, toStatus: OrderStatus) => void;
};

const BOARD_COLUMNS: OrderStatus[] = [...ORDER_STATUS_FLOW, "cancelado"];

const ANNOUNCEMENTS: Announcements = {
  onDragStart: () => "Se levantó el pedido para moverlo de columna.",
  onDragOver: ({ over }) => (over ? `El pedido está sobre la columna "${ORDER_STATUS_LABELS[over.id as OrderStatus] ?? over.id}".` : "El pedido no está sobre ninguna columna."),
  onDragEnd: ({ over }) => (over ? "El pedido se soltó." : "El pedido volvió a su columna original."),
  onDragCancel: () => "Se canceló el movimiento del pedido.",
};

function KanbanColumn({ status, orders }: { status: OrderStatus; orders: SellerOrder[] }) {
  // "Cancelado" es de solo lectura (el vendedor no puede cancelar — RLS lo confirma) y no acepta drops.
  const droppable = status !== "cancelado";
  const { setNodeRef, isOver } = useDroppable({ id: status, disabled: !droppable });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-48 flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3",
        isOver && droppable && "border-primary bg-primary/5",
      )}
    >
      <h3 className="font-heading text-sm font-semibold">
        {ORDER_STATUS_LABELS[status]} <span className="text-muted-foreground">({orders.length})</span>
      </h3>
      <SortableContext items={orders.map((order) => order.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {orders.map((order) => (
            <OrderKanbanCard key={order.id} order={order} draggable={droppable} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

/**
 * Drag & drop #2 (Fase 3.7). La validación de "un paso adelante" la hace
 * `hooks/useSellerOrders.ts` (`move`) ANTES de llamar al service — acá solo
 * se detecta a qué columna se soltó y se delega. `PointerSensor` +
 * `KeyboardSensor` con anuncios en español, igual que `SortableImageGallery`.
 */
export function OrdersKanban({ columns, onMove }: OrdersKanbanProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function resolveColumn(id: string): OrderStatus | undefined {
    if ((BOARD_COLUMNS as string[]).includes(id)) return id as OrderStatus;
    for (const status of BOARD_COLUMNS) {
      if (columns[status].some((order) => order.id === id)) return status;
    }
    return undefined;
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const orderId = String(active.id);
    const toStatus = resolveColumn(String(over.id));
    const fromStatus = resolveColumn(orderId);
    if (!toStatus || !fromStatus || fromStatus === toStatus) return;

    onMove(orderId, toStatus);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      accessibility={{ announcements: ANNOUNCEMENTS }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {BOARD_COLUMNS.map((status) => (
          <KanbanColumn key={status} status={status} orders={columns[status]} />
        ))}
      </div>
    </DndContext>
  );
}
