import { useEffect } from "react";
import { CURRENCY_PACK_LAYOUT } from "../platform/monetizationConfig";

interface CurrencyStoreLayoutProps {
  open: boolean;
  authorized: boolean;
  onClose: () => void;
  onPurchase?: (sku: string) => void;
}

/** Responsive menu-only shell. It intentionally cannot initiate a purchase
 * until the approved Xsolla order handler is supplied by the IAP phase. */
export function CurrencyStoreLayout({
  open,
  authorized,
  onClose,
  onPurchase,
}: CurrencyStoreLayoutProps) {
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;
  const purchaseReady = authorized && Boolean(onPurchase);
  return (
    <section
      className="currency-store"
      role="dialog"
      aria-modal="true"
      aria-labelledby="currency-store-title"
      aria-describedby="currency-store-note"
      data-testid="currency-store-dialog"
    >
      <header>
        <div>
          <small>COSMETIC CURRENCY</small>
          <h2 id="currency-store-title">CAPTAIN'S TREASURY</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Close currency store" autoFocus>×</button>
      </header>
      <div className="currency-store-grid">
        {CURRENCY_PACK_LAYOUT.map((pack) => (
          <article key={pack.sku}>
            <b>{pack.label}</b>
            <strong>{pack.amount.toLocaleString()} DOUBLOONS</strong>
            <button
              type="button"
              disabled={!purchaseReady}
              onClick={() => onPurchase?.(pack.sku)}
            >
              {purchaseReady
                ? "SELECT PACK"
                : authorized
                  ? "PAYMENT CONNECTION PENDING"
                  : "PLATFORM APPROVAL REQUIRED"}
            </button>
          </article>
        ))}
      </div>
      <p id="currency-store-note">Cosmetics only. Purchases never increase speed, size, or collision power.</p>
    </section>
  );
}
