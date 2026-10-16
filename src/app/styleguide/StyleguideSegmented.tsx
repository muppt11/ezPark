"use client";

import { useState } from "react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

export function StyleguideSegmented() {
  const [role, setRole] = useState<"driver" | "host">("driver");
  const [price, setPrice] = useState<"hourly" | "flat">("hourly");

  return (
    <div className="flex flex-wrap items-center gap-6">
      <SegmentedControl
        ariaLabel="Role"
        value={role}
        onChange={setRole}
        tone={role === "host" ? "accent" : "default"}
        options={[
          { value: "driver", label: "Driver" },
          { value: "host", label: "Host" },
        ]}
      />
      <SegmentedControl
        ariaLabel="Pricing"
        className="w-72"
        value={price}
        onChange={setPrice}
        options={[
          { value: "hourly", label: "Hourly" },
          { value: "flat", label: "Flat per event" },
        ]}
      />
    </div>
  );
}
