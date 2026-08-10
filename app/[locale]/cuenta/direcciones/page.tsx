"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { MapPin, Plus, Loader2 } from "lucide-react";
import {
  BotyAlert,
  BotyBadge,
  BotyButton,
  BotyEmptyState,
  BotyInput,
  BotyLabel,
  BotyPageHeader,
  BotySurface,
} from "@/components/boty/ui-patterns";
import { MxAddressGeoFields } from "@/components/checkout/mx-address-geo-fields";
import {
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  type SavedAddress,
} from "@/lib/customer-api";

const EMPTY_FORM: {
  label: string;
  recipientName: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  stateCode: string;
  countryCode: "MX" | "US";
  zip: string;
  isDefault: boolean;
} = {
  label: "",
  recipientName: "",
  phone: "",
  address1: "",
  address2: "",
  city: "",
  stateCode: "JAL",
  countryCode: "MX",
  zip: "",
  isDefault: false,
};

export default function DireccionesPage() {
  const t = useTranslations("account.addresses");
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setAddresses(await listAddresses());
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loadError"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function openNew() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setError(null);
  }

  function openEdit(addr: SavedAddress) {
    setEditId(addr.id);
    setForm({
      label: addr.label,
      recipientName: addr.recipientName,
      phone: addr.phone,
      address1: addr.address1,
      address2: addr.address2 ?? "",
      city: addr.city,
      stateCode: addr.stateCode,
      countryCode: (addr.countryCode ?? "MX") as "MX" | "US",
      zip: addr.zip,
      isDefault: addr.isDefault,
    });
    setShowForm(true);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload = { ...form, address2: form.address2 || null };
      if (editId) await updateAddress(editId, payload);
      else await createAddress(payload);
      setShowForm(false);
      setEditId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("saveError"));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("confirmDelete"))) return;
    setBusy(true);
    try {
      await deleteAddress(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("deleteError"));
    } finally {
      setBusy(false);
    }
  }

  async function setDefault(addr: SavedAddress) {
    setBusy(true);
    try {
      await updateAddress(addr.id, { isDefault: true });
      await load();
    } catch { /* ignore */ } finally { setBusy(false); }
  }

  const set = (k: keyof typeof EMPTY_FORM) => (v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <>
      <BotyPageHeader
        title={t("title")}
        description={t("subtitle")}
        action={
          !showForm ? (
            <BotyButton variant="primary" onClick={openNew} className="gap-2">
              <Plus className="w-4 h-4" />
              {t("new")}
            </BotyButton>
          ) : undefined
        }
      />

      {error && <BotyAlert variant="error" className="mb-4">{error}</BotyAlert>}

      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-8">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t("loading")}
        </div>
      )}

      {showForm && (
        <BotySurface className="p-6 md:p-8 mb-6">
          <h3 className="font-serif text-lg mb-4">{editId ? t("edit") : t("new")}</h3>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label={t("labelHint")} value={form.label} onChange={set("label")} />
              <Field label={t("recipientName")} value={form.recipientName} onChange={set("recipientName")} required />
              <Field label={t("phone")} value={form.phone} onChange={set("phone")} type="tel" required />
              <Field label={t("street")} value={form.address1} onChange={set("address1")} required className="sm:col-span-2" />
              <div className="sm:col-span-2">
                <MxAddressGeoFields
                  value={{
                    zip: form.zip,
                    stateCode: form.stateCode,
                    city: form.city,
                    address2: form.address2,
                  }}
                  onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
                />
              </div>
            </div>
            <label className="flex items-center gap-3 text-sm cursor-pointer rounded-2xl bg-background/60 px-4 py-3">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => set("isDefault")(e.target.checked)}
                className="rounded border-border"
              />
              {t("useAsDefault")}
            </label>
            <div className="flex flex-wrap gap-3 pt-2">
              <BotyButton type="submit" variant="primary" disabled={busy}>
                {busy ? t("saving") : t("save")}
              </BotyButton>
              <BotyButton type="button" variant="secondary" onClick={() => setShowForm(false)}>
                {t("cancel")}
              </BotyButton>
            </div>
          </form>
        </BotySurface>
      )}

      {!loading && addresses.length === 0 && !showForm && (
        <BotyEmptyState
          title={t("emptyTitle")}
          description={t("emptySubtitle")}
          action={<BotyButton variant="primary" onClick={openNew}>{t("add")}</BotyButton>}
        />
      )}

      <ul className="space-y-4">
        {addresses.map((addr) => (
          <li key={addr.id}>
            <BotySurface className="p-5 md:p-6">
              <div className="flex flex-wrap gap-4 justify-between">
                <div className="flex gap-4 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold flex flex-wrap items-center gap-2">
                      {addr.label}
                      {addr.isDefault && (
                        <BotyBadge className="bg-primary/10 text-primary">{t("default")}</BotyBadge>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {addr.recipientName} · {addr.phone}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {addr.address1}
                      {addr.address2 ? `, ${addr.address2}` : ""}, {addr.city}, {addr.stateCode} {addr.zip}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {!addr.isDefault && (
                    <BotyButton type="button" variant="secondary" size="sm" disabled={busy} onClick={() => void setDefault(addr)}>
                      {t("setDefault")}
                    </BotyButton>
                  )}
                  <BotyButton type="button" variant="secondary" size="sm" onClick={() => openEdit(addr)}>
                    {t("edit")}
                  </BotyButton>
                  <BotyButton type="button" variant="danger" size="sm" disabled={busy} onClick={() => void handleDelete(addr.id)}>
                    {t("delete")}
                  </BotyButton>
                </div>
              </div>
            </BotySurface>
          </li>
        ))}
      </ul>
    </>
  );
}

function Field({
  label, value, onChange, required, type = "text", pattern, className,
}: {
  label: string; value: string; onChange: (v: string) => void;
  required?: boolean; type?: string; pattern?: string; className?: string;
}) {
  return (
    <label className={`flex flex-col gap-2 ${className ?? ""}`}>
      <BotyLabel>{label}</BotyLabel>
      <BotyInput required={required} type={type} pattern={pattern} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
