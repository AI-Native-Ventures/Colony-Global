import type { EmployeeId } from "../../data/types";
import { NalediDesk } from "../NalediDesk";
import { DeskPage,type DeskProps } from "./DeskUI";
import { ScoutDesk } from "./ScoutDesk";
import { MayaDesk } from "./MayaDesk";
import { SiphoDesk } from "./SiphoDesk";
import { LeoDesk } from "./LeoDesk";
import { GraceDesk } from "./GraceDesk";
export function EmployeeDesk(props:DeskProps&{name:EmployeeId}){
  if(props.name==="Scout")return <ScoutDesk {...props}/>;
  if(props.name==="Maya")return <MayaDesk {...props}/>;
  if(props.name==="Sipho")return <SiphoDesk {...props}/>;
  if(props.name==="Leo")return <LeoDesk {...props}/>;
  if(props.name==="Grace")return <GraceDesk {...props}/>;
  return <DeskPage {...props} name="Naledi"><NalediDesk {...props} embedded/></DeskPage>;
}
