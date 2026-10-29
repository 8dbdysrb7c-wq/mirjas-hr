import {timeToMinutes} from './attendancePolicy.js';
const approved = new Set(['موافق','موافق عليه','مقبول','تمت الموافقة','تم التسليم']);
const types = new Set(['مغادرة خاصة','مغادرة عمل','مغادرة الدخان']);
const merge = ranges => { const result=[]; for(const [a,b] of ranges.sort((x,y)=>x[0]-y[0])) { const last=result.at(-1); if(last && a<=last[1]) last[1]=Math.max(last[1],b); else result.push([a,b]); } return result; };
const length = ranges => ranges.reduce((sum,[a,b])=>sum+b-a,0);
const overlap = (ranges,a,b) => length(ranges.map(([x,y])=>[Math.max(x,a),Math.min(y,b)]).filter(([x,y])=>y>x));
export function dailyDepartureSettlement({attendance={},leaves=[],date,employeeId,shiftStart='08:00',shiftEnd='16:00'}) {
 const start=timeToMinutes(shiftStart); let end=timeToMinutes(shiftEnd);
 if(start==null||end==null) return {lateMins:0,earlyMins:0,departureMins:0,deficitMins:0};
 if(end<=start) end+=1440;
 const normalize = time => time!=null && end>1440 && time<start ? time+1440 : time;
 const all=[],chargeable=[];
 for(const leave of leaves) {
  if(String(leave.employeeId)!==String(employeeId)|| (leave.date||leave.startDate)!==date||!approved.has(leave.status)||!types.has(leave.type)) continue;
  const a=normalize(timeToMinutes(leave.startTime)),b=normalize(timeToMinutes(leave.endTime));
  if(a==null||b==null)continue;
  const range=[Math.max(start,a),Math.min(end,b)];if(range[1]<=range[0])continue;
  all.push(range);
  if(!leave.deductFromVacationBalance && leave.calculationMode!=='deduct_vacation')chargeable.push(range);
 }
 const approvedRanges=merge(all), chargedRanges=merge(chargeable);
 const inTime=normalize(timeToMinutes(attendance.timeIn)),outTime=normalize(timeToMinutes(attendance.timeOut));
 const lateEnd=inTime==null?Math.min(end,start+Math.max(0,Number(attendance.lateMinutes)||0)):Math.max(start,Math.min(end,inTime));
 const earlyStart=outTime==null?end:Math.max(lateEnd,Math.min(end,outTime));
 const lateMins=Math.max(0,lateEnd-start-overlap(approvedRanges,start,lateEnd));
 const earlyMins=Math.max(0,end-earlyStart-overlap(approvedRanges,earlyStart,end));
 const departureMins=length(chargedRanges);
 return {lateMins,earlyMins,departureMins,deficitMins:lateMins+earlyMins+departureMins};
}
