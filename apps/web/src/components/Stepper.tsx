import type { TripStatus } from "@tripsync/core";

const STEPS: { status: TripStatus; label: string }[] = [
  { status: "planning", label: "Share availability" },
  { status: "dates_confirmed", label: "Confirm dates" },
  { status: "finalized", label: "Book & organize" },
];

export function Stepper({ status }: { status: TripStatus }) {
  const current = STEPS.findIndex((s) => s.status === status);
  return (
    <ol className="stepper">
      {STEPS.map((step, i) => (
        <li key={step.status} className={i < current ? "done" : i === current ? "active" : ""}>
          <span className="step-num">{i < current ? "✓" : i + 1}</span>
          {step.label}
        </li>
      ))}
    </ol>
  );
}
