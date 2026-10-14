import type { Attachment, Message, Topic, VoiceNote } from "./types";

export const seedTopics: Record<string, Topic> = {
  spring: {
    id: "spring",
    title: "Spring launch",
    summary: "Where this stands: posts approved, banner goes live Friday.",
    archived: false,
    unread: { Lerato: true, Kagiso: true },
    updatedAt: 100,
    time: "09:12",
    employees: ["Scout", "Maya", "Naledi", "Leo"],
    work: [
      "Naledi is drafting 3 posts for the spring launch.",
      "Maya is putting the campaign together.",
      "Leo is preparing the spring banner.",
    ],
    cardIds: ["C-01", "C-02", "C-04", "C-05", "C-06", "C-07", "C-16", "C-17", "C-18", "C-19"],
    mediaCardIds: ["C-04", "C-05", "C-07"],
  },
  website: {
    id: "website",
    title: "Website refresh",
    summary: "Where this stands: Leo is preparing the spring banner.",
    archived: false,
    unread: { Lerato: false, Kagiso: true },
    updatedAt: 90,
    time: "08:55",
    employees: ["Scout", "Leo"],
    work: ["Leo is preparing the spring banner."],
    cardIds: ["C-10", "C-20"],
  },
  stockists: {
    id: "stockists",
    title: "New stockists",
    summary: "Where this stands: Sipho found 12 boutiques.",
    archived: false,
    unread: { Lerato: false, Kagiso: false },
    updatedAt: 80,
    time: "Yesterday",
    employees: ["Scout", "Sipho"],
    work: [],
    cardIds: ["C-08", "C-11", "C-13"],
  },
  customerReplies: {
    id: "customerReplies",
    title: "Customer replies",
    summary: "Where this stands: Grace drafted a reply to Thabo.",
    archived: false,
    unread: { Lerato: true, Kagiso: false },
    updatedAt: 85,
    time: "09:10",
    employees: ["Scout", "Grace"],
    work: ["Grace is checking order 1042 and preparing a reply."],
    cardIds: ["C-09", "C-12"],
  },
  gettingStarted: {
    id: "gettingStarted",
    title: "Getting started",
    summary: "Where this stands: the team is ready.",
    archived: true,
    unread: { Lerato: false, Kagiso: false },
    updatedAt: 70,
    time: "9 Oct",
    employees: ["Scout", "Maya", "Naledi", "Sipho", "Leo", "Grace"],
    work: [],
    cardIds: ["C-03", "C-14", "C-15"],
  },
};

export const otherMessages: Message[] = [
  {
    id: "web1",
    conversationId: "website",
    from: "Lerato",
    text: "Can we update the homepage for spring?",
    time: "08:50",
  },
  {
    id: "web-voice",
    conversationId: "website",
    from: "Lerato",
    text: "Can we do something for the spring launch?",
    time: "08:52",
    voice: {
      transcript: "Can we do something for the spring launch?",
      seconds: 12,
      url: "./assets/voice-note.wav",
      status: "ready",
    },
  },
  {
    id: "web2",
    conversationId: "website",
    from: "Scout",
    text: "Leo is preparing the spring banner. You'll see the change here before anything goes live.",
    time: "08:55",
  },
  {
    id: "stock1",
    conversationId: "stockists",
    from: "Lerato",
    text: "Let's find a few boutiques that stock local designers.",
    time: "16:10",
  },
  {
    id: "stock2",
    conversationId: "stockists",
    from: "Scout",
    text: "Sipho found 12 boutiques. Juniper and Jade in Rosebank is a good place to start.",
    time: "16:20",
  },
  {
    id: "customer1",
    conversationId: "customerReplies",
    from: "Scout",
    text: "Thabo asked about order 1042. Grace has a reply ready for you to review before you send it.",
    time: "09:10",
  },
  {
    id: "start1",
    conversationId: "gettingStarted",
    from: "Scout",
    text: "Welcome, Lerato. The team is reading up on Lerato Designs. Plans usually arrive within the hour.",
    time: "09:00",
  },
];

export const sampleVoice: VoiceNote = {
  transcript: "Can we do something for the spring launch?",
  seconds: 12,
  url: "./assets/voice-note.wav",
  status: "ready",
};
export const samplePhoto: Attachment = {
  id: "linen-photo",
  name: "Spring-linen-background.png",
  size: 1840000,
  type: "image/png",
  kind: "image",
  url: "./assets/linen-background.png",
  ai: true,
};
export const sampleScreenshot: Attachment = {
  id: "customer-message",
  name: "Thabo-message.png",
  size: 20000,
  type: "image/png",
  kind: "image",
  url: "./assets/customer-message.png",
};
export const sampleDocument: Attachment = {
  id: "order-document",
  name: "Order-details.txt",
  size: 132,
  type: "text/plain",
  kind: "document",
  url:
    "data:text/plain;charset=utf-8," +
    encodeURIComponent(
      "Lerato Designs\nSpring linen collection\nSizes: XS to XL\nCollection launch: 1 November\nJohannesburg, South Africa\n",
    ),
  text: "Lerato Designs\nSpring linen collection\nSizes: XS to XL\nCollection launch: 1 November\nJohannesburg, South Africa",
};

export const commonConversationStates = [
  ["loading", "Loading"],
  ["loading-slow", "Taking longer"],
  ["offline", "Offline"],
  ["paused", "Team paused"],
  ["partner", "Partner view"],
  ["problem", "Problem"],
];
