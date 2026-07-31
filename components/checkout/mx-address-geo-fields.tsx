"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { BotyRadixSelect } from "@/components/boty/boty-radix-select";
import { BotyAlert, BotyInput, BotyLabel } from "@/components/boty/ui-patterns";
import {
  fetchGeoMunicipalities,
  fetchGeoStates,
  lookupPostalCode,
  type GeoMunicipality,
  type GeoState,
} from "@/lib/mx-geo-api";

export type MxAddressGeoValue = {
  zip: string;
  stateCode: string;
  city: string;
  address2?: string;
};

type MxAddressGeoFieldsProps = {
  value: MxAddressGeoValue;
  onChange: (patch: Partial<MxAddressGeoValue>) => void;
  requireColony?: boolean;
};

export function MxAddressGeoFields({
  value,
  onChange,
  requireColony = false,
}: MxAddressGeoFieldsProps) {
  const t = useTranslations("checkout.addressGeo");
  const [states, setStates] = useState<GeoState[]>([]);
  const [municipalities, setMunicipalities] = useState<GeoMunicipality[]>([]);
  const [colonies, setColonies] = useState<Array<{ name: string; type: string }>>([]);
  const [selectedMunicipality, setSelectedMunicipality] = useState("");
  const [loadingStates, setLoadingStates] = useState(true);
  const [loadingMunicipalities, setLoadingMunicipalities] = useState(false);
  const [loadingPostal, setLoadingPostal] = useState(false);
  const [geoHint, setGeoHint] = useState<string | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const lastLookedUpZip = useRef("");

  const zipDigits = value.zip.replace(/\D/g, "").slice(0, 5);

  useEffect(() => {
    void fetchGeoStates()
      .then(setStates)
      .catch(() => setGeoError(t("statesLoadError")))
      .finally(() => setLoadingStates(false));
  }, []);

  const loadMunicipalities = useCallback(async (stateCode: string) => {
    if (!stateCode) {
      setMunicipalities([]);
      return [];
    }
    setLoadingMunicipalities(true);
    try {
      const rows = await fetchGeoMunicipalities(stateCode);
      setMunicipalities(rows);
      return rows;
    } catch {
      setMunicipalities([]);
      return [];
    } finally {
      setLoadingMunicipalities(false);
    }
  }, []);

  useEffect(() => {
    if (!value.stateCode) return;
    void loadMunicipalities(value.stateCode);
  }, [value.stateCode, loadMunicipalities]);

  useEffect(() => {
    if (zipDigits.length !== 5) {
      lastLookedUpZip.current = "";
      setColonies([]);
      return;
    }
    if (zipDigits === lastLookedUpZip.current) return;

    const handle = window.setTimeout(() => {
      setLoadingPostal(true);
      setGeoError(null);
      void lookupPostalCode(zipDigits)
        .then(async (result) => {
          lastLookedUpZip.current = result.zip;
          setColonies(result.colonies);
          setGeoHint(
            result.colonies.length > 0
              ? t("colonyHint")
              : t("zipValidHint"),
          );

          const munRows = await loadMunicipalities(result.stateCode);
          const munMatch = munRows.find(
            (m) => m.name.toLowerCase() === result.municipality.toLowerCase(),
          );
          setSelectedMunicipality(munMatch?.cveGeo ?? "");

          onChange({
            zip: result.zip,
            stateCode: result.stateCode,
            city: result.city,
            address2:
              result.colonies.length === 1
                ? result.colonies[0]!.name
                : value.address2,
          });
        })
        .catch((err: unknown) => {
          lastLookedUpZip.current = "";
          setColonies([]);
          setGeoError(
            err instanceof Error ? err.message : t("zipNotFound"),
          );
        })
        .finally(() => setLoadingPostal(false));
    }, 400);

    return () => window.clearTimeout(handle);
  }, [zipDigits, loadMunicipalities, onChange, value.address2]);

  useEffect(() => {
    if (!value.city || municipalities.length === 0) return;
    const match = municipalities.find(
      (m) => m.name.toLowerCase() === value.city.toLowerCase(),
    );
    if (match) setSelectedMunicipality(match.cveGeo);
  }, [municipalities, value.city]);

  const stateOptions = useMemo(
    () => states.map((s) => ({ value: s.stateCode, label: s.name })),
    [states],
  );

  const municipalityOptions = useMemo(
    () => municipalities.map((m) => ({ value: m.cveGeo, label: m.name })),
    [municipalities],
  );

  const colonyOptions = useMemo(
    () => colonies.map((c) => ({ value: c.name, label: `${c.name} (${c.type})` })),
    [colonies],
  );

  function handleStateChange(stateCode: string) {
    lastLookedUpZip.current = "";
    setColonies([]);
    setSelectedMunicipality("");
    setGeoHint(null);
    onChange({ stateCode, city: "", address2: "" });
  }

  function handleMunicipalityChange(cveGeo: string) {
    setSelectedMunicipality(cveGeo);
    const mun = municipalities.find((m) => m.cveGeo === cveGeo);
    if (mun) onChange({ city: mun.name });
  }

  return (
    <div className="space-y-3">
      <label className="flex flex-col gap-2">
        <BotyLabel>{t("zipLabel")}</BotyLabel>
        <div className="relative">
          <BotyInput
            value={value.zip}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 5);
              onChange({ zip: digits });
            }}
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder={t("zipPlaceholder")}
            required
            pattern="\d{5}"
            maxLength={5}
          />
          {loadingPostal && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </label>

      {geoError && <BotyAlert variant="error">{geoError}</BotyAlert>}
      {geoHint && !geoError && (
        <p className="text-xs text-muted-foreground">{geoHint}</p>
      )}

      <BotyRadixSelect
        label={t("stateLabel")}
        value={value.stateCode}
        onValueChange={handleStateChange}
        options={stateOptions}
        placeholder={loadingStates ? t("loadingStates") : t("selectState")}
        disabled={loadingStates}
        required
      />

      <BotyRadixSelect
        label={t("municipalityLabel")}
        value={selectedMunicipality}
        onValueChange={handleMunicipalityChange}
        options={municipalityOptions}
        placeholder={
          loadingMunicipalities
            ? t("loadingMunicipalities")
            : value.stateCode
              ? t("selectMunicipality")
              : t("selectStateFirst")
        }
        disabled={!value.stateCode || loadingMunicipalities}
        required
      />

      {colonyOptions.length > 0 ? (
        <BotyRadixSelect
          label={t("colonyLabel")}
          value={value.address2 ?? ""}
          onValueChange={(colony) => onChange({ address2: colony })}
          options={colonyOptions}
          placeholder={t("selectColony")}
          required={requireColony}
        />
      ) : (
        <label className="flex flex-col gap-2">
          <BotyLabel>{t("colonyLabel")} {requireColony ? "*" : t("optional")}</BotyLabel>
          <BotyInput
            value={value.address2 ?? ""}
            onChange={(e) => onChange({ address2: e.target.value })}
            autoComplete="address-line2"
            placeholder={t("colonyPlaceholder")}
            required={requireColony}
          />
        </label>
      )}

      <label className="flex flex-col gap-2">
        <BotyLabel>{t("cityLabel")}</BotyLabel>
        <BotyInput
          value={value.city}
          onChange={(e) => onChange({ city: e.target.value })}
          autoComplete="address-level2"
          required
          placeholder={t("cityPlaceholder")}
        />
      </label>
    </div>
  );
}
