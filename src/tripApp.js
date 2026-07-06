export function initTripApp(){
// ── Trip #1 planner + per-stop toggles (live totals) ──
const TRIP={
  unit:"mi",
  cityBuffer:{mi:150,h:1.8},
  variants:{
    weekend:{legs:[{mi:200,h:3.4},{mi:200,h:3.3},{mi:185,h:3.0}],days:4,cities:3,caps:2},
    madison:{legs:[{mi:150,h:2.6},{mi:260,h:4.3},{mi:200,h:3.3},{mi:185,h:3.0}],days:5,cities:4,caps:3}
  },
  variant:"weekend"
};
const tpMi=mi=>TRIP.unit==="km"?Math.round(mi*1.60934/5)*5:Math.round(mi/5)*5;
function tripCompute(){
  const v=TRIP.variants[TRIP.variant];
  let mi=TRIP.cityBuffer.mi,h=TRIP.cityBuffer.h,see=0,chosen=0,total=0;
  v.legs.forEach(l=>{mi+=l.mi;h+=l.h;});
  document.querySelectorAll("#view-trip1 .day li").forEach(li=>{
    if(li.classList.contains("fixed"))return;
    total++;
    if(li.classList.contains("skip"))return;
    chosen++;see+=parseFloat(li.dataset.h||0);
    if(li.dataset.dmi){mi+=+li.dataset.dmi;h+=(+li.dataset.dh||0);}
  });
  const dist=tpMi(mi).toLocaleString("en-US")+" "+TRIP.unit;
  const set=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=val;};
  set("tpDist",dist);set("tpDrive","~"+Math.round(h)+" h");set("tpSee","~"+Math.round(see)+" h");set("tpStops",chosen+" / "+total);
  set("hDist","~"+dist);set("hTime","~"+Math.round(h)+" h");set("hDays",v.days);set("hCities",v.cities);set("hCaps",v.caps);
  document.querySelectorAll("#view-trip1 .day").forEach(day=>{
    const lis=[...day.querySelectorAll("li")].filter(li=>!li.classList.contains("fixed"));
    const on=lis.filter(li=>!li.classList.contains("skip")).length;
    const c=day.querySelector(".day-count");if(c)c.textContent=on+" stop"+(on===1?"":"s");
  });
}
(function initPlanner(){
  const units=document.getElementById("tpUnits");if(!units)return;
  document.querySelectorAll("#view-trip1 .day li").forEach(li=>{
    if(li.classList.contains("fixed"))return;
    li.addEventListener("click",()=>{li.classList.toggle("skip");tripCompute();});
  });
  units.querySelectorAll("button").forEach(b=>b.onclick=()=>{
    TRIP.unit=b.dataset.u;
    units.querySelectorAll("button").forEach(x=>x.classList.toggle("on",x===b));
    tripCompute();
  });
  document.getElementById("tpVariant").onchange=e=>{TRIP.variant=e.target.value;tripCompute();};
  tripCompute();
})();
}
