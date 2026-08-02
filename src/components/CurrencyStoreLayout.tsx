import { useEffect, useMemo, useState } from "react";
import {
  WORMS_ZONE_FLAGSHIP_GAME_VERSION,
  WORMS_ZONE_FLAGSHIP_SKINS,
  WORMS_ZONE_FLAGSHIP_SKIN_COUNT,
  WORMS_ZONE_SOURCE_PLACEHOLDER_SKINS,
  WORMS_ZONE_VERIFIED_SKINS,
  flagshipArtworkPath,
} from "../game/wormsZoneFlagshipCatalog";
import { CURRENCY_PACK_LAYOUT } from "../platform/monetizationConfig";

interface CurrencyStoreLayoutProps {
  open: boolean;
  authorized: boolean;
  onClose: () => void;
  onPurchase?: (sku: string) => void;
  onOpenWardrobe?: () => void;
  doubloons?: number;
  currentThemeId?: string;
}

type StoreTab = "skins" | "studio" | "treasury";
type CatalogFilter = "featured" | "all" | "awaiting";

const FEATURED_SKU = "premium_worm_dilophosaurus";

/** Unified first-party store and wardrobe. The checkout action remains fail-closed
 * until an approved order handler and platform authorization are both present. */
export function CurrencyStoreLayout({
  open,
  authorized,
  onClose,
  onPurchase,
  onOpenWardrobe,
  doubloons = 0,
  currentThemeId,
}: CurrencyStoreLayoutProps) {
  const [tab, setTab] = useState<StoreTab>("skins");
  const [filter, setFilter] = useState<CatalogFilter>("featured");
  const [query, setQuery] = useState("");
  const [selectedSku, setSelectedSku] = useState(FEATURED_SKU);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  const selected = WORMS_ZONE_FLAGSHIP_SKINS.find((skin) => skin.sku === selectedSku)
    ?? WORMS_ZONE_VERIFIED_SKINS[0];
  const purchaseReady = authorized && Boolean(onPurchase);
  const visibleSkins = useMemo(() => {
    const base = filter === "awaiting"
      ? WORMS_ZONE_SOURCE_PLACEHOLDER_SKINS
      : filter === "featured"
        ? WORMS_ZONE_VERIFIED_SKINS
        : WORMS_ZONE_FLAGSHIP_SKINS;
    const normalized = query.trim().toLocaleLowerCase();
    return normalized
      ? base.filter((skin) => skin.name.toLocaleLowerCase().includes(normalized))
      : base;
  }, [filter, query]);

  if (!open) return null;

  return (
    <section
      className="currency-store flagship-store"
      role="dialog"
      aria-modal="true"
      aria-labelledby="currency-store-title"
      aria-describedby="currency-store-note"
      data-testid="currency-store-dialog"
      data-flagship-skin-count={WORMS_ZONE_FLAGSHIP_SKIN_COUNT}
      data-verified-artwork-count={WORMS_ZONE_VERIFIED_SKINS.length}
    >
      <header className="flagship-store__header">
        <div className="flagship-store__title">
          <small>WORMIFI SKINS</small>
          <h2 id="currency-store-title">FLAGSHIP STORE &amp; WARDROBE</h2>
          <span>Look around. Big preview on every worm.</span>
        </div>
        <div className="flagship-store__balance" aria-label={`${doubloons.toLocaleString()} doubloons`}>
          <span aria-hidden="true">☀</span>
          <strong>{doubloons.toLocaleString()}</strong>
          <small>DOUBLOONS</small>
        </div>
        <button className="flagship-store__close" type="button" onClick={onClose} aria-label="Close flagship store" autoFocus>×</button>
      </header>

      <nav className="flagship-store__tabs" aria-label="Store sections">
        <button type="button" aria-pressed={tab === "skins"} onClick={() => setTab("skins")}>
          <span aria-hidden="true">🛒</span><b>FLAGSHIP SKINS</b><small>{WORMS_ZONE_FLAGSHIP_SKIN_COUNT} designs</small>
        </button>
        <button type="button" aria-pressed={tab === "studio"} onClick={() => setTab("studio")}>
          <span aria-hidden="true">🎨</span><b>ART STUDIO</b><small>Build your captain</small>
        </button>
        <button type="button" aria-pressed={tab === "treasury"} onClick={() => setTab("treasury")}>
          <span aria-hidden="true">☀</span><b>TREASURY</b><small>Cosmetic currency</small>
        </button>
      </nav>

      {tab === "skins" && (
        <div className="flagship-store__body">
          <aside className="flagship-store__rail" aria-label="Skin catalog filters">
            <button type="button" aria-pressed={filter === "featured"} onClick={() => setFilter("featured")}>
              <span aria-hidden="true">★</span><b>READY NOW</b><small>{WORMS_ZONE_VERIFIED_SKINS.length}</small>
            </button>
            <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
              <span aria-hidden="true">∞</span><b>ALL SKINS</b><small>{WORMS_ZONE_FLAGSHIP_SKIN_COUNT}</small>
            </button>
            <button type="button" aria-pressed={filter === "awaiting"} onClick={() => setFilter("awaiting")}>
              <span aria-hidden="true">◇</span><b>COMING SOON</b><small>{WORMS_ZONE_SOURCE_PLACEHOLDER_SKINS.length}</small>
            </button>
            <button type="button" onClick={() => setTab("studio")}>
              <span aria-hidden="true">✦</span><b>MAKE YOURS</b><small>Art Studio</small>
            </button>
          </aside>

          <section className="flagship-store__featured" aria-label={`Selected skin: ${selected.name}`}>
            <div className="flagship-store__featured-heading">
              <small>SELECTED FLAGSHIP DESIGN</small>
              <h3>{selected.name}</h3>
              <span>{selected.artworkStatus === "verified-local" ? "VERIFIED FIRST-PARTY ART" : "SOURCE ART NOT PUBLISHED"}</span>
            </div>
            <div className="flagship-store__hero-art">
              {flagshipArtworkPath(selected) ? (
                <img src={flagshipArtworkPath(selected)} alt={`${selected.name} flagship skin`} decoding="async" />
              ) : (
                <div className="flagship-store__missing-art" role="img" aria-label={`${selected.name} source artwork pending`}>
                  <span>?</span><b>ARTWORK PENDING</b><small>The flagship source currently publishes a generic placeholder.</small>
                </div>
              )}
            </div>
            <p>{selected.description}</p>
            <div className="flagship-store__price-context">
              <small>PRICE WHEN THE SHOP OPENS</small>
              <strong>{selected.sourcePriceLabel} USD</strong>
            </div>
            <button
              type="button"
              className="flagship-store__checkout"
              disabled={!purchaseReady}
              onClick={() => onPurchase?.(selected.sku)}
              data-testid="flagship-checkout"
            >
              {purchaseReady ? `BUY · ${selected.sourcePriceLabel}` : "SHOP OPENS SOON"}
            </button>
            <small className="flagship-store__checkout-note">
              {purchaseReady
                ? "Secure checkout opens once. Ownership restores from your account."
                : "You can look at everything. Buying is not switched on yet - nothing here costs money today."}
            </small>
          </section>

          <section className="flagship-store__catalog" aria-label="Flagship skin catalog">
            <header>
              <div><small>FAMILY SKIN LIBRARY</small><b>{visibleSkins.length} SHOWN</b></div>
              <label><span>FIND A SKIN</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Dragon, knight…" /></label>
            </header>
            <div className="flagship-store__catalog-grid" data-testid="flagship-skin-grid">
              {visibleSkins.map((skin, index) => (
                <button
                  type="button"
                  key={skin.sku}
                  className="flagship-product-card"
                  aria-pressed={skin.sku === selected.sku}
                  onClick={() => setSelectedSku(skin.sku)}
                  data-testid={`flagship-skin-${skin.sku}`}
                >
                  {index < 6 && <em>FLAGSHIP</em>}
                  <span className="flagship-product-card__art">
                    {flagshipArtworkPath(skin)
                      ? <img src={flagshipArtworkPath(skin)} alt="" loading="lazy" decoding="async" />
                      : <span className="flagship-product-card__pending" aria-label="Source artwork pending">?</span>}
                  </span>
                  <b>{skin.name}</b>
                  <small>{skin.artworkStatus === "verified-local" ? "READY" : "COMING SOON"}</small>
                  <strong>{skin.sourcePriceLabel} USD</strong>
                </button>
              ))}
              {visibleSkins.length === 0 && <p className="flagship-store__empty">No flagship skins match that search.</p>}
            </div>
          </section>
        </div>
      )}

      {tab === "studio" && (
        <section className="flagship-store__studio" data-testid="flagship-studio-panel">
          <div className="flagship-store__studio-mark" aria-hidden="true">🎨</div>
          <div>
            <small>WARDROBE + CREATION LAB</small>
            <h3>YOUR ART STUDIO</h3>
            <p>Choose from 190 exact parent body designs, combine 261 exact wearable parts, then layer Wormifi&apos;s originals. Build deeper with 3 food/treasure fields, 4 arena visual skins, and coordinated one-click world sets.</p>
            {currentThemeId && <span className="flagship-store__current-look">CURRENT LOOK · {currentThemeId}</span>}
          </div>
          <button type="button" onClick={onOpenWardrobe} disabled={!onOpenWardrobe} data-testid="flagship-open-art-studio">
            OPEN ART STUDIO
          </button>
        </section>
      )}

      {tab === "treasury" && (
        <section className="flagship-store__treasury" data-testid="flagship-treasury-panel">
          <header><small>COSMETIC CURRENCY</small><h3>CAPTAIN&apos;S TREASURY</h3><p>A clear three-pack layout. No gameplay power is sold.</p></header>
          <div className="currency-store-grid">
            {CURRENCY_PACK_LAYOUT.map((pack) => (
              <article key={pack.sku}>
                <span aria-hidden="true">☀</span>
                <b>{pack.label}</b>
                <strong>{pack.amount.toLocaleString()} DOUBLOONS</strong>
                <button type="button" disabled={!purchaseReady} onClick={() => onPurchase?.(pack.sku)}>
                  {purchaseReady ? "SELECT PACK" : "SHOP OPENS SOON"}
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      <p id="currency-store-note" className="flagship-store__fairness">
        COSMETICS ONLY · NEVER SPEED, SIZE, COLLISION POWER, OR A GAMEPLAY ADVANTAGE
      </p>
    </section>
  );
}
