(()=>{
const R=Math.PI/180;
const SHOWERS=[ // [name, peak month(1-12), day, ZHR, radiant/parent, active range]
 ['Quadrantids',1,3,110,'Boötes · asteroid 2003 EH1','Dec 28 – Jan 12'],['Lyrids',4,22,18,'Lyra · Comet Thatcher','Apr 14 – 30'],
 ['Eta Aquariids',5,6,50,'Aquarius · Halley’s Comet','Apr 19 – May 28'],['Southern Delta Aquariids',7,30,25,'Aquarius · comet 96P/Machholz','Jul 12 – Aug 23'],
 ['Perseids',8,12,100,'Perseus · Comet Swift–Tuttle','Jul 17 – Aug 24'],['Draconids',10,8,10,'Draco · Comet Giacobini–Zinner','Oct 6 – 10'],
 ['Orionids',10,21,20,'Orion · Halley’s Comet','Oct 2 – Nov 7'],['Southern Taurids',10,10,5,'Taurus · Comet Encke (fireballs)','Sep 10 – Nov 20'],
 ['Northern Taurids',11,12,5,'Taurus · Comet Encke (fireballs)','Oct 20 – Dec 10'],['Leonids',11,17,15,'Leo · Comet Tempel–Tuttle','Nov 6 – 30'],
 ['Geminids',12,14,150,'Gemini · asteroid 3200 Phaethon','Dec 4 – 20'],['Ursids',12,22,10,'Ursa Minor · Comet Tuttle','Dec 17 – 26']];
const PL=['Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune'];
const ICON={Mercury:'☿',Venus:'♀',Mars:'♂',Jupiter:'♃',Saturn:'♄',Uranus:'⛢',Neptune:'♆'};
const COL={Mercury:'#5b5048',Venus:'#6b5a33',Mars:'#6b2f22',Jupiter:'#5e4a30',Saturn:'#5e5030',Uranus:'#2a5560',Neptune:'#26386b'};
let tle=null,clouds=null,cloudKey='';
async function getTLE(){
  const c=JSON.parse(localStorage.getItem('sg_tle')||'null');if(c&&Date.now()-c.t<6*3600e3)return c.l;
  try{const r=await fetch('https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE',{cache:'no-store'});const t=(await r.text()).trim().split('\n').map(s=>s.trim());
    if(t.length>=3&&t[1].startsWith('1 ')){localStorage.setItem('sg_tle',JSON.stringify({t:Date.now(),l:t}));return t}}catch(e){}
  return c?c.l:null}
async function getClouds(){const k=App.loc.lat.toFixed(2)+','+App.loc.lon.toFixed(2);if(clouds&&cloudKey===k)return clouds;
  try{const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${App.loc.lat}&longitude=${App.loc.lon}&hourly=cloud_cover&forecast_days=3&timezone=auto&timeformat=unixtime`);const j=await r.json();
    clouds=j.hourly.time.map((t,i)=>[t*1000,j.hourly.cloud_cover[i]]);cloudKey=k}catch(e){clouds=null}return clouds}
function issPasses(l,o,start,hours){
  const satrec=satellite.twoline2satrec(l[1],l[2]);const gd={latitude:o.latitude*R,longitude:o.longitude*R,height:0.03};
  const out=[];let cur=null;
  for(let t=start.getTime();t<start.getTime()+hours*3600e3;t+=20e3){const d=new Date(t);const pv=satellite.propagate(satrec,d);if(!pv||!pv.position)continue;
    const gmst=satellite.gstime(d);const ecf=satellite.eciToEcf(pv.position,gmst);const la=satellite.ecfToLookAngles(gd,ecf);const el=la.elevation/R,az=la.azimuth/R;
    if(el>10){if(!cur)cur={start:d,saz:az,max:el,maxT:d,lit:false,dark:false};
      if(el>cur.max){cur.max=el;cur.maxT=d}cur.end=d;cur.eaz=az;
      const tt=A.MakeTime(d);const sunAlt=A.Horizon(tt,o,...(()=>{const e=A.Equator('Sun',tt,o,true,true);return [e.ra,e.dec]})(),'normal').altitude;
      const sv=A.GeoVector('Sun',tt,true);const sl=Math.hypot(sv.x,sv.y,sv.z);const s=[sv.x/sl,sv.y/sl,sv.z/sl];const p=pv.position;const pd=p.x*s[0]+p.y*s[1]+p.z*s[2];
      const perp=Math.hypot(p.x-pd*s[0],p.y-pd*s[1],p.z-pd*s[2]);const sunlit=pd>0||perp>6378;
      if(sunlit&&sunAlt<-6)cur.vis=true;if(sunAlt<-6)cur.dark=true}
    else if(cur){out.push(cur);cur=null}}
  if(cur)out.push(cur);return out}
function nextShowers(now){const y=now.getFullYear();const list=[];for(const yy of [y,y+1])for(const s of SHOWERS){const d=new Date(yy,s[1]-1,s[2],2,0);if(d>now-2*864e5)list.push([d,...s])}
  return list.sort((a,b)=>a[0]-b[0]).slice(0,5)}
let busy=false;
async function render(){
  if(busy)return;busy=true;const el=document.getElementById('tonight');
  try{
  const o=App.obs(),now=new Date(),t=A.MakeTime(now);
  // night window: sunset today (or now if after) to next sunrise
  let set=A.SearchRiseSet('Sun',o,-1,A.MakeTime(new Date(now-12*3600e3)),1.5);
  if(set&&set.date<now-12*3600e3)set=null;
  const sunNowAlt=A.Horizon(t,o,A.Equator('Sun',t,o,true,true).ra,A.Equator('Sun',t,o,true,true).dec).altitude;
  let dusk=A.SearchAltitude('Sun',o,-1,sunNowAlt< -12?A.MakeTime(new Date(now-14*3600e3)):t,1.2,-12);
  const sunset=A.SearchRiseSet('Sun',o,-1,sunNowAlt<0?A.MakeTime(new Date(now-14*3600e3)):t,1.2);
  const nStart=dusk?dusk.date:now;const dawn=A.SearchAltitude('Sun',o,+1,A.MakeTime(nStart),1.2,-12);const sunrise=A.SearchRiseSet('Sun',o,+1,A.MakeTime(nStart),1.2);
  const nEnd=dawn?dawn.date:new Date(nStart.getTime()+10*3600e3);
  const from=nStart<now?now:nStart;
  // planets
  const rows=PL.map(p=>{let best=-90,bestT=null;for(let x=from.getTime();x<=nEnd.getTime();x+=15*60e3){const tt=A.MakeTime(new Date(x));const e=A.Equator(p,tt,o,true,true);const h=A.Horizon(tt,o,e.ra,e.dec,'normal');if(h.altitude>best){best=h.altitude;bestT={d:new Date(x),az:h.azimuth}}}
    const rise=A.SearchRiseSet(p,o,+1,A.MakeTime(new Date(nStart-6*3600e3)),1.2),setT=A.SearchRiseSet(p,o,-1,A.MakeTime(rise&&rise.date<nEnd?rise.date:new Date(nStart-6*3600e3)),1.2);
    const mag=A.Illumination(p,t).mag;return {p,best,bestT,rise:rise&&rise.date,set:setT&&setT.date,mag,vis:best>8&&(mag<6||p==='Uranus')}});
  const vis=rows.filter(r=>r.best>8).sort((a,b)=>a.mag-b.mag);
  // moon
  const ph=A.MoonPhase(t),ill=A.Illumination('Moon',t).phase_fraction;
  const pname=ph<10||ph>350?'New Moon':ph<80?'Waxing crescent':ph<100?'First quarter':ph<170?'Waxing gibbous':ph<190?'Full Moon':ph<260?'Waning gibbous':ph<280?'Last quarter':'Waning crescent';
  const mr=A.SearchRiseSet('Moon',o,+1,A.MakeTime(new Date(now-6*3600e3)),1.5),ms=A.SearchRiseSet('Moon',o,-1,A.MakeTime(new Date(now-6*3600e3)),1.5);
  let q=A.SearchMoonQuarter(t);const qs=[];for(let i=0;i<4;i++){qs.push(q);q=A.NextMoonQuarter(q)}
  const QN=['New','First qtr','Full','Last qtr'];
  // ISS
  const [l,cl]=await Promise.all([getTLE(),getClouds()]);
  let passes=null;if(l){passes=issPasses(l,o,now,72).filter(p=>p.vis).slice(0,5)}
  // clouds tonight
  let cloudHtml='',avgC=null;if(cl){const night=cl.filter(c=>c[0]>=nStart-3600e3&&c[0]<=nEnd);if(night.length){avgC=Math.round(night.reduce((s,c)=>s+c[1],0)/night.length);
    cloudHtml=`<div class=clouds>${night.map(c=>`<i style="height:${Math.max(4,c[1])}%;opacity:${.35+c[1]/160}" title="${c[1]}%"></i>`).join('')}</div><div class=ctick><span>${App.fmtT(new Date(night[0][0]))}</span><span>cloud cover by hour</span><span>${App.fmtT(new Date(night[night.length-1][0]))}</span></div>`}}
  const moonPenalty=ill*3*(1),score=Math.max(1,Math.round(10-(avgC==null?2:avgC/12)-moonPenalty));
  const head=score>=7?'Tonight is worth it ✨':score>=4?'Decent night 🌙':'Tough night for stars ☁️';
  const dirs=a=>App.dirName(a);
  let h=`<div class="glass hero"><h1>${head}</h1><div class=m>${App.fmtD(now)} · ${App.loc.name} · Sunset ${App.fmtT(sunset&&sunset.date)} · Dark ${App.fmtT(dusk&&dusk.date)}–${App.fmtT(dawn&&dawn.date)}</div>
  <div class=score><div><b>${score}/10</b>Sky score</div><div><b>${avgC==null?'—':avgC+'%'}</b>Clouds</div><div><b>${Math.round(ill*100)}%</b>Moon lit</div><div><b>${vis.length}</b>Planets up</div></div>${cloudHtml}</div>`;
  h+=`<h4>Planets tonight</h4>`;
  for(const r of rows){const up=r.best>8;h+=`<div class="glass it ${up?'':'dim'}" onclick="SkyOpen('${r.p}')"><div class=ic style="background:${COL[r.p]}">${ICON[r.p]}</div><div><h3>${r.p}${r.mag>6?' <small style="color:#8f9ac8;font-weight:400">(binoculars)</small>':''}</h3><p>${up?`Best ${App.fmtT(r.bestT.d)}, ${r.best.toFixed(0)}° up in the ${dirs(r.bestT.az)} · mag ${r.mag.toFixed(1)}`:'Not well placed tonight (too close to the Sun or below horizon)'}<br>Rise ${App.fmtT(r.rise)} · Set ${App.fmtT(r.set)}</p></div><div class=t>${up?'👁':'—'}</div></div>`}
  h+=`<h4>Moon</h4><div class="glass it"><div class=ic style="font-size:26px">${moonGlyph(ph)}</div><div><h3>${pname} · ${Math.round(ill*100)}%</h3><p>Moonrise ${App.fmtT(mr&&mr.date)} · Moonset ${App.fmtT(ms&&ms.date)}<br>${qs.map(x=>QN[x.quarter]+' '+App.fmtD(x.time.date)).join(' · ')}</p></div></div>`;
  h+=`<h4>ISS visible passes (next 3 days)</h4>`;
  if(!l)h+=`<div class="glass it"><p>Couldn’t load the ISS orbit from CelesTrak (offline?). Try again later.</p></div>`;
  else if(!passes.length)h+=`<div class="glass it"><div class=ic>🛰</div><div><h3>No visible passes</h3><p>The ISS doesn’t pass over in darkness while sunlit in the next 72 hours from here. Check back — visibility comes in multi-day windows.</p></div></div>`;
  else for(const p of passes)h+=`<div class="glass it"><div class=ic style="background:#2a3a6b">🛰</div><div><h3>${App.fmtD(p.start)} · ${App.fmtT(p.start)}</h3><p>From ${dirs(p.saz)} → to ${dirs(p.eaz)} · max ${p.max.toFixed(0)}° at ${App.fmtT(p.maxT)}<br>Lasts ${Math.round((p.end-p.start)/60000)} min above 10°${p.max>50?' · bright, high pass':''}</p></div><div class=t>${p.max.toFixed(0)}°<small>max</small></div></div>`;
  h+=`<h4>Meteor showers</h4>`;
  for(const s of nextShowers(now)){const mi=A.Illumination('Moon',A.MakeTime(s[0])).phase_fraction;const days=Math.round((s[0]-now)/864e5);
    h+=`<div class="glass it"><div class=ic style="background:#3a2a5b">☄️</div><div><h3>${s[1]}</h3><p>Peak night ${App.fmtD(new Date(s[0]-864e5*0.5))} · up to ~${s[4]}/hr in dark skies<br>${s[5]} · active ${s[6]} · Moon ${Math.round(mi*100)}% lit</p></div><div class=t>${days<=0?'now':days+'d'}<small>${days<=0?'':'away'}</small></div></div>`}
  h+=`<div class=credits>Times shown in your phone’s local time zone. Positions: <a href="https://github.com/cosinekitty/astronomy">Astronomy Engine</a>. ISS orbit: <a href="https://celestrak.org">CelesTrak</a> TLE + satellite.js (${l?'epoch '+l[1].substr(18,14):'n/a'}). Clouds: <a href="https://open-meteo.com">Open-Meteo</a>. Stars: Hipparcos via d3-celestial. 3D textures: <a href="https://www.solarsystemscope.com/textures/">Solar System Scope</a> (CC BY 4.0, from NASA data). Meteor shower dates: IMO, peak dates approximate (±1 day).</div>`;
  el.innerHTML=h;
  }catch(e){el.innerHTML='<div class=loading>Something went wrong: '+e.message+'</div>';console.error(e)}
  busy=false;
}
function moonGlyph(ph){return ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'][Math.round(ph/45)%8]}
window.Tonight={render};
App.onLoc(()=>{if(App.view==='tonight')render()});
})();
