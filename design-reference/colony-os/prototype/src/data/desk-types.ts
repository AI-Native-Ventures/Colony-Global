import type { EmployeeId, Person } from "./types";
export type DraftStatus = "waiting" | "approved" | "changes" | "declined" | "withdrawn" | "live" | "sent";
export interface DeskDraft {
  id: string;
  employee: EmployeeId;
  kind: string;
  title: string;
  text: string;
  status: DraftStatus;
  actor?: Person;
  note?: string;
  route: string;
  target?: string;
  policy?: string;
  pendingSent?: boolean;
}
export interface Campaign {
  id: string;
  name: string;
  goal: string;
  dates: string;
  status: "planned" | "running" | "behind" | "paused" | "done";
  actor?: Person;
  credits: number;
  tasks: { employee: EmployeeId; text: string; status: string; route: string }[];
}
export interface WeekNumbers { week: string; orders: number | null; money: number | null; followers: number | null; actor?: Person }
export interface Photo {
  id: string; name: string; url: string; type: string; ai: boolean; tags: string[];
  uses: number; excluded: boolean; actor: Person; added: string; waiting?: boolean; importError?: boolean;
}
export type LeadStage = "New" | "Contacted" | "Talking" | "Won" | "Lost";
export interface ContactLine { id: string; text: string; actor: Person | "Sipho" | "Grace"; time: string; image?: string; waiting?: boolean; incoming?: boolean }
export interface Lead {
  id: string; name: string; type: string; place: string; why: string; source: string;
  contact: string; email: string; phone: string; website: string; instagram: string;
  stage: LeadStage; next: string; due: string; draft: string; history: ContactLine[]; reason?: string;
}
export interface Customer {
  id: string; name: string; source: string; contact: string; email: string; phone: string;
  status: "To reply" | "Waiting on the customer" | "Done";
  hours: number; draft: string; history: ContactLine[]; decision?: "waiting" | "approved" | "declined";
  expectsReply: boolean; waiting?: boolean; ownReply?: string;
}
export interface Knowledge { id: string; category: "Policies" | "FAQ" | "Product facts"; title: string; text: string; approved: boolean; actor: Person; date: string }
export interface WebsiteState {
  version: number; previousVersion: number; banner: string; mode: "live" | "building" | "ready";
  status: "idle" | "publishing" | "failed"; token?: string;
  history: { id: string; title: string; actor: Person; version: number; previous: number; banner: string; undone?: boolean }[];
  shopifyDone: boolean;
  domain: { address: string; seller: string; phase: string; token?: string };
}
export interface DeskSnapshot {
  incoming?: {text:string; image?:string; name?:string; source?:string; customer?:string};
  drafts: Record<string, DeskDraft>;
  campaigns: Record<string, Campaign>;
  numbers: WeekNumbers[];
  ideas: Record<string, { status: "new" | "approved" | "parked"; actor?: Person }>;
  corrections: Record<string, { actor: Person; conversation: string; text: string }>;
  photos: Photo[];
  leads: Record<string, Lead>;
  targets: string;
  website: WebsiteState;
  customers: Record<string, Customer>;
  knowledge: Knowledge[];
  admin: Record<string, { status: string; actor?: Person }>;
}
