export type EmployeeId =
  "Scout" | "Maya" | "Naledi" | "Sipho" | "Leo" | "Grace";
export type EmployeeStatus =
  | "Starting"
  | "Working"
  | "Free"
  | "Waiting on you"
  | "Paused"
  | "Stopped"
  | "Away"
  | "Hiring";
export interface Employee {
  name: EmployeeId;
  displayName?: string;
  role: string;
  reportsTo: string;
  status: EmployeeStatus;
  task: string;
  used: number;
  budget: number;
  waiting: number;
  next: string;
}
export type CardStatus =
  | "waiting"
  | "changes"
  | "approved"
  | "declined"
  | "ready"
  | "ready-send"
  | "posted"
  | "sent"
  | "live"
  | "expired"
  | "withdrawn"
  | "replaced"
  | "answered"
  | "hired"
  | "paid"
  | "fixed"
  | "chosen"
  | "skipped"
  | "ended"
  | "to-film"
  | "to-post"
  | "missed"
  | "more-asked"
  | "replied"
  | "customer-replied"
  | "scheduled"
  | "going-live"
  | "failed-live"
  | "undone"
  | "overdue"
  | "cancelled"
  | "accepted"
  | "not-accepted"
  | "not-now"
  | "open"
  | "restarting"
  | "still-failing"
  | "paused"
  | "new"
  | "read"
  | "shown";
export interface HistoryEntry {
  text: string;
  person: string;
  time: string;
}
export interface Card {
  id: string;
  type: string;
  employeePlan?: EmployeeId;
  employeeBudget?: number;
  employeeCredits?: number;
  title: string;
  summary: string;
  from: EmployeeId;
  status: CardStatus;
  arrived: string;
  conversation: string;
  ai: boolean;
  note?: string;
  answer?: string;
  postLink?: string;
  postWaiting?: boolean;
  scheduled: string;
  version: number;
  history: HistoryEntry[];
  planApprovals?: EmployeeId[];
  batchStatuses?: CardStatus[];
  batchNotes?: string[];
  batchActors?: string[];
  selectedOptions?: number[];
  completedShots?: number[];
  selectedLeads?: number[];
  removedLeads?: number[];
  amount?: string;
  displayName?: string;
  checkIn?: { orders: string; sales: string; followers: string; note: string };
  readBy?: Person[];
}
export interface Message {
  id: string;
  from: EmployeeId | "Lerato" | "Kagiso";
  text: string;
  time: string;
  status?: string;
  edited?: boolean;
  answered?: boolean;
  conversationId?: string;
  threadRoot?: string;
  event?: boolean;
  quote?: string;
  attachments?: Attachment[];
  voice?: VoiceNote;
  photoLibraryChoice?: "added" | "declined";
}
export type Person = "Lerato" | "Kagiso";
export interface Topic {
  id: string;
  title: string;
  summary: string;
  archived: boolean;
  renamedByPerson?: boolean;
  unread: Record<Person, boolean>;
  updatedAt: number;
  time: string;
  employees: EmployeeId[];
  work: string[];
  cardIds: string[];
  mediaCardIds?: string[];
  notice?: string;
  routing?: boolean;
  lastLine?: string;
}
export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  kind: "image" | "video" | "pdf" | "document";
  status?: "ready" | "uploading" | "failed" | "waiting";
  ai?: boolean;
  text?: string;
}
export interface VoiceNote {
  transcript: string;
  seconds: number;
  url: string;
  status: "ready" | "transcribing" | "failed";
  fixedBy?: Person;
}
export interface MessagePayload {
  attachments?: Attachment[];
  voice?: VoiceNote;
  quote?: string;
}
export interface WorkspaceReference {
  id: string;
  conversationId: string;
  kind: "link" | "browser";
  title: string;
  url: string;
}
export interface MockSnapshot {
  firstRun: import("./first-run-fixtures").FirstRunSnapshot;
  desks: import("./desk-types").DeskSnapshot;
  team: TeamSnapshot;
  settings: import("./settings-fixtures").SettingsSnapshot;
  cards: Record<string, Card>;
  messages: Message[];
  paused: boolean;
  topics: Record<string, Topic>;
  recentSearches: string[];
  recentTopics: string[];
  photoLibrary: string[];
  workspaceReferences: WorkspaceReference[];
}
export interface EmployeeProfile {
  displayName: string;
  avatar: EmployeeId;
  budget: number;
  lifecycle?: string;
  changedBy?: Person;
  retired?: boolean;
  tab: string;
  setup?: "starting" | "failed" | "done" | "cancelled";
  restartToken?: string;
}
export interface Routine {
  id: string;
  name: string;
  days: string;
  time: string;
  next: string;
  last: string;
  on: boolean;
  changedBy?: Person;
}
export interface EmployeePlan {
  status: "waiting" | "approved" | "changes" | "withdrawn" | "not-ready";
  actor: Person;
  note?: string;
  reviewed?: boolean;
}
export interface TeamEvent {
  id: string;
  employee: EmployeeId;
  text: string;
  actor: Person;
  category: "Results" | "Decisions" | "Problems";
}
export interface TeamSnapshot {
  profiles: Record<EmployeeId, EmployeeProfile>;
  routines: Record<EmployeeId, Routine[]>;
  plans: Record<EmployeeId, EmployeePlan>;
  events: TeamEvent[];
}
export interface StateEntry {
  key: string;
  label: string;
}
export interface ScreenEntry {
  id: string;
  name: string;
  slug: string;
  defaultState: string;
  forms: string[];
  states: StateEntry[];
}
export type Destination = (
  id: string,
  state?: string,
  params?: Record<string, string>,
) => void;
