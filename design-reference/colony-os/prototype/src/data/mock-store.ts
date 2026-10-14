import { useSyncExternalStore } from "react";
import { initialSnapshot, statusWords } from "./fixtures";
import { reconnectDesks } from "./desk-recovery";
import type {
  CardStatus,
  MockSnapshot,
  MessagePayload,
  Person,
  Topic,
  WorkspaceReference,
} from "./types";
const storageKey = "colony-os-design-m1";
let snapshot: MockSnapshot = initialSnapshot();
try {
  const saved = localStorage.getItem(storageKey);
  if (saved) {
    const previous = JSON.parse(saved);
    const initial = initialSnapshot();
    snapshot = { ...initial, ...previous };
    snapshot.cards = { ...initial.cards, ...previous.cards };
    snapshot.workspaceReferences = Array.isArray(previous.workspaceReferences)
      ? previous.workspaceReferences.filter((ref: WorkspaceReference) => {
          if (!ref || !["link", "browser"].includes(ref.kind)) return false;
          try {
            return ["http:", "https:"].includes(new URL(ref.url).protocol);
          } catch {
            return false;
          }
        })
      : initial.workspaceReferences;
    if (previous.topics) {
      snapshot.topics = {
        ...initial.topics,
        ...Object.fromEntries(
          Object.entries(previous.topics).map(([id, savedTopic]) => [
            id,
            {
              ...initial.topics[id],
              ...(savedTopic as Topic),
              cardIds: [...new Set([...(initial.topics[id]?.cardIds || []), ...((savedTopic as Topic).cardIds || [])])],
              mediaCardIds: (savedTopic as Topic).mediaCardIds ?? initial.topics[id]?.mediaCardIds,
            },
          ]),
        ),
      };
    }
    snapshot.firstRun = previous.firstRun ? {
      ...initial.firstRun,
      ...previous.firstRun,
      answers: { ...initial.firstRun.answers, ...previous.firstRun.answers },
      teamSelected: { ...initial.firstRun.teamSelected, ...previous.firstRun.teamSelected },
      teamNames: { ...initial.firstRun.teamNames, ...previous.firstRun.teamNames },
    } : initial.firstRun;
    snapshot.settings = previous.settings ? {
      ...initial.settings,
      ...previous.settings,
      lastSection: typeof previous.settings.lastSection === "string"
        ? { Lerato: previous.settings.lastSection, Kagiso: "S-01" }
        : { ...initial.settings.lastSection, ...previous.settings.lastSection },
      business: { ...initial.settings.business, ...previous.settings.business },
      billing: { ...initial.settings.billing, ...previous.settings.billing },
      power: { ...initial.settings.power, ...previous.settings.power },
      connections: { ...initial.settings.connections, ...previous.settings.connections },
      people: { ...initial.settings.people, ...previous.settings.people },
      notifications: {
        Lerato: { ...initial.settings.notifications.Lerato, ...previous.settings.notifications?.Lerato },
        Kagiso: { ...initial.settings.notifications.Kagiso, ...previous.settings.notifications?.Kagiso },
      },
      running: { ...initial.settings.running, ...previous.settings.running },
      accounts: {
        Lerato: { ...initial.settings.accounts.Lerato, ...previous.settings.accounts?.Lerato },
        Kagiso: { ...initial.settings.accounts.Kagiso, ...previous.settings.accounts?.Kagiso },
      },
      help: { ...initial.settings.help, ...previous.settings.help },
    } : initial.settings;
    const oldDesks = previous.desks;
    snapshot.desks = oldDesks ? {
      ...initial.desks,
      ...oldDesks,
      drafts: { ...initial.desks.drafts, ...oldDesks.drafts },
      campaigns: { ...initial.desks.campaigns, ...oldDesks.campaigns },
      ideas: { ...initial.desks.ideas, ...oldDesks.ideas },
      corrections: { ...initial.desks.corrections, ...oldDesks.corrections },
      leads: { ...initial.desks.leads, ...oldDesks.leads },
      customers: { ...initial.desks.customers, ...oldDesks.customers },
      admin: { ...initial.desks.admin, ...oldDesks.admin },
      website: { ...initial.desks.website, ...oldDesks.website,
        domain: { ...initial.desks.website.domain, ...oldDesks.website?.domain } },
    } : initial.desks;
    if (!previous.topics) {
      snapshot.messages = [
        ...initialSnapshot().messages.filter((m) => m.conversationId),
        ...previous.messages,
      ];
    }
    if (!snapshot.messages.some((m) => m.id === "web-voice")) {
      const voice = initialSnapshot().messages.find(
        (m) => m.id === "web-voice",
      )!;
      snapshot.messages.splice(
        Math.max(
          0,
          snapshot.messages.findIndex((m) => m.id === "web2"),
        ),
        0,
        voice,
      );
    }
    const seedMessage = initial.messages.find((m) => m.id === "m1");
    snapshot.messages = snapshot.messages.map((message) =>
      message.id === "m1" && message.text !== "Message deleted" && !message.attachments?.length
        ? { ...message, attachments: seedMessage?.attachments, photoLibraryChoice: "declined" }
        : message,
    );
    for (const reply of initial.messages.filter((message) => message.id.startsWith("c05-reply-"))) {
      if (!snapshot.messages.some((message) => message.id === reply.id)) snapshot.messages.push(reply);
    }
    const customerMessage = initial.messages.find((message) => message.id === "customer1");
    if (customerMessage && !snapshot.messages.some((message) => message.id === customerMessage.id))
      snapshot.messages.push(customerMessage);
  }
} catch {
  snapshot = initialSnapshot();
}
const listeners = new Set<() => void>();
const topicOf = (m: import("./types").Message) => m.conversationId || "spring";
function activity(id: string, person: string): Record<string, Topic> {
  const topic = snapshot.topics[id];
  if (!topic) return snapshot.topics;
  return {
    ...snapshot.topics,
    [id]: {
      ...topic,
      archived: false,
      updatedAt: Date.now(),
      time: "10:42",
      unread: { Lerato: person !== "Lerato", Kagiso: person !== "Kagiso" },
      employees: ["Scout", "Maya", "Naledi", "Sipho", "Leo", "Grace"].includes(
        person,
      )
        ? [
            ...new Set([
              ...topic.employees,
              person as import("./types").EmployeeId,
            ]),
          ]
        : topic.employees,
      notice: topic.archived
        ? "Back from the archive: new message from " + person
        : undefined,
      lastLine: undefined,
    },
  };
}
function write(next: MockSnapshot) {
  if (next.topics === snapshot.topics && next.cards !== snapshot.cards) {
    const changed = Object.keys(next.cards).filter(
      (id) =>
        next.cards[id] !== snapshot.cards[id] &&
        (next.cards[id].status !== snapshot.cards[id]?.status ||
          next.cards[id].history.length !== snapshot.cards[id]?.history.length),
    );
    if (changed.length)
      next = {
        ...next,
        topics: Object.fromEntries(
          Object.entries(next.topics).map(([id, topic]) => {
            const cardId = changed.find((cardId) =>
              topic.cardIds.includes(cardId),
            );
            if (!cardId) return [id, topic];
            const card = next.cards[cardId],
              person = card.history.at(-1)?.person;
            return [
              id,
              {
                ...topic,
                updatedAt: Date.now(),
                time: "10:42",
                lastLine:
                  card.type +
                  ": " +
                  card.title +
                  " · " +
                  statusWords[card.status],
                unread: {
                  Lerato: person !== "Lerato",
                  Kagiso: person !== "Kagiso",
                },
              },
            ];
          }),
        ),
      };
  }
  snapshot = next;
  try {
    localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    /* The mock remains usable when storage is unavailable. */
  }
  listeners.forEach((fn) => fn());
}
export const mockStore = {
  change: (mutate: (current: MockSnapshot) => MockSnapshot) =>
    write(mutate(snapshot)),
  get: () => snapshot,
  subscribe: (fn: () => void) => {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  reset: () => write(initialSnapshot()),
  restore: (value: MockSnapshot) => write(structuredClone(value)),
  restoreCard: (id: string, card: import("./types").Card) =>
    write({
      ...snapshot,
      cards: { ...snapshot.cards, [id]: structuredClone(card) },
    }),
  updateCard: (id: string, update: (card: import("./types").Card) => import("./types").Card) => {
    const card = snapshot.cards[id];
    if (!card) return false;
    write({ ...snapshot, cards: { ...snapshot.cards, [id]: update(card) } });
    return true;
  },
  transitionCard: (
    id: string,
    status: CardStatus,
    person: string,
    allowed: CardStatus[],
    note?: string,
    patch: Partial<import("./types").Card> = {},
  ) => {
    const card = snapshot.cards[id];
    if (!card || !allowed.includes(card.status)) return false;
    write({
      ...snapshot,
      cards: {
        ...snapshot.cards,
        [id]: {
          ...card,
          ...patch,
          status,
          note,
          history: [...card.history, { text: statusWords[status] + (note ? ": " + note : ""), person, time: "10:42" }],
        },
      },
    });
    return true;
  },
  decide: (id: string, status: CardStatus, person: string, note?: string) => {
    const old = snapshot.cards[id];
    if (!old) return false;
    if (status === "approved" || status === "ready") {
      if (
        !["waiting", "changes"].includes(old.status) &&
        !(status === "ready" && old.status === "posted")
      )
        return false;
    }
    if (
      ["declined", "changes", "skipped", "sent"].includes(status) &&
      !["waiting", "changes", "ready", "ready-send"].includes(old.status)
    )
      return false;
    const card = {
      ...old,
      status,
      note,
      history: [
        ...old.history,
        { text: statusWords[status] + (note ? ": " + note : ""), person, time: "10:42" },
      ],
    };
    write({ ...snapshot, cards: { ...snapshot.cards, [id]: card } });
    return true;
  },
  answer: (id: string, answer: string, person: string) => {
    const c = snapshot.cards[id];
    if (!["waiting", "changes"].includes(c.status)) return false;
    write({
      ...snapshot,
      cards: {
        ...snapshot.cards,
        [id]: {
          ...c,
          status: "answered",
          answer,
          history: [
            ...c.history,
            { text: "Answered: " + answer, person, time: "10:42" },
          ],
        },
      },
    });
    return true;
  },
  revise: (id: string) => {
    const c = snapshot.cards[id];
    write({
      ...snapshot,
      cards: {
        ...snapshot.cards,
        [id]: {
          ...c,
          status: "waiting",
          version: c.version + 1,
          history: [
            ...c.history,
            {
              text: "Version 3: changed after Lerato's note",
              person: c.from,
              time: "10:45",
            },
          ],
        },
      },
    });
  },
  schedule: (id: string, scheduled: string) => {
    const c = snapshot.cards[id];
    write({
      ...snapshot,
      cards: { ...snapshot.cards, [id]: { ...c, scheduled } },
    });
  },
  approveOne: (id: string, name: import("./types").EmployeeId) => {
    const c = snapshot.cards[id];
    write({
      ...snapshot,
      cards: {
        ...snapshot.cards,
        [id]: {
          ...c,
          planApprovals: [...new Set([...(c.planApprovals || []), name])],
          history: [
            ...c.history,
            {
              text: name + "'s plan approved",
              person: "Lerato",
              time: "10:42",
            },
          ],
        },
      },
    });
  },
  batch: (
    id: string,
    index: number,
    status: CardStatus,
    note = "",
    person = "Lerato",
  ) => {
    const c = snapshot.cards[id];
    const statuses =
      c.batchStatuses ||
      Array.from({ length: 5 }, () => "waiting" as CardStatus);
    const next = statuses.map((s, i) => (i === index ? status : s));
    const notes = Array.from({ length: 5 }, (_, i) =>
      i === index ? note : c.batchNotes?.[i] || "",
    );
    const actors = Array.from({ length: 5 }, (_, i) =>
      i === index ? person : c.batchActors?.[i] || "",
    );
    write({
      ...snapshot,
      cards: {
        ...snapshot.cards,
        [id]: {
          ...c,
          batchStatuses: next,
          batchNotes: notes,
          batchActors: actors,
          status: next.every((s) => ["ready", "posted", "skipped"].includes(s))
            ? "ready"
            : c.status,
          history: [
            ...c.history,
            {
              text:
                "Post " +
                (index + 1) +
                ": " +
                statusWords[status] +
                (note ? ": " + note : ""),
              person,
              time: "10:42",
            },
          ],
        },
      },
    });
  },
  approveBatch: (id: string, person: string) => {
    const c = snapshot.cards[id];
    const statuses = (
      c.batchStatuses ||
      Array.from({ length: 5 }, () => "waiting" as CardStatus)
    ).map((s) =>
      s === "skipped" || s === "posted" ? s : ("ready" as CardStatus),
    );
    write({
      ...snapshot,
      cards: {
        ...snapshot.cards,
        [id]: {
          ...c,
          status: "ready",
          batchStatuses: statuses,
          batchActors: Array.from({ length: 5 }, () => person),
          history: [
            ...c.history,
            { text: "All drafts approved", person, time: "10:42" },
          ],
        },
      },
    });
  },
  post: (id: string, postLink: string, person: string, postWaiting = false) => {
    const c = snapshot.cards[id];
    write({
      ...snapshot,
      cards: {
        ...snapshot.cards,
        [id]: {
          ...c,
          status: "posted",
          postLink,
          postWaiting,
          history: [
            ...c.history,
            {
              text:
                "Marked as posted" + (postWaiting ? ". Waiting to send." : ""),
              person,
              time: "18:04",
            },
          ],
        },
      },
    });
  },
  send: (
    text: string,
    person: Person,
    status?: string,
    conversationId = "spring",
    payload: MessagePayload = {},
  ) => {
    const id = crypto.randomUUID();
    write({
      ...snapshot,
      topics: activity(conversationId, person),
      messages: [
        ...snapshot.messages,
        {
          id,
          from: person,
          text,
          time: "10:42",
          status,
          conversationId,
          ...payload,
        },
      ],
    });
    return id;
  },
  sendThreadReply: (
    conversationId: string,
    threadRoot: string,
    text: string,
    person: Person,
    payload: MessagePayload = {},
    offline = false,
  ) => {
    const sourceExists = threadRoot.startsWith("message:")
      ? snapshot.messages.some((m) => m.id === threadRoot.slice(8) && topicOf(m) === conversationId && !m.threadRoot)
      : threadRoot.startsWith("card:")
        ? snapshot.topics[conversationId]?.cardIds.includes(threadRoot.slice(5)) || snapshot.topics[conversationId]?.mediaCardIds?.includes(threadRoot.slice(5))
        : false;
    if (!snapshot.topics[conversationId] || !sourceExists || (!text.trim() && !payload.attachments?.length && !payload.voice)) return "";
    const id = crypto.randomUUID();
    const topics = activity(conversationId, person);
    write({
      ...snapshot,
      topics: {
        ...topics,
        [conversationId]: {
          ...topics[conversationId],
          lastLine: `${person} replied in a thread: ${text.trim() || "Shared a file"}`,
        },
      },
      messages: [
        ...snapshot.messages,
        {
          id,
          from: person,
          text: text.trim(),
          time: "10:42",
          conversationId,
          threadRoot,
          status: offline ? "Waiting to send" : undefined,
          ...payload,
        },
      ],
    });
    return id;
  },
  addWorkspaceReference: (
    conversationId: string,
    kind: WorkspaceReference["kind"],
    title: string,
    rawUrl: string,
  ) => {
    if (!snapshot.topics[conversationId]) return false;
    let url: URL;
    try {
      url = new URL(rawUrl.trim());
    } catch {
      return false;
    }
    if (!["http:", "https:"].includes(url.protocol)) return false;
    const cleanTitle = title.trim() || url.hostname;
    if (snapshot.workspaceReferences.some((ref) => ref.conversationId === conversationId && ref.kind === kind && ref.url === url.href)) return false;
    write({
      ...snapshot,
      workspaceReferences: [
        ...snapshot.workspaceReferences,
        { id: crypto.randomUUID(), conversationId, kind, title: cleanTitle.slice(0, 80), url: url.href },
      ],
    });
    return true;
  },
  removeWorkspaceReference: (id: string) =>
    write({
      ...snapshot,
      workspaceReferences: snapshot.workspaceReferences.filter((ref) => ref.id !== id),
    }),
  receive: (
    text: string,
    person: import("./types").EmployeeId,
    conversationId = "spring",
  ) => {
    if (!snapshot.topics[conversationId]) return;
    write({
      ...snapshot,
      topics: activity(conversationId, person),
      messages: [
        ...snapshot.messages,
        {
          id: crypto.randomUUID(),
          from: person,
          text,
          time: "10:42",
          conversationId,
        },
      ],
    });
  },
  createTopic: (
    text: string,
    person: Person,
    payload: MessagePayload = {},
    routing = false,
  ) => {
    const id = crypto.randomUUID();
    const topic: Topic = {
      id,
      title: "New conversation",
      summary: "",
      archived: false,
      unread: { Lerato: person !== "Lerato", Kagiso: person !== "Kagiso" },
      updatedAt: Date.now(),
      time: "10:42",
      employees: ["Scout"],
      work: [],
      cardIds: [],
      routing,
    };
    write({
      ...snapshot,
      topics: { ...snapshot.topics, [id]: topic },
      messages: [
        ...snapshot.messages,
        {
          id: crypto.randomUUID(),
          from: person,
          text,
          time: "10:42",
          conversationId: id,
          ...payload,
        },
      ],
    });
    return id;
  },
  renameTopic: (id: string, title: string, person: Person, byScout = false) => {
    const topic = snapshot.topics[id];
    if (!topic || !title.trim() || (byScout && topic.renamedByPerson)) return;
    write({
      ...snapshot,
      topics: {
        ...snapshot.topics,
        [id]: {
          ...topic,
          title: title.trim(),
          renamedByPerson: !byScout || topic.renamedByPerson,
        },
      },
      messages: byScout
        ? snapshot.messages
        : [
            ...snapshot.messages,
            {
              id: crypto.randomUUID(),
              from: person,
              text: person + " renamed this " + title.trim(),
              time: "10:42",
              event: true,
              conversationId: id,
            },
          ],
    });
  },
  archiveTopic: (id: string, archived: boolean) => {
    const topic = snapshot.topics[id];
    if (topic)
      write({
        ...snapshot,
        topics: {
          ...snapshot.topics,
          [id]: { ...topic, archived, notice: undefined },
        },
      });
  },
  markRead: (id: string, person: Person, read: boolean) => {
    const topic = snapshot.topics[id];
    if (topic && topic.unread[person] === read)
      write({
        ...snapshot,
        topics: {
          ...snapshot.topics,
          [id]: { ...topic, unread: { ...topic.unread, [person]: !read } },
        },
        recentTopics: read
          ? [id, ...snapshot.recentTopics.filter((t) => t !== id)].slice(0, 5)
          : snapshot.recentTopics,
      });
  },
  moveTopic: (from: string, to: string) => {
    if (from === to || !snapshot.topics[from] || !snapshot.topics[to]) return;
    const topics = { ...activity(to, "Lerato") };
    delete topics[from];
    write({
      ...snapshot,
      topics,
      messages: [
        ...snapshot.messages.map((m) =>
          topicOf(m) === from ? { ...m, conversationId: to } : m,
        ),
        {
          id: crypto.randomUUID(),
          from: "Scout",
          text: "Moved here from Today",
          time: "10:42",
          event: true,
          conversationId: to,
        },
      ],
      recentTopics: snapshot.recentTopics
        .map((id) => (id === from ? to : id))
        .filter((id, i, all) => all.indexOf(id) === i),
      workspaceReferences: snapshot.workspaceReferences.map((ref) =>
        ref.conversationId === from ? { ...ref, conversationId: to } : ref,
      ),
    });
  },
  keepTopic: (id: string) => {
    if (snapshot.topics[id])
      write({
        ...snapshot,
        topics: {
          ...snapshot.topics,
          [id]: {
            ...snapshot.topics[id],
            routing: false,
            title:
              snapshot.topics[id].title === "New conversation"
                ? "Spring ideas"
                : snapshot.topics[id].title,
          },
        },
      });
  },
  saveSearch: (query: string) => {
    if (query.trim())
      write({
        ...snapshot,
        recentSearches: [
          query.trim(),
          ...snapshot.recentSearches.filter((q) => q !== query.trim()),
        ].slice(0, 5),
      });
  },
  deliver: (id: string) =>
    write({
      ...snapshot,
      messages: snapshot.messages.map((m) =>
        m.id === id
          ? {
              ...m,
              status: undefined,
              attachments: m.attachments?.map((f) => ({
                ...f,
                status: "ready",
              })),
            }
          : m,
      ),
    }),
  updateMessage: (id: string, patch: Partial<import("./types").Message>) =>
    write({
      ...snapshot,
      messages: snapshot.messages.map((m) =>
        m.id === id ? { ...m, ...patch } : m,
      ),
    }),
  addToLibrary: (ids: string[], messageId?: string, actor: Person = "Lerato") => {
    const files = snapshot.messages.flatMap(m=>m.attachments||[]).filter(f=>ids.includes(f.id)&&f.kind==="image"&&!snapshot.desks.photos.some(p=>p.id===f.id));
    write({
      ...snapshot,
      desks: { ...snapshot.desks, photos: [
        ...files.map(f=>({id:f.id,name:f.name,url:f.url,type:f.type,ai:!!f.ai,tags:[],uses:0,excluded:false,actor,added:"Today"})),
        ...snapshot.desks.photos,
      ] },
      photoLibrary: [...new Set([...snapshot.photoLibrary, ...ids])],
      messages: messageId
        ? snapshot.messages.map((m) =>
            m.id === messageId ? { ...m, photoLibraryChoice: "added" } : m,
          )
        : snapshot.messages,
    });
    for(const file of files.filter(f=>f.url.startsWith("blob:"))) {
      void fetch(file.url).then(r=>{if(!r.ok)throw new Error("Photo unavailable");return r.blob();}).then(blob=>new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(blob);})).then(url=>mockStore.change(s=>({...s,desks:{...s.desks,photos:s.desks.photos.map(p=>p.id===file.id?{...p,url,importError:false}:p)}}))).catch(()=>mockStore.change(s=>({...s,desks:{...s.desks,photos:s.desks.photos.map(p=>p.id===file.id?{...p,importError:true}:p)}})));
    }
  },
  reconnect: () =>
    write({
      ...snapshot,
      desks: reconnectDesks(snapshot.desks),
      messages: snapshot.messages.map((m) =>
        m.status === "Waiting to send" &&
        !m.conversationId?.startsWith("direct-")
          ? {
              ...m,
              status: undefined,
              attachments: m.attachments?.map((f) => ({
                ...f,
                status: "ready" as const,
              })),
            }
          : m,
      ),
      cards: Object.fromEntries(
        Object.entries(snapshot.cards).map(([id, c]) => [
          id,
          c.postWaiting ? { ...c, postWaiting: false } : c,
        ]),
      ),
    }),
  edit: (id: string, text: string) =>
    write({
      ...snapshot,
      messages: snapshot.messages.map((m) =>
        m.id === id ? { ...m, text, edited: true } : m,
      ),
    }),
  remove: (id: string) =>
    write({
      ...snapshot,
      messages: snapshot.messages.map((m) =>
        m.id === id
          ? {
              ...m,
              text: "Message deleted",
              voice: undefined,
              attachments: undefined,
              quote: undefined,
            }
          : m,
      ),
    }),
  resume: () => write({ ...snapshot, paused: false, settings: { ...snapshot.settings, running: { ...snapshot.settings.running, pausedBy: undefined } } }),
};
export function useMock() {
  return useSyncExternalStore(
    mockStore.subscribe,
    mockStore.get,
    mockStore.get,
  );
}
Object.assign(window, {
  __COLONY_DESIGN__: {
    reset: mockStore.reset,
    get: mockStore.get,
    change: mockStore.change,
    revise: mockStore.revise,
    resolve: mockStore.decide,
    reconnect: mockStore.reconnect,
    receive: mockStore.receive,
    renameTopic: mockStore.renameTopic,
  },
});
