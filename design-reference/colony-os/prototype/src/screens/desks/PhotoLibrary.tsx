import { useRef,useState } from "react";
import { ImagePlus } from "lucide-react";
import { AIChip,Button,Dialog } from "../../components/primitives";
import { mockStore } from "../../data/mock-store";
import { patchPhoto,removePhoto } from "../../data/desk-actions";
import type { Photo } from "../../data/desk-types";
import { Choices,DeskSection,DetailPage,useDesk,type DeskProps } from "./DeskUI";
export function PhotoLibrary(props:DeskProps){
  const {data,actor,gone,offline}=useDesk("Naledi",props),[filter,setFilter]=useState("All"),[tag,setTag]=useState(props.state==="filtered-empty"?"winter":""),[selected,setSelected]=useState(""),[tags,setTags]=useState(""),[editing,setEditing]=useState(false),[deleting,setDeleting]=useState(false),[error,setError]=useState(props.state==="file-rejected"?"Couldn't add this file. Use a photo under 50 MB.":""),[progress,setProgress]=useState(props.state==="uploading"?"Adding 2 of 4 photos...":"");
  const input=useRef<HTMLInputElement>(null),active=data.desks.photos.find(p=>p.id===selected);
  const photos=(props.state==="empty"?[]:data.desks.photos).filter(p=>(filter==="All"||filter==="AI-made"&&p.ai||filter==="Your photos"&&!p.ai)&&(!tag||p.tags.some(t=>t.toLowerCase().includes(tag.toLowerCase()))));
  const choose=(p:Photo)=>{setSelected(p.id);setTags(p.tags.join(", "));setEditing(false);setError("");};
  const add=async(files:File[])=>{
    if(gone||progress&&props.state!=="uploading")return;
    if(files.length>20){setError("Add up to 20 photos at a time.");return;}
    let added=0;
    for(const file of files){
      const accepted=/\.(jpe?g|png|heic|webp)$/i.test(file.name)&&(!file.type||/^image\/(jpeg|png|heic|heif|webp)$/.test(file.type));
      if(!accepted||file.size>50*1024*1024){setError("Couldn't add this file. Use a photo under 50 MB.");continue;}
      setProgress("Adding "+(added+1)+" of "+files.length+" photos...");
      try{
        const url=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(new Error("read"));r.readAsDataURL(file);});
        const photo:Photo={id:crypto.randomUUID(),name:file.name,url,type:file.type||(/\.heic$/i.test(file.name)?"image/heic":"image/jpeg"),ai:false,tags:[],uses:0,excluded:false,actor,added:"Today",waiting:offline};
        mockStore.change(s=>s.team.profiles.Naledi.retired?s:{...s,desks:{...s.desks,photos:[photo,...s.desks.photos]}});added++;
      }catch{setError("Couldn't add this photo. Choose it again to try again.");}
    }
    setProgress("");if(added)props.onNotice(offline?"Photos wait until you're back online.":"Added to your library.");
  };
  const deleteActive=()=>{if(!active)return;const undo=removePhoto(active.id);setSelected("");setDeleting(false);props.onNotice("Photo deleted.",undo);};
  return <DetailPage {...props} name="Naledi" title="Photo library" back="Naledi's desk" onBack={()=>props.onDestination("D-03")}>
    <div className="photo-add" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();void add([...e.dataTransfer.files]);}}><ImagePlus size={24} aria-hidden="true"/><p>Add 10 to 20 photos of your products.</p><span>Naledi and Leo use them in posts and on your website.</span><Button disabled={gone} onClick={()=>input.current?.click()}>Add photos</Button><input ref={input} type="file" hidden multiple accept=".jpg,.jpeg,.png,.heic,.webp" aria-label="Choose photos" onChange={e=>{void add([...(e.target.files||[])]);e.target.value="";}}/><small>JPG, PNG, HEIC and WebP · Up to 50 MB each</small></div>
    {progress&&<p role="status">{progress}</p>}{error&&<p role="alert" className="desk-warning">{error}</p>}
    <DeskSection title="Your photos" aside={<Choices label="Photo filter" options={["All","Your photos","AI-made"]} value={filter} onChange={setFilter}/>}><div className="photo-filter"><label htmlFor="photo-tags">Filter by tag</label><input id="photo-tags" placeholder="Try linen, spring or studio" value={tag} onChange={e=>setTag(e.target.value)}/><span>{photos.length} {photos.length===1?"photo":"photos"}</span></div>
      {!photos.length?<p className="desk-empty">{props.state==="empty"?"Add 10 to 20 photos of your products. Naledi and Leo use them in posts and on your website.":"No photos match. Try another filter or tag."}</p>:<div className="photo-grid">{photos.map(p=><button className={"photo-tile "+(p.excluded?"excluded":"")} key={p.id} onClick={()=>choose(p)}>{p.importError?<span className="heic-photo">Photo needs adding again</span>:p.type==="image/heic"?<span className="heic-photo">HEIC photo</span>:<img src={p.url} alt={p.name}/>}<span className="photo-caption"><strong>{p.name}</strong>{p.ai&&<AIChip/>}{p.tags.length>0&&<small>{p.tags.join(" · ")}</small>}<small>{p.importError?"Could not keep this photo. Add it again.":p.excluded?"Not used":"Used in "+p.uses+" posts"}{p.waiting?" · Waiting to add":""}</small><small>Added by {p.actor}, {p.added}</small></span></button>)}</div>}
    </DeskSection>
    {active&&<Dialog title={active.name} className="photo-dialog" onClose={()=>{setSelected("");setDeleting(false);}}><h2>{active.name}</h2>{active.importError?<p role="alert">Could not keep this photo. Delete it and add the file again.</p>:active.type==="image/heic"?<p>HEIC photo saved. A preview needs conversion on your team's computer.</p>:<img className="photo-large" src={active.url} alt={active.name}/>}<p>{active.ai?"AI-made. Never used as a product photo.":"Your photo."}</p><p className="desk-meta">Used in {active.uses} posts. Added by {active.actor}, {active.added}.</p>{active.excluded&&<p>Not used</p>}
      {editing?<form className="desk-form" onSubmit={e=>{e.preventDefault();const next=tags.split(",").map(t=>t.trim()).filter(Boolean);if(!patchPhoto(active.id,{tags:next})){setError("AI-made images can never be tagged or used as a product photo.");return;}setEditing(false);setError("");props.onNotice("Tags saved.");}}><label htmlFor="edit-photo-tags">Tags, separated by commas</label><input id="edit-photo-tags" value={tags} onChange={e=>setTags(e.target.value)}/>{error&&<p role="alert">{error}</p>}<div className="desk-actions"><Button type="submit">Save tags</Button><Button tone="quiet" onClick={()=>setEditing(false)}>Cancel</Button></div></form>:!gone&&<div className="desk-actions"><Button tone="quiet" onClick={()=>setEditing(true)}>Edit tags</Button><Button tone="quiet" onClick={()=>patchPhoto(active.id,{excluded:!active.excluded})}>{active.excluded?"Use this again":"Don't use this"}</Button><Button disabled={active.excluded||!!active.importError} onClick={()=>props.onDestination("M-07",offline?"offline":undefined,{employee:"Naledi",photo:active.id,quote:active.name})}>Use in a post</Button><Button tone="quiet" onClick={()=>active.uses?setDeleting(true):deleteActive()}>Delete</Button></div>}
      {deleting&&<div className="desk-confirm" role="group" aria-label="Confirm photo deletion"><h3>Delete this photo?</h3><p>Used in {active.uses} posts. Those posts keep their own copy.</p><div className="desk-actions"><Button onClick={deleteActive}>Delete photo</Button><Button tone="quiet" onClick={()=>setDeleting(false)}>Keep photo</Button></div></div>}
    </Dialog>}
  </DetailPage>;
}
