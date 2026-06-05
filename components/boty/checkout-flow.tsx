"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createDraftOrder, fetchEstimate, finalizeOrderPayment } from "@/lib/api";
import type { CheckoutRecipient } from "@/lib/api-types";
import { useCart } from "@/lib/cart-context";
import { useCustomer } from "@/lib/customer-context";
import { saveGuestOrderAccess } from "@/lib/order-guest-session";
import { createAddress, listAddresses, type SavedAddress } from "@/lib/customer-api";
import { MX_STATES } from "@/lib/mx-states";
import { cn, formatMxn } from "@/lib/utils";
import { RemoteImage } from "@/components/ui/remote-image";
import { LegalConsentCheckbox } from "@/components/legal/legal-consent-checkbox";
import { StripePaymentForm } from "./stripe-payment-form";
import { PaymentOutcomeOverlay } from "./payment-outcome-overlay";
import { PAYMENT_OUTCOME_VISIBLE_MS, paymentSuccessDescription } from "@/lib/payment-outcome-timing";
import { scrollToTop, scrollToTopAfterNav } from "@/lib/scroll-to-top";
import {
  Check,
  ChevronRight,
  CreditCard,
  MapPin,
  Package,
  Truck,
  Plus,
  ArrowLeft,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "address" | "confirm" | "payment";

const STEPS: { key: Step; label: string; icon: React.ElementType }[] = [
  { key: "address", label: "Dirección", icon: MapPin },
  { key: "confirm", label: "Confirmar", icon: Package },
  { key: "payment", label: "Pago", icon: CreditCard },
];

const STEP_ORDER: Step[] = ["address", "confirm", "payment"];

// ─── Main component ───────────────────────────────────────────────────────────

export function BotyCheckoutFlow() {
  const { items, clearCart, hydrated } = useCart();
  const { user } = useCustomer();
  const router = useRouter();

  const [step, setStep] = useState<Step>("address");
  const [recipient, setRecipient] = useState<CheckoutRecipient>({
    name: "", address1: "", address2: "", city: "",
    stateCode: "JAL", countryCode: "MX", zip: "", phone: "", email: "",
  });

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | "new" | null>(null);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [saveAddress, setSaveAddress] = useState(true);
  const [addressLabel, setAddressLabel] = useState("Casa");

  const [totals, setTotals] = useState({ subtotal: "0.00", shipping: "0.00", tax: "0.00", total: "0.00" });
  const [publicOrderId, setPublicOrderId] = useState<string | null>(null);
  const [trackingCode, setTrackingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [paymentOutcome, setPaymentOutcome] = useState<"success" | "error" | null>(null);

  const paymentReturnUrl =
    typeof window !== "undefined" && publicOrderId
      ? `${window.location.origin}${
          user
            ? `/cuenta/pedidos/${encodeURIComponent(publicOrderId)}?paid=1`
            : `/pedido/${encodeURIComponent(publicOrderId)}?paid=1`
        }`
      : undefined;

  // ── Load saved addresses when logged in ───────────────────────────────────
  useEffect(() => {
    if (!user) return;
    setLoadingAddresses(true);
    listAddresses()
      .then((addrs) => {
        setSavedAddresses(addrs);
        const def = addrs.find((a) => a.isDefault) ?? addrs[0];
        if (def) {
          setSelectedAddressId(def.id);
          applyAddress(def, user.email);
        } else {
          setSelectedAddressId("new");
          setRecipient((prev) => ({ ...prev, name: user.fullName, email: user.email, phone: user.phone ?? "" }));
        }
      })
      .catch(() => {
        setSelectedAddressId("new");
        setRecipient((prev) => ({ ...prev, name: user.fullName, email: user.email, phone: user.phone ?? "" }));
      })
      .finally(() => setLoadingAddresses(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function applyAddress(addr: SavedAddress, email: string) {
    setRecipient((prev) => ({
      ...prev,
      name: addr.recipientName,
      phone: addr.phone,
      email,
      address1: addr.address1,
      address2: addr.address2 ?? "",
      city: addr.city,
      stateCode: addr.stateCode,
      zip: addr.zip,
    }));
  }

  function handleSelectSavedAddress(addr: SavedAddress) {
    setSelectedAddressId(addr.id);
    applyAddress(addr, user?.email ?? recipient.email);
    setError(null);
  }

  function handleSelectNew() {
    setSelectedAddressId("new");
    setRecipient({
      name: user?.fullName ?? "",
      email: user?.email ?? "",
      phone: user?.phone ?? "",
      address1: "", address2: "", city: "",
      stateCode: "JAL", countryCode: "MX", zip: "",
    });
    setError(null);
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const cartItems = items.map((i) => ({
    variantId: i.variantId,
    quantity: i.quantity,
    retailPriceMxn: i.retailPriceMxn,
  }));

  const productSubtotal = useMemo(() =>
    items.reduce((sum, i) => sum + Number.parseFloat(i.retailPriceMxn) * i.quantity, 0),
    [items]);

  const address = {
    address1: recipient.address1,
    address2: recipient.address2,
    city: recipient.city,
    stateCode: recipient.stateCode,
    countryCode: "MX" as const,
    zip: recipient.zip,
  };

  const currentStateName = MX_STATES.find((s) => s.code === recipient.stateCode)?.name ?? recipient.stateCode;

  function handleClearStaleCart() {
    clearCart();
    setError(null);
    router.push("/shop");
  }

  const staleCartAction = error && isStaleCartError(error) ? handleClearStaleCart : undefined;

  const displayTotals = useMemo(() => {
    if (step === "confirm" || step === "payment") return totals;
    return {
      subtotal: productSubtotal.toFixed(2),
      shipping: "—",
      tax: "—",
      total: productSubtotal.toFixed(2),
    };
  }, [step, totals, productSubtotal]);

  // ── Step handlers ─────────────────────────────────────────────────────────
  async function handleAddressSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // Guardar dirección si el usuario lo solicitó y está llenando el formulario
      const isFillingForm = !user || selectedAddressId === "new" || savedAddresses.length === 0;
      if (user && isFillingForm && saveAddress) {
        try {
          const saved = await createAddress({
            label: addressLabel.trim() || "Mi dirección",
            recipientName: recipient.name,
            phone: recipient.phone,
            address1: recipient.address1,
            address2: recipient.address2 || null,
            city: recipient.city,
            stateCode: recipient.stateCode,
            zip: recipient.zip,
            isDefault: savedAddresses.length === 0,
          });
          setSavedAddresses((prev) => [...prev, saved.data]);
          setSelectedAddressId(saved.data.id);
        } catch {
          // No bloquear el checkout si falla guardar la dirección
        }
      }

      // El backend selecciona automáticamente la tarifa más barata
      const res = await fetchEstimate({ items: cartItems, address });
      setTotals(res.data);
      setStep("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo calcular el envío. Verifica la dirección e intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateOrder() {
    if (!user && !acceptedLegal) {
      setError("Debes aceptar los Términos y Condiciones y el Aviso de Privacidad para continuar.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await createDraftOrder({
        items: cartItems, recipient,
        retailCosts: { currency: "MXN", ...totals },
        saveAccount: !user,
        ...(!user ? { acceptedLegal: true as const } : {}),
      });
      const code = res.data.trackingCode ?? res.data.internalOrderId;
      setPublicOrderId(code);
      setTrackingCode(code);
      if (!user) {
        saveGuestOrderAccess(code, recipient.email);
      }
      setStep("payment");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear el pedido");
    } finally {
      setBusy(false);
    }
  }

  function handlePaymentSuccess() {
    setError(null);
    setPaymentOutcome("success");
    scrollToTop();
    if (publicOrderId) {
      void finalizeOrderPayment(publicOrderId).catch(() => {
        // El webhook puede completar después; no bloquear la UX de éxito
      });
    }
  }

  function handlePaymentError(msg: string) {
    setError(msg);
    setPaymentOutcome("error");
    scrollToTop();
  }

  useEffect(() => {
    if (paymentOutcome !== "success" || !publicOrderId) return;

    const path = user
      ? `/cuenta/pedidos/${encodeURIComponent(publicOrderId)}?paid=1`
      : `/pedido/${encodeURIComponent(publicOrderId)}?paid=1`;

    const timer = window.setTimeout(() => {
      clearCart();
      setPaymentOutcome(null);
      router.push(path);
      scrollToTopAfterNav();
    }, PAYMENT_OUTCOME_VISIBLE_MS);

    return () => window.clearTimeout(timer);
  }, [paymentOutcome, publicOrderId, user, router, clearCart]);

  useEffect(() => {
    if (paymentOutcome) scrollToTop();
  }, [paymentOutcome]);

  useEffect(() => {
    if (step === "payment") scrollToTop();
  }, [step]);

  // ── Empty / loading guards ────────────────────────────────────────────────
  if (!hydrated) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
        Cargando carrito…
      </div>
    );
  }

  const completingCheckout =
    paymentOutcome != null || (step === "payment" && publicOrderId != null);

  if (items.length === 0 && !completingCheckout) {
    return (
      <div className="max-w-md mx-auto text-center py-20 bg-card rounded-3xl boty-shadow px-8">
        <Package className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
        <p className="text-lg font-medium mb-2">Tu carrito está vacío</p>
        <p className="text-sm text-muted-foreground mb-6">Agrega productos para continuar con tu compra</p>
        <Link
          href="/shop"
          className="inline-flex bg-primary text-primary-foreground px-8 py-3 rounded-full text-sm font-medium hover:bg-primary/90 boty-transition"
        >
          Ver colección
        </Link>
      </div>
    );
  }

  const stepIndex = STEP_ORDER.indexOf(step);

  return (
    <>
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* ── Progress bar ─────────────────────────────────────────────────── */}
      <nav aria-label="Pasos del checkout" className="flex items-center justify-center gap-0">
        {STEPS.map((s, i) => {
          const done = STEP_ORDER.indexOf(s.key) < stepIndex;
          const active = s.key === step;
          const Icon = s.icon;
          return (
            <div key={s.key} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center boty-transition text-sm font-medium shrink-0",
                    done && "bg-primary text-primary-foreground",
                    active && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                    !done && !active && "bg-muted text-muted-foreground",
                  )}
                >
                  {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium hidden sm:block",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-px w-12 sm:w-20 mx-2 mb-5 boty-transition",
                    STEP_ORDER.indexOf(STEPS[i + 1]!.key) <= stepIndex ? "bg-primary" : "bg-border",
                  )}
                />
              )}
            </div>
          );
        })}
      </nav>

      {/* ── Main grid ────────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left column */}
        <div className="flex flex-col gap-4">

          {/* ── STEP: ADDRESS ──────────────────────────────────────────── */}
          {step === "address" && (
            <form onSubmit={(e) => void handleAddressSubmit(e)} className="bg-card rounded-3xl p-6 boty-shadow space-y-5">
              <h2 className="font-serif text-xl">Dirección de envío</h2>

              {/* Guest: invite to login */}
              {!user && (
                <div className="rounded-2xl bg-primary/5 border border-primary/20 px-4 py-3 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">¿Ya tienes cuenta? </span>
                  <Link href="/login?redirect=/checkout" className="text-primary hover:underline font-medium">
                    Inicia sesión
                  </Link>
                  {" "}para usar tus direcciones guardadas y ver el historial de pedidos.
                </div>
              )}

              {/* Logged-in: saved address cards — solo si tiene al menos una */}
              {user && !loadingAddresses && savedAddresses.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Tus direcciones guardadas
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {savedAddresses.map((addr) => {
                      const isSelected = selectedAddressId === addr.id;
                      return (
                        <button
                          key={addr.id}
                          type="button"
                          onClick={() => handleSelectSavedAddress(addr)}
                          className={cn(
                            "rounded-2xl border-2 p-4 text-left boty-transition w-full",
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/40",
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">
                                {addr.label}
                              </p>
                              <p className="text-sm font-medium text-foreground mt-0.5">{addr.recipientName}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                {addr.address1}
                                {addr.address2 && `, ${addr.address2}`}
                                <br />
                                {addr.city}, {addr.stateCode} {addr.zip}
                              </p>
                            </div>
                            <div
                              className={cn(
                                "w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center mt-0.5",
                                isSelected ? "border-primary bg-primary" : "border-border",
                              )}
                            >
                              {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                            </div>
                          </div>
                        </button>
                      );
                    })}

                    {/* Nueva dirección */}
                    <button
                      type="button"
                      onClick={handleSelectNew}
                      className={cn(
                        "rounded-2xl border-2 p-4 text-left boty-transition w-full flex items-center gap-3",
                        selectedAddressId === "new"
                          ? "border-primary bg-primary/5"
                          : "border-dashed border-border hover:border-primary/40",
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                        selectedAddressId === "new" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
                      )}>
                        <Plus className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Nueva dirección</p>
                        <p className="text-xs text-muted-foreground">Usar una dirección diferente</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Formulario — invitado, sin direcciones guardadas, o seleccionó "nueva" */}
              {(!user || selectedAddressId === "new" || savedAddresses.length === 0) && (
                <div className="space-y-3">
                  {savedAddresses.length > 0 && selectedAddressId === "new" && (
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-1">
                      Nueva dirección
                    </p>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Field
                        label="Nombre completo"
                        value={recipient.name}
                        onChange={(v) => setRecipient({ ...recipient, name: v })}
                        required
                        autoComplete="name"
                      />
                    </div>
                    <Field
                      label="Correo electrónico"
                      type="email"
                      value={recipient.email}
                      onChange={(v) => setRecipient({ ...recipient, email: v })}
                      required
                      autoComplete="email"
                      disabled={!!user}
                    />
                    <Field
                      label="Teléfono"
                      type="tel"
                      value={recipient.phone}
                      onChange={(v) => setRecipient({ ...recipient, phone: v })}
                      required
                      autoComplete="tel"
                      placeholder="10 dígitos"
                    />
                    <div className="sm:col-span-2">
                      <Field
                        label="Calle y número"
                        value={recipient.address1}
                        onChange={(v) => setRecipient({ ...recipient, address1: v })}
                        required
                        autoComplete="address-line1"
                        placeholder="Av. Revolución 123"
                      />
                    </div>
                    <Field
                      label="Colonia"
                      value={recipient.address2 ?? ""}
                      onChange={(v) => setRecipient({ ...recipient, address2: v })}
                      autoComplete="address-line2"
                      placeholder="Opcional"
                    />
                    <Field
                      label="Ciudad"
                      value={recipient.city}
                      onChange={(v) => setRecipient({ ...recipient, city: v })}
                      required
                      autoComplete="address-level2"
                    />
                    <div className="flex flex-col gap-1 text-sm">
                      <label className="font-medium">Estado</label>
                      <select
                        value={recipient.stateCode}
                        onChange={(e) => setRecipient({ ...recipient, stateCode: e.target.value })}
                        className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 boty-transition"
                        autoComplete="address-level1"
                        required
                      >
                        {MX_STATES.map((s) => (
                          <option key={s.code} value={s.code}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <Field
                      label="Código postal"
                      value={recipient.zip}
                      onChange={(v) => setRecipient({ ...recipient, zip: v })}
                      required
                      pattern="\d{5}"
                      autoComplete="postal-code"
                      placeholder="5 dígitos"
                    />
                  </div>

                  {/* Opción de guardar dirección — solo para usuarios con sesión */}
                  {user && (
                    <div className="pt-1 space-y-2">
                      <label className="flex items-center gap-3 cursor-pointer select-none group">
                        <div
                          className={cn(
                            "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 boty-transition",
                            saveAddress ? "border-primary bg-primary" : "border-border group-hover:border-primary/50",
                          )}
                          onClick={() => setSaveAddress((v) => !v)}
                        >
                          {saveAddress && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={saveAddress}
                          onChange={(e) => setSaveAddress(e.target.checked)}
                        />
                        <span className="text-sm text-foreground">
                          Guardar esta dirección para futuros pedidos
                        </span>
                      </label>

                      {saveAddress && (
                        <div className="ml-8">
                          <Field
                            label="Nombre de la dirección"
                            value={addressLabel}
                            onChange={setAddressLabel}
                            placeholder='Ej. Casa, Trabajo, Mamá…'
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* If logged-in, address is selected, no form needed — confirm selected */}
              {user && selectedAddressId && selectedAddressId !== "new" && savedAddresses.length > 0 && (
                <AddressConfirmBanner recipient={recipient} stateName={currentStateName} />
              )}

              {error && <ErrorBanner message={error} onClearCart={staleCartAction} />}

              <button
                type="submit"
                disabled={busy || (!user && !recipient.address1) || (!!user && !selectedAddressId)}
                className="w-full bg-primary text-primary-foreground py-3.5 rounded-full font-medium hover:bg-primary/90 boty-transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {busy ? "Calculando envío…" : (
                  <>Siguiente <ChevronRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
          )}

          {/* ── STEP: CONFIRM ──────────────────────────────────────────── */}
          {step === "confirm" && (
            <div className="bg-card rounded-3xl p-6 boty-shadow space-y-5">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => { setStep("address"); setError(null); }}
                  className="rounded-full p-2 hover:bg-muted boty-transition text-muted-foreground"
                  aria-label="Volver a dirección"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h2 className="font-serif text-xl">Confirma tu pedido</h2>
              </div>

              {/* Address summary */}
              <div className="rounded-2xl bg-muted/40 p-4 space-y-0.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Enviar a
                </p>
                <p className="text-sm font-medium">{recipient.name}</p>
                <p className="text-sm text-muted-foreground">{recipient.address1}{recipient.address2 ? `, ${recipient.address2}` : ""}</p>
                <p className="text-sm text-muted-foreground">{recipient.city}, {currentStateName} {recipient.zip}</p>
                <p className="text-sm text-muted-foreground">{recipient.phone}</p>
              </div>

              {/* Shipping info */}
              <div className="rounded-2xl bg-muted/40 p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5" /> Envío
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Calculado automáticamente</p>
                  <span className="text-sm font-semibold">{formatMxn(totals.shipping)}</span>
                </div>
              </div>

              {/* Totals breakdown */}
              <div className="space-y-2 text-sm border-t border-border/50 pt-4">
                <TotalRow label="Subtotal productos" value={formatMxn(totals.subtotal)} />
                <TotalRow label="Envío" value={formatMxn(totals.shipping)} />
                <TotalRow label="IVA (16%)" value={formatMxn(totals.tax)} />
                <TotalRow label="Total" value={formatMxn(totals.total)} strong />
              </div>

              {!user && (
                <p className="text-xs text-muted-foreground bg-muted/40 rounded-2xl px-4 py-3">
                  Al confirmar recibirás un código de seguimiento único. Guárdalo junto con tu correo para consultar el estado en cualquier momento.
                </p>
              )}

              {error && <ErrorBanner message={error} onClearCart={staleCartAction} />}

              {!user && (
                <LegalConsentCheckbox
                  id="checkout-legal-consent"
                  checked={acceptedLegal}
                  onChange={setAcceptedLegal}
                  disabled={busy}
                />
              )}

              <button
                type="button"
                onClick={() => void handleCreateOrder()}
                disabled={busy || (!user && !acceptedLegal)}
                className="w-full bg-primary text-primary-foreground py-4 rounded-full font-semibold hover:bg-primary/90 boty-transition disabled:opacity-50 text-base flex items-center justify-center gap-2"
              >
                {busy ? "Procesando…" : (<><CreditCard className="w-4 h-4" /> Ir a pagar — {formatMxn(totals.total)}</>)}
              </button>

              <p className="text-xs text-muted-foreground text-center">
                Tu tarjeta se cobrará en el siguiente paso. Pago seguro con Stripe.
              </p>
            </div>
          )}

          {/* ── STEP: PAYMENT ──────────────────────────────────────────── */}
          {step === "payment" && publicOrderId && (
            <div className="bg-card rounded-3xl p-6 boty-shadow space-y-4">
              <h2 className="font-serif text-xl flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Pago seguro
              </h2>
              {!user && trackingCode && (
                <div className="rounded-2xl bg-primary/5 border border-primary/20 px-4 py-3 text-sm">
                  <p className="text-muted-foreground">Tu código de seguimiento</p>
                  <p className="font-mono font-semibold tracking-wide mt-1">{trackingCode}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Guárdalo: lo necesitarás con tu correo para ver el estado del pedido.
                  </p>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Ingresa los datos de tu tarjeta. El cargo es de{" "}
                <strong className="text-foreground">{formatMxn(totals.total)}</strong>.
              </p>
              <StripePaymentForm
                publicOrderId={publicOrderId}
                totalMxn={formatMxn(totals.total)}
                returnUrl={paymentReturnUrl}
                billing={{
                  name: recipient.name,
                  email: recipient.email,
                  phone: recipient.phone,
                  country: recipient.countryCode,
                  address1: recipient.address1,
                  address2: recipient.address2,
                  city: recipient.city,
                  state: recipient.stateCode,
                  postalCode: recipient.zip,
                }}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
              {error && paymentOutcome !== "error" && (
                <ErrorBanner message={error} onClearCart={staleCartAction} />
              )}
            </div>
          )}
        </div>

        {/* ── Right column: order summary ─────────────────────────────── */}
        <div className="lg:sticky lg:top-28 h-fit">
          <div className="bg-card rounded-3xl p-6 boty-shadow space-y-5">
            <h3 className="font-serif text-lg">Tu pedido</h3>

            {/* Items */}
            <ul className="divide-y divide-border/50">
              {items.map((item) => (
                <li key={item.variantId} className="py-3 flex gap-3 items-center">
                  <div className="relative w-14 h-14 flex-shrink-0 rounded-xl overflow-hidden bg-muted">
                    <RemoteImage
                      src={item.thumbnail || "/placeholder.svg"}
                      alt={item.productName}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                    {item.quantity > 1 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-bold">
                        {item.quantity}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">{item.variantLabel}</p>
                    {item.quantity > 1 && (
                      <p className="text-xs text-muted-foreground">{formatMxn(item.retailPriceMxn)} c/u</p>
                    )}
                  </div>
                  <p className="text-sm font-semibold shrink-0">
                    {formatMxn(Number.parseFloat(item.retailPriceMxn) * item.quantity)}
                  </p>
                </li>
              ))}
            </ul>

            {/* Totals */}
            <div className="space-y-2 text-sm border-t border-border/50 pt-4">
              <TotalRow label="Subtotal" value={formatMxn(displayTotals.subtotal)} />
              <TotalRow
                label="Envío"
                value={displayTotals.shipping === "—" ? "—" : formatMxn(displayTotals.shipping)}
                muted={displayTotals.shipping === "—"}
              />
              <TotalRow
                label="IVA (16%)"
                value={displayTotals.tax === "—" ? "—" : formatMxn(displayTotals.tax)}
                muted={displayTotals.tax === "—"}
              />
              <div className="border-t border-border/50 pt-2">
                <TotalRow
                  label="Total"
                  value={
                    step === "confirm" || step === "payment"
                      ? formatMxn(totals.total)
                      : formatMxn(productSubtotal)
                  }
                  strong
                />
              </div>
            </div>

            {step === "address" && (
              <p className="text-xs text-muted-foreground text-center">
                Envío e IVA se calculan al confirmar tu dirección
              </p>
            )}
          </div>

          {/* Security badge */}
          <div className="mt-3 text-center text-xs text-muted-foreground space-y-1">
            <p className="flex items-center justify-center gap-1.5">
              <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 fill-current" aria-hidden>
                <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 0 1 2.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0 1 10 1.944ZM11 14a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm0-7a1 1 0 1 0-2 0v3a1 1 0 1 0 2 0V7Z" clipRule="evenodd" />
              </svg>
              Compra 100 % segura · Stripe
            </p>
            <p>
              <Link href="/terminos" className="text-primary hover:underline">
                Términos
              </Link>
              {" · "}
              <Link href="/privacidad" className="text-primary hover:underline">
                Privacidad
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>

    {paymentOutcome === "success" && (
      <PaymentOutcomeOverlay
        variant="success"
        title="¡Pago recibido!"
        description={paymentSuccessDescription(recipient.email)}
        showRedirectProgress
      />
    )}

    {paymentOutcome === "error" && (
      <PaymentOutcomeOverlay
        variant="error"
        title="No se pudo completar el pago"
        description="Revisa los datos de tu tarjeta o prueba con otro método."
        detail={error ?? undefined}
        actionLabel="Reintentar pago"
        onAction={() => {
          setPaymentOutcome(null);
          setError(null);
          scrollToTop();
        }}
      />
    )}
    </>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function AddressConfirmBanner({ recipient, stateName }: { recipient: CheckoutRecipient; stateName: string }) {
  return (
    <div className="rounded-2xl bg-muted/50 border border-border/60 px-4 py-3 flex gap-3 items-start">
      <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
      <div className="text-sm leading-relaxed">
        <p className="font-medium text-foreground">{recipient.name}</p>
        <p className="text-muted-foreground text-xs">
          {recipient.address1}
          {recipient.address2 && `, ${recipient.address2}`}
          {" · "}{recipient.city}, {stateName} {recipient.zip}
        </p>
      </div>
    </div>
  );
}

function isStaleCartError(message: string): boolean {
  return (
    message.includes("carrito") ||
    message.includes("catálogo") ||
    message.includes("Variante no encontrada")
  );
}

function ErrorBanner({
  message,
  onClearCart,
}: {
  message: string;
  onClearCart?: () => void;
}) {
  return (
    <div role="alert" className="rounded-2xl bg-destructive/5 border border-destructive/20 px-4 py-3 text-sm text-destructive">
      <p>{message}</p>
      {onClearCart ? (
        <button
          type="button"
          onClick={onClearCart}
          className="mt-2 font-medium underline underline-offset-2 hover:opacity-80"
        >
          Vaciar carrito e ir a la tienda
        </button>
      ) : null}
    </div>
  );
}

function TotalRow({
  label,
  value,
  strong,
  muted,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className={strong ? "font-semibold text-base" : "text-muted-foreground"}>{label}</span>
      <span
        className={cn(
          strong ? "font-bold text-base" : "",
          muted ? "text-muted-foreground text-xs italic" : "font-medium",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
  pattern,
  autoComplete,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  pattern?: string;
  autoComplete?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        pattern={pattern}
        autoComplete={autoComplete}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none boty-transition",
          "focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
          disabled && "opacity-60 cursor-not-allowed bg-muted",
        )}
      />
    </label>
  );
}
