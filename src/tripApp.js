import * as d3 from "d3";
import * as topojson from "topojson-client";

export function initTripApp(){
  // ── city catalog (ord = a sensible loop order out of Chicago) ──
  const CITIES=[
    {id:"chicago",    disp:"Chicago",     st:"IL", cap:0, home:1, lat:41.8781, lon:-87.6298, ord:0},
    {id:"springfield",disp:"Springfield", st:"IL", cap:1,         lat:39.7817, lon:-89.6501, ord:1},
    {id:"indy",       disp:"Indianapolis",st:"IN", cap:1,         lat:39.7684, lon:-86.1581, ord:2},
    {id:"madison",    disp:"Madison",     st:"WI", cap:1,         lat:43.0731, lon:-89.4012, ord:3},
    {id:"twincities", disp:"Twin Cities", st:"MN", cap:1,         lat:44.9537, lon:-93.0900, ord:4},
    {id:"milwaukee",  disp:"Milwaukee",   st:"WI", cap:0,         lat:43.0389, lon:-87.9065, ord:5},
  ];
  const STFULL={IL:"Illinois",IN:"Indiana",WI:"Wisconsin",MN:"Minnesota"};
  let unit="mi";
  const R=3958.8, rad=Math.PI/180;
  function hav(a,b){const dLat=(b.lat-a.lat)*rad,dLon=(b.lon-a.lon)*rad;
    const s=Math.sin(dLat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLon/2)**2;
    return 2*R*Math.asin(Math.sqrt(s));}
  const tpMi=mi=>unit==="km"?Math.round(mi*1.60934/5)*5:Math.round(mi/5)*5;
  const setT=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
  const cardFor=id=>document.querySelector(`#view-trip1 .day[data-city="${id}"]`);
  const cityOn=c=>c.home?true:(()=>{const k=cardFor(c.id);return !!k&&!k.classList.contains("cityoff");})();
  // route order = the current on-screen order of the day cards (user-reorderable)
  const cityById=id=>CITIES.find(c=>c.id===id);
  const includedLoop=()=>[...document.querySelectorAll("#view-trip1 .day[data-city]")]
    .map(card=>cityById(card.dataset.city)).filter(c=>c&&cityOn(c));

  function computeTrip(){
    const loop=includedLoop();
    const seq=loop.length>1?[...loop,loop[0]]:loop;
    let miles=0;for(let i=0;i<seq.length-1;i++)miles+=hav(seq[i],seq[i+1])*1.22;
    miles+=loop.length*30;                       // in-town driving buffer
    const driveH=miles/62;
    let see=0,chosen=0,total=0;
    loop.forEach(c=>{const card=cardFor(c.id);if(!card)return;
      card.querySelectorAll("li").forEach(li=>{if(li.classList.contains("fixed"))return;total++;
        if(li.classList.contains("skip"))return;chosen++;see+=parseFloat(li.dataset.h||0);});});
    const caps=loop.filter(c=>c.cap).length;
    const states=new Set(loop.map(c=>c.st)).size;
    const days=loop.length+1;
    const dist=tpMi(miles).toLocaleString("en-US")+" "+unit;
    setT("tpDist",dist);setT("tpDrive","~"+Math.round(driveH)+" h");setT("tpSee","~"+Math.round(see)+" h");setT("tpStops",chosen+" / "+total);
    setT("hDist","~"+dist);setT("hTime","~"+Math.round(driveH)+" h");setT("hDays",days);setT("hCities",loop.length);setT("hCaps",caps);setT("hStatesN",states);

    CITIES.forEach(c=>{const card=cardFor(c.id);if(!card)return;
      const on=cityOn(c),idx=loop.indexOf(c);
      const dn=card.querySelector(".day-n"),dt=card.querySelector(".daytoggle"),dd=card.querySelector(".day-drive"),dc=card.querySelector(".day-count");
      if(dn)dn.textContent=c.home?"Day 1":(on?"Day "+(idx+1):"");
      if(dt){dt.innerHTML=on?"✓ In the trip":"＋ Add city";dt.classList.toggle("on",on);}
      if(dd){ if(!on)dd.textContent="";
        else if(idx<=0)dd.textContent="";
        else{const prev=loop[idx-1],raw=hav(prev,c)*1.22,mi=Math.round(raw/5)*5;
          dd.innerHTML=`🚗 <b>~${(raw/62).toFixed(1)} h</b> · ${mi} mi · from ${prev.disp}`;}}
      if(dc){const lis=[...card.querySelectorAll("li")].filter(li=>!li.classList.contains("fixed"));
        const onc=lis.filter(li=>!li.classList.contains("skip")).length;
        dc.textContent=on?onc+" stop"+(onc===1?"":"s"):"";}
    });
    renderRibbon(loop);
    drawMini();
  }

  function renderRibbon(loop){
    const el=document.getElementById("tripRibbon");if(!el)return;
    const nodes=loop.length?[...loop,loop[0]]:loop;
    el.innerHTML=nodes.map((c,i)=>{
      const sub=c.home?(i===0?"start":"home"):(c.cap?c.st+" · capital":c.st);
      return `<div class="trip-node${c.home?" home":""}"><span class="dot"></span><b>${c.disp}</b><small>${sub}</small></div>`
        +(i<nodes.length-1?'<div class="trip-arrow">→</div>':"");
    }).join("");
  }

  // ── mini-map of the states you'll visit ──
  const US_ATLAS="https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";
  let mmFC=null;
  function drawMini(){
    const svg=d3.select("#tripMiniMap"),node=svg.node();
    if(!mmFC||!node)return;
    const W=node.clientWidth,H=node.clientHeight;if(W<20||H<20)return;
    const loop=includedLoop();
    const full=new Set(loop.map(c=>STFULL[c.st]));
    const feats=mmFC.features.filter(f=>!["Alaska","Hawaii","Puerto Rico"].includes(f.properties.name));
    const hi={type:"FeatureCollection",features:feats.filter(f=>full.has(f.properties.name))};
    if(!hi.features.length){svg.selectAll("*").remove();return;}
    const proj=d3.geoAlbersUsa().fitExtent([[34,26],[W-34,H-22]],hi);
    svg.selectAll("*").remove();
    svg.append("g").selectAll("path").data(feats).join("path")
      .attr("d",d3.geoPath(proj)).attr("class",f=>"mm-state"+(full.has(f.properties.name)?" on":""));
    const nodes=loop.length?[...loop,loop[0]]:loop;
    const line=nodes.map(c=>proj([c.lon,c.lat])).filter(Boolean);
    if(line.length>1)svg.append("path").attr("class","mm-route").attr("d","M"+line.map(p=>p.join(",")).join("L"));
    const seen=new Set();
    nodes.forEach(c=>{if(seen.has(c.id))return;seen.add(c.id);const p=proj([c.lon,c.lat]);if(!p)return;
      const g=svg.append("g").attr("transform",`translate(${p[0]},${p[1]})`);
      g.append("circle").attr("class","mm-dot"+(c.home?" home":"")).attr("r",4.5);
      const flip=p[0]>W-72;
      g.append("text").attr("class","mm-lab").attr("x",flip?-8:8).attr("y",3).attr("text-anchor",flip?"end":"start").text(c.disp);});
    const el=document.getElementById("tripMapStates");
    if(el)el.textContent="· "+full.size+" states: "+[...new Set(loop.map(c=>c.st))].join(" · ");
  }
  d3.json(US_ATLAS).then(us=>{mmFC=topojson.feature(us,us.objects.states);drawMini();}).catch(()=>{});
  const _mm=document.getElementById("tripMiniMap");
  if(_mm&&"ResizeObserver"in window)new ResizeObserver(()=>drawMini()).observe(_mm);

  // ── wire toggles ──
  document.querySelectorAll("#view-trip1 .daytoggle").forEach(btn=>{
    btn.addEventListener("click",()=>{btn.closest(".day").classList.toggle("cityoff");computeTrip();});
  });
  document.querySelectorAll("#view-trip1 .day li").forEach(li=>{
    if(li.classList.contains("fixed"))return;
    li.addEventListener("click",()=>{if(li.closest(".day").classList.contains("cityoff"))return;
      li.classList.toggle("skip");computeTrip();});
  });
  document.querySelectorAll("#tpUnits button").forEach(b=>b.onclick=()=>{
    unit=b.dataset.u;document.querySelectorAll("#tpUnits button").forEach(x=>x.classList.toggle("on",x===b));computeTrip();
  });

  // ── reorder cities (▲ ▼) — Chicago stays the start ──
  function moveCard(card,dir){
    const wrap=card.parentNode;
    if(dir<0){const prev=card.previousElementSibling;
      if(prev&&prev.dataset.city&&prev.dataset.city!=="chicago")wrap.insertBefore(card,prev);}
    else{const next=card.nextElementSibling;
      if(next&&next.dataset.city)wrap.insertBefore(next,card);}
    computeTrip();
  }
  document.querySelectorAll("#view-trip1 .day[data-city]").forEach(card=>{
    if(card.dataset.city==="chicago")return;
    const h=card.querySelector(".day-h");if(!h)return;
    const rc=document.createElement("span");rc.className="reorder";
    rc.innerHTML='<button class="rbtn" data-dir="-1" title="Move earlier" aria-label="Move earlier">▲</button><button class="rbtn" data-dir="1" title="Move later" aria-label="Move later">▼</button>';
    h.insertBefore(rc,h.firstChild);
    rc.querySelectorAll(".rbtn").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();moveCard(card,+b.dataset.dir);}));
  });

  // ── flying into Chicago: ballpark + live-fare deep link ──
  const flFrom=document.getElementById("flFrom"),flDate=document.getElementById("flDate"),
        flReturn=document.getElementById("flReturn"),flGo=document.getElementById("flGo"),flOut=document.getElementById("flOut");
  const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
  const HIByMonth=[260,250,260,270,290,340,360,350,270,280,300,360];
  function ballpark(dstr){
    if(!dstr)return "";
    const m=new Date(dstr+"T00:00").getMonth(),hi=HIByMonth[m],lo=Math.round(hi*0.55/10)*10;
    return `Rough ballpark: <b>~$${lo}–$${hi}</b> round-trip, domestic, in ${MONTHS[m]}. Real fares depend a lot on where you fly from — tap below for live numbers.`;
  }
  function updateFlight(){
    if(!flDate)return;
    const d=flDate.value;
    if(d&&!flReturn.value){const rd=new Date(d+"T00:00");rd.setDate(rd.getDate()+includedLoop().length);flReturn.value=rd.toISOString().slice(0,10);}
    if(flOut)flOut.innerHTML=d?ballpark(d):"Pick a departure date for a ballpark — then check live fares.";
    const from=(flFrom.value||"").trim();
    const q=`flights from ${from||"your city"} to Chicago on ${d||"a date"}`+(flReturn.value?` through ${flReturn.value}`:"");
    if(flGo)flGo.href="https://www.google.com/travel/flights?q="+encodeURIComponent(q);
  }
  [flFrom,flDate,flReturn].forEach(el=>el&&el.addEventListener("input",updateFlight));
  updateFlight();

  computeTrip();
}
