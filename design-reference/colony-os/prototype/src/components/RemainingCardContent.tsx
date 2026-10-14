import { useState, type KeyboardEvent } from "react";
import { Check, ExternalLink } from "lucide-react";
import type { Card, CardStatus, Destination } from "../data/types";
import { boutiqueLeads } from "../data/remaining-card-fixtures";
import { Avatar, Button } from "./primitives";

const shots = [
  ["Show the linen shirt on a hanger", "3 sec", "Three ways to wear it"],
  ["Close-up of the fabric in sunlight", "3 sec", "Made for warm days"],
  ["Wear it loose with jeans", "4 sec", "One: easy"],
  ["Tie it over the Kaya dress", "4 sec", "Two: layered"],
  ["Tuck it into the linen trousers", "6 sec", "Three: ready to go"],
];
const imageNames = ["Morning linen", "Soft plaster", "City light", "Warm shadows"];

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="remaining-detail"><span>{label}</span><strong>{children}</strong></div>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="remaining-section"><h2>{title}</h2>{children}</section>;
}

export function RemainingCardContent({ card, state, status, inline, selectedOptions, onSelectOption, selectedLeads, onSelectLead, device, onDevice, onAction, onDestination, business }: {
  card: Card;
  state: string;
  status: CardStatus;
  inline: boolean;
  selectedOptions: number[];
  onSelectOption: (index: number) => void;
  selectedLeads: number[];
  onSelectLead: (index: number) => void;
  device: "computer" | "phone";
  onDevice: (device: "computer" | "phone") => void;
  onAction: (name: string, value?: string) => void;
  onDestination: Destination;
  business: { registeredName: string; vat: string; banking: string };
}) {
  const [orders, setOrders] = useState(card.checkIn?.orders || (state === "invalid-number" ? "four" : ""));
  const [sales, setSales] = useState(card.checkIn?.sales || "");
  const [followers, setFollowers] = useState(card.checkIn?.followers || "");
  const [extra, setExtra] = useState(card.checkIn?.note || "");
  const [invalid, setInvalid] = useState(state === "invalid-number");
  const [showAllLeads, setShowAllLeads] = useState(false);
  const [removingLead, setRemovingLead] = useState<number | null>(null);
  const [removeReason, setRemoveReason] = useState("");
  const quote = state === "quote" || card.title.toLowerCase().includes("quote");
  const ownerBilling = ["owner-only", "credits-out", "hosting"].includes(state);

  switch (card.id) {
    case "C-06":
      return <div className="remaining-body">
        <div className="remaining-metric-row"><span>Instagram reel + TikTok</span><strong>20 seconds</strong><span>5 shots · about 15 minutes to film</span></div>
        <blockquote className="remaining-hook">“Three ways to wear the linen shirt.”</blockquote>
        {!inline && <>
          <Section title="Shot list"><ol className="remaining-shot-list">{shots.map(([shot, seconds, words], index) => <li key={shot}><label><input type="checkbox" checked={card.completedShots?.includes(index) || (state === "shot-progress" && index < 2)} onChange={() => onAction("Toggle shot", String(index))} disabled={!(["to-film", "waiting", "missed"].includes(status))}/><span><strong>{shot}</strong><small>{seconds} · Words on screen: {words}</small></span></label></li>)}</ol></Section>
          <Section title="Words to say"><p>“One shirt, three days. Wear it loose, tie it over a dress, or tuck it in. Which would you choose?”</p></Section>
          <Section title="Caption"><p>One linen shirt, three easy looks for Johannesburg spring. Which one is you? #LeratoDesigns #SpringLinen</p></Section>
          <div className="remaining-detail-grid"><Detail label="Music idea">Upbeat Amapiano</Detail><Detail label="What you need">Linen shirt, Kaya dress, jeans, trousers, a sunny corner</Detail><Detail label="Suggested post time">Tuesday 18:00</Detail></div>
        </>}
      </div>;
    case "C-07":
      return <div className="remaining-body"><p className="remaining-intro">For the spring launch post. All four are AI-made backgrounds, not product photographs.</p>
        {state === "credits-out" && <p className="remaining-warning">Out of credits, so Naledi can't make more right now.</p>}
        <div className="remaining-image-grid" role="group" aria-label="AI-made background options" onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
          if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
          const current = Number((event.target as HTMLElement).closest("[data-option]")?.getAttribute("data-option") || 0);
          const next = (current + (event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : 3)) % 4;
          event.preventDefault();
          (event.currentTarget.querySelector(`[data-option="${next}"]`) as HTMLButtonElement)?.focus();
        }}>
          {imageNames.map((name, index) => <button key={name} type="button" data-option={index} className={"remaining-image-option" + (selectedOptions.includes(index) ? " selected" : "")} aria-pressed={selectedOptions.includes(index)} onClick={() => onSelectOption(index)}>
            <span className={"remaining-image-art art-" + index}>{state === "image-failed" && index === 0 ? "Couldn't load this image." : <><span className="remaining-image-sun"/><span className="remaining-image-ground"/></>}</span>
            <span className="remaining-image-caption"><strong>{name}</strong><small>AI-made {selectedOptions.includes(index) && <Check size={13}/>}</small></span>
          </button>)}
        </div>
        {!inline && <><p className="remaining-warning">AI-made. Not a photo of your product.</p><div className="remaining-detail-grid"><Detail label="What was asked for">A sunny Johannesburg street in soft morning light</Detail><Detail label="Will be used in">Spring launch post</Detail><Detail label="Credits used">$0.24 for these four images</Detail></div></>}
      </div>;
    case "C-08":
    case "C-09": {
      const customer = card.id === "C-09";
      return <div className="remaining-body">
        <div className="remaining-detail-grid"><Detail label="To">{customer ? "Thabo Nkosi · thabo@example.com" : "Juniper and Jade · buyer · hello@juniperandjade.co.za"}</Detail><Detail label="Send with">{customer ? "Email reply" : "Email"}</Detail>{!customer && <Detail label="Subject">Lerato Designs spring collection</Detail>}</div>
        {!inline && customer && <Section title="Their message"><blockquote>Hi, could you check where order 1042 is? I placed it last week and haven't had an update. Thanks, Thabo.</blockquote><p className="remaining-muted">Received 26 hours ago · Urgent</p></Section>}
        {inline ? <p className="remaining-intro">{customer ? "Hi Thabo, thanks for checking in. Your order shipped on Monday and is on its way." : "Hi Juniper and Jade, I'm Lerato, the founder of Lerato Designs in Johannesburg."}</p> : <Section title={customer ? "Reply to send" : "Message to send"}><div className="remaining-letter">{customer ? <><p>Hi Thabo,</p><p>Thanks for checking in. Your order shipped on Monday and is on its way. You can follow it here: leratodesigns.co.za/track/1042.</p><p>It should reach you within 3 to 5 working days in Gauteng. If it hasn't arrived by Friday, reply here and we'll help.</p><p>Warmly,<br/>Lerato Designs</p></> : <><p>Hi Juniper and Jade,</p><p>I'm Lerato, the founder of Lerato Designs in Johannesburg. I love how you bring local labels into your store.</p><p>Our new spring linen collection might be a fit for your rail. Could I send you a short line sheet and a few pieces to look at?</p><p>Warmly,<br/>Lerato</p></>}</div></Section>}
        {!inline && <><div className="remaining-detail-grid">{customer ? <><Detail label="Based on">Delivery takes 3 to 5 working days in Gauteng.</Detail><Detail label="After sending">Resend order 1042 if the tracking does not move.</Detail></> : <><Detail label="Attachment">Spring collection line sheet.pdf · attach it yourself</Detail><Detail label="Why this shop">They carry four local designers like Lerato Designs.</Detail><Detail label="Next">If no reply by Thursday, Sipho will draft a follow-up.</Detail></>}</div>{state === "batch" && <p className="remaining-warning">Five first messages are ready. Each is reviewed and sent separately.</p>}</>}
      </div>;
    }
    case "C-10":
      return <div className="remaining-body">
        <div className="remaining-segmented" role="group" aria-label="Preview size"><button type="button" aria-pressed={device === "computer"} onClick={() => onDevice("computer")} onKeyDown={e => { if (e.key === "ArrowRight") { e.preventDefault(); onDevice("phone"); } }}>Computer</button><button type="button" aria-pressed={device === "phone"} onClick={() => onDevice("phone")} onKeyDown={e => { if (e.key === "ArrowLeft") { e.preventDefault(); onDevice("computer"); } }}>Phone</button></div>
        <div className={"remaining-site-compare " + device}><div className="remaining-site-panel"><span>Before</span><div className="remaining-mini-site"><small>LERATO DESIGNS</small><div className="remaining-mini-hero before"><strong>Made for every day</strong></div><div className="remaining-mini-products">Kaya dress · R899<br/>Linen shirt · R720</div></div></div><div className="remaining-site-panel"><span>After</span><div className="remaining-mini-site"><small>LERATO DESIGNS</small><div className="remaining-mini-hero after"><strong>Spring linen, now in</strong></div><div className="remaining-mini-products">Kaya dress · R849<br/>Linen shirt · R690</div></div></div></div>
        {!inline && <><div className="remaining-detail-grid"><Detail label="Pages">Home, Kaya dress, Linen shirt</Detail><Detail label="Why">Make the new collection easy to find.</Detail><Detail label="Website">leratodesigns.colony.site</Detail><Detail label="When">When you approve, or at the scheduled time.</Detail></div>{state === "hosting-paused" && <p className="remaining-warning">Your website is paused because the hosting payment didn't go through. Lerato can fix this in billing.</p>}{state === "no-domain" && <p className="remaining-warning">Your own domain is not connected yet. This works on the Colony address.</p>}</>}
      </div>;
    case "C-11":
      return <div className="remaining-body"><p className="remaining-intro">20 boutiques found. The top 5 already carry brands like yours. Choose who Sipho should contact.</p><div className="remaining-lead-list" role="group" aria-label="Boutiques to contact" onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {if (!["ArrowDown","ArrowUp"].includes(event.key)) return;const inputs=[...event.currentTarget.querySelectorAll<HTMLInputElement>("[data-lead] input[type=checkbox]")];const current=inputs.indexOf(event.target as HTMLInputElement);if(current<0)return;const next=(current+(event.key==="ArrowDown"?1:inputs.length-1))%inputs.length;event.preventDefault();inputs[next]?.focus();}}>{boutiqueLeads.slice(0,inline ? 3 : showAllLeads ? boutiqueLeads.length : 5).map(([name,place,why,contact,source],index)=>card.removedLeads?.includes(index) ? null : <div key={name} className="remaining-lead" data-lead={index}><label><input type="checkbox" checked={selectedLeads.includes(index)} onChange={()=>onSelectLead(index)}/><span><strong>{name}</strong><small>{place}</small>{!inline && <><p>{why}</p><small>{contact} · Found on {source}</small></>}</span></label>{!inline && (removingLead === index ? <form className="remaining-remove-lead" onSubmit={event=>{event.preventDefault();onAction("Remove lead",JSON.stringify({index,reason:removeReason}));setRemovingLead(null);setRemoveReason("");}}><label>Reason (optional)<input value={removeReason} onChange={event=>setRemoveReason(event.target.value)}/></label><Button type="submit" tone="secondary">Remove lead</Button><Button type="button" tone="quiet" onClick={()=>setRemovingLead(null)}>Cancel</Button></form> : <Button tone="quiet" aria-label={`Remove ${name}`} onClick={()=>{setRemovingLead(index);setRemoveReason("");}}>Remove</Button>)}</div>)}</div>{!inline && <><Button tone="quiet" onClick={()=>setShowAllLeads(value=>!value)}>{showAllLeads ? "Show top 5" : "Show all 20"}</Button><div className="remaining-detail-grid"><Detail label="Contact plan">Sipho will draft individual first messages for chosen shops.</Detail><Detail label="Based on">Your target customers: boutiques that stock local designers.</Detail></div><button className="remaining-text-link" onClick={()=>onDestination("D-04")}>See target customers</button></>}</div>;
    case "C-12":
      return <div className="remaining-body"><div className="remaining-paper"><span className="eyebrow">Lerato Designs · Draft policy</span><h2>Frequently asked questions</h2><h3>Delivery</h3><p>Orders in Gauteng usually arrive in 3 to 5 working days. We share tracking after dispatch.</p>{!inline && <><h3>Returns</h3><p>Unworn items with a receipt can be returned within 14 days. Write to us before sending a return.</p><h3>Sizes</h3><p>The linen collection runs from XS to XL. Ask us for measurements if you're between sizes.</p><h3>Payment</h3><p>We accept card payments through our checkout link.</p></>}</div>{!inline && <p className="remaining-muted">Changed since version 1: delivery times are now shown by area.</p>}</div>;
    case "C-13":
      if (inline) return <div className="remaining-body"><div className="remaining-detail-grid"><Detail label="Customer">Brightway Events</Detail><Detail label="Total">{business.vat ? "Review total" : "R8,450.00"}</Detail><Detail label={quote ? "Valid until" : "Due"}>31 October 2026</Detail></div>{state === "overdue" && <p className="remaining-warning">Overdue by 3 days. Grace drafted a reminder.</p>}</div>;
      return <div className="remaining-body"><div className="remaining-paper invoice"><div className="remaining-invoice-head"><strong>{business.registeredName || "LERATO DESIGNS"}</strong><span>{quote ? "QUOTE QUO-0042" : "INVOICE INV-0042"}</span></div><div className="remaining-detail-grid"><Detail label="For">Brightway Events · accounts@brightway.co.za</Detail><Detail label={quote ? "Valid until" : "Due"}>31 October 2026</Detail></div><div className="remaining-invoice-row"><span>30 linen uniforms</span><span>30 × R250.00</span><strong>R7,500.00</strong></div><div className="remaining-invoice-row"><span>Alterations</span><span>1 × R950.00</span><strong>R950.00</strong></div>{!inline && <div className="remaining-invoice-row"><span>Subtotal</span><span/><strong>R8,450.00</strong></div>}{!inline && <div className="remaining-invoice-row"><span>VAT</span><span>{business.vat ? `VAT number ${business.vat}` : "Not VAT registered"}</span><strong>{business.vat ? "Review amount" : "R0.00"}</strong></div>}<div className="remaining-invoice-total"><span>Total</span><strong>{business.vat ? "Review total" : "R8,450.00"}</strong></div>{!inline && business.vat && <p className="remaining-warning">VAT is registered in your profile. Confirm the amount before sending this sample invoice.</p>}{!inline && (business.banking ? <div className="remaining-detail-grid"><Detail label="Payment details">{business.banking}</Detail></div> : <p className="remaining-warning">Banking details are not in your business profile. <button className="remaining-text-link" onClick={()=>onDestination("S-01")}>Add them before sending</button> if the customer will pay by bank transfer.</p>)}</div>{state === "overdue" && <p className="remaining-warning">Overdue by 3 days. Grace drafted a friendly reminder.</p>}{status === "ready-send" && <p className="remaining-warning">Attach the PDF to your email before sending.</p>}</div>;
    case "C-14":
      return <div className="remaining-body"><div className="remaining-brand-logo">LERATO <span>DESIGNS</span></div><div className="remaining-swatch-row"><span>Linen</span><span>Terracotta</span><span>Olive</span><span>Charcoal</span></div><p className="remaining-intro">Voice: warm, proud, simple.</p>{!inline && <><div className="remaining-detail-grid"><Detail label="Fonts">Manrope for web; a soft serif for campaign headings</Detail><Detail label="Do">Talk like a friend who sews.</Detail><Detail label="Don't">Shout sales.</Detail><Detail label="Photos">Natural light, real fabrics, real people wearing the pieces.</Detail></div><Section title="Sample post"><p>Made for warm days and the little plans that become big ones. Meet our spring linen.</p></Section>{state === "missing-logo" && <p className="remaining-warning">I couldn't find your logo. Add it?</p>}</>}</div>;
    case "C-15":
      return <div className="remaining-body"><div className="remaining-hire"><Avatar name="Leo" size="large"/><div><strong>{card.displayName || "Leo"}</strong><span>Website Builder · reports to Scout</span></div></div><p className="remaining-intro">Your old site's order form is broken. {card.displayName || "Leo"} can build and keep your new site current.</p>{inline ? <p className="remaining-muted">$4.00 a week · team total $19.00</p> : <><div className="remaining-detail-grid"><Detail label="First week">Build four pages, check the order links, show you the site before it goes live.</Detail><Detail label="Routine">Site check every Wednesday at 09:00.</Detail><Detail label="Never alone">Publish changes or buy hosting without your say-so.</Detail><Detail label="Weekly budget">$4.00 · team total $19.00</Detail></div><p className="remaining-muted">Not now means Scout will wait 30 days before suggesting this again.</p></>}</div>;
    case "C-16":
      return <div className="remaining-body"><div className="remaining-money"><strong>{ownerBilling ? state === "hosting" ? "$10.00" : "$18.40" : card.amount || "$0.50"}</strong><span>{ownerBilling ? state === "hosting" ? "per month for hosting" : "in Colony credits" : state === "ad-spend" ? "once for an Instagram ad" : "more each week for Naledi"}</span></div><p className="remaining-intro">{ownerBilling ? state === "hosting" ? "Hosting payment didn't go through. Your website is paused until Lerato fixes billing." : "At the current pace, credits will run out Thursday." : state === "ad-spend" ? "Maya suggests $20 on an Instagram ad. You would pay Instagram directly." : "More room for launch images and next week's posts."}</p>{!inline && <div className="remaining-detail-grid"><Detail label="Current weekly budget">$5.00 · $3.40 used this week</Detail><Detail label="Credits balance">$18.40</Detail><Detail label="If declined">Naledi will make fewer new images this week.</Detail>{state === "hosting" && <Detail label="Next payment">13 November</Detail>}</div>}</div>;
    case "C-17":
      return <div className="remaining-body"><p className="remaining-intro">Site visits this week: <strong>412</strong> (from your website).</p>{status === "sent" ? <p className="remaining-success">Thanks. Orders are up 4 on last week.</p> : ["waiting", "changes"].includes(status) && <form className="remaining-number-form" onSubmit={event=>{event.preventDefault();if (!/^\d+$/.test(orders) || (sales && !/^\d+(?:\.\d{1,2})?$/.test(sales)) || (followers && !/^\d+$/.test(followers))) {setInvalid(true);return;}setInvalid(false);onAction("Send numbers",JSON.stringify({orders,sales,followers,note:extra}));}}><label>Orders this week <input inputMode="numeric" value={orders} onChange={event=>setOrders(event.target.value)} aria-invalid={invalid && !/^\d+$/.test(orders)}/></label><label>Sales this week (R, optional) <input inputMode="decimal" value={sales} onChange={event=>setSales(event.target.value)} aria-invalid={invalid && !!sales && !/^\d+(?:\.\d{1,2})?$/.test(sales)}/></label>{!inline && <><label>New followers (optional) <input inputMode="numeric" value={followers} onChange={event=>setFollowers(event.target.value)} aria-invalid={invalid && !!followers && !/^\d+$/.test(followers)}/></label><label>Anything to add? <textarea value={extra} onChange={event=>setExtra(event.target.value)}/></label></>}{invalid && <p className="remaining-error" role="alert">Just the number, please.</p>}<Button type="submit" tone="primary">Send numbers</Button></form>}</div>;
    case "C-18":
      return <div className="remaining-body"><p className="remaining-warning">Urgent · Next week's posts are late.</p><p>Naledi stopped while making next week's posts. Scout restarted her once; she stopped again.</p>{!inline && <div className="remaining-detail-grid"><Detail label="What is affected">Next week's five posts</Detail><Detail label="Already tried">Scout restarted Naledi once.</Detail><Detail label="How long">Since 09:10</Detail></div>}{status === "fixed" && <p className="remaining-success">Naledi is back. The posts should be ready by 14:00.</p>}{state === "computer-off" && <p className="remaining-warning">Restarts when Lerato's MacBook is back on.</p>}{status === "still-failing" && <p className="remaining-warning">Still failing. Get help from the Colony team?</p>}</div>;
    case "C-19":
      return <div className="remaining-body"><p className="remaining-intro">{state === "friday" ? "This week: brand kit approved, five posts out, three boutiques contacted. Next week: carousel and the pop-up flyer." : "Morning. Naledi's posts for next week are ready, Sipho found 12 boutiques, and Thabo is waiting on his order."}</p>{!inline && <><div className="remaining-brief-links"><button onClick={()=>onDestination("C-05")}>Next week's posts <ExternalLink size={13}/></button><button onClick={()=>onDestination("C-11")}>Boutiques found <ExternalLink size={13}/></button><button onClick={()=>onDestination("C-09")}>Thabo's reply <ExternalLink size={13}/></button></div>{state === "friday" && <div className="remaining-detail-grid"><Detail label="Credits this week">$9.10 of $19.00</Detail><Detail label="By employee">Naledi $3.40 · Maya $2.10 · Leo $1.50 · Sipho $1.20 · Scout $0.50 · Grace $0.40</Detail></div>}{state === "late" && <p className="remaining-muted">Written at 07:12, after your computer woke up.</p>}<p className="remaining-muted">Written by Scout at 08:30. Reading this marks it read for you.</p></>}</div>;
    case "C-20":
      return <div className="remaining-body">{state === "grouped" ? <details><summary>4 updates</summary><ul><li>The spring banner is live.</li><li>Sipho moved Juniper and Jade to Talking.</li><li>Grace added the returns policy to her knowledge.</li><li>Naledi saved next week's post drafts.</li></ul></details> : <p>The spring banner is live. <button className="remaining-text-link" onClick={()=>onDestination("C-10","live")}>See it live</button></p>}</div>;
    default:
      return null;
  }
}
