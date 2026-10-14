import { mockStore } from "./mock-store";
import type { Card, CardStatus, Destination, Person } from "./types";
import { boutiqueLeads } from "./remaining-card-fixtures";

type Context = {
  actor: Person;
  state: string;
  navigate: Destination;
  notice: (text: string, undo?: () => void) => void;
  clearState: () => void;
};

function download(name: string, data: Blob | string, type = "text/plain") {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function simplePdf(lines: string[]) {
  const safe = lines.map(line => line.normalize("NFKD").replace(/[^\x20-\x7E]/g, "").replace(/[\\()]/g, "\\$&"));
  const stream = "BT /F1 12 Tf 50 780 Td 18 TL " + safe.map((line, index) => (index ? "T* " : "") + "(" + line + ") Tj").join(" ") + " ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset => { pdf += String(offset).padStart(10, "0") + " 00000 n \n"; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

const videoScript = "Three ways to wear the linen shirt.\n1. Show the linen shirt on a hanger.\n2. Film the fabric in sunlight.\n3. Wear it loose with jeans.\n4. Tie it over the Kaya dress.\n5. Tuck it into linen trousers.\nVoiceover: One shirt, three days. Wear it loose, tie it over a dress, or tuck it in. Which would you choose?";
const socialCaption = "One linen shirt, three easy looks for Johannesburg spring. Which one is you? #LeratoDesigns #SpringLinen";
const messageText = "Hi Juniper and Jade,\n\nI'm Lerato, the founder of Lerato Designs in Johannesburg. I love how you bring local labels into your store. Our new spring linen collection might be a fit for your rail. Could I send you a short line sheet and a few pieces to look at?\n\nWarmly,\nLerato";
const replyText = "Hi Thabo,\n\nThanks for checking in. Your order shipped on Monday and is on its way. You can follow it here: leratodesigns.co.za/track/1042. It should reach you within 3 to 5 working days in Gauteng. If it hasn't arrived by Friday, reply here and we'll help.\n\nWarmly,\nLerato Designs";
const documentLines = ["Lerato Designs - FAQ and policies", "Delivery: Gauteng orders arrive in 3 to 5 working days.", "Returns: unworn items with a receipt may be returned within 14 days.", "Sizes: XS to XL.", "Payment: card through our checkout link."];
function invoiceLines(quote: boolean) {
  const business = mockStore.get().settings.business;
  return [
    `${business.registeredName || "Lerato Designs"} - ${quote ? "QUOTE QUO-0042" : "INVOICE INV-0042"}`,
    "For: Brightway Events, accounts@brightway.co.za",
    "30 linen uniforms: 30 x R250.00 = R7,500.00",
    "Alterations: 1 x R950.00 = R950.00",
    "Subtotal: R8,450.00",
    business.vat ? `VAT number: ${business.vat}. Confirm VAT amount before sending.` : "VAT: not charged",
    business.vat ? "TOTAL: confirm VAT amount before sending" : "TOTAL: R8,450.00",
    `${quote ? "Valid until" : "Due"}: 31 October 2026`,
    business.banking ? `Payment details: ${business.banking}` : "Banking details were not provided.",
  ];
}
function invoiceEmailText() {
  return mockStore.get().settings.business.vat
    ? "Please review the VAT amount and total on invoice INV-0042, then attach the corrected PDF before sending."
    : "Please find invoice INV-0042 attached. Total R8,450.00 due 31 October.\n\nPlease attach the PDF before sending.";
}

export async function handleRemainingCardAction(id: string, action: string, value: string | undefined, { actor, state, navigate, notice, clearState }: Context): Promise<boolean> {
  if (!/^C-(0[6-9]|1[0-9]|20)$/.test(id)) return false;
  const card = mockStore.get().cards[id];
  if (!card) return true;
  const ownerOnly = id === "C-16" && ["owner-only", "credits-out", "hosting"].includes(state);
  if (actor === "Kagiso" && ownerOnly && action !== "Remind Lerato") { notice("Only Lerato can approve this."); return true; }
  const before = structuredClone(card);
  const move = (next: CardStatus, allowed: CardStatus[], note?: string, patch: Partial<Card> = {}) => {
    const reviewState = state as CardStatus;
    const reviewAllowed = card.status === "waiting" && allowed.includes(reviewState) ? [...allowed, "waiting" as CardStatus] : allowed;
    const ok = mockStore.transitionCard(id, next, actor, reviewAllowed, note, patch);
    if (!ok) { notice("This card has already moved on. Open the latest version."); return; }
    clearState();
    notice((next === "ready-send" ? "Approved. Ready for you to send." : next === "to-film" ? "Approved. Ready to film." : next === "to-post" ? "Filmed. Ready to post." : next === "going-live" ? "Making the website change live." : next === "changes" ? "Changes asked." : next === "undone" ? "Website change undone." : next === "chosen" ? "Images chosen." : next === "sent" ? "Marked as sent." : next === "read" ? "Marked as read." : next === "approved" ? "Approved." : next === "declined" ? "Declined." : next === "skipped" ? "Skipped." : next === "hired" ? "Hired. Getting started." : next === "not-now" ? "Scout will ask again in 30 days." : next === "restarting" ? "Restarting Naledi." : next === "paused" ? "Naledi paused." : next === "paid" ? "Marked as paid." : next === "posted" ? "Marked as posted." : next === "more-asked" ? "Naledi will make another set." : next === "cancelled" ? "Cancelled." : next === "accepted" ? "Accepted." : next === "not-accepted" ? "Not accepted." : "Updated."), () => mockStore.restoreCard(id, before));
  };
  if (action === "Try again" && state === "problem") { navigate(id); return true; }
  if (action === "Remind Lerato") { notice("Lerato has a reminder in this local preview."); return true; }
  if (action === "Toggle shot") {
    const index = Number(value);
    if (!Number.isInteger(index) || index < 0 || index > 4) return true;
    mockStore.updateCard(id, current => ({ ...current, completedShots: current.completedShots?.includes(index) ? current.completedShots.filter(i => i !== index) : [...(current.completedShots || []), index] }));
    return true;
  }
  if (action === "Approve" || action === "Make it live" || action === "Make it live now" || action === "Hire") {
    const next: CardStatus = action === "Hire" ? "hired" : action.startsWith("Make it live") ? "going-live" : id === "C-06" ? "to-film" : ["C-08", "C-09", "C-13"].includes(id) ? "ready-send" : "approved";
    move(next, action === "Make it live now" ? ["scheduled"] : ["waiting", "changes"]);
    if (next === "going-live") window.setTimeout(() => mockStore.transitionCard(id, "live", "Leo", ["going-live"]), 850);
    if (next === "hired") window.setTimeout(() => navigate("M-08", "starting", { employee: card.displayName || "Leo" }), 500);
    return true;
  }
  if (action === "Ask for changes") { move("changes", ["waiting", "to-film", "to-post", "ready-send"], value || "Please revise this."); return true; }
  if (action === "Decline" || action === "Decline all" || action === "None of these") { move("declined", ["waiting", "changes"], value || undefined); return true; }
  if (action === "Skip" || action === "Skip this week") { move("skipped", ["waiting", "to-post", "missed"], value || undefined); return true; }
  if (action === "Mark as filmed") { move("to-post", ["to-film"], undefined, { completedShots: [0, 1, 2, 3, 4] }); return true; }
  if (action === "Mark as posted") { move("posted", ["to-post", "missed"], undefined, { postLink: value || undefined }); return true; }
  if (action === "Use this") {
    const selected = (value || "").split(",").map(Number).filter(n => Number.isInteger(n) && n >= 0 && n < 4);
    if (!selected.length) { notice("Choose at least one image."); return true; }
    move("chosen", ["waiting"], undefined, { selectedOptions: selected });
    return true;
  }
  if (action === "More like this") { if (state === "credits-out") notice("Out of credits. Lerato can buy more in billing."); else move("more-asked", ["waiting"]); return true; }
  if (action === "Approve chosen") {
    const selected = (value || "").split(",").map(Number).filter(n => Number.isInteger(n) && n >= 0 && n < boutiqueLeads.length);
    if (!selected.length) { notice("Choose at least one boutique."); return true; }
    move("approved", ["waiting"], selected.length + " chosen", { selectedLeads: selected });
    return true;
  }
  if (action === "Remove lead") {
    let selection: { index: number; reason?: string };
    try { selection = JSON.parse(value || "{}"); } catch { return true; }
    const { index, reason } = selection;
    if (!Number.isInteger(index) || index < 0 || index >= boutiqueLeads.length) return true;
    mockStore.updateCard(id, current => ({
      ...current,
      removedLeads: [...new Set([...(current.removedLeads || []), index])],
      selectedLeads: (current.selectedLeads || []).filter(i => i !== index),
      history: [...current.history, { text: `Removed ${boutiqueLeads[index][0]}${reason?.trim() ? `: ${reason.trim()}` : ""}`, person: actor, time: "just now" }],
    }));
    notice(reason?.trim() ? `Lead removed: ${reason.trim()}` : "Lead removed from this list.", () => mockStore.restoreCard(id, before));
    return true;
  }
  if (action === "More like this one") { mockStore.transitionCard(id, "waiting", actor, ["waiting"], "Find more shops like " + (boutiqueLeads[Number(value) || 0]?.[0] || boutiqueLeads[0][0])); notice("Sipho will look for similar shops."); return true; }
  if (action === "Mark as sent") { move("sent", ["ready-send"]); return true; }
  if (action === "Undo the mark") { move(id === "C-06" ? "to-post" : "ready-send", ["sent", "posted"], "Mark undone"); return true; }
  if (action === "Add their reply") { if (!value?.trim()) return true; move("replied", ["sent"], value.trim()); return true; }
  if (action === "Mark as paid" || action === "Accepted" || action === "Not accepted" || action === "Cancel") { move(action === "Mark as paid" ? "paid" : action === "Accepted" ? "accepted" : action === "Not accepted" ? "not-accepted" : "cancelled", ["sent", "overdue"]); return true; }
  if (action === "Undo") { move("undone", ["live"]); return true; }
  if (action === "Try again" && id === "C-10") { move("going-live", ["failed-live"]); window.setTimeout(() => mockStore.transitionCard(id, "live", "Leo", ["going-live"]), 850); return true; }
  if (action === "Restart") { move("restarting", ["open", "still-failing"]); window.setTimeout(() => mockStore.transitionCard(id, "fixed", "Scout", ["restarting"]), 850); return true; }
  if (action === "Pause") { move("paused", ["open", "still-failing"]); return true; }
  if (action === "Not now") { move("not-now", ["waiting"], value); return true; }
  if (action === "Change name") { if (value?.trim()) { mockStore.updateCard(id, current => ({ ...current, displayName: value.trim(), title: "Hire " + value.trim() + " as Website Builder?" })); notice("Name changed."); } return true; }
  if (action === "Change amount") { if (value?.trim()) { mockStore.updateCard(id, current => ({ ...current, amount: value.trim() })); notice("Amount changed."); } return true; }
  if (action === "Send numbers") {
    try { const input = JSON.parse(value || "{}"); if (!/^\d+$/.test(input.orders) || input.sales && !/^\d+(?:\.\d{1,2})?$/.test(input.sales) || input.followers && !/^\d+$/.test(input.followers)) { notice("Just the number, please."); return true; } move("sent", ["waiting"], undefined, { checkIn: input }); }
    catch { notice("Just the number, please."); }
    return true;
  }
  if (action === "Mark as read") { mockStore.updateCard(id, current => ({ ...current, readBy: [...new Set([...(current.readBy || []), actor])] })); notice("Brief marked as read for you."); return true; }
  if (action === "Reply" || action === "Tell Scout") { navigate(action === "Reply" ? "T-04" : "T-03", undefined, { quote: card.summary, conversation: "spring" }); return true; }
  if (action === "Past briefs") { navigate("D-01"); return true; }
  if (action === "Get help") { navigate("S-09", undefined, { topic: "Naledi stopped" }); return true; }
  if (action === "Open website change") { navigate("C-10", "live"); return true; }
  if (action === "See it live") { navigate("D-05", "live"); return true; }
  if (action === "Open latest version") { mockStore.revise(id); navigate(id); return true; }
  if (action === "Buy credits" || action === "Fix billing") { navigate("S-02"); return true; }
  if (action === "Open Instagram") { window.open("https://www.instagram.com/leratodesigns/", "_blank", "noopener,noreferrer"); return true; }
  if (action === "Open your email app") { const customer = id === "C-09", invoice = id === "C-13"; window.location.href = `mailto:${customer ? "thabo@example.com" : invoice ? "accounts@brightway.co.za" : "hello@juniperandjade.co.za"}?subject=${encodeURIComponent(customer ? "Re: Order 1042" : invoice ? "Lerato Designs invoice INV-0042" : "Lerato Designs spring collection")}&body=${encodeURIComponent(customer ? replyText : invoice ? invoiceEmailText() : messageText)}`; return true; }
  if (action.startsWith("Copy ")) {
    const content = action === "Copy script" ? videoScript : action === "Copy caption" ? socialCaption : action === "Copy reply" ? replyText : action === "Copy email text" ? invoiceEmailText() : action === "Copy text" ? documentLines.join("\n") : messageText;
    await navigator.clipboard.writeText(content);
    notice("Copied.");
    return true;
  }
  if (action === "Download PDF") { const quote = id === "C-13" && state === "quote"; download(id === "C-13" ? `Lerato-Designs-${quote ? "QUO" : "INV"}-0042.pdf` : "Lerato-Designs-FAQ.pdf", simplePdf(id === "C-13" ? invoiceLines(quote) : documentLines)); notice("PDF saved to Downloads."); return true; }
  if (action === "Save attachments") { download("Lerato-Designs-line-sheet.pdf", simplePdf(["Lerato Designs - spring collection", "Linen shirt R720", "Kaya dress R899", "Sizes XS to XL"])); notice("Attachment saved to Downloads."); return true; }
  if (action === "Save image") {
    const index = Number(value ?? card.selectedOptions?.[0] ?? 0);
    if (index === 0) { const link = document.createElement("a"); link.href = "./assets/linen-background.png"; link.download = "spring-background-1.png"; link.click(); }
    else { const colors = [["#d4b49f", "#f4e9d9"], ["#ded0b8", "#aa8a73"], ["#e8d8c2", "#b3a698"]][index - 1]; const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><defs><linearGradient id="g"><stop stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient></defs><rect width="1200" height="800" fill="url(#g)"/><circle cx="910" cy="180" r="105" fill="#f9e7ca"/></svg>`; download(`spring-background-${index+1}.svg`, svg, "image/svg+xml"); }
    notice("Image saved to Downloads.");
    return true;
  }
  if (action === "Add logo") { const input = document.createElement("input"); input.type = "file"; input.accept = "image/*"; input.onchange = () => { const file = input.files?.[0]; if (!file) return; mockStore.updateCard(id, current => ({ ...current, note: "Logo selected: " + file.name })); notice("Logo selected for this local preview."); }; input.click(); return true; }
  return true;
}
