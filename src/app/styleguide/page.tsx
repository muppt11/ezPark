import { CalendarDays, Footprints, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StyleguideSegmented } from "./StyleguideSegmented";

const tokens = [
  "bg", "surface", "surface-subtle", "text", "muted", "border", "border-strong",
  "primary", "primary-text", "accent", "accent-text", "accent-subtle", "danger", "success",
];

export default function StyleguidePage() {
  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Style guide</h1>
        <p className="mt-1 text-muted">Switch themes in the header to check every token and component.</p>
      </header>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Tokens</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {tokens.map((t) => (
            <div key={t} className="overflow-hidden rounded-control border border-border bg-surface">
              <div className="h-14" style={{ background: `var(--${t})` }} />
              <p className="px-2 py-1.5 text-xs font-medium">--{t}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Buttons</h2>
        <div className="flex flex-wrap gap-3">
          <Button>Reserve spot</Button>
          <Button variant="accent">List my driveway</Button>
          <Button variant="secondary">Details</Button>
          <Button variant="ghost">Edit times</Button>
          <Button variant="danger">Cancel booking</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Segmented controls</h2>
        <StyleguideSegmented />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Search fields</h2>
        <div className="max-w-xl space-y-3">
          <label className="flex h-14 items-center gap-3 rounded-control border border-border-strong bg-surface px-4 focus-within:outline-2 focus-within:outline-primary">
            <Search size={18} className="text-muted" />
            <input
              placeholder="Search a venue or event"
              className="w-full bg-transparent text-[17px] outline-none placeholder:text-muted"
            />
          </label>
          <div className="flex h-16 items-center gap-3 rounded-control border border-border-strong bg-surface px-4">
            <CalendarDays size={18} className="text-muted" />
            <div className="grid flex-1 grid-cols-2">
              <div>
                <p className="text-xs text-muted">Arrive</p>
                <p className="font-medium">Sat, 5:00 PM</p>
              </div>
              <div>
                <p className="text-xs text-muted">Leave</p>
                <p className="font-medium">Sat, 11:00 PM</p>
              </div>
            </div>
          </div>
          <p className="text-sm text-danger">Pick a leave time after your arrival time.</p>
          <p className="text-sm text-success">Payment confirmed. Address unlocked.</p>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Listing card (preview of search results)</h2>
        <Card className="flex max-w-xl gap-4 p-4">
          <div className="h-24 w-24 shrink-0 rounded-control bg-surface-subtle" />
          <div className="flex flex-1 flex-col">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">Driveway near E 21st St</p>
                <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-accent-subtle px-2 py-0.5 text-sm font-medium text-accent">
                  <Footprints size={14} /> 6 min walk
                </p>
                <p className="mt-1 text-sm text-muted">0.3 mi · 2 cars · Open 3–11 PM</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold">$25</p>
                <p className="text-sm text-muted">per event</p>
              </div>
            </div>
            <div className="mt-auto flex justify-end gap-2 pt-3">
              <Button variant="ghost">Details</Button>
              <Button>Reserve</Button>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
