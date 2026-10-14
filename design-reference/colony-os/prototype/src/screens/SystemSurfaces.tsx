import { useState } from "react";
import { ArrowRight, Bell, Check, ChevronRight, CircleHelp, Command, Monitor, Moon, Sun, X } from "lucide-react";
import { mockStore, useMock } from "../data/mock-store";
import type { Destination } from "../data/types";
import { AntMark, Avatar, Banner, Button } from "../components/primitives";
import "../system-surfaces.css";

type Link = { label: string; to?: string; next?: string; note?: string };
type Scenario = { title: string; body: string; detail?: string; links?: Link[] };
const go = (onDestination: Destination, id: string, state?: string) => onDestination(id, state);

export const bannerCatalogue: { id: string; title: string; owner: string; partner?: string; action?: string; to?: string; secondary?: string }[] = [
  { id: "G-04a", title: "Team stopped", owner: "Your team has stopped. Restart it to carry on.", action: "Restart team", to: "X-10" },
  { id: "G-04b", title: "Scout stopped", owner: "Scout has stopped, so nobody is running your team.", action: "Restart Scout", to: "X-09" },
  { id: "G-04c", title: "Credits out", owner: "Your team is paused: credits ran out.", partner: "Your team is paused: credits ran out. Only Lerato can buy credits.", action: "Buy credits", to: "S-02" },
  { id: "G-04d", title: "Plan limit", owner: "Your team is paused until 14:00: your Claude plan reached its limit.", partner: "Your team is paused until 14:00: Lerato's Claude plan reached its limit.", action: "Use credits until then", to: "X-06" },
  { id: "G-04e", title: "Plan disconnected", owner: "Your team can't reach your Claude plan. Sign in again to carry on.", partner: "Your team can't reach Lerato's Claude plan. Lerato needs to sign in again on Lerato's MacBook Air.", action: "Sign in again", to: "S-03" },
  { id: "G-04f", title: "Offline", owner: "You're offline. Your team waits until you're back.", action: "Try again", to: "X-01" },
  { id: "G-04g", title: "Colony unreachable", owner: "Colony isn't answering right now. Your team will catch up when it's back.", action: "Try again", to: "X-02" },
  { id: "G-04h", title: "Team computer off", owner: "Your team is waiting: Lerato's MacBook Air has been off since 18:40.", action: "Move team here", to: "X-13" },
  { id: "G-04i", title: "Paused by a person", owner: "Your team is paused. Kagiso paused it at 15:20.", action: "Resume team", to: "X-22" },
  { id: "G-04j", title: "Website paused", owner: "Your website is paused: the hosting payment didn't go through.", partner: "Your website is paused: the hosting payment didn't go through. Only Lerato can update the payment.", action: "Update payment", to: "S-02" },
  { id: "G-04k", title: "Credits low", owner: "Credits are low: about 2 days left at this week's pace.", action: "Buy credits", to: "S-02", secondary: "Not now" },
  { id: "G-04l", title: "Update ready", owner: "A new version of Colony is available. Download it to update.", action: "Download update", to: "W-02", secondary: "Later" },
  { id: "G-04m", title: "Notifications off", owner: "Notifications are off, so you'll only see decisions while Colony is open.", action: "Turn on", to: "X-20", secondary: "Not now" },
  { id: "G-04n", title: "Images paused", owner: "Credits ran out, so AI-made images are paused. Your team keeps working.", partner: "Credits ran out, so AI-made images are paused. Only Lerato can buy credits.", action: "Buy credits", to: "S-02", secondary: "Not now" },
  { id: "G-04o", title: "Disk almost full", owner: "This computer is almost out of space. Colony needs at least 1 GB free to keep your team working.", action: "Open storage settings", to: "X-21" },
  { id: "G-04p", title: "Terms updated", owner: "We updated our terms. Here's what changed.", action: "See what changed", to: "W-04", secondary: "OK" },
];

const notifications: { key: string; from: string; body: string; to: string; state?: string }[] = [
  { key: "decision", from: "Scout", body: "Naledi's posts for next week are ready for your OK.", to: "C-05" },
  { key: "several-decisions", from: "Scout", body: "3 things need you: posts, a website change and a reply to Thabo.", to: "T-05" },
  { key: "employee-problem", from: "Scout", body: "Sipho has stopped working. Want me to restart him?", to: "C-18" },
  { key: "scout-stopped", from: "Colony", body: "Scout has stopped, so nobody is running your team. Open Colony to restart Scout.", to: "X-09" },
  { key: "team-stopped", from: "Colony", body: "Your team has stopped. Open Colony to restart it.", to: "X-10" },
  { key: "team-paused", from: "Colony", body: "Your team is paused: credits ran out. Buy credits to carry on.", to: "X-05" },
  { key: "credits-low", from: "Colony", body: "Credits are running low: about 2 days left.", to: "S-02" },
  { key: "morning-brief", from: "Scout", body: "Morning, Lerato. 2 things need you today.", to: "T-01" },
  { key: "friday-wrap", from: "Scout", body: "Friday wrap: 14 things done this week, 1 needs you.", to: "T-01" },
  { key: "time-to-post", from: "Scout", body: "Time to post Naledi's spring linen carousel on Instagram.", to: "C-05", state: "time-to-post" },
  { key: "customer-waiting", from: "Scout", body: "Thabo has waited a day for a reply. Grace's draft is ready.", to: "C-09" },
  { key: "reply-to-you", from: "Scout", body: "Done. The price list is in Spring launch.", to: "T-03" },
  { key: "team-moved", from: "Colony", body: "Your team now runs on Kagiso's laptop.", to: "X-13" },
];

const system: Record<string, Scenario & { states?: Record<string, Partial<Scenario>> }> = {
  "X-01": { title: "You're offline", body: "Your team waits until you're back.", detail: "You can read and type. Messages send when you're back.", links: [{ label: "Try again", next: "back-online" }], states: { "offline-a-while": { title: "Offline since 09:14", body: "You can read and type. Messages send when you're back." }, "messages-waiting": { body: "2 messages will send when you're back." }, "back-online": { title: "Back online", body: "2 waiting messages sent.", links: [{ label: "See Today", to: "T-01" }] } } },
  "X-02": { title: "Colony isn't answering right now", body: "Your work is safe, and we'll keep trying.", links: [{ label: "Try now", next: "back" }], states: { longer: { title: "Still trying", body: "Your team picks up as soon as Colony answers." }, back: { title: "Connected again", body: "Your team is catching up.", links: [{ label: "See Today", to: "T-01" }] } } },
  "X-03": { title: "While you were away", body: "Your team was off from 06:40 to 09:20 because Lerato's MacBook Air was asleep.", detail: "Catching up on 3 things: the morning brief, 2 customer emails and Naledi's posts. The 08:30 brief came at 09:21.", links: [{ label: "Keep my team running", to: "S-07" }, { label: "Open Needs you", to: "T-05" }], states: { "caught-up": { title: "All caught up", body: "Your team has checked what arrived while it was off." }, "long-time-off": { body: "Your team was off for 4 days. Scout is checking what matters most first." }, "nothing-missed": { title: "Nothing missed", body: "Your team is up to date.", links: [{ label: "See Today", to: "T-01" }] } } },
  "X-04": { title: "Credits are low", body: "Credits are low: $3.10 left, about 2 days at this pace.", detail: "Buy $15 now, or turn on auto top-up so this doesn't happen again.", links: [{ label: "Buy credits", to: "S-02" }, { label: "Turn on auto top-up", to: "S-02" }, { label: "Not now", note: "We'll remind you tomorrow." }], states: { partner: { body: "Credits are low. Only Lerato can buy more.", links: [{ label: "Let Lerato know", note: "We let Lerato know." }] }, "auto-top-up-failed": { body: "Auto top-up didn't go through: your card was declined.", links: [{ label: "Update card", to: "W-05" }] }, "auto-top-up-limit": { body: "Auto top-up has bought credits 4 times this month.", links: [{ label: "Buy credits", to: "S-02" }] } } },
  "X-05": { title: "Out of credits", body: "Your team is paused until you add more.", detail: "Nothing is lost. Everyone picks up where they stopped.", links: [{ label: "Buy credits", to: "S-02" }, { label: "Use my own plan instead", to: "S-03" }], states: { partner: { body: "Out of credits. Only Lerato can buy more. We let Lerato know.", links: [{ label: "Let Lerato know", note: "We let Lerato know." }] }, "own-plan": { body: "AI-made images are paused. Everything else keeps running on your Claude plan." }, "waiting-payment": { body: "Finish paying in your browser.", links: [{ label: "See payment", to: "W-05" }] }, resumed: { title: "Your team is back to work", body: "Everyone picks up where they stopped.", links: [{ label: "See catch-up", to: "X-03" }] } } },
  "X-06": { title: "Your Claude plan hit its limit", body: "It resets at 14:00, and your team waits until then.", links: [{ label: "Use credits until 14:00", next: "using-credits" }, { label: "Wait", note: "We'll check again at 14:00." }], states: { unknown: { body: "Your team tries again every 30 minutes." }, "using-credits": { title: "Using credits until your Claude plan resets at 14:00", body: "Your team keeps working." }, "plan-back": { title: "Your Claude plan is back", body: "Your team is using it again." }, partner: { body: "Only Lerato can switch to credits.", links: [{ label: "Wait", note: "We'll check the plan again." }] } } },
  "X-07": { title: "Your Claude plan is signed out", body: "Sign in again on this computer to keep your team working.", links: [{ label: "Sign in again", next: "signing-in" }, { label: "Use credits instead", to: "S-03" }], states: { "other-computer": { body: "Sign in again on Lerato's MacBook Air, where your team runs.", links: [{ label: "See how your team is powered", to: "S-03" }] }, "signing-in": { title: "Signing in to your Claude plan", body: "Finish in your browser, then come back to Colony.", links: [{ label: "Show sign-in result", next: "fixed" }] }, "sign-in-failed": { title: "Signing in didn't finish", body: "Try again, or use credits for now." }, fixed: { title: "Signed in", body: "Your team is back to work." } } },
  "X-08": { title: "Naledi stopped", body: "Naledi stopped while drafting next week's posts. I restarted Naledi once and it happened again.", detail: "The rest of your team keeps working.", links: [{ label: "Restart Naledi", next: "restarting" }, { label: "Pause Naledi", to: "M-06" }, { label: "Ask Scout", to: "T-03" }], states: { restarting: { title: "Restarting Naledi", body: "Naledi is picking up where things stopped.", links: [{ label: "Show result", next: "back" }] }, back: { title: "Naledi is back", body: "Naledi is picking up where things stopped." }, "still-failing": { title: "Restarting didn't help", body: "Send us the details so we can fix it?", links: [{ label: "Get help", to: "S-09" }] }, paused: { title: "Paused by Lerato", body: "Naledi stays paused until you resume her.", links: [{ label: "Employee settings", to: "M-06" }] } } },
  "X-09": { title: "Scout stopped", body: "Your team keeps working, and decisions come straight to you until Scout is back.", links: [{ label: "Restart Scout", next: "restarting" }, { label: "Get help", to: "S-09" }], states: { restarting: { title: "Restarting Scout", body: "Other employees keep working.", links: [{ label: "Show result", next: "back" }] }, back: { title: "Scout is back", body: "Scout is catching up." }, "still-failing": { body: "Restarting didn't help. Get help from the Colony team.", links: [{ label: "Get help", to: "S-09" }] } } },
  "X-10": { title: "Your team stopped", body: "Restart it to get everyone back to work.", links: [{ label: "Restart the team", next: "restarting" }, { label: "Get help", to: "S-09" }], states: { "other-computer": { body: "Your team stopped on Lerato's MacBook Air. Restart it there, or move the team here.", links: [{ label: "Move team here", to: "X-16" }] }, restarting: { body: "Restarting your team. This takes about a minute.", links: [{ label: "Show result", to: "T-01" }] }, "restart-failed": { body: "Restarting didn't work. Quit Colony and open it again. If that doesn't help, send us the details.", links: [{ label: "Get help", to: "S-09" }] } } },
  "X-11": { title: "An update is ready", body: "Restart Colony to finish. Your team pauses for about a minute.", links: [{ label: "Restart to update", next: "updating" }, { label: "Later", note: "We'll remind you tomorrow." }], states: { required: { title: "Update Colony to keep going", body: "Your team waits until it's done.", links: [{ label: "Update now", next: "updating" }] }, updating: { title: "Updating Colony", body: "This takes about a minute.", links: [{ label: "Show result", next: "updated" }] }, failed: { title: "Couldn't update", body: "Try again, or download the latest version from colony.global.", links: [{ label: "Try again", next: "updating" }, { label: "Download the latest version", to: "W-02" }] }, updated: { title: "Updated to Colony 2.0.4", body: "Your team is back to work." }, "mac-launch": { title: "A new version of Colony is available", body: "Download it to update. Your team keeps working until you quit to install it.", links: [{ label: "Download update", to: "W-02" }, { label: "Later", note: "We'll remind you tomorrow." }] } } },
  "X-12": { title: "You signed out", body: "Sign in to carry on.", links: [{ label: "Sign in", to: "O-01" }, { label: "Get help", note: "Open your email app to contact Colony support." }], states: { removed: { title: "Lerato removed you from Lerato Designs", body: "You no longer have access to this company." }, left: { title: "You left Lerato Designs", body: "Lerato can invite you again later." }, "company-closed": { title: "Lerato Designs was closed", body: "The team has stopped." }, "missing-sign-in": { title: "We couldn't find your sign-in on this computer", body: "Sign in again. Nothing is lost." } } },
  "X-13": { title: "Your team is off", body: "Lerato's MacBook Air has been asleep since 22:10.", detail: "3 decisions and 2 customer emails are waiting.", links: [{ label: "Move team here", to: "N-02" }, { label: "Not now", note: "We'll check again later." }], states: { moving: { title: "Moving your team", body: "Stopping there and starting here.", links: [{ label: "See move", to: "N-02" }] }, moved: { title: "Your team now runs on Kagiso's laptop", body: "The old computer shows everything but no longer runs the team." }, "computer-back": { title: "Your team computer is back", body: "Your team is working again." }, "old-computer": { title: "Your team moved to Kagiso's laptop", body: "It no longer runs here." } } },
  "X-14": { title: "The window can close", body: "Your team keeps working while the window is closed. Find Colony in the menu bar.", detail: "Quitting Colony stops your team.", links: [{ label: "Got it", to: "T-01" }, { label: "Quit instead", to: "X-15" }], states: { "team-windows": { body: "Your team keeps working while the window is closed. Find Colony in the tray, next to the clock." }, "other-mac": { body: "Colony stays in the menu bar so you still get notifications." }, "other-windows": { body: "Colony stays in the tray so you still get notifications." } } },
  "X-15": { title: "Quit Colony?", body: "Your team stops until you open Colony again.", detail: "Naledi is drafting 3 posts. They'll be finished after you open Colony again.", links: [{ label: "Keep working", to: "T-01" }, { label: "Quit Colony", next: "shutting-down" }], states: { "other-computer": { title: "Colony closes on this computer", body: "Your team keeps working on Lerato's MacBook Air.", links: [{ label: "Open Colony", to: "T-01" }] }, "shutting-down": { title: "Colony closed", body: "Your team starts again when you open Colony.", links: [{ label: "Open Colony", to: "N-01" }] } } },
  "X-16": { title: "Move your team to this computer?", body: "Your team stops on Lerato's MacBook Air and starts here.", detail: "Keep this computer on and connected so everyone can work.", links: [{ label: "Keep it there", to: "S-07" }, { label: "Move team here", to: "N-02" }], states: { working: { title: "Moving your team", body: "Stopping there and starting here." }, done: { title: "Your team moved", body: "It is starting on this computer." }, failed: { title: "The move didn't finish", body: "Your team is safe on the old computer. Try again.", links: [{ label: "Try again", next: "asking" }] } } },
  "X-17": { title: "Nothing needs you right now", body: "Scout brings decisions here.", links: [{ label: "New conversation", to: "T-04" }], states: { filled: { title: "Decisions arrived", body: "Scout has brought new work to Needs you.", links: [{ label: "Open Needs you", to: "T-05" }] } } },
  "X-18": { title: "Loading", body: "The last known content stays visible while Colony updates.", states: { placeholders: { body: "Updating" }, long: { title: "Still loading", body: "Check your internet if this keeps going." }, "very-long": { title: "This is taking longer than usual", body: "You can leave this screen. We'll tell you when it's done." }, done: { title: "Loaded", body: "Your work is ready.", links: [{ label: "See Today", to: "T-01" }] } } },
  "X-19": { title: "Leo couldn't make the change live", body: "Your site still shows the old version.", links: [{ label: "Try again", to: "C-10" }], states: { repeated: { body: "Your site still shows the old version. We can help if this keeps happening.", links: [{ label: "Try again", to: "C-10" }, { label: "Get help", to: "S-09" }] }, fixed: { title: "The change is live", body: "Your site is showing the new spring page.", links: [{ label: "See the website", to: "W-08" }] } } },
  "X-20": { title: "Allow notifications", body: "Allow notifications so decisions reach you right away.", links: [{ label: "Continue", next: "explaining" }], states: { explaining: { body: "Colony will ask your computer for permission. You can change this later.", links: [{ label: "Show allowed", next: "allowed" }, { label: "Show denied", next: "denied" }] }, allowed: { title: "Notifications allowed", body: "Decisions can reach you while Colony is open or closed." }, denied: { title: "Notifications are off for Colony on this computer", body: "Turn them on in your computer's settings.", links: [{ label: "Open notification settings", note: "Find Colony, then turn on Allow notifications." }, { label: "Type instead", to: "T-03" }] }, "no-device": { title: "No microphone found", body: "Plug one in, or type instead.", links: [{ label: "Type instead", to: "T-03" }] }, "device-busy": { title: "Your microphone is busy in another app", body: "Close it and try again, or type instead.", links: [{ label: "Type instead", to: "T-03" }] }, microphone: { title: "Colony needs your microphone for voice notes", body: "Nothing is recorded until you press record.", links: [{ label: "Continue", next: "microphone-denied" }, { label: "Type instead", to: "T-03" }] }, "microphone-denied": { title: "The microphone is off for Colony", body: "Turn it on in your computer's settings, or type instead.", links: [{ label: "Open microphone settings", note: "Find Colony in your computer's microphone settings." }, { label: "Type instead", to: "T-03" }] }, "restart-needed": { title: "Restart Colony to use the microphone", body: "The computer has allowed it. Colony needs to reopen.", links: [{ label: "Restart Colony", next: "allowed" }] } } },
  "X-21": { title: "Colony needs macOS 12 or newer", body: "This Mac has macOS 11.", links: [{ label: "How to update your computer", note: "Open this computer's update settings." }], states: { "old-windows": { title: "Colony needs Windows 10 or newer", body: "Update Windows to use Colony." }, "already-open": { title: "Colony is already open", body: "Your open window comes to the front.", links: [{ label: "Open Colony", to: "T-01" }] }, "not-responding": { title: "Colony is already open but not responding", body: "Close it and try again?", links: [{ label: "Close the other Colony", next: "already-open" }] }, "disk-low": { title: "This computer is almost out of space", body: "Colony needs at least 1 GB free to keep your team working.", links: [{ label: "Open storage settings", note: "Open this computer's storage settings." }] }, "team-paused": { title: "Team paused: not enough space", body: "Free up 1 GB so your team can keep its work safely.", links: [{ label: "Open storage settings", note: "Open this computer's storage settings." }] } } },
  "X-22": { title: "Team paused by Kagiso at 14:02", body: "Nothing new starts until someone resumes.", links: [{ label: "Resume", next: "resuming" }], states: { resuming: { title: "Resuming your team", body: "Everyone is picking up where they stopped.", links: [{ label: "Show result", next: "resumed" }] }, resumed: { title: "Your team is back to work", body: "Missed routines run once when they are still useful." }, "long-time": { title: "Your team has been paused since yesterday at 14:02", body: "Resume when you're ready.", links: [{ label: "Resume", next: "resuming" }] } } },
};

const empties: [string,string,string][] = [
  [
    "T-01 Today, Needs you part",
    "Nothing needs you right now.",
    "none"
  ],
  [
    "T-01 Today, before the first brief",
    "Your first brief arrives tomorrow at 08:30.",
    "none"
  ],
  [
    "T-02 Conversation list",
    "No conversations yet. Tell Scout what you want to work on.",
    "New conversation"
  ],
  [
    "T-02 Archived conversations",
    "Nothing archived.",
    "none"
  ],
  [
    "T-05 Needs you",
    "Nothing needs you. Scout brings decisions here.",
    "none"
  ],
  [
    "T-05 Needs you, history",
    "Decisions you make show up here.",
    "none"
  ],
  [
    "T-06 Search, no results",
    "Nothing found for \"linen dress\". Try another word.",
    "none"
  ],
  [
    "T-08 Photo picker, no photos yet",
    "No photos yet. Add some from your computer.",
    "Add from computer"
  ],
  [
    "M-01 Team, nobody on it",
    "No one on your team. Ask Scout to hire someone.",
    "Message Scout"
  ],
  [
    "M-03 Plan tab, before the first plan",
    "Naledi is writing a 2-week plan. You'll get it to approve.",
    "none"
  ],
  [
    "M-04 Schedule tab",
    "No routines yet.",
    "none"
  ],
  [
    "M-05 Activity tab",
    "Nothing yet. Naledi's work shows up here.",
    "none"
  ],
  [
    "M-07 Direct chat, new",
    "Say hi to Naledi, or ask about anything on Naledi's desk.",
    "none"
  ],
  [
    "D-01 Brief history",
    "Briefs collect here, starting tomorrow at 08:30.",
    "none"
  ],
  [
    "D-01 Handled by Scout alone",
    "Nothing handled by Scout alone yet.",
    "none"
  ],
  [
    "D-01 Company plan, before approval",
    "Scout is putting the team's plans together.",
    "none"
  ],
  [
    "D-02 Campaigns",
    "No campaigns yet. Maya is planning the first one.",
    "none"
  ],
  [
    "D-02 Ideas",
    "No ideas waiting.",
    "none"
  ],
  [
    "D-02 Numbers",
    "Numbers arrive after your first Thursday check-in.",
    "none"
  ],
  [
    "D-03 Content calendar",
    "No posts planned yet. Naledi is drafting the first week.",
    "none"
  ],
  [
    "D-03 Ready to post",
    "Nothing to post right now.",
    "none"
  ],
  [
    "D-03 Brand kit, not ready",
    "Naledi is putting your brand kit together.",
    "none"
  ],
  [
    "D-03 Photo library",
    "Add product photos so Naledi and Leo can use them.",
    "Add photos"
  ],
  [
    "D-04 Deals",
    "No leads yet. Sipho looks for new leads every Tuesday.",
    "none"
  ],
  [
    "D-04 Today's follow-ups",
    "No follow-ups today.",
    "none"
  ],
  [
    "D-04 Target customers",
    "Sipho is choosing who to look for first.",
    "none"
  ],
  [
    "D-05 No website yet",
    "No website yet. Leo is building the first version.",
    "none"
  ],
  [
    "D-05 Changes waiting",
    "No changes waiting.",
    "none"
  ],
  [
    "D-05 History",
    "Nothing has gone live yet.",
    "none"
  ],
  [
    "D-05 Visits",
    "Visits show up once your site is live.",
    "none"
  ],
  [
    "D-06 Customer messages",
    "No customer messages yet. Forward your customer emails to Grace to start.",
    "Set up forwarding (S-04)"
  ],
  [
    "D-06 Knowledge",
    "Grace is writing your FAQ and policies.",
    "none"
  ],
  [
    "D-06 Admin list",
    "Nothing on the admin list.",
    "none"
  ],
  [
    "S-02 Payment history",
    "No payments yet.",
    "none"
  ],
  [
    "S-04 Social accounts",
    "Add your Instagram so Naledi can open it for you at posting time.",
    "Add account"
  ],
  [
    "S-05 Partners",
    "Just you for now. Invite a partner to share the work.",
    "Invite"
  ]
];

const confirmations = [
  ["Let Naledi go?", "Naledi stops now, and Naledi's routines stop. Drafts, posts and photos stay where they are.", "Let Naledi go", "Keep Naledi"],
  ["Remove Kagiso from Lerato Designs?", "Kagiso loses access right away. Decisions Kagiso made keep Kagiso's name.", "Remove Kagiso", "Keep Kagiso"],
  ["Cancel the invite for sizwe@leratodesigns.co.za?", "The invite link stops working. You can invite Sizwe again later.", "Cancel invite", "Keep invite"],
  ["Close Lerato Designs?", "Your team stops now. Everything in Colony is deleted after 30 days. Partners lose access and the website goes offline. Unused credits can't be refunded in the app. This can't be undone.", "Close Lerato Designs", "Keep my company"],
  ["Move your team to this computer?", "Your team stops on Lerato's MacBook Air and starts here. Keep this computer on and connected.", "Move team here", "Keep it there"],
  ["Sign out and stop your team?", "Your team stops here until someone signs in again or moves it.", "Sign out and stop team", "Stay signed in"],
  ["Quit Colony?", "Your team stops until you open Colony again.", "Quit Colony", "Keep working"],
  ["Disconnect your Claude plan?", "Your team switches to Colony credits ($18.40 left).", "Disconnect", "Keep connected"],
  ["Turn off auto top-up?", "When credits run out, your team pauses until you buy more.", "Turn off", "Keep it on"],
  ["Put your website back to how it was?", "Leo keeps the spring banner change as a draft.", "Put it back", "Keep it live"],
  ["Stop using leratodesigns.co.za?", "Your website stays at leratodesigns.colony.site.", "Remove domain", "Keep domain"],
  ["End Spring launch now?", "Naledi, Leo and Sipho stop their spring tasks. Maya writes up what it achieved.", "End campaign", "Keep it running"],
  ["Cancel hiring Leo?", "Leo stops setting up and is removed. No more credits are used for Leo.", "Cancel hire", "Keep Leo"],
  ["Turn off plan check?", "Naledi won't send new plans until you turn it back on.", "Turn off", "Keep it on"],
  ["Delete this photo?", "It's used in 2 posts. Those posts keep their own copy.", "Delete photo", "Keep photo"],
] as const;
const problemExamples: { title: string; body: string; fix: string; to: string }[] = [
  { title: "Payment cancelled", body: "Nothing was charged.", fix: "Try again", to: "W-05" },
  { title: "Your card was declined", body: "Auto top-up didn't run. Your team keeps going until credits run out.", fix: "Update card", to: "W-05" },
  { title: "This photo is too big to send", body: "Photos can be up to 50 MB.", fix: "Choose another photo", to: "T-08" },
  { title: "We couldn't send the invite to sizwe@leratodesigns.co.za", body: "Check the address and try again.", fix: "Try again", to: "S-05" },
  { title: "Leo couldn't make the new spring page live", body: "Your site still shows the old version.", fix: "Try again", to: "C-10" },
  { title: "Signing in to your Claude plan didn't finish", body: "Try again, or use credits for now.", fix: "Try again", to: "S-03" },
];

export function SystemSurface({ id, state, platform, partner, onDestination, onNotice }: { id: string; state: string; platform: string; partner: boolean; onDestination: Destination; onNotice: (message: string) => void }) {
  const snapshot = useMock();
  const [caseIndex, setCaseIndex] = useState(0);
  const [typedName, setTypedName] = useState("");
  const [activeEmpty, setActiveEmpty] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(true);
  const banner = bannerCatalogue.find(item => item.id === id) || bannerCatalogue[0];
  const scenario = system[id];
  const copy = scenario ? { ...scenario, ...(scenario.states?.[state] || {}) } : null;
  const run = (link: Link) => { if (link.to) go(onDestination, link.to); else if (link.next) go(onDestination, id, link.next); else if (link.note) onNotice(link.note); };
  if (id === "G-02") return <main className="system-page" data-product-ui><div className="system-top"><span className="eyebrow">This computer</span><h1>{platform === "windows" ? "Colony in the tray" : "Colony in the menu bar"}</h1><p>The window can close while your team keeps working.</p></div><div className="native-preview"><div className="native-bar"><button onClick={() => platform === "windows" ? go(onDestination,"G-01") : setMenuOpen(value => !value)} onContextMenu={event => {event.preventDefault();setMenuOpen(true);}} aria-expanded={menuOpen} aria-label="Open Colony menu"><AntMark/> <span>{state === "needs-you" ? "2" : ""}</span></button><span>{platform === "windows" ? "09:41 · Tuesday" : "Tue 09:41"}</span></div>{menuOpen && <div className="native-menu" role="menu" aria-label="Colony menu" onKeyDown={event => {if (!["ArrowDown","ArrowUp","Home","End"].includes(event.key)) return; const items=[...event.currentTarget.querySelectorAll<HTMLButtonElement>("[role^=menuitem]:not(:disabled)")]; const current=items.indexOf(document.activeElement as HTMLButtonElement); const next=event.key==="Home"?0:event.key==="End"?items.length-1:event.key==="ArrowDown"?(current+1)%items.length:(current-1+items.length)%items.length; items[next]?.focus();event.preventDefault();}}><div className="native-menu-header"><strong>Lerato Designs</strong><span>{state === "offline" ? "You're offline" : state === "signed-out" ? "Signed out" : state === "first-run" ? "Finish setting up" : state === "other-computer" ? "Team runs on Lerato's MacBook Air" : snapshot.paused || state === "paused" ? "Team paused" : state === "problem" ? "Team needs help" : "Team working"}</span></div>{state === "signed-out" ? <button role="menuitem" onClick={() => go(onDestination,"O-01")}>Sign in</button> : state === "first-run" ? <button role="menuitem" onClick={() => go(onDestination,"O-03")}>Open Colony</button> : <><button role="menuitem" onClick={() => go(onDestination,"T-05")}>Needs you (2)</button><button role="menuitem" onClick={() => go(onDestination,"T-04")}>Message Scout</button><button role="menuitem" onClick={() => go(onDestination,"G-01")}>Open Colony</button><div className="native-menu-divider"/>{(["Scout","Maya","Naledi","Sipho","Leo","Grace"] as const).map(name => <button role="menuitem" key={name} onClick={() => onDestination("M-02",undefined,{employee:name})}>{name}: {name === "Naledi" ? "Waiting on you" : "Working"}</button>)}<div className="native-menu-divider"/><button role="menuitem" disabled={state === "offline"} title={state === "offline" ? "Needs the internet" : undefined} onClick={() => go(onDestination,"X-22")}>{snapshot.paused ? "Resume team" : "Pause team"}</button>{state !== "other-computer" && <button role="menuitemcheckbox" aria-checked={snapshot.settings.running.stayAwake} onClick={() => go(onDestination,"S-07")}>{snapshot.settings.running.stayAwake ? "✓ " : ""}Keep this computer awake while plugged in</button>}{state === "update-ready" && <button role="menuitem" onClick={() => go(onDestination,"X-11")}>Restart to update</button>}</>}<div className="native-menu-divider"/><button role="menuitem" onClick={() => go(onDestination,"X-15")}>Quit Colony</button></div>}</div><p className="system-support">{platform === "windows" ? "Windows: click the tray icon to open Colony; right-click for this menu." : "Mac: choose the Colony icon in the menu bar to open this menu."}</p></main>;
  if (id === "G-03") { const chosen = notifications.find(item => item.key === state) || notifications[0]; return <main className="system-page" data-product-ui><div className="system-top"><span className="eyebrow">Outside the window</span><h1>Computer notifications</h1><p>Scout speaks for the team. Colony speaks for the app itself.</p></div><div className="notification-preview"><Bell size={18}/><button onClick={() => go(onDestination,chosen.to,chosen.state)}><strong>{chosen.from}</strong><span>{chosen.body}</span><small>Open in Colony <ArrowRight size={12}/></small></button><button aria-label="Dismiss notification" onClick={() => onNotice("Dismissed. The decision stays in Needs you.")}><X size={17}/></button></div><div className="system-list"><h2>When you hear from us</h2><p>{state === "quiet-hours" ? "From 21:00 to 07:00, only urgent problems come through." : state === "notifications-off" ? "Notifications are off on this computer. Decisions still wait in Needs you." : state === "handled-elsewhere" ? "A decision handled on another computer disappears here." : state === "looking-at-it" ? "The open conversation stays quiet while you're looking at it." : "Decisions are grouped when several arrive together. Problems are never grouped with ordinary decisions."}</p></div></main>; }
  if (id === "G-04" || id.startsWith("G-04")) { const selected = id === "G-04" ? bannerCatalogue[0] : banner; const copyText = partner && selected.partner ? selected.partner : selected.owner; return <main className="system-page" data-product-ui><div className="system-top"><span className="eyebrow">Whole-team messages</span><h1>{id === "G-04" ? "Banners" : selected.title}</h1><p>One clear message appears at a time. The most important one comes first.</p></div>{!hidden && <Banner text={copyText + (state === "multiple" ? " +2 more" : "")} action={partner && ["G-04c","G-04j","G-04n"].includes(selected.id) ? "Remind Lerato" : selected.action} onAction={() => { if (partner && ["G-04c","G-04j","G-04n"].includes(selected.id)) onNotice("We've let Lerato know."); else if (selected.to) go(onDestination,selected.to); }}/>}<div className="system-links">{(id === "G-04" || ["G-04d","G-04h","G-04k","G-04l","G-04m","G-04n","G-04p"].includes(id)) && <Button tone="quiet" onClick={() => setHidden(value => !value)}>{hidden ? "Show banner" : "Not now"}</Button>}{state === "multiple" && <Button tone="quiet" onClick={() => go(onDestination,"G-04g")}>See other messages</Button>}</div>{id === "G-04" && <div className="system-list"><h2>Banner catalogue</h2>{["G-04f","G-04g","G-04a","G-04b","G-04c","G-04d","G-04e","G-04h","G-04o","G-04i","G-04j","G-04k","G-04n","G-04l","G-04m","G-04p"].map(key=>bannerCatalogue.find(item=>item.id===key)!).map((item,index) => <button key={item.id} onClick={() => go(onDestination,item.id)}><span>{index+1}. {item.title}</span><ChevronRight size={16}/></button>)}</div>}</main>; }
  if (id === "G-05") return <main className="system-page" data-product-ui><div className="system-top"><span className="eyebrow">Everywhere in Colony</span><h1>Keyboard shortcuts</h1><p>Use Command on Mac or Control on Windows. Tab and Shift+Tab reach every action.</p></div><div className="shortcut-grid">{[["Today","1","T-01"],["Conversations","2","T-02"],["Team","3","M-01"],["Settings",",","S-01"],["Needs you","J","T-05"],["New conversation","N","T-04"],["Search everything","K","T-06"],["Find in this conversation","F","T-06"],["Main action of an open card","Enter","C-01"],["Undo","Z","G-06"],["Close a card","Esc","C-01"]].map(([label,key,to])=><button key={label} onClick={()=>go(onDestination,to)}><span>{label}</span><kbd>{platform === "windows" ? "Ctrl" : "⌘"} {key}</kbd></button>)}</div><p className="system-support">A focused card owns its main shortcut. While you type, other shortcuts stay out of the way.</p></main>;
  if (id === "G-06") { const words: Record<string,string>={approved:"Approved. Naledi will get going.",declined:"Declined. Scout will let Maya know.",posted:"Marked as posted.",sent:"Marked as sent.",copied:"Copied.",saved:"Saved to Downloads.",archived:"Conversation archived.",renamed:"Naledi is now Thandi.",invite:"Invite sent to kagiso@leratodesigns.co.za.",undo:"Approval undone."}; return <main className="system-page" data-product-ui><div className="system-top"><span className="eyebrow">Small confirmations</span><h1>Toasts and undo</h1><p>One short line. The undo window lasts ten seconds and pauses while you focus it.</p></div><div className="toast-specimen"><Check size={18}/><strong>{words[state] || words.approved}</strong>{!["copied","invite","undo"].includes(state) && <Button tone="quiet" onClick={()=>onNotice("Undone.")}>Undo</Button>}</div><Button tone="secondary" onClick={()=>onNotice(words[state] || words.approved)}>Show this toast</Button></main>; }
  if (id === "G-08") return <main className="system-page" data-product-ui><div className="system-top"><span className="eyebrow">On this computer</span><h1>Appearance</h1><p>Colony follows your computer unless you choose a theme here.</p></div><div className="appearance-options">{[["Match this computer","system",<Monitor size={18}/>],["Light","light",<Sun size={18}/>],["Dark","dark",<Moon size={18}/>]].map(([label,value,icon])=><button key={String(value)} onClick={()=>onDestination("G-08",state,{theme:String(value)})}>{icon}<span>{label}</span></button>)}</div><div className="system-list"><h2>Text size</h2><p>Default, Large or Larger. Use {platform === "windows" ? "Ctrl" : "Cmd"} + and - to change it.</p><Button onClick={()=>onDestination("S-08")}>Open appearance settings</Button></div><p className="system-support">At 1024 x 700, actions stay reachable. Reduced motion and increased contrast follow your computer.</p></main>;
  if (!copy) return null;
  const links = copy.links || [];
  if (id === "X-19" && state !== "fixed") return <main className="system-page" data-product-ui><div className="system-top"><span className="eyebrow">When something goes wrong</span><h1>{problemExamples[caseIndex % problemExamples.length].title}</h1><p>{problemExamples[caseIndex % problemExamples.length].body}</p></div><div className="system-links"><Button tone="primary" onClick={()=>go(onDestination,problemExamples[caseIndex % problemExamples.length].to)}>{problemExamples[caseIndex % problemExamples.length].fix}</Button>{state === "repeated" && <Button tone="secondary" onClick={()=>go(onDestination,"S-09")}>Get help</Button>}</div><div className="system-list"><h2>Other examples</h2>{problemExamples.map((example,index)=><button key={example.title} onClick={()=>setCaseIndex(index)} aria-current={caseIndex===index?"true":undefined}><span>{example.title}</span><ChevronRight size={15}/></button>)}</div><p className="system-support">What happened, what it means and one way forward. No technical codes or lost text.</p></main>;
  if (id === "X-16" && state === "asking") return <main className="system-page" data-product-ui onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); onNotice("Nothing changed."); } }}><div className="system-top"><span className="eyebrow">Before you choose</span><h1>Confirmations</h1><p>Important changes explain their consequences before you decide.</p></div><section className="confirmation-preview" role="group" aria-label={confirmations[caseIndex][0]}><h2>{confirmations[caseIndex][0]}</h2><p>{confirmations[caseIndex][1]}</p>{caseIndex===3 && <label className="system-name">Type Lerato Designs to confirm<input value={typedName} onChange={event=>setTypedName(event.target.value)}/></label>}<div className="system-links"><Button autoFocus tone="secondary" onClick={()=>onNotice("Nothing changed.")}>{confirmations[caseIndex][3]}</Button><Button tone="danger" disabled={caseIndex===3&&typedName!=="Lerato Designs"} onClick={()=>go(onDestination,"X-16","working")}>{confirmations[caseIndex][2]}</Button></div></section><details className="confirmation-catalogue"><summary>Review the other confirmations <ChevronRight size={16}/></summary><div className="system-list">{confirmations.map((entry,index)=><button key={entry[0]} onClick={()=>{setCaseIndex(index);setTypedName("");}} aria-current={caseIndex===index?"true":undefined}><span>{entry[0]}</span><ChevronRight size={15}/></button>)}</div></details><p className="system-support">The safe choice has focus first. Escape keeps everything as it was.</p></main>;
  return <main className="system-page" data-product-ui><div className="system-top"><span className="eyebrow">{id === "X-03" ? "Today" : id === "X-16" ? "Before you choose" : "Colony"}</span><h1>{id === "X-16" ? confirmations[caseIndex][0] : copy.title}</h1><p>{id === "X-16" ? confirmations[caseIndex][1] : copy.body}</p>{copy.detail && id !== "X-16" && <p className="system-detail">{copy.detail}</p>}</div>{id === "X-08" && <div className="system-ant"><Avatar name="Naledi"/><span>Naledi · Social Media Manager</span></div>}{id === "X-09" && <div className="system-ant"><Avatar name="Scout"/><span>Scout · Chief of Staff</span></div>}{id === "X-18" && state !== "done" && <div className="system-skeleton" role="status" aria-label="Loading"><i/><i/><i/></div>}{id === "X-16" && <><div className="system-list"><h2>Confirming other changes</h2>{confirmations.map((entry,index)=><button key={entry[0]} onClick={()=>{setCaseIndex(index);setTypedName("");}} aria-current={caseIndex===index?"true":undefined}><span>{entry[0]}</span><ChevronRight size={15}/></button>)}</div>{caseIndex===3 && <label className="system-name">Type Lerato Designs to confirm<input value={typedName} onChange={e=>setTypedName(e.target.value)}/></label>}</>}{id === "X-17" && state === "empty" && <div className="system-list"><h2>Places that can be empty</h2>{empties.map((entry,index)=><button key={entry[0]} onClick={()=>setActiveEmpty(index)} aria-current={activeEmpty===index?"true":undefined}><span>{entry[0]}</span><ChevronRight size={15}/></button>)}<p className="system-empty-copy">{empties[activeEmpty][1]}</p>{empties[activeEmpty][2]!=="none"&&<Button tone="secondary" onClick={()=>go(onDestination,({"New conversation":"T-04","Add from computer":"D-03a","Message Scout":"T-04","Add photos":"D-03a","Set up forwarding (S-04)":"S-04","Add account":"S-04","Invite":"S-05"} as Record<string,string>)[empties[activeEmpty][2]]||"T-01")}>{empties[activeEmpty][2]}</Button>}</div>}{id === "X-19" && <div className="system-help"><CircleHelp size={18}/><span>What happened. What still works. One next step.</span></div>}{id === "X-20" && <div className="system-permission"><Bell size={19}/><span>{["no-device","device-busy","restart-needed","microphone","microphone-denied"].includes(state) ? "Microphone" : "Notifications"}</span></div>}{id === "X-22" && <div className="system-ant"><Avatar name="Scout"/><span>Scout keeps decisions available while the team is paused.</span></div>}<div className="system-links">{(id === "X-16" && state === "asking" ? [{label:confirmations[caseIndex][3],note:"Nothing changed."},{label:confirmations[caseIndex][2],next:"working"}] : links).map((link,index)=><Button key={link.label} tone={index===0?"primary":"secondary"} disabled={id==="X-16"&&caseIndex===3&&index===1&&typedName!=="Lerato Designs"} onClick={()=>run(link)}>{link.label}{index===0&&<ArrowRight size={14}/>}</Button>)}</div><p className="system-support">{id === "X-16" ? "The safe choice has focus first. Escape leaves everything as it was." : id === "X-20" ? "These controls show the interface only. Your computer's own permission question appears outside Colony." : "This review state uses local sample data. Nothing has been sent or changed outside the prototype."}</p></main>;
}
