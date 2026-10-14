import type { Person } from "./types";

export type SettingsPerson = {
  name: string;
  email: string;
  photo?: string;
  theme: "system" | "light" | "dark";
  textSize: "default" | "large" | "larger";
};

export type NotificationChoices = {
  morning: boolean;
  friday: boolean;
  posts: boolean;
  customers: boolean;
  quiet: boolean;
  urgentThrough: boolean;
  sound: boolean;
  from: string;
  to: string;
};

export type SettingsSnapshot = {
  lastSection: Record<Person, string>;
  business: {
    name: string;
    sells: string;
    buyers: string;
    where: string;
    city: string;
    country: string;
    website: string;
    shop: string;
    email: string;
    phone: string;
    whatsapp: string;
    address: string;
    registeredName: string;
    registration: string;
    vat: string;
    banking: string;
    timeZone: string;
  };
  billing: {
    balance: number;
    autoTopUp: boolean;
    threshold: number;
    pack: number;
    monthlyLimit: number;
    cardSaved: boolean;
    checkout: number | null;
  };
  power: {
    choice: "credits" | "claude" | "chatgpt";
    fallback: boolean;
    connected: boolean;
  };
  connections: {
    forwarding: "not-set" | "waiting" | "confirmation" | "working";
    instagram: string;
    facebook: string;
    tiktok: string;
    linkedin: string;
    x: string;
  };
  people: {
    kagiso: boolean;
    invites: { email: string; invitedBy: Person; expires: string }[];
  };
  notifications: Record<Person, NotificationChoices>;
  running: {
    startWithComputer: boolean;
    stayAwake: boolean;
    computer: "here" | "elsewhere";
    restarting: boolean;
    pausedBy?: Person;
  };
  accounts: Record<Person, SettingsPerson>;
  help: { kind: "help" | "problem" | "feedback"; draft: string; includeDetails: boolean };
};

const notifications = (): NotificationChoices => ({
  morning: true,
  friday: true,
  posts: true,
  customers: true,
  quiet: true,
  urgentThrough: true,
  sound: true,
  from: "21:00",
  to: "07:00",
});

export const initialSettings = (): SettingsSnapshot => ({
  lastSection: { Lerato: "S-01", Kagiso: "S-01" },
  business: {
    name: "Lerato Designs",
    sells: "Women's clothing in natural linen and cotton, made in Johannesburg.",
    buyers: "Women aged 25 to 45 who like local, made-to-last clothing.",
    where: "Online, weekend pop-up markets",
    city: "Johannesburg",
    country: "South Africa",
    website: "leratodesigns.colony.site",
    shop: "https://shop.leratodesigns.co.za",
    email: "hello@leratodesigns.co.za",
    phone: "+27 11 555 0140",
    whatsapp: "",
    address: "Johannesburg, South Africa",
    registeredName: "Lerato Designs",
    registration: "",
    vat: "",
    banking: "",
    timeZone: "Africa/Johannesburg",
  },
  billing: {
    balance: 18.4,
    autoTopUp: false,
    threshold: 5,
    pack: 15,
    monthlyLimit: 4,
    cardSaved: false,
    checkout: null,
  },
  power: { choice: "credits", fallback: false, connected: false },
  connections: {
    forwarding: "not-set",
    instagram: "@leratodesigns",
    facebook: "",
    tiktok: "@leratodesigns",
    linkedin: "",
    x: "",
  },
  people: { kagiso: true, invites: [] },
  notifications: { Lerato: notifications(), Kagiso: notifications() },
  running: { startWithComputer: true, stayAwake: true, computer: "here", restarting: false },
  accounts: {
    Lerato: { name: "Lerato Mokoena", email: "lerato@leratodesigns.co.za", theme: "system", textSize: "default" },
    Kagiso: { name: "Kagiso Dlamini", email: "kagiso@leratodesigns.co.za", theme: "system", textSize: "default" },
  },
  help: { kind: "help", draft: "", includeDetails: false },
});
