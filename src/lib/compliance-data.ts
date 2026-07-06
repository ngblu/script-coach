// Cold-calling compliance data — US federal + state rules and major countries.
// General guidance, not legal advice. Federal TCPA baseline: 8am-9pm local time,
// honor the National DNC Registry, no autodialed calls to cells without consent.

export interface ComplianceRule {
  code: string; // "US-TN", "CA", "UK"
  name: string;
  country: string;
  timezone: string; // representative IANA timezone
  allowedHoursStart: number; // local hour, 24h
  allowedHoursEnd: number;
  requiresRegistration: boolean;
  doNotCallRegistry: string;
  recordingConsent: "one-party" | "two-party";
  maxAttemptsPerDay: number | null;
  restrictedIndustries: string[];
  notes: string[];
}

// US federal baseline applies everywhere; states listed override/extend it.
export const US_FEDERAL_NOTES = [
  "TCPA: calls allowed 8:00 AM - 9:00 PM prospect's local time",
  "Check the National Do Not Call Registry (donotcall.gov) before dialing consumers",
  "B2B calls to business landlines are generally exempt from DNC, but state rules may still apply",
  "No prerecorded voice or autodialer to cell phones without prior express consent",
  "Identify yourself and your business at the start of the call",
];

const TWO_PARTY_STATES = new Set([
  "CA", "CT", "DE", "FL", "IL", "MD", "MA", "MI", "MT", "NV", "NH", "OR", "PA", "VT", "WA",
]);

const STATE_TZ: Record<string, string> = {
  AL: "America/Chicago", AK: "America/Anchorage", AZ: "America/Phoenix", AR: "America/Chicago",
  CA: "America/Los_Angeles", CO: "America/Denver", CT: "America/New_York", DE: "America/New_York",
  FL: "America/New_York", GA: "America/New_York", HI: "Pacific/Honolulu", ID: "America/Denver",
  IL: "America/Chicago", IN: "America/New_York", IA: "America/Chicago", KS: "America/Chicago",
  KY: "America/New_York", LA: "America/Chicago", ME: "America/New_York", MD: "America/New_York",
  MA: "America/New_York", MI: "America/New_York", MN: "America/Chicago", MS: "America/Chicago",
  MO: "America/Chicago", MT: "America/Denver", NE: "America/Chicago", NV: "America/Los_Angeles",
  NH: "America/New_York", NJ: "America/New_York", NM: "America/Denver", NY: "America/New_York",
  NC: "America/New_York", ND: "America/Chicago", OH: "America/New_York", OK: "America/Chicago",
  OR: "America/Los_Angeles", PA: "America/New_York", RI: "America/New_York", SC: "America/New_York",
  SD: "America/Chicago", TN: "America/Chicago", TX: "America/Chicago", UT: "America/Denver",
  VT: "America/New_York", VA: "America/New_York", WA: "America/Los_Angeles", WV: "America/New_York",
  WI: "America/Chicago", WY: "America/Denver",
};

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado",
  CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho",
  IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
  NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina",
  ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas",
  UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia",
  WI: "Wisconsin", WY: "Wyoming",
};

// Stricter-than-federal state specifics
const STATE_OVERRIDES: Record<string, Partial<ComplianceRule>> = {
  FL: {
    allowedHoursStart: 8,
    allowedHoursEnd: 20,
    maxAttemptsPerDay: 3,
    notes: [
      "Florida Telephone Solicitation Act (FTSA): calls 8 AM - 8 PM (stricter than federal 9 PM)",
      "Max 3 call attempts per 24 hours to the same number regarding the same subject",
      "Written consent required for autodialed sales calls",
    ],
  },
  OK: {
    maxAttemptsPerDay: 3,
    notes: [
      "Oklahoma Telephone Solicitation Act mirrors Florida: max 3 attempts per 24 hours",
      "Commercial calls require prior express written consent if autodialed",
    ],
  },
  TX: {
    requiresRegistration: true,
    notes: [
      "Texas requires telephone solicitor registration with the Secretary of State for some consumer sales (B2B largely exempt)",
      "Texas has its own state DNC list in addition to the federal registry",
    ],
  },
  LA: {
    requiresRegistration: true,
    notes: ["Louisiana requires telemarketer registration with the PSC for consumer solicitation"],
  },
  IN: {
    notes: [
      "Indiana has one of the strictest state DNC lists — check the Indiana DNC list separately",
      "No exemption for established business relationships on the Indiana list",
    ],
  },
  MS: {
    allowedHoursStart: 8,
    allowedHoursEnd: 20,
    notes: ["Mississippi limits solicitation calls to 8 AM - 8 PM local time"],
  },
  AL: {
    allowedHoursStart: 8,
    allowedHoursEnd: 20,
    notes: ["Alabama limits solicitation calls to 8 AM - 8 PM local time"],
  },
  SC: {
    allowedHoursStart: 8,
    allowedHoursEnd: 21,
    notes: ["South Carolina: 8 AM - 9 PM, mirrors federal but enforced at state level"],
  },
  TN: {
    notes: [
      "Tennessee follows federal TCPA baseline (8 AM - 9 PM)",
      "Tennessee Regulatory Authority manages a state DNC program — the federal registry covers it",
    ],
  },
};

function buildUSStates(): ComplianceRule[] {
  return Object.keys(STATE_NAMES).map((code) => {
    const override = STATE_OVERRIDES[code] || {};
    return {
      code: `US-${code}`,
      name: STATE_NAMES[code],
      country: "United States",
      timezone: STATE_TZ[code],
      allowedHoursStart: override.allowedHoursStart ?? 8,
      allowedHoursEnd: override.allowedHoursEnd ?? 21,
      requiresRegistration: override.requiresRegistration ?? false,
      doNotCallRegistry: "National DNC Registry (donotcall.gov)" + (code === "IN" ? " + Indiana state list" : code === "TX" ? " + Texas state list" : ""),
      recordingConsent: TWO_PARTY_STATES.has(code) ? "two-party" : "one-party",
      maxAttemptsPerDay: override.maxAttemptsPerDay ?? null,
      restrictedIndustries: [],
      notes: [...US_FEDERAL_NOTES, ...(override.notes || [])],
    };
  });
}

const COUNTRIES: ComplianceRule[] = [
  {
    code: "CA",
    name: "Canada",
    country: "Canada",
    timezone: "America/Toronto",
    allowedHoursStart: 9,
    allowedHoursEnd: 21,
    requiresRegistration: true,
    doNotCallRegistry: "National DNCL (lnnte-dncl.gc.ca) — registration required to access",
    recordingConsent: "one-party",
    maxAttemptsPerDay: null,
    restrictedIndustries: [],
    notes: [
      "CRTC rules: weekdays 9 AM - 9:30 PM, weekends 10 AM - 6 PM",
      "Telemarketers MUST register with the National DNCL operator before calling",
      "CASL applies to any electronic follow-up (email/SMS) — consent required",
    ],
  },
  {
    code: "UK",
    name: "United Kingdom",
    country: "United Kingdom",
    timezone: "Europe/London",
    allowedHoursStart: 8,
    allowedHoursEnd: 21,
    requiresRegistration: false,
    doNotCallRegistry: "TPS — Telephone Preference Service (tpsonline.org.uk)",
    recordingConsent: "one-party",
    maxAttemptsPerDay: null,
    restrictedIndustries: ["claims management (banned)", "pension cold calls (banned)"],
    notes: [
      "Screening against TPS and CTPS (corporate) is legally required",
      "PECR + UK GDPR govern B2B calling — corporate subscribers can still opt out",
      "Cold calls about pensions are illegal; claims management cold calls banned",
      "Display your number (no CLI withholding)",
    ],
  },
  {
    code: "AU",
    name: "Australia",
    country: "Australia",
    timezone: "Australia/Sydney",
    allowedHoursStart: 9,
    allowedHoursEnd: 20,
    requiresRegistration: false,
    doNotCallRegistry: "Do Not Call Register (donotcall.gov.au)",
    recordingConsent: "two-party",
    maxAttemptsPerDay: null,
    restrictedIndustries: [],
    notes: [
      "Weekdays 9 AM - 8 PM, Saturdays 9 AM - 5 PM, NO Sunday or public holiday calls",
      "Wash lists against the Do Not Call Register (30-day validity)",
      "Most states require all-party consent for recording",
    ],
  },
  {
    code: "DE",
    name: "Germany",
    country: "Germany",
    timezone: "Europe/Berlin",
    allowedHoursStart: 9,
    allowedHoursEnd: 20,
    requiresRegistration: false,
    doNotCallRegistry: "No central registry — express consent required instead",
    recordingConsent: "two-party",
    maxAttemptsPerDay: null,
    restrictedIndustries: [],
    notes: [
      "B2C cold calling WITHOUT prior express consent is ILLEGAL (UWG §7)",
      "B2B calls require at least presumed consent (genuine relevance to their business)",
      "Fines up to €300,000 for violations — this is one of the strictest markets",
    ],
  },
];

export const COMPLIANCE_RULES: ComplianceRule[] = [...buildUSStates(), ...COUNTRIES];

export function getRule(code: string): ComplianceRule | undefined {
  return COMPLIANCE_RULES.find((r) => r.code === code);
}

export function getUSStates(): ComplianceRule[] {
  return COMPLIANCE_RULES.filter((r) => r.code.startsWith("US-"));
}

export function getCountries(): ComplianceRule[] {
  return COMPLIANCE_RULES.filter((r) => !r.code.startsWith("US-"));
}

export type CallWindowStatus = "open" | "closing-soon" | "closed";

export function getCallWindowStatus(rule: ComplianceRule): {
  status: CallWindowStatus;
  localTime: string;
  message: string;
} {
  const now = new Date();
  const localHourStr = now.toLocaleString("en-US", {
    timeZone: rule.timezone,
    hour: "numeric",
    hour12: false,
  });
  const localTime = now.toLocaleString("en-US", {
    timeZone: rule.timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const hour = parseInt(localHourStr, 10);

  if (hour >= rule.allowedHoursStart && hour < rule.allowedHoursEnd) {
    if (hour >= rule.allowedHoursEnd - 1) {
      return { status: "closing-soon", localTime, message: "Window closes within the hour" };
    }
    return { status: "open", localTime, message: "OK to call now" };
  }
  return {
    status: "closed",
    localTime,
    message: `Calling window is ${rule.allowedHoursStart}:00 - ${rule.allowedHoursEnd}:00 local`,
  };
}

export function buildChecklist(rule: ComplianceRule): string[] {
  const items: string[] = [];
  items.push(`Verify the number is not on: ${rule.doNotCallRegistry}`);
  if (rule.requiresRegistration) {
    items.push("Confirm your telemarketer registration is current for this jurisdiction");
  }
  if (rule.recordingConsent === "two-party") {
    items.push("Two-party consent: announce recording and get agreement BEFORE recording");
  } else {
    items.push("One-party consent: you may record, but announcing it builds trust");
  }
  if (rule.maxAttemptsPerDay) {
    items.push(`Check attempt count: max ${rule.maxAttemptsPerDay} attempts per 24h to this number`);
  }
  items.push("Identify yourself and 555 Digital within the first few seconds");
  items.push("Honor any opt-out request immediately and log it");
  return items;
}
