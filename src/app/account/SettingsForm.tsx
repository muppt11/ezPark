"use client";

import { useActionState, useState, type ReactNode } from "react";
import { Car, House, LocateFixed } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ChoiceCard } from "@/components/ui/ChoiceCard";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { updateSettings, type SettingsState } from "./actions";

export type SettingsValues = {
  name: string;
  email: string;
  isDriver: boolean;
  isHost: boolean;
  homeArea: string | null;
  homeLat: number | null;
  homeLng: number | null;
  maxWalkMinutes: number;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleColor: string | null;
  licensePlate: string | null;
};

export function SettingsForm({ initial }: { initial: SettingsValues }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(updateSettings, {});
  const err = state.fieldErrors ?? {};
  const [area, setArea] = useState(initial.homeArea ?? "");
  const [coords, setCoords] = useState({ lat: initial.homeLat, lng: initial.homeLng });
  const [locating, setLocating] = useState<"idle" | "busy" | "denied">("idle");

  function useMyLocation() {
    if (!navigator.geolocation) return setLocating("denied");
    setLocating("busy");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Round to ~100 m: enough to rank nearby venues, without storing an exact home location.
        setCoords({ lat: round3(pos.coords.latitude), lng: round3(pos.coords.longitude) });
        if (!area) setArea("My current area");
        setLocating("idle");
      },
      () => setLocating("denied"),
      { timeout: 10_000 },
    );
  }

  return (
    <form action={action} className="divide-y divide-border">
      <Section title="Profile">
        <Field label="Name" name="name" defaultValue={initial.name} autoComplete="name" error={err.name} />
        <div>
          <p className="mb-1.5 text-sm font-medium">Email</p>
          <p className="text-muted">{initial.email}</p>
        </div>
      </Section>

      <Section title="How you use ezPark" description="One account can do both.">
        <div className="space-y-3">
          <ChoiceCard
            name="wantsDriver"
            title="Find parking"
            description="Reserve driveways near events."
            icon={<Car size={22} />}
            defaultChecked={initial.isDriver}
          />
          <ChoiceCard
            name="wantsHost"
            tone="accent"
            title="Rent out my driveway"
            description="List your driveway and get paid."
            icon={<House size={22} />}
            defaultChecked={initial.isHost}
          />
        </div>
        {err.roles && <p className="text-sm text-danger">{err.roles}</p>}
      </Section>

      <Section title="Location" description="Used to show events near you first. We only store your rough area.">
        <div className="flex items-end gap-2">
          <Field
            label="Your area"
            name="homeArea"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="e.g. Hyde Park, Austin"
            className="flex-1"
          />
          <Button type="button" variant="secondary" className="h-12 shrink-0" onClick={useMyLocation} disabled={locating === "busy"}>
            <LocateFixed size={18} />
            <span className="hidden sm:inline">{locating === "busy" ? "Locating…" : "Use my location"}</span>
          </Button>
        </div>
        {locating === "denied" && <p className="text-sm text-danger">Couldn&apos;t get your location. Type your area instead.</p>}
        {coords.lat != null && area && <p className="text-sm text-muted">Location saved for ranking nearby events.</p>}
        <input type="hidden" name="homeLat" value={coords.lat ?? ""} />
        <input type="hidden" name="homeLng" value={coords.lng ?? ""} />
        <Select
          label="How far are you willing to walk?"
          name="maxWalkMinutes"
          defaultValue={String(initial.maxWalkMinutes)}
          hint="Search shows driveways within this walk first."
          className="sm:max-w-xs"
        >
          {[5, 10, 15, 20, 30].map((m) => (
            <option key={m} value={m}>
              Up to {m} minutes
            </option>
          ))}
        </Select>
      </Section>

      <Section title="Your vehicle" description="Helps your host recognize your car. Shared only after you book.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Make" name="vehicleMake" defaultValue={initial.vehicleMake ?? ""} placeholder="Toyota" />
          <Field label="Model" name="vehicleModel" defaultValue={initial.vehicleModel ?? ""} placeholder="Camry" />
          <Field label="Color" name="vehicleColor" defaultValue={initial.vehicleColor ?? ""} placeholder="Silver" />
        </div>
        <Field
          label="License plate"
          name="licensePlate"
          defaultValue={initial.licensePlate ?? ""}
          className="sm:max-w-xs"
          autoCapitalize="characters"
          error={err.licensePlate}
        />
      </Section>

      <div className="flex items-center gap-4 py-6">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
        {state.ok && !pending && <Alert tone="success">Saved.</Alert>}
      </div>
    </form>
  );
}

export function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 py-8 md:grid-cols-[14rem_1fr] md:gap-10">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function round3(n: number) {
  return Math.round(n * 1000) / 1000;
}
