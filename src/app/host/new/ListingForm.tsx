"use client";

import { useActionState, useState, useTransition } from "react";
import { Camera, MapPin, TriangleAlert } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Select } from "@/components/ui/Select";
import { formatEventDate, formatTime } from "@/lib/format";
import { formatMiles } from "@/lib/geo";
import { createListing, lookupAddress, type ListingFormState, type LookupResult } from "../actions";

const FAR_M = 1609;
type Mode = "FLAT" | "HOURLY" | "BOTH";

export function ListingForm({ payoutsEnabled }: { payoutsEnabled: boolean }) {
  const [state, formAction, saving] = useActionState<ListingFormState, FormData>(createListing, {});
  const err = state.fieldErrors ?? {};

  const [address, setAddress] = useState("");
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [finding, startFind] = useTransition();
  const [eventIds, setEventIds] = useState<string[]>([]);
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null);
  const [carCount, setCarCount] = useState("1");
  const [mode, setMode] = useState<Mode>("FLAT");

  const place = lookup?.ok ? lookup : null;
  // Every nearby venue's events in one list (closest venue first), so a driveway near
  // campus can be listed for a football game and a concert at the arena together.
  const withEvents = place?.venues.filter((v) => v.events.length > 0) ?? [];

  function find() {
    startFind(async () => {
      const r = await lookupAddress(address);
      setLookup(r);
      if (r.ok) {
        // Pre-select the next event at the closest venue; the host can add more.
        const first = r.venues.find((v) => v.events.length)?.events[0];
        setEventIds(first ? [first.id] : []);
      }
    });
  }

  function toggle(id: string, on: boolean) {
    setEventIds((ids) => (on ? [...new Set([...ids, id])] : ids.filter((x) => x !== id)));
  }

  function toggleVenue(ids: string[]) {
    const allOn = ids.every((id) => eventIds.includes(id));
    setEventIds((cur) => (allOn ? cur.filter((x) => !ids.includes(x)) : [...new Set([...cur, ...ids])]));
  }

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    const resized = await downscale(file);
    setPhoto({ file: resized, preview: URL.createObjectURL(resized) });
  }

  return (
    <form
      action={(fd) => {
        if (photo) fd.set("photo", photo.file);
        return formAction(fd);
      }}
      className="space-y-10"
    >
      {state.error && <Alert tone="error">{state.error}</Alert>}

      {/* 1. Address */}
      <Step n={1} title="Where's your driveway?">
        <div className="flex items-end gap-2">
          <Field
            label="Street address"
            name="address"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              if (lookup) setLookup(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                find();
              }
            }}
            placeholder="2105 San Antonio St"
            autoComplete="street-address"
            className="flex-1"
            error={err.address ?? (lookup && !lookup.ok ? lookup.error : undefined)}
            hint="Only drivers who book see your exact address."
          />
          <Button type="button" variant="secondary" className="mb-[26px] h-12" onClick={find} disabled={finding || address.trim().length < 5}>
            {finding ? "Finding…" : "Find"}
          </Button>
        </div>
        {place && (
          <p className="flex items-center gap-1.5 text-sm">
            <MapPin size={16} className="text-accent" /> {place.place.label}
          </p>
        )}
      </Step>

      {place && (
        <>
          {/* 2. Events, grouped by venue */}
          <Step n={2} title="Which events?">
            <p className="-mt-2 text-sm text-muted">Pick as many as you like, at any nearby venue. Each event becomes its own listing.</p>
            {withEvents.map((v) => {
              const ids = v.events.map((e) => e.id);
              const allOn = ids.every((id) => eventIds.includes(id));
              const far = v.distanceMeters > FAR_M;
              return (
                <fieldset key={v.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <legend className="font-semibold">
                      {v.name}{" "}
                      <span className={`text-sm font-normal ${far ? "text-danger" : "text-muted"}`}>
                        · {formatMiles(v.distanceMeters)} away
                      </span>
                    </legend>
                    <button type="button" onClick={() => toggleVenue(ids)} className="shrink-0 text-sm font-semibold text-primary">
                      {allOn ? "Clear" : "Select all"}
                    </button>
                  </div>
                  {far && (
                    <p className="flex items-start gap-2 text-sm text-danger">
                      <TriangleAlert size={16} className="mt-0.5 shrink-0" />
                      More than 1 mile away. Most drivers want a shorter walk, so expect fewer bookings here.
                    </p>
                  )}
                  <div className="divide-y divide-border rounded-control border border-border bg-surface">
                    {v.events.map((e) => (
                      <label key={e.id} className="flex cursor-pointer items-center gap-3 px-4 py-3">
                        <input
                          type="checkbox"
                          name="eventIds"
                          value={e.id}
                          checked={eventIds.includes(e.id)}
                          onChange={(ev) => toggle(e.id, ev.target.checked)}
                          className="h-5 w-5 accent-[var(--primary)]"
                        />
                        <span className="flex-1">
                          <span className="block font-medium">{e.name}</span>
                          <span className="text-sm text-muted">
                            {formatEventDate(new Date(e.startsAt))} · {formatTime(new Date(e.startsAt))}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              );
            })}

            {err.eventIds && <p className="text-sm text-danger">{err.eventIds}</p>}
            {eventIds.length > 0 ? (
              <p className="text-sm font-medium">
                {eventIds.length} {eventIds.length === 1 ? "event" : "events"} selected
              </p>
            ) : (
              <div className="space-y-2 rounded-control bg-neutral px-4 py-3">
                <p className="text-sm">
                  {withEvents.length === 0
                    ? "No events announced near you in the next 60 days. Save a draft and publish it in one tap when events are added."
                    : "No events picked. You can save a draft for a venue and publish it later."}
                </p>
                <Select label="Save a draft for" name="draftVenueId" defaultValue={place.venues[0]?.id}>
                  {place.venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({formatMiles(v.distanceMeters)})
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </Step>

          {/* 3. Details */}
          <Step n={3} title="Your driveway">
            <div>
              <p className="mb-1.5 text-sm font-medium">
                Photo <span className="font-normal text-muted">(optional)</span>
              </p>
              <label className="flex cursor-pointer items-center gap-4 rounded-card border-2 border-dashed border-border-strong bg-surface p-3 hover:border-primary">
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local preview blob
                  <img src={photo.preview} alt="Your driveway" className="h-24 w-32 rounded-control object-cover" />
                ) : (
                  <span className="flex h-24 w-32 items-center justify-center rounded-control bg-neutral text-muted">
                    <Camera size={28} />
                  </span>
                )}
                <span>
                  <span className="block font-semibold text-primary">{photo ? "Change photo" : "Add a photo"}</span>
                  <span className="text-sm text-muted">Helps drivers spot your driveway. Only shown after they book.</span>
                </span>
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => pickPhoto(e.target.files?.[0])} />
              </label>
              {err.photo && <p className="mt-1.5 text-sm text-danger">{err.photo}</p>}
            </div>

            <div>
              <p className="mb-1.5 text-sm font-medium">How many cars fit?</p>
              <input type="hidden" name="carCount" value={carCount} />
              <SegmentedControl
                ariaLabel="Cars"
                value={carCount}
                onChange={setCarCount}
                className="w-full sm:w-72"
                options={["1", "2", "3", "4"].map((n) => ({ value: n, label: n }))}
              />
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">Price</p>
              <input type="hidden" name="pricingMode" value={mode} />
              <SegmentedControl<Mode>
                ariaLabel="Pricing"
                value={mode}
                onChange={setMode}
                className="w-full"
                options={[
                  { value: "FLAT", label: "Flat per event" },
                  { value: "HOURLY", label: "Hourly" },
                  { value: "BOTH", label: "Both" },
                ]}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {mode !== "HOURLY" && (
                  <Field label="Flat price ($)" name="flatPrice" type="number" inputMode="decimal" min={5} max={200} defaultValue={25} error={err.flatPrice} hint="Driveways near the stadium usually get $20–$40." />
                )}
                {mode !== "FLAT" && (
                  <Field label="Hourly rate ($)" name="hourlyRate" type="number" inputMode="decimal" min={1} max={50} defaultValue={8} error={err.hourlyRate} />
                )}
              </div>
              <p className="text-sm text-muted">You keep 90%. ezPark&apos;s fee is 10%.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Select label="Opens" name="opensHoursBefore" defaultValue="3">
                {[1, 2, 3, 4, 5, 6].map((h) => (
                  <option key={h} value={h}>
                    {h} {h === 1 ? "hour" : "hours"} before start
                  </option>
                ))}
              </Select>
              <Select label="Closes" name="closesHoursAfter" defaultValue="3">
                {[1, 2, 3, 4, 5, 6].map((h) => (
                  <option key={h} value={h}>
                    {h} {h === 1 ? "hour" : "hours"} after start
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label htmlFor="instructions" className="mb-1.5 block text-sm font-medium">
                Parking instructions <span className="font-normal text-muted">(optional)</span>
              </label>
              <textarea
                id="instructions"
                name="instructions"
                rows={3}
                maxLength={500}
                placeholder="e.g. Pull up on the left side. Don't block the garage."
                className="w-full rounded-control border border-border-strong bg-surface px-3.5 py-3 text-[16px] placeholder:text-muted focus-visible:outline-2 focus-visible:outline-primary"
              />
              <p className="mt-1.5 text-sm text-muted">Shown to the driver only after they pay.</p>
            </div>
          </Step>

          <div className="space-y-2">
            <Button type="submit" size="lg" fullWidth disabled={saving}>
              {saving
                ? "Saving…"
                : eventIds.length === 0
                  ? "Save draft"
                  : payoutsEnabled
                    ? `Publish listing${eventIds.length > 1 ? `s (${eventIds.length} events)` : ""}`
                    : "Continue to payout setup"}
            </Button>
            {!payoutsEnabled && eventIds.length > 0 && (
              <p className="text-center text-sm text-muted">Last step: tell us where to send your earnings (about 30 seconds).</p>
            )}
          </div>
        </>
      )}
    </form>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-3 text-xl font-bold">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm text-primary-text">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Shrink phone photos to ≤1600px JPEG before upload: faster on mobile data, well under the size limit. */
async function downscale(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob ? new File([blob], "driveway.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file; // e.g. HEIC the browser can't decode: let the server validate it
  }
}
