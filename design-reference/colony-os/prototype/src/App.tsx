import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, X } from "lucide-react";
import registry from "./data/screen-registry.json";
import { caption, seedCards, slideTitles } from "./data/fixtures";
import { mockStore, useMock } from "./data/mock-store";
import { AppFrame } from "./components/AppFrame";
import { CardView } from "./components/CardView";
import { RemainingCardView } from "./components/RemainingCardView";
import { handleRemainingCardAction } from "./data/remaining-card-actions";
import { openDecisionCards } from "./data/card-queries";
import "./remaining-cards.css";
import {
  Banner,
  Button,
  CloseButton,
  Dialog,
  Empty,
  IconButton,
} from "./components/primitives";
import {
  DeferredDestination,
  ReviewControls,
  ReviewHome,
} from "./components/Review";
import { Today } from "./screens/Today";
import { Conversation } from "./screens/Conversation";
import { Conversations } from "./screens/Conversations";
import { NewConversation } from "./screens/NewConversation";
import { ConversationSearch } from "./screens/ConversationSearch";
import { Attachments, VoiceNotes } from "./screens/ConversationMedia";
import "./conversations.css";
import { NeedsYou } from "./screens/NeedsYou";
import { Team, EmployeePage } from "./screens/Team";
import { EmployeePlan } from "./screens/EmployeePlan";
import { EmployeeSchedule } from "./screens/EmployeeSchedule";
import { EmployeeActivity } from "./screens/EmployeeActivity";
import { EmployeeSettings } from "./screens/EmployeeSettings";
import { DirectChat } from "./screens/DirectChat";
import { NewHire } from "./screens/NewHire";
import { EmployeePlanCard } from "./components/EmployeePlanCard";
import { displayName } from "./data/team-actions";
import { deskEmployee, openDeskCount, photoAttachment, correctScout } from "./data/desk-actions";
import { EmployeeDesk } from "./screens/desks/EmployeeDesk";
import { CampaignDetail } from "./screens/desks/MayaDesk";
import { PhotoLibrary } from "./screens/desks/PhotoLibrary";
import { LeadDetail } from "./screens/desks/SiphoDesk";
import { DomainSetup } from "./screens/desks/DomainSetup";
import { CustomerDetail } from "./screens/desks/GraceDesk";
import { Knowledge } from "./screens/desks/Knowledge";
import { PasteCustomer } from "./screens/desks/PasteCustomer";
import { Settings } from "./screens/Settings";
import { FirstRun } from "./screens/FirstRun";
import { SystemSurface } from "./screens/SystemSurfaces";
import { OutsideSurface } from "./screens/OutsideSurfaces";
import { completeMockPayment, completeMockPlan, saveFirstRun } from "./data/first-run-actions";

import { NalediDesk } from "./screens/NalediDesk";
import { IdentityGallery } from "./screens/IdentityGallery";
import { Foundations } from "./screens/Foundations";
import type { Destination, EmployeeId, MessagePayload } from "./data/types";

function readRoute() {
  const [path, query = ""] = location.hash.slice(1).split("?");
  const p = new URLSearchParams(query);
  const id = (path || "/review").replace(/^\//, "");
  const entry = registry.screens.find((s) => s.id === id);
  return {
    id,
    state: p.get("state") || entry?.defaultState || "normal",
    theme: p.get("theme") || localStorage.getItem("colony-theme") || "system",
    form: p.get("form") || entry?.forms[0] || "screen",
    platform: p.get("platform") || "mac",
    employee: (p.get("employee") ||
      (id.startsWith("D-") ? deskEmployee(id) : id === "M-08"
        ? "Leo"
        : p.get("state") === "scout"
          ? "Scout"
          : "Naledi")) as EmployeeId,
    capture: p.get("capture") === "1",
    params: p,
  };
}
type Toast = { text: string; undo?: () => void; remaining: number };
export default function App() {
  const [route, setRoute] = useState(readRoute);
  const [deferred, setDeferred] = useState("");
  const [shortcuts, setShortcuts] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [zoom, setZoom] = useState(
    Number(localStorage.getItem("colony-zoom") || 1),
  );
  const toastPause = useRef(false);
  const newReturn = useRef<{
    id: string;
    state: string;
    params: Record<string, string>;
  }>({ id: "T-02", state: "normal", params: {} });
  const searchReturn = useRef<{
    id: string;
    state: string;
    params: Record<string, string>;
  }>({ id: "T-02", state: "normal", params: {} });
  const cardReturn = useRef<{
    id: string;
    state: string;
    params: Record<string, string>;
  }>({ id: "T-01", state: "normal", params: {} });
  const snapshot = useMock();
  useEffect(() => {
    const change = () => setRoute(readRoute());
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () =>
      (document.documentElement.dataset.theme =
        route.theme === "system"
          ? media.matches
            ? "dark"
            : "light"
          : route.theme);
    apply();
    localStorage.setItem("colony-theme", route.theme);
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [route.theme]);
  useEffect(() => {
    document.documentElement.style.fontSize = 14 * zoom + "px";
    localStorage.setItem("colony-zoom", String(zoom));
  }, [zoom]);
  useEffect(() => {
    const reconnect = () => mockStore.reconnect();
    window.addEventListener("online", reconnect);
    return () => window.removeEventListener("online", reconnect);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setInterval(() => {
      if (!toastPause.current)
        setToast((t) =>
          !t
            ? null
            : t.remaining <= 100
              ? null
              : { ...t, remaining: t.remaining - 100 },
        );
    }, 100);
    return () => clearInterval(timer);
  }, [!!toast]);
  const notice = (text: string, undo?: () => void) => {
    toastPause.current = false;
    setToast({ text, undo, remaining: 10000 });
  };
  const navigate: Destination = (id, state, extra = {}) => {
    if (
      /^(M-|D-)/.test(route.id) &&
      route.state === "offline" &&
      !state &&
      (/^(M-|D-|C-)/.test(id) || ["T-03", "T-04"].includes(id))
    )
      state = "offline";
    const selected = (extra.employee || route.employee) as EmployeeId;
    if (id === "M-02" && extra.restoreTab === "1") {
      const tabs = ["Desk", "Plan", "Schedule", "Activity", "Settings"];
      const remembered = snapshot.team.profiles[selected]?.tab || "Desk";
      id =
        ["M-02", "M-03", "M-04", "M-05", "M-06"][tabs.indexOf(remembered)] ||
        "M-02";
    }
    if (/^M-0[2-8]$/.test(id)) extra = { employee: selected, ...extra };
    if (id === "T-04" && route.id !== "T-04")
      newReturn.current = {
        id: route.id === "review" ? "T-02" : route.id,
        state: route.state,
        params: Object.fromEntries(route.params),
      };
    if (id === "T-06" && route.id !== "T-06")
      searchReturn.current = {
        id: route.id === "review" ? "T-02" : route.id,
        state: route.state,
        params: Object.fromEntries(route.params),
      };
    if (
      !registry.screens.some((s) => s.id === id) &&
      !["review", "foundations"].includes(id)
    ) {
      setDeferred(id);
      return;
    }
    if (id.startsWith("C-") && !route.id.startsWith("C-"))
      cardReturn.current = {
        id: route.id === "review" ? "T-01" : route.id,
        state: route.state,
        params: Object.fromEntries(route.params),
      };
    const p = new URLSearchParams({
      theme: extra.theme || route.theme,
      platform: extra.platform || route.platform,
      ...(route.capture ? { capture: "1" } : {}),
      ...(route.params.get("conversation") &&
      ["T-03", "T-06", "T-07", "T-08"].includes(id)
        ? { conversation: route.params.get("conversation")! }
        : {}),
      ...(route.params.get("person")
        ? { person: route.params.get("person")! }
        : route.state === "partner" && id !== route.id
          ? { person: "partner" }
          : {}),
      ...extra,
    });
    if (state) p.set("state", state);
    if (route.id === id && !extra.form && route.form !== "screen")
      p.set("form", route.form);
    location.hash = "/" + id + "?" + p.toString();
  };
  const closeCard = () => {
    const back = cardReturn.current;
    const last = route.params.get("planEmployee")
      ? "plan-" + route.params.get("planEmployee")
      : route.id;
    navigate(back.id, back.state, back.params);
    setTimeout(() => {
      const target =
        document.querySelector<HTMLElement>(
          '[data-card-id="' + last + '"] .card-title-button',
        ) || document.getElementById("main-content");
      target?.focus();
    }, 40);
  };
  const undo = () => {
    if (toast?.undo) {
      toast.undo();
      setToast(null);
    }
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const field =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement;
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "z" &&
        toast?.undo &&
        !field
      ) {
        e.preventDefault();
        undo();
        return;
      }
      if (
        e.key === "Escape" &&
        !field &&
        !route.id.startsWith("C-") &&
        !deferred
      ) {
        if (
          /^M-0[2-6]$/.test(route.id) &&
          !document.querySelector("dialog[open]")
        ) {
          navigate("M-01");
          setTimeout(
            () =>
              document
                .querySelector<HTMLButtonElement>(".employee-task")
                ?.focus(),
            40,
          );
        }
        return;
      }
      if (e.key === "/" && !field) {
        e.preventDefault();
        setShortcuts(true);
        return;
      }
      if (!(e.metaKey || e.ctrlKey)) return;
      const shortcuts: Record<string, string> = {
        "1": "T-01",
        "2": "T-02",
        "3": "M-01",
        ",": snapshot.settings.lastSection[route.state === "partner" || route.params.get("person") === "partner" ? "Kagiso" : "Lerato"],
        j: "T-05",
        k: "T-06",
        n: "T-04",
        w: "X-14",
        q: "X-15",
        f: "T-06",
      };
      if (shortcuts[e.key.toLowerCase()]) {
        e.preventDefault();
        navigate(shortcuts[e.key.toLowerCase()]);
      }
      if (["=", "+", "-", "0"].includes(e.key)) {
        e.preventDefault();
        setZoom((z) =>
          e.key === "0"
            ? 1
            : Math.min(1.3, Math.max(1, z + (e.key === "-" ? -0.15 : 0.15))),
        );
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  const actor =
    route.state === "partner" ||
    route.state === "owner-only" ||
    route.id.startsWith("P-") ||
    route.params.get("person") === "partner"
      ? "Kagiso"
      : "Lerato";
  const clearState = () => {
    if (route.id.startsWith("C-"))
      navigate(
        route.id,
        ["paused", "offline", "partner", "quote", "ad-spend"].includes(route.state)
          ? route.state
          : "waiting",
        {
          form: route.form,
          ...(route.params.get("network")
            ? {
                network: route.params.get("network")!,
                queuePosting: route.params.get("queuePosting") || "",
              }
            : {}),
          ...(route.params.get("post")
            ? { post: route.params.get("post")! }
            : {}),
        },
      );
  };
  const decide = (
    id: string,
    status: import("./data/types").CardStatus,
    note?: string,
  ) => {
    const previous = structuredClone(mockStore.get().cards[id]);
    const accepted = mockStore.decide(id, status, actor, note);
    if (!accepted) {
      notice("Kagiso already approved this at 10:42.");
      return;
    }
    clearState();
    notice(
      status === "ready"
        ? "Approved. Ready to post."
        : status === "changes"
          ? "Changes asked."
          : status === "declined"
            ? "Declined."
            : status === "skipped"
              ? "Skipped."
              : "Approved.",
      () => mockStore.restoreCard(id, previous),
    );
  };
  const action = async (id: string, actionName: string, value?: string) => {
    if (route.state === "let-go" || route.params.get("readOnly") === "1") {
      notice("Let go by Lerato on 3 Nov. This work is read-only.");
      return;
    }
    if (route.id.startsWith("C-") && /^C-(0[6-9]|1[0-9]|20)$/.test(id) && (route.state === "offline" || route.params.get("network") === "offline") && !["Copy script", "Copy caption", "Copy message", "Copy reply", "Copy text", "Copy email text", "Download PDF", "Save image", "Save attachments", "Try again"].includes(actionName)) {
      notice("You can decide when you're back online.");
      return;
    }
    if (await handleRemainingCardAction(id, actionName, value, { actor, state: route.state, navigate, notice, clearState })) return;
    if (
      (route.state === "offline" ||
        route.params.get("network") === "offline") &&
      [
        "Approve",
        "Approve all",
        "Decline",
        "Skip",
        "Send changes",
        "Answer",
        "You decide",
      ].includes(actionName)
    ) {
      notice("You can decide when you're back online.");
      return;
    }
    if (
      actionName === "Approve all" &&
      ["batch", "batch-mixed"].includes(route.state)
    ) {
      const before = structuredClone(mockStore.get().cards[id]);
      mockStore.approveBatch(id, actor);
      notice("Approved. Ready to post.", () =>
        mockStore.restoreCard(id, before),
      );
      return;
    }
    if (["Approve", "Approve all"].includes(actionName)) {
      decide(id, ["C-00", "C-04", "C-05"].includes(id) ? "ready" : "approved");
      return;
    }
    if (actionName === "Decline") {
      decide(id, "declined", value);
      return;
    }
    if (actionName === "Skip") {
      decide(id, "skipped", value);
      return;
    }
    if (actionName === "Send changes") {
      decide(
        id,
        "changes",
        (route.params.get("noteFor")
          ? route.params.get("noteFor") + ": "
          : "") + (value || ""),
      );
      return;
    }
    if (actionName === "Ask for changes") {
      navigate(id, "note", { form: "full", noteFor: value || "" });
      return;
    }
    if (actionName === "Answer" || actionName === "You decide") {
      const before = structuredClone(mockStore.get().cards[id]);
      mockStore.answer(id, value || "You decide.", actor);
      clearState();
      notice("Answered.", () => mockStore.restoreCard(id, before));
      return;
    }
    if (actionName === "Copy caption" || actionName === "Copy text") {
      await navigator.clipboard.writeText(
        actionName === "Copy text"
          ? "Sipho wants to offer Juniper and Jade 10 dresses on consignment."
          : caption,
      );
      notice(
        actionName === "Copy text"
          ? "Copied."
          : "Copied. Paste it into Instagram.",
      );
      return;
    }
    if (actionName === "Save images" || actionName === "Save files") {
      if (actionName === "Save files") {
        const url = URL.createObjectURL(
          new Blob(
            [
              "Sipho wants to offer Juniper and Jade 10 dresses on consignment.",
            ],
            { type: "text/plain" },
          ),
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = "Lerato-Designs-outreach.txt";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        notice("Saved 1 file to your Downloads folder.");
        return;
      }
      const count = id === "C-05" ? 6 : 1;
      for (let i = 1; i <= count; i++) {
        const link = document.createElement("a");
        link.href =
          "./assets/" +
          (id === "C-05"
            ? "carousel-" + String(i).padStart(2, "0") + ".png"
            : "social-post.png");
        link.download = "Lerato-Designs-" + String(i).padStart(2, "0") + ".png";
        link.click();
      }
      notice(
        "Saved " +
          count +
          " " +
          (count === 1 ? "image" : "images") +
          " to your Downloads folder.",
      );
      return;
    }
    if (actionName === "Open Instagram") {
      window.open(
        "https://www.instagram.com/leratodesigns/",
        "_blank",
        "noopener,noreferrer",
      );
      return;
    }
    if (actionName === "Post") {
      const before = structuredClone(mockStore.get().cards[id]);
      mockStore.post(
        id,
        value || "",
        actor,
        route.state === "offline" || route.params.get("network") === "offline",
      );
      clearState();
      notice(
        route.state === "offline" || route.params.get("network") === "offline"
          ? "Marked as posted. Waiting to send."
          : "Marked as posted.",
        () => mockStore.restoreCard(id, before),
      );
      return;
    }
    if (actionName === "Mark as sent") {
      decide(id, "sent");
      return;
    }
    if (actionName === "Undo the mark") {
      const c = mockStore.get().cards[id];
      mockStore.restoreCard(id, {
        ...c,
        status: "ready",
        postWaiting: false,
        postLink: undefined,
        history: [
          ...c.history,
          { text: "Undo the mark", person: actor, time: "18:05" },
        ],
      });
      clearState();
      notice("Mark undone.");
      return;
    }
    if (actionName === "Set time") {
      mockStore.schedule(id, value || "Wednesday 18:00");
      clearState();
      notice("Time changed.");
      return;
    }
    if (actionName === "Ask Scout") {
      navigate("T-03", "reply", { quote: seedCards[id].summary });
      return;
    }
    if (actionName === "Open post") {
      navigate(value === "0" ? "C-05" : "C-04", "ready", {
        post: value || "0",
      });
      return;
    }
    if (actionName === "Open latest version") {
      mockStore.revise(id);
      navigate(id, "waiting");
      return;
    }
    if (actionName === "Open the post") {
      const url = snapshot.cards[id].postLink;
      if (url && /^https?:\/\//.test(url))
        window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    if (actionName === "Remind Lerato") {
      notice("We've let Lerato know.");
      return;
    }
    if (actionName === "Try again") {
      navigate(route.id);
      return;
    }
  };
  const send = (
    text: string,
    payload: MessagePayload = {},
    reconnected = false,
  ) => {
    const offline =
      !reconnected &&
      (route.state === "offline" || route.state === "waiting-send");
    const newTopic = !["T-03", "T-07", "T-08"].includes(route.id);
    const routing = newTopic && /spring|launch|linen/i.test(text);
    const conversationId = newTopic
      ? mockStore.createTopic(text, actor, payload, routing)
      : route.params.get("conversation") || "spring";
    const messageId = newTopic
      ? mockStore.get().messages.at(-1)!.id
      : mockStore.send(
          text,
          actor,
          offline ? "Waiting to send" : "Sending",
          conversationId,
          payload,
        );
    if (newTopic)
      navigate(
        "T-03",
        offline
          ? "offline"
          : route.state.startsWith("paused")
            ? route.state
            : undefined,
        { conversation: conversationId },
      );
    else if (
      route.state === "new" ||
      route.state === "archived" ||
      route.state === "empty"
    )
      navigate("T-03", undefined, { conversation: conversationId });
    if (!offline && messageId)
      setTimeout(() => mockStore.deliver(messageId), 350);
    const correction = route.params.get("scoutCorrection");
    if (newTopic && correction && payload.quote && !offline) correctScout(correction, actor, conversationId, text);
    if (
      !offline &&
      !route.state.startsWith("paused") &&
      !route.state.includes("stopped")
    ) {
      const names = [
        "Scout",
        "Maya",
        "Naledi",
        "Sipho",
        "Leo",
        "Grace",
      ] as EmployeeId[];
      setTimeout(() => {
        const currentMessage = mockStore
          .get()
          .messages.find((m) => m.id === messageId);
        if (!currentMessage || currentMessage.text === "Message deleted")
          return;
        const text = currentMessage.text;
        const named = names.find(
          (n) => text.includes("@" + n) || text.includes("@" + displayName(n)),
        );
        const replyTopic = currentMessage.conversationId || "spring";
        mockStore.receive(
          correction && payload.quote ? "Got it. I'll remember how you want this handled next time." : named === "Naledi"
            ? "Next week's 5 posts are ready. Want to look now?"
            : named
              ? named + " is working on the spring launch."
              : text === "I want to plan a sale."
                ? "Nice. Which products, and when should it run?"
                : text === "I want to answer a customer."
                  ? "Paste the customer's message here, add a screenshot, or forward the email to lerato-designs@inbox.colony.global."
                  : payload.attachments?.some((f) => f.kind === "image") &&
                      /customer|Thabo|message/i.test(text)
                    ? "Grace will draft an answer. You'll see it here before you send it."
                    : newTopic && /more customers/i.test(text)
                      ? "Who would you like to reach, and what would you like to sell them?"
                      : newTopic && /website/i.test(text)
                        ? "What would you like to change on your website?"
                        : newTopic
                          ? "What would a good result look like?"
                          : conversationId === "website"
                            ? "Leo is preparing the spring banner. I'll bring it here for you to approve."
                            : conversationId === "stockists"
                              ? "Sipho is finding boutiques that stock local designers. I'll bring the first messages here for you to approve."
                              : "Naledi is drafting 3 posts for the spring launch.",
          named || "Scout",
          replyTopic,
        );
        if (newTopic && !routing)
          mockStore.renameTopic(
            conversationId,
            /sale/i.test(text)
              ? "Spring sale"
              : /customer/i.test(text)
                ? "Customer replies"
                : /website/i.test(text)
                  ? "Website update"
                  : "A new idea",
            actor,
            true,
          );
      }, 600);
    }
  };
  const renderCard = (
    id: string,
    state?: string,
    form: "inline" | "full" = "inline",
  ) => {
    const planName = (
      id.startsWith("plan/")
        ? id.slice(5)
        : id === "C-03"
          ? route.params.get("planEmployee")
          : null
    ) as EmployeeId | null;
    if (planName && snapshot.team.profiles[planName])
      return (
        <EmployeePlanCard
          {...props}
          key={"plan-" + planName}
          name={planName}
          state={
            route.params.get("network") === "offline"
              ? "offline"
              : state || "normal"
          }
          form={form}
          readOnly={
            snapshot.team.profiles[planName].retired ||
            route.params.get("readOnly") === "1"
          }
          onClose={form === "full" ? closeCard : undefined}
        />
      );
    const chosen = state || "normal";
    let card =
      chosen === "desk-offline"
        ? { ...snapshot.cards[id], status: "ready" as const }
        : snapshot.cards[id];
    if (id === "C-03" && chosen === "employee-plan")
      card = {
        ...card,
        from: "Naledi",
        title: "Naledi's plan for 13 to 26 October",
      };
    if (["batch", "batch-mixed"].includes(chosen))
      card = {
        ...card,
        title: "Next week's 5 posts",
        summary: "5 posts for 13 to 19 October",
      };
    if (route.params.has("post"))
      card = {
        ...card,
        title: slideTitles[Number(route.params.get("post"))] || card.title,
        summary: "Instagram feed · Spring launch",
      };
    if (route.state === "let-go") card = { ...card, status: "posted" };
    if (id === "C-00") {
      const sample: Record<string, Partial<typeof card>> = {
        "owner-only": {
          type: "Money request",
          title: "Colony credits",
          summary: "$18.40 in credits.",
          from: "Scout",
          ai: false,
        },
        hired: {
          type: "Hire proposal",
          title: "Naledi, Social Media Manager",
          summary: "Naledi is getting ready.",
          from: "Scout",
          ai: false,
        },
        paid: {
          type: "Money request",
          title: "Colony credits",
          summary: "$18.40 in credits.",
          from: "Scout",
          ai: false,
        },
        fixed: {
          type: "Problem",
          title: "Naledi ran into a problem and stopped. Restart her?",
          summary: "Naledi is drafting next week's 5 posts.",
          from: "Scout",
          ai: false,
        },
        live: {
          type: "Website change",
          title: "Spring banner",
          summary: "Your website is live.",
          from: "Leo",
          ai: false,
        },
        answered: {
          type: "Question",
          title: "Which sizes does the linen dress come in?",
          summary: "Answered by Lerato: XS to XL.",
          ai: false,
        },
        chosen: {
          type: "Images",
          title: "Spring linen background",
          summary: "Use the green dress instead.",
          ai: true,
        },
        "ready-send": {
          type: "Message draft",
          title: "Juniper and Jade, Rosebank",
          summary:
            "Sipho wants to offer Juniper and Jade 10 dresses on consignment.",
          from: "Sipho",
          ai: false,
        },
        sent: {
          type: "Message draft",
          title: "Juniper and Jade, Rosebank",
          summary:
            "Sipho wants to offer Juniper and Jade 10 dresses on consignment.",
          from: "Sipho",
          ai: false,
        },
      };
      card = { ...card, ...sample[chosen] };
    }
    if (id === "C-16") {
      if (["owner-only", "credits-out"].includes(chosen))
        card = { ...card, title: "Buy Colony credits", summary: "Credits will run out on Thursday at this pace." };
      else if (chosen === "hosting")
        card = { ...card, title: "Fix website hosting payment", summary: "The $10 monthly hosting payment didn't go through." };
      else if (chosen === "ad-spend")
        card = { ...card, title: "$20 Instagram ad this weekend?", summary: "Maya suggests a small ad. You would pay Instagram directly.", amount: "$20" };
    }
    if (id === "C-13" && chosen === "quote")
      card = { ...card, title: "Quote QUO-0042", summary: "Brightway Events · 30 uniforms · R8,450.00 valid until 31 October." };
    if (id === "C-19" && chosen === "friday")
      card = { ...card, title: "Your Friday wrap", summary: "A short look at what moved this week and what comes next." };
    if (id === "C-20" && chosen === "grouped")
      card = { ...card, title: "Four updates", summary: "Recent progress from your team." };
    if (/^C-(0[6-9]|1[0-9]|20)$/.test(id))
      return <RemainingCardView
        key={id + "-" + chosen + "-" + form}
        card={card}
        state={chosen}
        form={form}
        partner={actor === "Kagiso"}
        offlineOverride={route.params.get("network") === "offline"}
        readOnly={route.state === "let-go" || route.params.get("readOnly") === "1"}
        onOpen={() => navigate(id, state, { form: "full" })}
        onClose={form === "full" ? closeCard : undefined}
        onDestination={navigate}
        onAction={(name, value) => action(id, name, value)}
        business={snapshot.settings.business}
      />;
    return (
      <CardView
        key={id + "-" + chosen + "-" + form}
        card={card}
        state={chosen}
        form={form}
        partner={actor === "Kagiso"}
        offlineOverride={route.params.get("network") === "offline" || (chosen === "conversation" && route.state === "offline")}
        allowOfflineMark={
          chosen === "desk-offline" || route.params.get("queuePosting") === "1"
        }
        readOnly={
          route.state === "let-go" || route.params.get("readOnly") === "1"
        }
        noteTarget={route.params.get("noteFor") || ""}
        onOpen={() =>
          navigate(id, chosen === "desk-offline" ? "ready" : state, {
            form: "full",
            ...(chosen === "desk-offline"
              ? { network: "offline", queuePosting: "1" }
              : {}),
            ...(route.state === "let-go" ? { readOnly: "1" } : {}),
          })
        }
        onClose={form === "full" ? closeCard : undefined}
        onDestination={navigate}
        onAction={(a, v) => action(id, a, v)}
        onApproveOne={(name) => {
          mockStore.approveOne(id, name);
          notice(name + "'s plan approved.");
        }}
        onBatch={(index, status, note) => {
          mockStore.batch(id, index, status, note, actor);
          notice(
            status === "ready"
              ? "Approved."
              : status === "changes"
                ? "Changes asked."
                : "Skipped.",
          );
        }}
      />
    );
  };
  const props = {
    state: route.state,
    partner: actor === "Kagiso",
    onDestination: navigate,
    renderCard,
    onSend: send,
    onNotice: (s: string, callback?: () => void) =>
      notice(
        s,
        callback ||
          (s === "Message deleted"
            ? (window as unknown as { __lastUndo?: () => void }).__lastUndo
            : undefined),
      ),
  };
  let content: ReactNode;
  if (/^(G-0[2-68]|X-)/.test(route.id) && route.id !== "G-07")
    content = <SystemSurface id={route.id} state={route.state} platform={route.platform} partner={actor === "Kagiso"} onDestination={navigate} onNotice={notice} key={route.id + route.state + route.platform} />;
  else if (route.id === "T-02")
    content = <Conversations {...props} key={route.state} />;
  else if (route.id === "T-04")
    content = ["first-sent", "routing"].includes(route.state) ? (
      <Conversation {...props} key={route.state} previewNew />
    ) : (
      <NewConversation
        {...props}
        key={
          route.state +
          (route.params.get("prefill") || "") +
          (route.params.get("quote") || "")
        }
        prefill={route.params.get("prefill") || ""}
        initialQuote={route.params.get("quote") || ""}
        onClose={() => {
          const back = newReturn.current;
          navigate(back.id, back.state, back.params);
        }}
        onConnectedSend={(text, payload) => send(text, payload, true)}
      />
    );
  else if (route.id === "T-06")
    content = (
      <ConversationSearch
        {...props}
        key={route.state}
        initial={route.params.get("query") || ""}
        onClose={() => {
          const back = searchReturn.current;
          navigate(back.id, back.state, back.params);
        }}
      />
    );
  else if (route.id === "T-07")
    content = <VoiceNotes {...props} key={route.state} />;
  else if (route.id === "T-08")
    content = <Attachments {...props} key={route.state} />;
  else if (route.id === "T-03")
    content = (
      <Conversation
        {...props}
        key={route.state + (route.params.get("conversation") || "spring") + (route.params.get("thread") || "")}
        conversationId={route.params.get("conversation") || "spring"}
        highlight={route.params.get("message") || ""}
        initialThread={route.params.get("thread") || ""}
        initialQuote={route.params.get("quote") || ""}
      />
    );
  else if (route.id === "T-05")
    content = <NeedsYou {...props} key={route.state} />;
  else if (route.id === "M-01") content = <Team {...props} />;
  else if (route.id === "M-02")
    content = <EmployeePage {...props} name={route.employee} />;
  else if (route.id === "M-03")
    content = (
      <EmployeePlan
        {...props}
        key={route.employee + route.state}
        name={route.employee}
      />
    );
  else if (route.id === "M-04")
    content = (
      <EmployeeSchedule
        {...props}
        key={route.employee + route.state}
        name={route.employee}
      />
    );
  else if (route.id === "M-05")
    content = (
      <EmployeeActivity
        {...props}
        key={route.employee + route.state}
        name={route.employee}
      />
    );
  else if (route.id === "M-06")
    content = (
      <EmployeeSettings
        {...props}
        key={route.employee + route.state}
        name={route.employee}
      />
    );
  else if (route.id === "M-07")
    content = (
      <DirectChat
        {...props}
        key={route.employee + route.state}
        name={route.employee}
        quote={route.params.get("quote") || ""}
        initialFiles={route.params.get("photo") ? snapshot.desks.photos.filter(p=>p.id===route.params.get("photo")&&!p.excluded).map(photoAttachment) : []}
      />
    );
  else if (route.id === "M-08")
    content = (
      <NewHire
        {...props}
        key={route.employee + route.state}
        name={route.employee}
        autoOpen={!route.capture}
      />
    );
  else if (/^D-0[1-6]$/.test(route.id))
    content = <EmployeeDesk {...props} key={route.id+route.state} name={deskEmployee(route.id)}/>;
  else if (route.id === "D-02a") content = <CampaignDetail {...props} key={route.state+(route.params.get("campaign")||"spring")}/>;
  else if (route.id === "D-03a") content = <PhotoLibrary {...props} key={route.state}/>;
  else if (route.id === "D-04a") content = <LeadDetail {...props} key={route.state+(route.params.get("lead")||"juniper")}/>;
  else if (route.id === "D-05a") content = <DomainSetup {...props} key={route.state}/>;
  else if (route.id === "D-06a") content = <CustomerDetail {...props} key={route.state+(route.params.get("customer")||"thabo")}/>;
  else if (route.id === "D-06b") content = <Knowledge {...props} key={route.state}/>;
  else if (route.id === "D-06c") content = <PasteCustomer {...props} key={route.state+(route.params.get("customer")||"")}/>;
  else if (route.id.startsWith("S-")) content = <Settings {...props} id={route.id} theme={route.theme} platform={route.platform} onTextSize={(value) => setZoom(value === "default" ? 1 : value === "large" ? 1.15 : 1.3)} key={route.id + route.state} />;
  else if (route.id === "G-07") content = <IdentityGallery {...props} />;
  else if (route.id.startsWith("C-"))
    content =
      route.form === "inline" ? (
        <div className="inline-specimen">
          <header className="page-heading">
            <span className="eyebrow">Spring launch</span>
            <h1>Needs you.</h1>
          </header>
          {renderCard(route.id, route.state, "inline")}
        </div>
      ) : (
        <Today {...props} state="normal" />
      );
  else if (
    route.id === "G-01" &&
    ["signed-out", "update-required"].includes(route.state)
  )
    content = (
      <Empty
        text={
          route.state === "signed-out"
            ? "You have been signed out. Sign in to carry on."
            : "Update Colony to carry on."
        }
        action={route.state === "signed-out" ? "Sign in" : "Update Colony"}
        onAction={() =>
          navigate(route.state === "signed-out" ? "O-01" : "X-11")
        }
      />
    );
  else
    content = (
      <Today
        {...props}
        state={route.state === "reopening" ? "before-brief" : route.state}
      />
    );
  const bannerInfo = globalBanner(
    route.params.get("network") === "offline" ? "offline" : snapshot.paused && ["normal", "partner", "credits", "live"].includes(route.state) ? "paused-person" : route.state,
    actor === "Kagiso",
    snapshot.paused ? snapshot.settings.running.pausedBy : undefined,
  );
  const count =
    openDecisionCards(snapshot).length +
    Object.values(snapshot.team.plans).filter(
      (p) => p.status === "waiting" || p.status === "changes",
    ).length + openDeskCount(snapshot);
  const toastElement = toast && (
    <div
      className="toast"
      role="status"
      onMouseEnter={() => (toastPause.current = true)}
      onMouseLeave={() =>
        (toastPause.current = !!document.activeElement?.closest(".toast"))
      }
      onFocus={() => (toastPause.current = true)}
      onBlur={(e) => {
        toastPause.current =
          e.currentTarget.matches(":hover") ||
          e.currentTarget.contains(e.relatedTarget);
      }}
    >
      <Check size={16} />
      <span>{toast.text}</span>
      {toast.undo && (
        <Button tone="quiet" onClick={undo}>
          Undo
        </Button>
      )}
      {toast.undo && (
        <span
          className="toast-timer"
          aria-label={Math.ceil(toast.remaining / 1000) + " seconds to undo"}
        >
          {Math.ceil(toast.remaining / 1000)}s
        </span>
      )}
      <IconButton label="Dismiss confirmation" onClick={() => setToast(null)}>
        <X size={14} />
      </IconButton>
    </div>
  );
  const fullCard = route.id.startsWith("C-") && route.form === "full";
  const reviewControls = !route.capture && route.id !== "review" && (
    <ReviewControls
      id={route.id}
      state={route.state}
      theme={route.theme}
      form={route.form}
      platform={route.platform}
      person={actor === "Kagiso" ? "partner" : "owner"}
      onDestination={navigate}
      onReview={() => navigate("review")}
      onReset={() => {
        mockStore.reset();
        notice("Mock data reset.");
      }}
    />
  );
  const externalReturn = !route.capture && (
    route.id === "O-01" && route.state === "waiting-google" ||
    route.id === "O-05" && route.state === "waiting-payment" ||
    route.id === "O-06" && route.state === "waiting-browser"
  ) ? <div className="run-review-sim" data-review-ui><strong>Design review only</strong><Button tone="quiet" onClick={() => {
    if (route.id === "O-01") {
      const intent = snapshot.firstRun.intent;
      saveFirstRun({ email: snapshot.firstRun.email || (intent === "invite" ? "kagiso@leratodesigns.co.za" : "lerato@leratodesigns.co.za") });
      navigate(intent === "invite" ? "P-01" : intent === "other-computer" ? "N-01" : intent === "returning" && snapshot.firstRun.teamReady ? "T-01" : "O-03");
    } else if (route.id === "O-05") {
      completeMockPayment();
      navigate("O-05", "paid");
    } else {
      completeMockPlan();
      navigate("O-06", "connected");
    }
  }}>Show return from browser</Button></div> : null;
  const externalFormReturn = !route.capture && route.id === "W-08" && route.state === "form-sent" ? <div className="run-review-sim" data-review-ui><strong>Design review only</strong><Button tone="quiet" onClick={() => navigate("D-06a", "to-reply", { customer: "thabo" })}>Show this message reaching Grace</Button></div> : null;
  return (
    <>
      {!fullCard && reviewControls}
      {route.id === "review" ? (
        <ReviewHome
          onDestination={navigate}
          onFoundations={() => navigate("foundations")}
        />
      ) : route.id === "foundations" ? (
        <Foundations {...props} />
      ) : route.id.startsWith("W-") ? (
        <OutsideSurface id={route.id} state={route.state} platform={route.platform} origin={route.params.get("from") || undefined} onDestination={navigate} onNotice={notice} key={route.id + route.state} />
      ) : /^(O-|P-|N-)/.test(route.id) ? (
        <FirstRun id={route.id} state={route.state} partner={actor === "Kagiso"} platform={route.platform} capture={route.capture} params={route.params} onDestination={navigate} onNotice={notice} />
      ) : (
        <AppFrame
          id={route.id}
          state={route.state}
          platform={route.platform}
          partner={actor === "Kagiso"}
          count={
            route.state === "empty" && ["T-01", "T-05"].includes(route.id)
              ? 0
              : count
          }
          onDestination={navigate}
          banner={
            bannerInfo && (
              <Banner
                {...bannerInfo}
                onAction={() => {
                  if (bannerInfo.action === "Resume team") {
                    mockStore.resume();
                    navigate(route.id);
                    notice("Team resumed.");
                  } else if (bannerInfo.action?.includes("Restart"))
                    navigate(
                      route.id,
                      route.id === "M-02" ? "starting" : "first-day",
                    );
                  else if (bannerInfo.action === "Remind Lerato")
                    notice("We've let Lerato know.");
                  else navigate(bannerInfo.to || route.id);
                }}
              />
            )
          }
        >
          {content}
        </AppFrame>
      )}
      {externalReturn}
      {externalFormReturn}
      {fullCard ? (
        <Dialog
          title={seedCards[route.id].title}
          onClose={closeCard}
          className="card-dialog"
        >
          {reviewControls}
          <div className="dialog-close-top">
            <CloseButton onClose={closeCard} />
          </div>
          {renderCard(route.id, route.state, "full")}
          {toastElement}
        </Dialog>
      ) : (
        toastElement
      )}
      {deferred && (
        <DeferredDestination id={deferred} onClose={() => setDeferred("")} />
      )}
      {shortcuts && (
        <Dialog
          title="Keyboard shortcuts"
          onClose={() => setShortcuts(false)}
          className="shortcuts-dialog"
        >
          <CloseButton onClose={() => setShortcuts(false)} />
          <h2>Keyboard shortcuts</h2>
          {[
            ["Today", "⌘ / Ctrl 1"],
            ["Conversations", "⌘ / Ctrl 2"],
            ["Team", "⌘ / Ctrl 3"],
            ["Settings", "⌘ / Ctrl ,"],
            ["Needs you", "⌘ / Ctrl J"],
            ["Search", "⌘ / Ctrl K"],
            ["New conversation", "⌘ / Ctrl N"],
            ["Find in conversation", "⌘ / Ctrl F"],
            ["Record voice note", "⌘ / Ctrl Shift R"],
            ["Add files", "⌘ / Ctrl Shift A"],
            ["Send", "Enter"],
            ["New line", "Shift Enter"],
            ["Card primary action", "⌘ / Ctrl Enter"],
            ["Close", "Esc"],
            ["Undo", "⌘ / Ctrl Z"],
            ["Larger text", "⌘ / Ctrl +"],
            ["Smaller text", "⌘ / Ctrl -"],
            ["Default text", "⌘ / Ctrl 0"],
          ].map(([label, key]) => (
            <div key={label}>
              <span>{label}</span>
              <kbd>{key}</kbd>
            </div>
          ))}
        </Dialog>
      )}
    </>
  );
}
function globalBanner(
  state: string,
  partner: boolean,
  pausedBy?: string,
): { text: string; action?: string; to?: string } | null {
  const all: Record<string, { text: string; action?: string; to?: string }> = {
    offline: { text: "You're offline. Your team waits until you're back." },
    "waiting-send": {
      text: "You're offline. Your team waits until you're back.",
    },
    unreachable: {
      text: "Colony isn't answering right now. Your work is safe, and we'll keep trying.",
      action: "Try again",
    },
    "paused-credits": {
      text: partner
        ? "Only Lerato can buy credits"
        : "The team is paused because credits ran out. Buy credits to carry on.",
      action: partner ? "Remind Lerato" : "Buy credits",
      to: "S-02",
    },
    "paused-plan": {
      text: "Your Claude plan limit is reached until 14:00. The team will carry on then.",
      action: "See your plan",
      to: "S-03",
    },
    "paused-person": {
      text: "Paused by " + (pausedBy || "Kagiso") + " at 14:05. Resume when you're ready.",
      action: "Resume team",
    },
    paused: {
      text: "Paused by " + (pausedBy || "Kagiso") + " at 14:05. Resume when you're ready.",
      action: "Resume team",
    },
    "team-stopped": {
      text: "Your team has stopped.",
      action: "Restart the team",
    },
    "scout-stopped": { text: "Scout has stopped.", action: "Restart Scout" },
    "computer-off": {
      text: "The team runs on Lerato's MacBook, which is off or asleep. Messages wait until it's back on.",
    },
    "stopped-elsewhere": {
      text: "Your team has stopped. Restart from Lerato's MacBook.",
    },
  };
  return all[state] || null;
}
