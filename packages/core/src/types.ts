/** A calendar day in ISO form, e.g. "2026-12-24". Always interpreted in UTC. */
export type ISODate = string;

export type TripStatus = "planning" | "dates_confirmed" | "finalized";

export interface User {
  id: string;
  name: string;
}

export interface Group {
  id: string;
  name: string;
  destination: string;
  inviteCode: string;
  ownerId: string;
  /** First and last day the group is considering for the trip. */
  windowStart: ISODate;
  windowEnd: ISODate;
  /** Desired trip length in days (inclusive of start and end day). */
  tripLength: number;
  status: TripStatus;
  confirmedStart: ISODate | null;
  confirmedEnd: ISODate | null;
  createdAt: string;
}

/** userId -> the days that user is available. */
export type AvailabilityMap = Record<string, ISODate[]>;

export interface GroupDetail extends Group {
  members: User[];
  availability: AvailabilityMap;
}

export interface TripDocument {
  id: string;
  groupId: string;
  uploaderId: string;
  uploaderName: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface CustomLink {
  id: string;
  groupId: string;
  label: string;
  url: string;
  addedBy: string;
  createdAt: string;
}
