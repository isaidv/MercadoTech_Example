import { Price } from "@/components/shared/Price";
import { Button } from "@/components/ui/button";

type CartSummaryProps = {
  subtotal: number;
  disabled?: boolean;
  loading?: boolean;
  onCheckout: () => void;
};

/**
 * Checkout SIMULADO — no pide ni guarda ningún dato de tarjeta (ver
 * `services/order.service.ts`.checkout, que solo llama al RPC). El texto
 * es literal, no una paráfrasis.
 */
export function CartSummary({ subtotal, disabled, loading, onCheckout }: CartSummaryProps) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
      <div data-testid="cart-subtotal" className="flex items-center justify-between">
        <span className="text-sm font-medium">Subtotal</span>
        <Price value={subtotal} size="lg" />
      </div>

      <p className="text-xs text-muted-foreground">
        Pago simulado para el laboratorio — no se realiza ningún cobro.
      </p>

      <Button data-testid="cart-checkout" onClick={onCheckout} disabled={disabled || loading}>
        {loading ? "Procesando..." : "Finalizar compra"}
      </Button>
    </div>
  );
}
