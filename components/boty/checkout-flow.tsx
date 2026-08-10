"use client";

import { Link, useRouter } from "@/lib/i18n/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { createDraftOrder, fetchEstimate, finalizeOrderPayment } from "@/lib/api";
import type { CheckoutRecipient } from "@/lib/api-types";
import { useCart } from "@/lib/cart-context";
import { useCustomer } from "@/lib/customer-context";
import { saveGuestOrderAccess } from "@/lib/order-guest-session";
import { createAddress, listAddresses, type SavedAddress } from "@/lib/customer-api";
import { MX_STATES } from "@/lib/mx-states";
import { US_STATES } from "@/lib/us-states";
import { MxAddressGeoFields } from "@/components/checkout/mx-address-geo-fields";
import { UsAddressGeoFields } from "@/components/checkout/us-address-geo-fields";
import { cn, formatCurrency } from "@/lib/utils";
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

function emptyRecipientForMarket(
  countryCode: "MX" | "US",
  base?: Partial<CheckoutRecipient>,
): CheckoutRecipient {
  return {
    name: base?.name ?? "",
    address1: "",
    address2: "",
    city: "",
    stateCode: countryCode === "US" ? "CA" : "JAL",
    countryCode,
    zip: "",
    phone: base?.phone ?? "",
    email: base?.email ?? "",
  };
}
// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "address" | "confirm" | "payment";

const STEP_ICONS: { key: Step; icon: React.ElementType }[] = [
  { key: "address", icon: MapPin },
  { key: "confirm", icon: Package },
  { key: "payment", icon: CreditCard },
];

const STEP_ORDER: Step[] = ["address", "confirm", "payment"];

// ─── Main component ───────────────────────────────────────────────────────────

export function BotyCheckoutFlow() {
  const t = useTranslations("checkout");
  const { items, inStockItems, outOfStockItems, clearCart, hydrated, removeItem, currency, itemPrice } = useCart();
  const { user } = useCustomer();
  const router = useRouter();
  const shipCountry: "MX" | "US" = currency === "USD" ? "US" : "MX";

  const STEPS = STEP_ICONS.map((s) => ({ ...s, label: t(`steps.${s.key}`) }));

  const [step, setStep] = useState<Step>("address");
  const [recipient, setRecipient] = useState<CheckoutRecipient>(() =>
    emptyRecipientForMarket(currency === "USD" ? "US" : "MX"),
  );

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | "new" | null>(null);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [saveAddress, setSaveAddress] = useState(true);
  const [addressLabel, setAddressLabel] = useState(t("addressLabelDefault"));

  const [totals, setTotals] = useState({ subtotal: "0.00", shipping: "0.00", tax: "0.00", total: "0.00" });
  const [publicOrderId, setPublicOrderId] = useState<string | null>(null);
  const [trackingCode, setTrackingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [paymentOutcome, setPaymentOutcome] = useState<"success" | "error" | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const submittingRef = useRef(false);

  const paymentReturnUrl =
    typeof window !== "undefined" && publicOrderId
      ? `${window.location.origin}${
          user
            ? `/cuenta/pedidos/${encodeURIComponent(publicOrderId)}?paid=1`
            : `/pedido/${encodeURIComponent(publicOrderId)}?paid=1`
        }`
      : undefined;

  // ── Load saved addresses when logged in (filtradas por país del mercado) ──
  useEffect(() => {
    if (!user) return;
    setLoadingAddresses(true);
    listAddresses()
      .then((addrs) => {
        const forMarket = addrs.filter((a) => (a.countryCode ?? "MX") === shipCountry);
        setSavedAddresses(forMarket);
        const def = forMarket.find((a) => a.isDefault) ?? forMarket[0];
        if (def) {
          setSelectedAddressId(def.id);
          applyAddress(def, user.email);
        } else {
          setSelectedAddressId("new");
          setRecipient(
            emptyRecipientForMarket(shipCountry, {
              name: user.fullName,
              email: user.email,
              phone: user.phone ?? "",
            }),
          );
        }
      })
      .catch(() => {
        setSelectedAddressId("new");
        setRecipient(
          emptyRecipientForMarket(shipCountry, {
            name: user.fullName,
            email: user.email,
            phone: user.phone ?? "",
          }),
        );
      })
      .finally(() => setLoadingAddresses(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, shipCountry]);

  // Si cambia el mercado (MX↔US), reinicia dirección al país correcto.
  useEffect(() => {
    if (recipient.countryCode === shipCountry) return;
    setRecipient((prev) =>
      emptyRecipientForMarket(shipCountry, {
        name: prev.name,
        email: prev.email,
        phone: prev.phone,
      }),
    );
    setSelectedAddressId(user ? "new" : null);
    setStep("address");
    setError(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipCountry]);

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
      countryCode: addr.countryCode ?? shipCountry,
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
    setRecipient(
      emptyRecipientForMarket(shipCountry, {
        name: user?.fullName ?? "",
        email: user?.email ?? "",
        phone: user?.phone ?? "",
      }),
    );
    setError(null);
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  // Solo items con existencias van al pedido
  const cartItems = inStockItems.map((i) => ({
    variantId: i.variantId,
    quantity: i.quantity,
    retailPriceMxn: currency === "MXN" ? i.retailPriceMxn : undefined,
    retailPriceUsd: currency === "USD" ? (i.retailPriceUsd ?? undefined) : undefined,
  }));

  const hasOutOfStock = outOfStockItems.length > 0;

  const productSubtotal = useMemo(() =>
    inStockItems.reduce((sum, i) => {
      const price = itemPrice(i);
      return price ? sum + Number.parseFloat(price) * i.quantity : sum;
    }, 0),
    [inStockItems, itemPrice]);

  const address = {
    address1: recipient.address1,
    address2: recipient.address2,
    city: recipient.city,
    stateCode: recipient.stateCode,
    countryCode: shipCountry,
    zip: recipient.zip,
  };

  const currentStateName =
    (shipCountry === "US" ? US_STATES : MX_STATES).find((s) => s.code === recipient.stateCode)?.name ??
    recipient.stateCode;

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

    // Client-side field validation
    const isFillingForm = !user || selectedAddressId === "new" || savedAddresses.length === 0;
    if (isFillingForm) {
      const errs: Record<string, string> = {};
      if (!recipient.name.trim()) errs.name = t("errors.nameRequired");
      if (!recipient.email.trim()) {
        errs.email = t("errors.emailRequired");
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.email)) {
        errs.email = t("errors.emailInvalid");
      }
      if (!recipient.phone.trim()) {
        errs.phone = t("errors.phoneRequired");
      } else if (!/^\d{10}$/.test(recipient.phone)) {
        errs.phone = t("errors.phoneInvalid");
      }
      if (!recipient.address1.trim()) errs.address1 = t("errors.addressRequired");
      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs);
        const firstKey = Object.keys(errs)[0];
        document.getElementById(`field-${firstKey}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      setFieldErrors({});
    }

    if (submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    setError(null);
    try {
      // Guardar dirección si el usuario lo solicitó y está llenando el formulario
      const isFillingForm = !user || selectedAddressId === "new" || savedAddresses.length === 0;
      if (user && isFillingForm && saveAddress) {
        try {
          const saved = await createAddress({
            label: addressLabel.trim() || t("addressLabelFallback"),
            recipientName: recipient.name,
            phone: recipient.phone,
            address1: recipient.address1,
            address2: recipient.address2 || null,
            city: recipient.city,
            stateCode: recipient.stateCode,
            countryCode: shipCountry,
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
      const res = await fetchEstimate({ items: cartItems, address, currency });
      setTotals(res.data);
      setStep("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.estimateFailed"));
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }

  async function handleCreateOrder() {
    if (!user && !acceptedLegal) {
      setError(t("errors.legalRequired"));
      return;
    }
    if (submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const res = await createDraftOrder({
        items: cartItems, recipient,
        retailCosts: { currency, ...totals },
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
      setError(err instanceof Error ? err.message : t("errors.orderCreateFailed"));
    } finally {
      submittingRef.current = false;
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
        {t("loadingCart")}
      </div>
    );
  }

  const completingCheckout =
    paymentOutcome != null || (step === "payment" && publicOrderId != null);

  if (inStockItems.length === 0 && !completingCheckout) {
    return (
      <div className="max-w-md mx-auto text-center py-20 bg-card rounded-3xl boty-shadow px-8">
        <Package className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
        <p className="text-lg font-medium mb-2">{t("emptyCart.title")}</p>
        <p className="text-sm text-muted-foreground mb-6">{t("emptyCart.subtitle")}</p>
        <Link
          href="/shop"
          className="inline-flex bg-primary text-primary-foreground px-8 py-3 rounded-full text-sm font-medium hover:bg-primary/90 boty-transition"
        >
          {t("emptyCart.viewCollection")}
        </Link>
      </div>
    );
  }

  const stepIndex = STEP_ORDER.indexOf(step);

  return (
    <>
    <div className="space-y-8 max-w-6xl mx-auto">

      {/* ── Banner de items agotados ──────────────────────────────────────── */}
      {hasOutOfStock && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 px-5 py-4">
          <p className="text-sm font-semibold text-amber-900 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            {t("outOfStock.banner", { count: outOfStockItems.length })}
          </p>
          <p className="text-xs text-amber-700 mb-3">
            {t("outOfStock.notice")}
          </p>
          <ul className="space-y-1.5 mb-3">
            {outOfStockItems.map((i) => (
              <li key={i.variantId} className="flex items-center justify-between gap-3 text-sm text-amber-800">
                <span className="truncate">{i.productName} — <span className="text-amber-600">{i.variantLabel}</span></span>
                <button
                  type="button"
                  onClick={() => removeItem(i.variantId)}
                  className="shrink-0 text-xs underline underline-offset-2 text-amber-700 hover:text-amber-900"
                >
                  {t("outOfStock.remove")}
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => outOfStockItems.forEach((i) => removeItem(i.variantId))}
            className="text-xs font-medium text-amber-800 underline underline-offset-2 hover:text-amber-900"
          >
            {t("outOfStock.removeAll")}
          </button>
        </div>
      )}

      {/* ── Progress bar ─────────────────────────────────────────────────── */}
      <nav aria-label={t("stepsAriaLabel")} className="flex items-center justify-center gap-0">
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
              <h2 className="font-serif text-xl">{t("addressStep.title")}</h2>

              {/* Guest: invite to login */}
              {!user && (
                <div className="rounded-2xl bg-primary/5 border border-primary/20 px-4 py-3 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{t("addressStep.alreadyHaveAccount")} </span>
                  <Link href="/login?redirect=/checkout" className="text-primary hover:underline font-medium">
                    {t("addressStep.login")}
                  </Link>
                  {" "}{t("addressStep.loginSuffix")}
                </div>
              )}

              {/* Logged-in: saved address cards — solo si tiene al menos una */}
              {user && !loadingAddresses && savedAddresses.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {t("addressStep.savedAddresses")}
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
                        <p className="text-sm font-medium">{t("addressStep.newAddress")}</p>
                        <p className="text-xs text-muted-foreground">{t("addressStep.useDifferentAddress")}</p>
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
                      {t("addressStep.newAddress")}
                    </p>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Field
                        label={t("fields.fullName")}
                        value={recipient.name}
                        onChange={(v) => { setRecipient({ ...recipient, name: v }); setFieldErrors((p) => ({ ...p, name: "" })); }}
                        required
                        autoComplete="name"
                        error={fieldErrors.name}
                        fieldKey="name"
                      />
                    </div>
                    <Field
                      label={t("fields.email")}
                      type="email"
                      value={recipient.email}
                      onChange={(v) => { setRecipient({ ...recipient, email: v }); setFieldErrors((p) => ({ ...p, email: "" })); }}
                      required
                      autoComplete="email"
                      disabled={!!user}
                      error={fieldErrors.email}
                      fieldKey="email"
                    />
                    <Field
                      label={t("fields.phone")}
                      type="tel"
                      value={recipient.phone}
                      onChange={(v) => { setRecipient({ ...recipient, phone: v }); setFieldErrors((p) => ({ ...p, phone: "" })); }}
                      required
                      autoComplete="tel"
                      placeholder={t("fields.phonePlaceholder")}
                      error={fieldErrors.phone}
                      fieldKey="phone"
                    />
                    <div className="sm:col-span-2">
                      <Field
                        label={t("fields.street")}
                        value={recipient.address1}
                        onChange={(v) => { setRecipient({ ...recipient, address1: v }); setFieldErrors((p) => ({ ...p, address1: "" })); }}
                        required
                        autoComplete="address-line1"
                        placeholder={t("fields.streetPlaceholder")}
                        error={fieldErrors.address1}
                        fieldKey="address1"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      {shipCountry === "US" ? (
                        <UsAddressGeoFields
                          value={{
                            zip: recipient.zip,
                            stateCode: recipient.stateCode,
                            city: recipient.city,
                          }}
                          onChange={(patch) => setRecipient({ ...recipient, ...patch })}
                          labels={{
                            zip: t("fields.zipUs"),
                            state: t("fields.stateUs"),
                            city: t("fields.city"),
                          }}
                        />
                      ) : (
                        <MxAddressGeoFields
                          value={{
                            zip: recipient.zip,
                            stateCode: recipient.stateCode,
                            city: recipient.city,
                            address2: recipient.address2,
                          }}
                          onChange={(patch) => setRecipient({ ...recipient, ...patch })}
                        />
                      )}
                    </div>
                    {shipCountry === "US" ? (
                      <div className="sm:col-span-2">
                        <Field
                          label={t("fields.address2")}
                          value={recipient.address2 ?? ""}
                          onChange={(v) => setRecipient({ ...recipient, address2: v })}
                          autoComplete="address-line2"
                          placeholder={t("fields.address2Placeholder")}
                          fieldKey="address2"
                        />
                      </div>
                    ) : null}
                    <p className="sm:col-span-2 text-[11px] text-[#7A756E] tracking-[0.06em]">
                      {shipCountry === "US"
                        ? t("addressStep.shipsToUsOnly")
                        : t("addressStep.shipsToMxOnly")}
                    </p>
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
                          {t("addressStep.saveAddressCheckbox")}
                        </span>
                      </label>

                      {saveAddress && (
                        <div className="ml-8">
                          <Field
                            label={t("fields.addressLabel")}
                            value={addressLabel}
                            onChange={setAddressLabel}
                            placeholder={t("fields.addressLabelPlaceholder")}
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
                {busy ? t("calculatingShipping") : (
                  <>{t("next")} <ChevronRight className="w-4 h-4" /></>
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
                  aria-label={t("confirmStep.backToAddress")}
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h2 className="font-serif text-xl">{t("confirmStep.title")}</h2>
              </div>

              {/* Address summary */}
              <div className="rounded-2xl bg-muted/40 p-4 space-y-0.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> {t("confirmStep.shipTo")}
                </p>
                <p className="text-sm font-medium">{recipient.name}</p>
                <p className="text-sm text-muted-foreground">{recipient.address1}{recipient.address2 ? `, ${recipient.address2}` : ""}</p>
                <p className="text-sm text-muted-foreground">{recipient.city}, {currentStateName} {recipient.zip}</p>
                <p className="text-sm text-muted-foreground">{recipient.phone}</p>
              </div>

              {/* Shipping info */}
              <div className="rounded-2xl bg-muted/40 p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5" /> {t("shippingLabel")}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{t("confirmStep.calculatedAutomatically")}</p>
                  <span className="text-sm font-semibold">{formatCurrency(totals.shipping, currency)}</span>
                </div>
              </div>

              {/* Totals breakdown */}
              <div className="space-y-2 text-sm border-t border-border/50 pt-4">
                <TotalRow label={t("confirmStep.subtotalProducts")} value={formatCurrency(totals.subtotal, currency)} />
                <TotalRow label={t("shippingLabel")} value={formatCurrency(totals.shipping, currency)} />
                <TotalRow label={t("tax")} value={formatCurrency(totals.tax, currency)} />
                <TotalRow label={t("total")} value={formatCurrency(totals.total, currency)} strong />
              </div>

              {!user && (
                <p className="text-xs text-muted-foreground bg-muted/40 rounded-2xl px-4 py-3">
                  {t("confirmStep.guestTrackingNotice")}
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
                {busy ? t("confirmStep.processing") : (<><CreditCard className="w-4 h-4" /> {t("confirmStep.goToPayment")} — {formatCurrency(totals.total, currency)}</>)}
              </button>

              <p className="text-xs text-muted-foreground text-center">
                {t("confirmStep.cardChargeNotice")}
              </p>
            </div>
          )}

          {/* ── STEP: PAYMENT ──────────────────────────────────────────── */}
          {step === "payment" && publicOrderId && (
            <div className="bg-card rounded-3xl p-6 boty-shadow space-y-4">
              <h2 className="font-serif text-xl flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                {t("paymentStep.title")}
              </h2>
              {!user && trackingCode && (
                <div className="rounded-2xl bg-primary/5 border border-primary/20 px-4 py-3 text-sm">
                  <p className="text-muted-foreground">{t("paymentStep.trackingCodeLabel")}</p>
                  <p className="font-mono font-semibold tracking-wide mt-1">{trackingCode}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t("paymentStep.trackingCodeNotice")}
                  </p>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                {t("paymentStep.cardChargeIntro")}{" "}
                <strong className="text-foreground">{formatCurrency(totals.total, currency)}</strong>.
              </p>
              <StripePaymentForm
                publicOrderId={publicOrderId}
                totalMxn={formatCurrency(totals.total, currency)}
                currency={currency}
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
            <h3 className="font-serif text-lg">{t("orderSummary.title")}</h3>

            {/* Items */}
            <ul className="divide-y divide-border/50">
              {inStockItems.map((item) => (
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
                    {item.quantity > 1 && itemPrice(item) && (
                      <p className="text-xs text-muted-foreground">{t("orderSummary.perUnit", { price: formatCurrency(itemPrice(item)!, currency) })}</p>
                    )}
                  </div>
                  <p className="text-sm font-semibold shrink-0">
                    {itemPrice(item) ? formatCurrency(Number.parseFloat(itemPrice(item)!) * item.quantity, currency) : "—"}
                  </p>
                </li>
              ))}
            </ul>

            {/* Totals */}
            <div className="space-y-2 text-sm border-t border-border/50 pt-4">
              <TotalRow label={t("orderSummary.subtotal")} value={formatCurrency(displayTotals.subtotal, currency)} />
              <TotalRow
                label={t("shippingLabel")}
                value={displayTotals.shipping === "—" ? "—" : formatCurrency(displayTotals.shipping, currency)}
                muted={displayTotals.shipping === "—"}
              />
              <TotalRow
                label={t("tax")}
                value={displayTotals.tax === "—" ? "—" : formatCurrency(displayTotals.tax, currency)}
                muted={displayTotals.tax === "—"}
              />
              <div className="border-t border-border/50 pt-2">
                <TotalRow
                  label={t("total")}
                  value={
                    step === "confirm" || step === "payment"
                      ? formatCurrency(totals.total, currency)
                      : formatCurrency(productSubtotal, currency)
                  }
                  strong
                />
              </div>
            </div>

            {step === "address" && (
              <p className="text-xs text-muted-foreground text-center">
                {t("orderSummary.shippingTaxNotice")}
              </p>
            )}
          </div>

          {/* Security badge */}
          <div className="mt-3 text-center text-xs text-muted-foreground space-y-1">
            <p className="flex items-center justify-center gap-1.5">
              <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 fill-current" aria-hidden>
                <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 0 1 2.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0 1 10 1.944ZM11 14a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm0-7a1 1 0 1 0-2 0v3a1 1 0 1 0 2 0V7Z" clipRule="evenodd" />
              </svg>
              {t("security.securePurchase")}
            </p>
            <p>
              <Link href="/terminos" className="text-primary hover:underline">
                {t("security.terms")}
              </Link>
              {" · "}
              <Link href="/privacidad" className="text-primary hover:underline">
                {t("security.privacy")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>

    {paymentOutcome === "success" && (
      <PaymentOutcomeOverlay
        variant="success"
        title={t("paymentOutcome.successTitle")}
        description={paymentSuccessDescription(recipient.email, (key, values) =>
          t(`paymentOutcome.${key}`, values),
        )}
        showRedirectProgress
      />
    )}

    {paymentOutcome === "error" && (
      <PaymentOutcomeOverlay
        variant="error"
        title={t("paymentOutcome.errorTitle")}
        description={t("paymentOutcome.errorDescription")}
        detail={error ?? undefined}
        actionLabel={t("paymentOutcome.retryPayment")}
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
  const t = useTranslations("checkout");
  return (
    <div role="alert" className="rounded-2xl bg-destructive/5 border border-destructive/20 px-4 py-3 text-sm text-destructive">
      <p>{message}</p>
      {onClearCart ? (
        <button
          type="button"
          onClick={onClearCart}
          className="mt-2 font-medium underline underline-offset-2 hover:opacity-80"
        >
          {t("clearCartAndShop")}
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
  error,
  fieldKey,
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
  error?: string;
  fieldKey?: string;
}) {
  return (
    <label id={fieldKey ? `field-${fieldKey}` : undefined} className="flex flex-col gap-1 text-sm">
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
        aria-invalid={error ? "true" : undefined}
        className={cn(
          "rounded-xl border bg-background px-3 py-2.5 text-sm outline-none boty-transition",
          error
            ? "border-red-400 focus:ring-2 focus:ring-red-300/30"
            : "border-border focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
          disabled && "opacity-60 cursor-not-allowed bg-muted",
        )}
      />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </label>
  );
}
