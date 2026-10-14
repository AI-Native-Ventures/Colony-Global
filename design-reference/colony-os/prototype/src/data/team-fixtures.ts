import type { EmployeeId, TeamSnapshot } from "./types";
export const employeeIds: EmployeeId[] = [
  "Scout",
  "Maya",
  "Naledi",
  "Sipho",
  "Leo",
  "Grace",
];
const budget = [2, 3, 5, 3, 4, 2];
const routine = (
  id: string,
  name: string,
  days: string,
  time: string,
  last: string,
) => ({ id, name, days, time, next: `Next: ${days}, ${time}`, last, on: true });
export function initialTeam(): TeamSnapshot {
  const extras = {
    Scout: [
      routine(
        "brief",
        "Morning brief",
        "Weekdays",
        "08:30",
        "Last: today, 08:30. Morning brief shared.",
      ),
      routine(
        "wrap",
        "Friday wrap",
        "Fridays",
        "16:00",
        "Last: Friday 9 Oct. Your week in a few lines.",
      ),
    ],
    Maya: [
      routine(
        "numbers",
        "Numbers check-in",
        "Thursdays",
        "10:00",
        "Last: Thursday 8 Oct. Numbers shared by Lerato.",
      ),
      routine(
        "ideas",
        "Campaign ideas",
        "First Monday of the month",
        "10:00",
        "Last: Monday 5 Oct. Spring launch proposed.",
      ),
    ],
    Naledi: [
      routine(
        "posts",
        "Next week's posts",
        "Every Monday",
        "10:00",
        "Last: Monday 13 Oct. 5 posts drafted.",
      ),
      routine(
        "reminders",
        "Time-to-post reminders",
        "At each post's time",
        "18:00",
        "Last: yesterday. Spring carousel marked as posted.",
      ),
      routine(
        "lookback",
        "Monthly look back",
        "Last Friday of the month",
        "11:00",
        "Last: Friday 25 Sep. Your month in social media.",
      ),
    ],
    Sipho: [
      routine(
        "leads",
        "Lead hunt",
        "Tuesdays",
        "09:00",
        "Last: Tuesday 6 Oct. 12 boutiques found.",
      ),
      routine(
        "followup",
        "Follow-up check",
        "Weekdays",
        "08:00",
        "Last: today. 2 follow-ups ready.",
      ),
    ],
    Leo: [
      routine(
        "site",
        "Site check",
        "Wednesdays",
        "09:00",
        "Last: Wednesday 7 Oct. Everything looks good.",
      ),
      routine(
        "refresh",
        "Monthly refresh",
        "First Tuesday of the month",
        "09:00",
        "Last: Tuesday 6 Oct. Spring banner drafted.",
      ),
    ],
    Grace: [
      routine(
        "customers",
        "Customers waiting check",
        "Every day",
        "08:00",
        "Last: today. Thabo is waiting about his order.",
      ),
      routine(
        "admin",
        "Admin catch-up",
        "Fridays",
        "10:00",
        "Last: Friday 9 Oct. Policies checked.",
      ),
    ],
  };
  return {
    profiles: Object.fromEntries(
      employeeIds.map((id, i) => [
        id,
        { displayName: id, avatar: id, budget: budget[i], tab: "Desk" },
      ]),
    ) as TeamSnapshot["profiles"],
    routines: Object.fromEntries(
      employeeIds.map((id) => [
        id,
        [
          routine(
            "plan",
            "Plan check",
            "Every Monday",
            "09:00",
            "Last: Monday 13 Oct. Plan checked.",
          ),
          ...extras[id],
        ],
      ]),
    ) as TeamSnapshot["routines"],
    plans: Object.fromEntries(
      employeeIds.map((id) => [id, { status: "approved", actor: "Lerato" }]),
    ) as TeamSnapshot["plans"],
    events: [],
  };
}
export const planItems: Record<EmployeeId, string[]> = {
  Scout: [
    "Keep the spring launch on track",
    "Bring each plan to you for a yes",
    "Share the morning brief",
    "Check what is waiting on you",
    "Prepare the Friday wrap",
    "Review the next company plan",
  ],
  Maya: [
    "Choose the spring launch offer",
    "Put the campaign together",
    "Ask for this week’s numbers",
    "Check the newsletter draft",
    "Review the October goal",
    "Plan the next campaign",
  ],
  Naledi: [
    "Choose the linen photos",
    "Draft 5 posts for next week",
    "Prepare the spring carousel",
    "Check the captions with Maya",
    "Share the next posting times",
    "Week 2: start posting on TikTok, 3 times a week.",
    "Prepare a short video script",
    "Look back at this week’s posts",
    "Write the next plan",
  ],
  Sipho: [
    "Find 12 local boutiques",
    "Prepare the linen line sheet",
    "Draft outreach for Juniper and Jade",
    "Check the follow-ups",
    "Update the lead list",
    "Write the next plan",
  ],
  Leo: [
    "Check the current website",
    "Prepare the spring banner",
    "Show the new spring page",
    "Check the mobile layout",
    "Apply approved changes",
    "Write the next plan",
  ],
  Grace: [
    "Check customers waiting",
    "Draft Thabo’s order reply",
    "Review the delivery FAQ",
    "Prepare the supplier email",
    "Catch up on the admin",
    "Write the next plan",
  ],
};
export const neverAlone: Record<EmployeeId, string[]> = {
  Scout: [
    "Anything public",
    "Spending money",
    "Hiring or letting someone go",
    "Big changes to the company plan",
  ],
  Maya: ["Discounts and prices", "Anything public", "Spending money"],
  Naledi: ["Anything public", "Customer photos or names", "Prices"],
  Sipho: ["Outreach and follow-ups", "Prices and terms", "Customer details"],
  Leo: ["Putting website changes live", "Prices", "Setting up hosting"],
  Grace: ["Customer replies", "Refunds and prices", "Customer details"],
};
