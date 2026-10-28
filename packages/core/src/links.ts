import type { ISODate } from "./types";

export type LinkCategory = "flights" | "stays" | "packages" | "transport" | "essentials";

export interface TravelLink {
  category: LinkCategory;
  provider: string;
  label: string;
  url: string;
}

export interface TripQuery {
  destination: string;
  start: ISODate;
  end: ISODate;
  travelers: number;
}

export const CATEGORY_LABELS: Record<LinkCategory, string> = {
  flights: "Flights",
  stays: "Hotels & stays",
  packages: "Travel packages",
  transport: "Getting around",
  essentials: "Before you go",
};

/**
 * Search links pre-filled with the confirmed trip, where the provider
 * supports it. Check-out is the trip's last day.
 */
export function buildTravelLinks({ destination, start, end, travelers }: TripQuery): TravelLink[] {
  const dest = encodeURIComponent(destination);
  const adults = Math.max(1, travelers);

  return [
    {
      category: "flights",
      provider: "Google Flights",
      label: `Flights to ${destination}`,
      url: `https://www.google.com/travel/flights?q=${encodeURIComponent(
        `Flights to ${destination} on ${start} through ${end}`,
      )}`,
    },
    {
      category: "flights",
      provider: "Skyscanner",
      label: "Compare airfares",
      url: "https://www.skyscanner.net/",
    },
    {
      category: "stays",
      provider: "Booking.com",
      label: `Hotels in ${destination}`,
      url: `https://www.booking.com/searchresults.html?ss=${dest}&checkin=${start}&checkout=${end}&group_adults=${adults}&no_rooms=1`,
    },
    {
      category: "stays",
      provider: "Airbnb",
      label: `Homes in ${destination}`,
      url: `https://www.airbnb.com/s/${dest}/homes?checkin=${start}&checkout=${end}&adults=${adults}`,
    },
    {
      category: "packages",
      provider: "Expedia",
      label: "Flight + hotel bundles",
      url: "https://www.expedia.com/Vacation-Packages",
    },
    {
      category: "packages",
      provider: "Expedia",
      label: `Hotels in ${destination} (bundle-ready)`,
      url: `https://www.expedia.com/Hotel-Search?destination=${dest}&startDate=${start}&endDate=${end}&adults=${adults}`,
    },
    {
      category: "packages",
      provider: "GetYourGuide",
      label: `Tours & activities in ${destination}`,
      url: `https://www.getyourguide.com/s/?q=${dest}`,
    },
    {
      category: "transport",
      provider: "Rentalcars.com",
      label: "Car rental",
      url: "https://www.rentalcars.com/",
    },
    {
      category: "transport",
      provider: "Google Maps",
      label: `Map of ${destination}`,
      url: `https://www.google.com/maps/search/?api=1&query=${dest}`,
    },
    {
      category: "essentials",
      provider: "Google",
      label: `Visa requirements for ${destination}`,
      url: `https://www.google.com/search?q=${encodeURIComponent(`visa requirements ${destination}`)}`,
    },
    {
      category: "essentials",
      provider: "Google",
      label: "Travel insurance options",
      url: `https://www.google.com/search?q=${encodeURIComponent(`group travel insurance ${destination}`)}`,
    },
  ];
}
