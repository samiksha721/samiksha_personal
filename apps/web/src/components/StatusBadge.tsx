import type { TripStatus } from "@tripsync/core";

const LABELS: Record<TripStatus, string> = {
  planning: "Finding dates",
  dates_confirmed: "Dates confirmed",
  finalized: "Finalized",
};

export function StatusBadge({ status }: { status: TripStatus }) {
  return <span className={`badge badge-${status}`}>{LABELS[status]}</span>;
}
