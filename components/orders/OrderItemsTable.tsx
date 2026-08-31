import { Price } from "@/components/shared/Price";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { OrderItem } from "@/types/order";

type OrderItemsTableProps = {
  items: OrderItem[];
};

/** `title_snapshot`/`price_snapshot` — nunca el producto en vivo: es el historial del pedido tal como quedó al comprar. */
export function OrderItemsTable({ items }: OrderItemsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Producto</TableHead>
          <TableHead className="text-right">Cantidad</TableHead>
          <TableHead className="text-right">Precio</TableHead>
          <TableHead className="text-right">Subtotal</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell>{item.title_snapshot}</TableCell>
            <TableCell className="text-right">{item.quantity}</TableCell>
            <TableCell className="text-right">
              <Price value={item.price_snapshot} size="sm" />
            </TableCell>
            <TableCell className="text-right">
              <Price value={item.price_snapshot * item.quantity} size="sm" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
