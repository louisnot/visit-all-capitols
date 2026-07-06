import * as d3 from "d3";
import * as topojson from "topojson-client";

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

// ── mini-map of the states you'll visit (updates with the route select) ──
const US_ATLAS="https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";
let mmFC=null;
const mmCity={Chicago:[-87.6298,41.8781],Springfield:[-89.6501,39.7817],Indianapolis:[-86.1581,39.7684],Madison:[-89.4012,43.0731]};
const mmAbbr={Illinois:"IL",Indiana:"IN",Wisconsin:"WI"};
const tripStates=()=>TRIP.variant==="madison"?["Illinois","Indiana","Wisconsin"]:["Illinois","Indiana"];
const tripPath=()=>TRIP.variant==="madison"
  ?["Chicago","Madison","Springfield","Indianapolis","Chicago"]
  :["Chicago","Springfield","Indianapolis","Chicago"];
function drawMini(){
  const svg=d3.select("#tripMiniMap"),node=svg.node();
  if(!mmFC||!node)return;
  const W=node.clientWidth,H=node.clientHeight;if(W<20||H<20)return;
  const set=new Set(tripStates());
  const feats=mmFC.features.filter(f=>!["Alaska","Hawaii","Puerto Rico"].includes(f.properties.name));
  const hi={type:"FeatureCollection",features:feats.filter(f=>set.has(f.properties.name))};
  const proj=d3.geoAlbersUsa().fitExtent([[34,26],[W-34,H-22]],hi);
  svg.selectAll("*").remove();
  svg.append("g").selectAll("path").data(feats).join("path")
    .attr("d",d3.geoPath(proj)).attr("class",f=>"mm-state"+(set.has(f.properties.name)?" on":""));
  const order=tripPath(),line=order.map(n=>proj(mmCity[n])).filter(Boolean);
  if(line.length>1)svg.append("path").attr("class","mm-route").attr("d","M"+line.map(p=>p.join(",")).join("L"));
  const seen=new Set();
  order.forEach(n=>{if(seen.has(n))return;seen.add(n);const p=proj(mmCity[n]);if(!p)return;
    const g=svg.append("g").attr("transform",`translate(${p[0]},${p[1]})`);
    g.append("circle").attr("class","mm-dot"+(n==="Chicago"?" home":"")).attr("r",4.5);
    const flip=p[0]>W-72;
    g.append("text").attr("class","mm-lab").attr("x",flip?-8:8).attr("y",3).attr("text-anchor",flip?"end":"start").text(n);});
  const el=document.getElementById("tripMapStates");
  if(el)el.textContent="· "+set.size+" states: "+tripStates().map(s=>mmAbbr[s]).join(" · ");
}
d3.json(US_ATLAS).then(us=>{mmFC=topojson.feature(us,us.objects.states);drawMini();}).catch(()=>{});
const _mmSvg=document.getElementById("tripMiniMap");
if(_mmSvg&&"ResizeObserver"in window)new ResizeObserver(()=>drawMini()).observe(_mmSvg);
const _vsel=document.getElementById("tpVariant");
if(_vsel)_vsel.addEventListener("change",drawMini);
}
