import { X, Minus, Plus, Trash2 } from "lucide-react";
import { useCart, cartLineKey } from "@/lib/cart";
import { Link, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { cdnImage, handleImgError } from "@/lib/cdn-image";

export default function CartDrawer() {
  const { open, setOpen, items, total, setQty, remove } = useCart();
  const { pathname } = useLocation();
  const isCheckout = pathname.startsWith("/checkout");

  useEffect(() => {
    if (isCheckout) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isCheckout, open]);

  if (isCheckout) return null;

  return (
    <>
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-background shadow-[var(--shadow-elevated)] transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-bold">Your Cart ({items.length})</h2>
          <button onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-muted" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
              <p className="mb-4">Your cart is empty.</p>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => {
                const { product, qty, variantLabel } = item;
                const key = cartLineKey(item);
                return (
                  <li key={key} className="flex gap-3">
                    <img src={cdnImage(product.image, 200)} alt={product.title} loading="lazy" decoding="async" onError={handleImgError} className="h-20 w-20 rounded-lg object-cover" />
                    <div className="flex-1">
                      <p className="line-clamp-2 text-sm font-semibold">{product.title}</p>
                      {variantLabel && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{variantLabel}</p>
                      )}
                      <p className="mt-0.5 text-sm text-primary font-bold">৳{product.price}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="inline-flex items-center rounded-full border border-border">
                          <button onClick={() => setQty(key, qty - 1)} className="p-1.5 hover:bg-muted rounded-l-full" aria-label="Decrease">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-7 text-center text-sm font-semibold">{qty}</span>
                          <button onClick={() => setQty(key, qty + 1)} className="p-1.5 hover:bg-muted rounded-r-full" aria-label="Increase">
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <button onClick={() => remove(key)} className="ml-auto rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-primary" aria-label="Remove">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-border px-5 py-4">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-lg font-bold">৳{total}</span>
            </div>
            <Link
              to="/checkout"
              onClick={() => setOpen(false)}
              className="block w-full rounded-full bg-primary py-3 text-center text-sm font-bold text-primary-foreground transition hover:opacity-90"
            >
              Checkout Now
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
