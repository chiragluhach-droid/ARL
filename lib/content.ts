/**
 * All copy and company details live here.
 * Anything wrapped in [BRACKETS] is a placeholder to be replaced with real data.
 */

export const company = {
  short: "ARL",
  name: "Ahmedabad Roadlines",
  tagline: "Moving What Matters.",
  phone: "+91 99908 92600", // dummy number for the prototype
  email: "[hello@ahmedabadroadlines.in]",
  address: "[Street address], Ahmedabad, Gujarat",
  hours: "[Mon–Sat · 09:00–19:00 IST]",
  plate: "GJ 01 AR 0001", // decorative plate on the 3D truck — placeholder
  pickupFacility: "DELHI HUB", // placeholder facility labels on the 3D buildings
  destinationFacility: "MUMBAI DC",
};

export const nav = [
  { label: "Services", href: "#services" },
  { label: "Fleet", href: "#fleet" },
  { label: "Tracking", href: "#tracking" },
  { label: "About", href: "#about" },
];

export const services = [
  "Full Truck Load",
  "Part Truck Load",
  "Long Haul Transportation",
  "Dedicated Fleet",
  "Warehousing",
  "Real-Time Tracking",
];

export const fleet = "[Fleet details — vehicle types, capacities, count]";

/**
 * Prototype route along NH 48. Distances are approximate road distances and only
 * drive the on-screen odometer / route marker.
 */
export const route = {
  highway: "NH 48",
  totalKm: 1420,
  stops: [
    { name: "Delhi", km: 0, lat: 28.6139, lng: 77.209 },
    { name: "Jaipur", km: 270, lat: 26.9124, lng: 75.7873 },
    { name: "Ahmedabad", km: 940, lat: 23.0225, lng: 72.5714 },
    { name: "Vadodara", km: 1050, lat: 22.3072, lng: 73.1812 },
    { name: "Surat", km: 1200, lat: 21.1702, lng: 72.8311 },
    { name: "Mumbai", km: 1420, lat: 19.076, lng: 72.8777 },
  ],
};

/** About — company-supplied copy (kept verbatim; split into paragraphs for layout). */
export const about = {
  since: "Since",
  year: "1993",
  tagline: "One man. One truck.",
  // Lightly edited from the company-supplied text for flow and readability (same facts).
  lead: 'Ahmedabad Roadlines Pvt Ltd is an integrated logistics company that grew from a "One Man, One Truck" operation, founded by CMD Sh. Narain Dass Baweja in 1993.',
  body: [
    "Over the years, ARL has grown into one of India's leading logistics and supply chain solutions companies. It has been a long journey, and the reputation we have earned along the way rests on one constant focus: quality of service, efficiency, dependability and reliability.",
    "We understand how fast-moving the logistics business is, and we pair that with highly customised service — practical solutions that fit the way your business works. Every consignment is planned and executed as efficiently and precisely as possible.",
    "We continue to honour our commitments to every existing customer, while working tirelessly to widen and strengthen the network of businesses we serve.",
    "Today, the same care that went into that first truck runs through everything we do — from a single part load to a dedicated fleet, from the first pickup to the final handover at the dock.",
  ],
  today: ["Full Truck Load", "Part Truck Load", "Long Haul", "Dedicated Fleet", "Warehousing", "Real-Time Tracking"],
  photo: {
    src: "/images/about-truck.jpg",
    alt: "A vintage ARL truck parked in front of a warehouse loading yard",
    caption: "A journey built on people, trust and movement.",
  },
  stats: [
    { value: "25+", label: ["Years", "of service"] },
    { value: "Pan India", label: ["Network", "coverage"] },
    { value: "Integrated", label: ["Logistics &", "supply chain solutions"] },
  ],
};
