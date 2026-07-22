import * as d3 from "d3";
import * as topojson from "topojson-client";

export function initTrip2App(){
  // ── stops (ord = a sensible loop order out of Seattle; stay = days to enjoy it) ──
  const CITIES=[
    {id:"seattle",    disp:"Seattle",     st:"WA", cap:0, home:1, lat:47.6062, lon:-122.3321, ord:0, stay:1.5},
    {id:"olympic",    disp:"Olympic NP",  st:"WA", cap:1,         lat:47.0379, lon:-122.9007, ord:1, stay:2},
    {id:"rainier",    disp:"Mt. Rainier", st:"WA", cap:0,         lat:46.8523, lon:-121.7603, ord:2, stay:1},
    {id:"portland",   disp:"Portland",    st:"OR", cap:0,         lat:45.5152, lon:-122.6784, ord:3, stay:1.5},
    {id:"salem",      disp:"Salem",       st:"OR", cap:1,         lat:44.9429, lon:-123.0351, ord:4, stay:1},
    {id:"craterlake", disp:"Crater Lake", st:"OR", cap:0,         lat:42.9446, lon:-122.1090, ord:5, stay:1},
    {id:"boise",      disp:"Boise",       st:"ID", cap:1,         lat:43.6150, lon:-116.2023, ord:6, stay:1.5},
    {id:"glacier",    disp:"Glacier NP",  st:"MT", cap:1,         lat:47.6000, lon:-113.4300, ord:7, stay:2.5},
    {id:"yellowstone",disp:"Yellowstone", st:"WY", cap:0,         lat:44.4280, lon:-110.5885, ord:8, stay:3},
    {id:"cheyenne",   disp:"Cheyenne",    st:"WY", cap:1,         lat:41.1400, lon:-104.8202, ord:9, stay:0.5},
    {id:"denver",     disp:"Denver",      st:"CO", cap:1,         lat:39.7392, lon:-104.9903, ord:10, stay:2},
  ];
  const STFULL={WA:"Washington",OR:"Oregon",ID:"Idaho",MT:"Montana",WY:"Wyoming",CO:"Colorado"};
  let unit="mi";
  const R=3958.8, rad=Math.PI/180;
  function hav(a,b){const dLat=(b.lat-a.lat)*rad,dLon=(b.lon-a.lon)*rad;
    const s=Math.sin(dLat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLon/2)**2;
    return 2*R*Math.asin(Math.sqrt(s));}
  const tpMi=mi=>unit==="km"?Math.round(mi*1.60934/5)*5:Math.round(mi/5)*5;
  const setT=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
  const cityById=id=>CITIES.find(c=>c.id===id);
  function cardFor(id){return document.querySelector(`#view-trip2 .day[data-city="${id}"]`);}
  function cityOn(c){if(c.home)return true;const k=cardFor(c.id);return !!k&&!k.classList.contains("cityoff");}
  function loopNow(){return [...document.querySelectorAll("#view-trip2 .day[data-city]")]
    .map(card=>cityById(card.dataset.city)).filter(c=>c&&cityOn(c));}

  function difficulty(needed,chosen){
    const ratio=needed/Math.max(1,chosen);
    if(ratio<=0.95)return {ratio,color:"#46e08a",label:"Relaxed — room to breathe"};
    if(ratio<=1.2) return {ratio,color:"#ffce4d",label:"Tight — expect long driving days"};
    return {ratio,color:"#f4675f",label:"Rushed — drop a stop or add days"};
  }

  function computeTrip(){
    const loop=loopNow();
    const seq=loop;                              // one-way: Seattle → … → finish (no return)
    let miles=0;for(let i=0;i<seq.length-1;i++)miles+=hav(seq[i],seq[i+1])*1.25;
    miles+=loop.length*25;                       // in-town / trailhead driving
    const driveH=miles/55;                        // scenic mountain roads are slow
    const driveDays=driveH/6;                     // ~6 h of driving per travel day
    const stayDays=loop.reduce((s,c)=>s+(c.stay||0),0);
    const needed=driveDays+stayDays;
    const chosen=+(document.getElementById("tp2Days")||{}).value||7;
    let see=0,chosen2=0,total=0;
    loop.forEach(c=>{const card=cardFor(c.id);if(!card)return;
      card.querySelectorAll("li").forEach(li=>{if(li.classList.contains("fixed"))return;total++;
        if(li.classList.contains("skip"))return;chosen2++;see+=parseFloat(li.dataset.h||0);});});
    const caps=loop.filter(c=>c.cap).length,states=new Set(loop.map(c=>c.st)).size;
    const dist=tpMi(miles).toLocaleString("en-US")+" "+unit;
    setT("tp2Dist",dist);setT("tp2Drive","~"+Math.round(driveH)+" h");setT("tp2Need","~"+Math.ceil(needed)+" d");setT("tp2Stops",chosen2+" / "+total);
    setT("hDist2","~"+dist);setT("hTime2","~"+Math.round(driveH)+" h");setT("hDays2",chosen);setT("hCities2",loop.length);setT("hCaps2",caps);setT("hStatesN2",states);
    setT("tp2DaysVal",chosen);

    // difficulty meter (colour changes as it gets harder)
    const d=difficulty(needed,chosen);
    const fill=document.getElementById("tp2DiffFill"),lab=document.getElementById("tp2DiffLabel");
    if(fill){fill.style.width=(Math.min(d.ratio,1.4)/1.4*100).toFixed(0)+"%";fill.style.background=d.color;}
    if(lab){lab.style.color=d.color;lab.innerHTML=`<b>${d.label}</b> · needs ≈ ${Math.ceil(needed)} days, you have ${chosen}`;}

    // per-stop labels
    CITIES.forEach(c=>{const card=cardFor(c.id);if(!card)return;
      const on=cityOn(c),idx=loop.indexOf(c);
      const dn=card.querySelector(".day-n"),dt=card.querySelector(".daytoggle"),dd=card.querySelector(".day-drive"),dc=card.querySelector(".day-count");
      if(dn)dn.textContent=c.home?"Day 1":(on?"Stop "+(idx+1):"");
      if(dt){dt.innerHTML=on?"✓ In the trip":"＋ Add stop";dt.classList.toggle("on",on);}
      if(dd){ if(!on)dd.textContent="";
        else if(idx<=0)dd.textContent="";
        else{const prev=loop[idx-1],raw=hav(prev,c)*1.25,mi=Math.round(raw/5)*5;
          dd.innerHTML=`🚗 <b>~${(raw/55).toFixed(1)} h</b> · ${mi} mi · from ${prev.disp}`
            +(idx===loop.length-1?' · 🏁 <b>finish</b>':'');}}
      if(dc){const lis=[...card.querySelectorAll("li")].filter(li=>!li.classList.contains("fixed"));
        const onc=lis.filter(li=>!li.classList.contains("skip")).length;
        dc.textContent=on?onc+" stop"+(onc===1?"":"s"):"";}
    });
    renderRibbon(loop);
    drawMini();
  }

  function renderRibbon(loop){
    const el=document.getElementById("tripRibbon2");if(!el)return;
    el.innerHTML=loop.map((c,i)=>{
      const last=i===loop.length-1&&loop.length>1;
      const sub=c.home?"start":(last?"finish":(c.cap?c.st+" · capital":c.st));
      const cls="trip-node"+(c.home?" home":"")+(last?" finish":"");
      return `<div class="${cls}"><span class="dot"></span><b>${c.disp}</b><small>${sub}</small></div>`
        +(i<loop.length-1?'<div class="trip-arrow">→</div>':"");
    }).join("");
  }

  // ── mini-map of the states you'll roam ──
  const US_ATLAS="https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";
  let mmFC=null;
  function drawMini(){
    const svg=d3.select("#tripMiniMap2"),node=svg.node();
    if(!mmFC||!node)return;
    const W=node.clientWidth,H=node.clientHeight;if(W<20||H<20)return;
    const loop=loopNow();
    const full=new Set(loop.map(c=>STFULL[c.st]));
    const feats=mmFC.features.filter(f=>!["Alaska","Hawaii","Puerto Rico"].includes(f.properties.name));
    const hi={type:"FeatureCollection",features:feats.filter(f=>full.has(f.properties.name))};
    if(!hi.features.length){svg.selectAll("*").remove();return;}
    const proj=d3.geoAlbersUsa().fitExtent([[34,26],[W-34,H-22]],hi);
    svg.selectAll("*").remove();
    svg.append("g").selectAll("path").data(feats).join("path")
      .attr("d",d3.geoPath(proj)).attr("class",f=>"mm-state"+(full.has(f.properties.name)?" on":""));
    const nodes=loop;                            // one-way path, no return leg
    const line=nodes.map(c=>proj([c.lon,c.lat])).filter(Boolean);
    if(line.length>1)svg.append("path").attr("class","mm-route").attr("d","M"+line.map(p=>p.join(",")).join("L"));
    nodes.forEach((c,i)=>{const p=proj([c.lon,c.lat]);if(!p)return;
      const last=i===nodes.length-1&&nodes.length>1;
      const g=svg.append("g").attr("transform",`translate(${p[0]},${p[1]})`);
      g.append("circle").attr("class","mm-dot"+(c.home?" home":"")+(last?" finish":"")).attr("r",last?5.5:4.5);
      const flip=p[0]>W-72;
      g.append("text").attr("class","mm-lab").attr("x",flip?-8:8).attr("y",3).attr("text-anchor",flip?"end":"start").text(c.disp);});
    const el=document.getElementById("tripMapStates2");
    if(el)el.textContent="· "+full.size+" states: "+[...new Set(loop.map(c=>c.st))].join(" · ");
  }
  d3.json(US_ATLAS).then(us=>{mmFC=topojson.feature(us,us.objects.states);drawMini();}).catch(()=>{});
  const _mm=document.getElementById("tripMiniMap2");
  if(_mm&&"ResizeObserver"in window)new ResizeObserver(()=>drawMini()).observe(_mm);

  // ── toggles + activities ──
  document.querySelectorAll("#view-trip2 .daytoggle").forEach(btn=>{
    btn.addEventListener("click",()=>{btn.closest(".day").classList.toggle("cityoff");computeTrip();});
  });
  document.querySelectorAll("#view-trip2 .day li").forEach(li=>{
    if(li.classList.contains("fixed"))return;
    li.addEventListener("click",()=>{if(li.closest(".day").classList.contains("cityoff"))return;
      li.classList.toggle("skip");computeTrip();});
  });
  document.querySelectorAll("#tp2Units button").forEach(b=>b.onclick=()=>{
    unit=b.dataset.u;document.querySelectorAll("#tp2Units button").forEach(x=>x.classList.toggle("on",x===b));computeTrip();
  });
  const daysEl=document.getElementById("tp2Days");
  if(daysEl)daysEl.addEventListener("input",computeTrip);

  // ── reorder: ▲▼ arrows + drag handle (desktop) ──
  const tripWrap=document.querySelector("#view-trip2 .trip-wrap");
  function moveCard(card,dir){
    const wrap=card.parentNode;
    if(dir<0){const prev=card.previousElementSibling;
      if(prev&&prev.dataset.city&&prev.dataset.city!=="seattle")wrap.insertBefore(card,prev);}
    else{const next=card.nextElementSibling;
      if(next&&next.dataset.city)wrap.insertBefore(next,card);}
    computeTrip();
  }
  let dragCard=null;
  function dragAfter(y){
    const els=[...tripWrap.querySelectorAll(".day[data-city]")].filter(c=>c.dataset.city!=="seattle"&&c!==dragCard);
    let best={off:-Infinity,el:null};
    els.forEach(el=>{const b=el.getBoundingClientRect(),off=y-b.top-b.height/2;if(off<0&&off>best.off)best={off,el};});
    return best.el;
  }
  if(tripWrap){
    tripWrap.addEventListener("dragover",e=>{
      if(!dragCard)return;e.preventDefault();e.dataTransfer.dropEffect="move";
      const after=dragAfter(e.clientY);
      if(after)tripWrap.insertBefore(dragCard,after);else tripWrap.appendChild(dragCard);
    });
    tripWrap.addEventListener("drop",e=>{if(dragCard){e.preventDefault();computeTrip();}});
  }
  document.querySelectorAll("#view-trip2 .day[data-city]").forEach(card=>{
    if(card.dataset.city==="seattle")return;
    const h=card.querySelector(".day-h");if(!h)return;
    const rc=document.createElement("span");rc.className="reorder";
    rc.innerHTML='<span class="grip" draggable="true" title="Drag to reorder" aria-label="Drag to reorder">⠿</span>'+
      '<span class="arrows"><button class="rbtn" data-dir="-1" title="Move earlier" aria-label="Move earlier">▲</button>'+
      '<button class="rbtn" data-dir="1" title="Move later" aria-label="Move later">▼</button></span>';
    h.insertBefore(rc,h.firstChild);
    rc.querySelectorAll(".rbtn").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();moveCard(card,+b.dataset.dir);}));
    const grip=rc.querySelector(".grip");
    grip.addEventListener("dragstart",e=>{dragCard=card;card.classList.add("dragging");e.dataTransfer.effectAllowed="move";
      try{e.dataTransfer.setData("text/plain",card.dataset.city);}catch(_){}
      try{e.dataTransfer.setDragImage(card,24,18);}catch(_){}});
    grip.addEventListener("dragend",()=>{if(dragCard)dragCard.classList.remove("dragging");dragCard=null;computeTrip();});
  });

  // ── optimize: shortest one-way path from Seattle (nearest-neighbour) ──
  function optimizeOrder(){
    const inc=loopNow();if(inc.length<3)return;
    const home=inc[0],pool=inc.slice(1),path=[home];let cur=home;
    while(pool.length){let bi=0,bd=Infinity;
      pool.forEach((c,i)=>{const d=hav(cur,c);if(d<bd){bd=d;bi=i;}});
      cur=pool.splice(bi,1)[0];path.push(cur);}
    path.forEach(c=>tripWrap.appendChild(cardFor(c.id)));
    CITIES.forEach(c=>{if(!c.home&&!cityOn(c))tripWrap.appendChild(cardFor(c.id));});
    computeTrip();
  }
  const optBtn=document.getElementById("tp2Optimize");
  if(optBtn)optBtn.addEventListener("click",optimizeOrder);

  computeTrip();
}
