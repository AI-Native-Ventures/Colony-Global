import type { DeskSnapshot, DeskDraft } from "./desk-types";
const draft = (id: string, employee: DeskDraft["employee"], kind: string, title: string, text: string, status: DeskDraft["status"], route: string, target?: string, policy?: string): DeskDraft => ({id,employee,kind,title,text,status,route,target,policy});
export const briefs = [
  { id: "mon12", kind: "Morning briefs", date: "Monday 12 October, 08:30", text: "The spring launch is on track. Naledi has next week's 5 posts ready. Leo's spring page is next. Two decisions are waiting on you." },
  { id: "fri9", kind: "Friday wraps", date: "Friday 9 October, 16:00", text: "Friday wrap: 14 things done, 3 waiting on you, $9.10 used this week." },
  { id: "fri9am", kind: "Morning briefs", date: "Friday 9 October, 08:30", text: "Sipho has 3 follow-ups ready. Grace has a reply for Thabo. Your website had 412 visits this week." },
];
export const scoutCalls = [
  { id: "photos", date: "Today, 09:12", question: "Naledi asked which photos to use for the linen carousel", decision: "Picked the 3 studio shots you approved last week", why: "They match the brand kit you approved", conversation: "spring" },
  { id: "followup", date: "Friday, 11:20", question: "Sipho asked when to follow up with Juniper and Jade", decision: "Thursday, after their buying meeting", why: "They asked for time to look at the line sheet", conversation: "stockists" },
];
export function initialDesks(): DeskSnapshot {
  return {
    drafts: Object.fromEntries([
      draft("site-banner","Leo","Website change","A new spring banner","Home: introduce the spring linen collection. Your product prices and buying links stay the same.","waiting","D-05"),
      draft("site-linen","Leo","Website change","A linen page","Lookbook: the 3 linen pieces, how to care for them and a link to your existing shop.","waiting","D-05"),
      draft("site-policy","Leo","Website change","Update the returns policy","FAQ: use the returns policy approved in Grace's knowledge.","approved","D-05"),
      draft("juniper-draft","Sipho","Message draft","Follow up with Juniper and Jade","Hi, following up on our spring linen collection. Would you like the line sheet for your next buying meeting? Regards, Lerato.","approved","D-04a","juniper"),
      draft("kalahari-draft","Sipho","Message draft","Introduce Lerato Designs","Hi, Lerato Designs makes contemporary South African linen clothing. May I send you our spring line sheet? Regards, Lerato.","approved","D-04a","kalahari"),
      draft("brightway-draft","Sipho","Message draft","Check the uniform sizes","Hi, could you confirm the sizes for your branded clothing? I can then prepare a quote for you. Regards, Lerato.","approved","D-04a","brightway"),
      draft("thabo-reply","Grace","Customer reply","Reply to Thabo","Hi Thabo, thanks for getting in touch. Delivery takes 3 to 5 working days in Gauteng. Please send your order number so we can help with the next step.","waiting","D-06a","thabo","Delivery policy"),
      draft("nomsa-reply","Grace","Customer reply","Reply to Nomsa","Hi Nomsa, our linen dresses are available in sizes XS to XL. Would you like the size guide?","approved","D-06a","nomsa","Sizes and fit"),
      draft("aisha-reply","Grace","Customer reply","Reply to Aisha","Hi Aisha, our returns policy covers unworn items within 14 days, with the tag on. We are checking your request and will get back to you.","waiting","D-06a","aisha","Returns policy"),
    ].map(d=>[d.id,d])),
    campaigns: {
      spring: {id:"spring",name:"Spring launch",goal:"40 orders",dates:"1 to 31 Oct",status:"running",credits:4.7,tasks:[
        {employee:"Naledi",text:"9 posts",status:"5 of 9 done",route:"D-03"},
        {employee:"Leo",text:"a spring page",status:"Ready for your OK",route:"D-05"},
        {employee:"Sipho",text:"10 boutiques",status:"6 contacted",route:"D-04"},
        {employee:"Grace",text:"sale FAQ",status:"Done",route:"D-06b"},
      ]},
      popup: {id:"popup",name:"November pop-up",goal:"Meet 20 new customers",dates:"7 to 8 Nov",status:"planned",credits:0.4,tasks:[{employee:"Naledi",text:"pop-up flyer",status:"Draft",route:"D-03"},{employee:"Grace",text:"pop-up questions",status:"Planned",route:"D-06b"}]},
    },
    numbers: [
      {week:"20 Aug",orders:5,money:3200,followers:18,actor:"Lerato"},
      {week:"27 Aug",orders:7,money:4450,followers:24,actor:"Lerato"},
      {week:"3 Sep",orders:null,money:null,followers:null},
      {week:"10 Sep",orders:6,money:3900,followers:21,actor:"Kagiso"},
      {week:"17 Sep",orders:8,money:5100,followers:29,actor:"Lerato"},
      {week:"24 Sep",orders:9,money:6200,followers:35,actor:"Lerato"},
      {week:"1 Oct",orders:10,money:6800,followers:37,actor:"Kagiso"},
      {week:"8 Oct",orders:12,money:8400,followers:42,actor:"Lerato"},
    ],
    ideas: {bundle:{status:"new"},market:{status:"new"}}, corrections:{},
    photos: Array.from({length:6},(_,i)=>({id:"photo-"+(i+1),name:["Spring linen","The 3 pieces","A morning in linen","Made for the weekend","Spring styling","Shop the drop"][i],url:"./assets/carousel-"+String(i+1).padStart(2,"0")+".png",type:"image/png",ai:true,tags:["linen",i%2?"spring":"studio"],uses:i<3?3:0,excluded:false,actor:"Lerato" as const,added:"12 Oct"})),
    leads: {
      juniper:{id:"juniper",name:"Juniper and Jade",type:"Boutique",place:"Rosebank",why:"Stocks 4 local labels, no linen yet. The spring collection fits their focus on local designers.",source:"Found on their website. Stocks 4 local labels, none in linen.",contact:"Buying team",email:"",phone:"",website:"",instagram:"",stage:"Contacted",next:"Follow-up planned for Thursday.",due:"Today",draft:"juniper-draft",history:[{id:"j1",text:"Sent by Lerato on 14 Oct by email. Introduced the spring linen collection.",actor:"Lerato",time:"14 Oct, 09:12"}]},
      kalahari:{id:"kalahari",name:"Kalahari Collective",type:"Concept store",place:"Cape Town",why:"A concept store that stocks independent South African designers. Linen would add something new to their range.",source:"Found while researching independent shops.",contact:"",email:"",phone:"",website:"",instagram:"",stage:"New",next:"Send the introduction",due:"Today",draft:"kalahari-draft",history:[]},
      brightway:{id:"brightway",name:"Brightway Events",type:"Corporate uniforms",place:"Johannesburg",why:"Orders branded clothing for events. A good fit for the corporate range.",source:"Introduced by Lerato.",contact:"Events team",email:"",phone:"",website:"",instagram:"",stage:"Talking",next:"Confirm the uniform sizes",due:"Today",draft:"brightway-draft",history:[{id:"b1",text:"They replied: 'Send us your line sheet.' Sipho drafted one.",actor:"Sipho",time:"15 Oct, 11:20"}]},
    },
    targets:"Boutiques that stock local designers in Johannesburg and Cape Town\nEvent companies that order branded clothing",
    website:{version:2,previousVersion:1,banner:"Spring linen, made for your everyday.",mode:"live",status:"idle",history:[{id:"site-v2",title:"Refreshed the home page",actor:"Lerato",version:2,previous:1,banner:"Contemporary South African apparel."}],shopifyDone:false,domain:{address:"",seller:"Afrihost",phase:"entering"}},
    customers:{
      thabo:{id:"thabo",name:"Thabo Nkosi",source:"Forwarded email",contact:"Email address not added",email:"",phone:"",status:"To reply",hours:3,draft:"thabo-reply",expectsReply:true,history:[{id:"t1",text:"Hi, where is my order?",actor:"Grace",time:"09:14"}]},
      nomsa:{id:"nomsa",name:"Nomsa Khumalo",source:"Pasted from Instagram",contact:"Instagram",email:"",phone:"",status:"To reply",hours:26,draft:"nomsa-reply",expectsReply:true,history:[{id:"n1",text:"Hi, what sizes do your linen dresses come in?",actor:"Grace",time:"Yesterday, 08:40"}]},
      aisha:{id:"aisha",name:"Aisha Patel",source:"Pasted from WhatsApp",contact:"WhatsApp",email:"",phone:"",status:"To reply",hours:2,draft:"aisha-reply",decision:"waiting",expectsReply:false,history:[{id:"a1",text:"I'd like to return a dress I wore once. Is that possible?",actor:"Grace",time:"09:35"}]},
    },
    knowledge:[
      {id:"delivery",category:"Policies",title:"Delivery",text:"3 to 5 working days in Gauteng. Ask for the order number before checking a delivery.",approved:true,actor:"Lerato",date:"12 Oct"},
      {id:"returns",category:"Policies",title:"Returns and exchanges",text:"Returns: unworn items within 14 days, with the tag on.",approved:true,actor:"Lerato",date:"12 Oct"},
      {id:"sizes",category:"Policies",title:"Sizes and fit",text:"Linen dresses: XS to XL. Share the size guide when someone needs help choosing.",approved:true,actor:"Lerato",date:"12 Oct"},
      {id:"payment",category:"Policies",title:"Payment",text:"Use the company's existing payment link or shop. Never ask for card details in a message.",approved:true,actor:"Lerato",date:"12 Oct"},
      {id:"orders",category:"Policies",title:"Changing an order",text:"Ask for the order number and the requested change. Check with Lerato before promising a change.",approved:true,actor:"Lerato",date:"12 Oct"},
      {id:"care",category:"FAQ",title:"How do I care for linen?",text:"Cool gentle wash. Dry in the shade. Follow the care label on the garment.",approved:true,actor:"Lerato",date:"12 Oct"},
      {id:"fabric",category:"Product facts",title:"Spring linen collection",text:"Linen clothing. Sizes XS to XL. Prices: use Lerato's current price list; people approve every price change.",approved:true,actor:"Lerato",date:"12 Oct"},
    ],
    admin:{invoice014:{status:"Overdue"},reminder:{status:"Due today"},supplier:{status:"Draft"}},
  };
}
