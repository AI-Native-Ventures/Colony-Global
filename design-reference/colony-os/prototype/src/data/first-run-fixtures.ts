import type { EmployeeId } from "./types";

export type FirstRunIntent = "new" | "invite" | "other-computer" | "returning";
export type PowerChoice = "credits" | "claude" | "chatgpt";
export type BusinessAnswers = {
  owner: string;
  name: string;
  category: string;
  detail: string;
  buyers: string;
  channels: string[];
  links: string[];
  location: string;
  goals: string[];
  goalText: string;
  bestSellers: string;
  priceRange: string;
  tone: string;
};
export type FirstRunSnapshot = {
  intent: FirstRunIntent;
  email: string;
  lastEmail: string;
  termsAccepted: boolean;
  question: number;
  editingFromSummary: boolean;
  answers: BusinessAnswers;
  power: PowerChoice;
  pack: 5 | 15 | 50 | 120;
  checkout: "none" | "waiting" | "paid";
  connectedPlan: boolean;
  profileConfirmed: boolean;
  teamSelected: Record<EmployeeId, boolean>;
  teamNames: Record<EmployeeId, string>;
  teamHired: boolean;
  teamReady: boolean;
  partnerJoined: boolean;
  ownerNotificationPermission: boolean;
  partnerStartWithComputer: boolean;
  partnerNotificationPermission: boolean;
  movePower: "credits" | "plan";
  movedHere: boolean;
  returnTo: string;
};

export const firstRunEmployees: { id: EmployeeId; role: string; reportsTo: string; week: string; why: string; budget: number }[] = [
  { id: "Scout", role: "Chief of Staff", reportsTo: "Lerato", week: "Run your team and bring you the decisions that matter.", why: "One clear voice to keep your team together.", budget: 2 },
  { id: "Maya", role: "Growth Marketer", reportsTo: "Scout", week: "Shape a launch plan for the spring linen collection.", why: "She will keep the business focused on more customers and sales.", budget: 3 },
  { id: "Naledi", role: "Social Media Manager", reportsTo: "Maya", week: "Plan your spring linen posts and draft the first week.", why: "She will make the collection visible without posting alone.", budget: 5 },
  { id: "Sipho", role: "Sales Director", reportsTo: "Scout", week: "Find boutiques that fit Lerato Designs.", why: "He will look for stockists and larger orders.", budget: 3 },
  { id: "Leo", role: "Website Builder", reportsTo: "Scout", week: "Prepare a spring collection page for your review.", why: "He will keep your website current.", budget: 4 },
  { id: "Grace", role: "Customer Care and Admin", reportsTo: "Scout", week: "Organise customer questions and draft kind replies.", why: "She will help every customer get an answer.", budget: 2 },
];

export const initialFirstRun = (): FirstRunSnapshot => ({
  intent: "new",
  email: "",
  lastEmail: "lerato@leratodesigns.co.za",
  termsAccepted: false,
  question: 1,
  editingFromSummary: false,
  answers: {
    owner: "Lerato",
    name: "",
    category: "",
    detail: "",
    buyers: "",
    channels: [],
    links: [],
    location: "Johannesburg, South Africa",
    goals: [],
    goalText: "",
    bestSellers: "The linen dress, relaxed shirt and wide-leg trousers",
    priceRange: "R450 to R1,200",
    tone: "warm, confident, local",
  },
  power: "credits",
  pack: 50,
  checkout: "none",
  connectedPlan: false,
  profileConfirmed: false,
  teamSelected: { Scout: true, Maya: true, Naledi: true, Sipho: true, Leo: true, Grace: true },
  teamNames: { Scout: "Scout", Maya: "Maya", Naledi: "Naledi", Sipho: "Sipho", Leo: "Leo", Grace: "Grace" },
  teamHired: false,
  teamReady: false,
  partnerJoined: false,
  ownerNotificationPermission: true,
  partnerStartWithComputer: true,
  partnerNotificationPermission: true,
  movePower: "credits",
  movedHere: false,
  returnTo: "O-07",
});
