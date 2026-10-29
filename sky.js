(()=>{
const D=window.SKYDATA,F=window.FACTS,R=Math.PI/180;
const cv=document.getElementById('sky'),cx=cv.getContext('2d');
let W=0,H=0,dpr=1;
const st={az:180,alt:35,fov:80,sensor:false,offset:0,basis:null,sel:null};
const vec=(ra,de)=>{ra*=R;de*=R;return [Math.cos(de)*Math.cos(ra),Math.cos(de)*Math.sin(ra),Math.sin(de)]};
const stars=D.stars.map(s=>({v:vec(s[0],s[1]),m:s[2],bv:s[3],name:s[4],des:s[5],hip:s[6]}));
const lines=Object.entries(D.lines).map(([id,segs])=>({id,segs:segs.map(sg=>sg.map(p=>vec(p[0],p[1])))}));
const cons=Object.entries(D.cons).map(([id,c])=>({id,n:c.n,v:vec(c.ra,c.de),r:c.r}));
const BODIES=['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune'];
const SYM={Sun:'',Moon:'',Mercury:'',Venus:'',Mars:'',Jupiter:'',Saturn:'',Uranus:'',Neptune:''};
const PCOL={Sun:'#fff3b0',Moon:'#f4f1e6',Mercury:'#d9cbb8',Venus:'#fff7dd',Mars:'#ff9a6a',Jupiter:'#ffe7c2',Saturn:'#ffe2a6',Uranus:'#b9f0ff',Neptune:'#8fb2ff'};
function bvColor(bv){if(bv<0)return'#aac4ff';if(bv<.3)return'#dfe7ff';if(bv<.6)return'#fff8ee';if(bv<1)return'#ffe8c4';if(bv<1.4)return'#ffd09a';return'#ffb27a'}
let M=null,planets=[],now=new Date(),lastCalc=0;
function time(){return new Date(Date.now()+st.offset*3600e3)}
function recalc(){
  now=time();const t=A.MakeTime(now),o=App.obs();
  const rot=A.Rotation_EQJ_HOR(t,o);M=rot.rot; // hor: x north, y west, z zenith
  planets=BODIES.map(b=>{const eq=A.Equator(b,t,o,false,true);const v=vec(eq.ra*15,eq.dec);let mag=null;try{mag=A.Illumination(b,t).mag}catch(e){}
    return {name:b,v,mag,dist:eq.dist}});
  lastCalc=performance.now();
}
// EQJ vec -> ENU [E,N,U]
function enu(v){const x=M[0][0]*v[0]+M[1][0]*v[1]+M[2][0]*v[2],y=M[0][1]*v[0]+M[1][1]*v[1]+M[2][1]*v[2],z=M[0][2]*v[0]+M[1][2]*v[1]+M[2][2]*v[2];return [-y,x,z]}
function altaz(e){return {alt:Math.asin(Math.max(-1,Math.min(1,e[2])))/R,az:((Math.atan2(e[0],e[1])/R)+360)%360}}
function fromAltAz(alt,az){alt*=R;az*=R;return [Math.cos(alt)*Math.sin(az),Math.cos(alt)*Math.cos(az),Math.sin(alt)]}
function basisFromAltAz(az,alt){const a=az*R,l=alt*R;const f=[Math.sin(a)*Math.cos(l),Math.cos(a)*Math.cos(l),Math.sin(l)];
  const r=[Math.cos(a),-Math.sin(a),0];const u=[-Math.sin(a)*Math.sin(l),-Math.cos(a)*Math.sin(l),Math.cos(l)];return {f,r,u}}
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=v=>{const l=Math.hypot(v[0],v[1],v[2])||1;return [v[0]/l,v[1]/l,v[2]/l]};
function rotv(v,k,ang){const c=Math.cos(ang),s=Math.sin(ang),kv=cross(k,v),kd=k[0]*v[0]+k[1]*v[1]+k[2]*v[2];return v.map((x,i)=>x*c+kv[i]*s+k[i]*kd*(1-c))}
function ortho(b){const f=norm(b.f);const r=norm(cross(f,b.u));const u=cross(r,f);return {f,r,u}}
let view=basisFromAltAz(180,35);
function setView(az,alt){view=basisFromAltAz(az,alt)}
// yaw about world zenith, pitch about the camera's own right axis: works through zenith/nadir (no gimbal lock, no clamp)
function dragBy(yaw,pitch){const Z=[0,0,1];let b={f:rotv(view.f,Z,yaw),r:rotv(view.r,Z,yaw),u:rotv(view.u,Z,yaw)};
  b={f:rotv(b.f,b.r,pitch),r:b.r,u:rotv(b.u,b.r,pitch)};view=ortho(b)}
function dragBasis(){return view}
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
let B,S;
function proj(e){const d=dot(e,B.f);if(st.cam){if(d<0.05)return null;const k=S/d;return [W/2+dot(e,B.r)*k,H/2-dot(e,B.u)*k,d]}if(d<-0.3)return null;const k=2*S/(1+d);return [W/2+dot(e,B.r)*k,H/2-dot(e,B.u)*k,d]}
function resize(){dpr=Math.min(window.devicePixelRatio||1,3);W=cv.clientWidth;H=cv.clientHeight;cv.width=W*dpr;cv.height=H*dpr;cx.setTransform(dpr,0,0,dpr,0,0)}
window.addEventListener('resize',resize);
// sensors
let sens=null;
function onOri(e){
  if(e.alpha==null)return;
  let al=e.alpha;
  if(e.webkitCompassHeading!=null)al=360-e.webkitCompassHeading;
  else if(!e.absolute&&e.type!=='deviceorientationabsolute'){/* relative only */}
  const a=al*R,b=e.beta*R,g=e.gamma*R;
  const cA=Math.cos(a),sA=Math.sin(a),cB=Math.cos(b),sB=Math.sin(b),cG=Math.cos(g),sG=Math.sin(g);
  let x=[cA*cG-sA*sB*sG, cG*sA+cA*sB*sG, -cB*sG];
  let y=[-cB*sA, cA*cB, sB];
  const z=[cG*sA*sB+cA*sG, sA*sG-cA*cG*sB, cB*cG];
  const ang=((screen.orientation&&screen.orientation.angle)||window.orientation||0)*R;
  if(ang){const c=Math.cos(ang),s=Math.sin(ang);const nx=x.map((v,i)=>c*v+s*y[i]),ny=y.map((v,i)=>-s*x[i]+c*v);x=nx;y=ny}
  feed({r:x,u:y,f:z.map(v=>-v)});
}
// Full rotation-matrix smoothing: low-pass each basis vector then re-orthonormalise (no Euler angles, no clamps)
function feed(nb){if(!sens)sens=ortho(nb);else{const k=0.25;const m={};for(const key of ['r','u','f'])m[key]=sens[key].map((v,i)=>v+(nb[key][i]-v)*k);sens=ortho(m)}lastSens=Date.now()}
let lastSens=0,aos=null;
// Preferred on Android Chrome: AbsoluteOrientationSensor quaternion, screen-referenced (handles rotation, no gimbal lock)
function startAOS(){try{if(!('AbsoluteOrientationSensor' in window))return false;
  aos=new AbsoluteOrientationSensor({frequency:60,referenceFrame:'screen'});
  aos.addEventListener('reading',()=>{const [qx,qy,qz,qw]=aos.quaternion;
    const c0=[1-2*(qy*qy+qz*qz),2*(qx*qy+qz*qw),2*(qx*qz-qy*qw)],c1=[2*(qx*qy-qz*qw),1-2*(qx*qx+qz*qz),2*(qy*qz+qx*qw)],c2=[2*(qx*qz+qy*qw),2*(qy*qz-qx*qw),1-2*(qx*qx+qy*qy)];
    gotAbs=true;feed({r:c0,u:c1,f:c2.map(v=>-v)})});
  aos.addEventListener('error',()=>{try{aos.stop()}catch(e){}aos=null});aos.start();return true}catch(e){aos=null;return false}}
const sBtn=document.getElementById('sensorBtn');
let gotAbs=false,listening=false;
const oAbs=e=>{if(aos&&Date.now()-lastSens<300)return;gotAbs=true;onOri(e)},oRel=e=>{if(!gotAbs)onOri(e)};
async function startSensor(quiet){
  try{if(typeof DeviceOrientationEvent!=='undefined'&&DeviceOrientationEvent.requestPermission){const p=await DeviceOrientationEvent.requestPermission();if(p!=='granted')throw 0}}catch(e){if(!quiet)alert('Motion sensor permission denied — drag to look around instead.');return false}
  startAOS();
  if(!listening){window.addEventListener('deviceorientationabsolute',oAbs,true);window.addEventListener('deviceorientation',oRel,true);listening=true}
  st.sensor=true;sBtn.classList.add('a');sBtn.textContent='🧭 Live · tap to stop';
  setTimeout(()=>{if(st.sensor&&!sens){if(!quiet)alert('No compass/tilt sensor data from this browser. Drag to pan instead.');stopSensor()}},2500);return true}
function stopSensor(){if(sens)view=ortho(sens);st.sensor=false;sens=null;if(aos){try{aos.stop()}catch(e){}aos=null}
  if(listening){window.removeEventListener('deviceorientationabsolute',oAbs,true);window.removeEventListener('deviceorientation',oRel,true);listening=false;gotAbs=false}
  sBtn.classList.remove('a');sBtn.textContent='🧭 Point phone'}
sBtn.onclick=()=>{if(st.sensor){stopSensor();return}startSensor()};
// ---- See-through camera mode ----
const vid=document.getElementById('camVid'),camBtn=document.getElementById('camBtn'),fovBox=document.getElementById('fovBox'),fovIn=document.getElementById('fovIn'),fovOut=document.getElementById('fovOut');
let camStream=null;st.cam=false;st.camVfov=+(localStorage.getItem('camVfov')||65);
fovIn.value=st.camVfov;fovOut.textContent=st.camVfov+'°';
fovIn.oninput=()=>{st.camVfov=+fovIn.value;fovOut.textContent=st.camVfov+'°';localStorage.setItem('camVfov',st.camVfov)};
function curFovH(){return st.cam?2*Math.atan(Math.tan(st.camVfov*R/2)*W/H)/R:st.fov}
async function startCam(){
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){alert('Camera not available in this browser (needs HTTPS).');return}
  if(!st.sensor)startSensor(true);  // keep inside the tap gesture for iOS permission
  try{camStream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}}})}
  catch(e){console.warn('camera',e&&e.name,e&&e.message);alert('Camera permission was denied or no camera found.');return}
  vid.srcObject=camStream;vid.muted=true;vid.setAttribute('playsinline','');try{await vid.play()}catch(e){}
  st.cam=true;document.body.classList.add('cam');camBtn.classList.add('a');camBtn.textContent='📷 Camera on';fovBox.hidden=false}
function stopCam(){if(camStream)camStream.getTracks().forEach(t=>t.stop());camStream=null;vid.srcObject=null;st.cam=false;document.body.classList.remove('cam');camBtn.classList.remove('a');camBtn.textContent='📷 See-through';fovBox.hidden=true}
camBtn.onclick=()=>{st.cam?stopCam():startCam()};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&st.cam)stopCam()});
// time button
const tBtn=document.getElementById('timeBtn');const OFFS=[0,1,2,3,4,6,8,10];
tBtn.onclick=()=>{const i=(OFFS.indexOf(st.offset)+1)%OFFS.length;st.offset=OFFS[i];tBtn.textContent=st.offset?'🕒 '+App.fmtT(time())+' (+'+st.offset+'h)':'🕒 Now';recalc()};
// drag / pinch / tap
const ptr=new Map();let down=null,pinch0=null;
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);ptr.set(e.pointerId,[e.clientX,e.clientY]);if(ptr.size===1)down={x:e.clientX,y:e.clientY,lx:e.clientX,ly:e.clientY,moved:false};
  if(ptr.size===2){const p=[...ptr.values()];pinch0={d:Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]),fov:st.fov}}});
cv.addEventListener('pointermove',e=>{if(!ptr.has(e.pointerId))return;ptr.set(e.pointerId,[e.clientX,e.clientY]);
  if(ptr.size===2&&pinch0){const p=[...ptr.values()];const d=Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]);st.fov=Math.max(20,Math.min(130,pinch0.fov*pinch0.d/d));if(down)down.moved=true;return}
  if(!down)return;const dx=e.clientX-down.x,dy=e.clientY-down.y;if(Math.hypot(dx,dy)>8)down.moved=true;
  if(down.moved&&!st.sensor){const radpx=curFovH()*R/W;dragBy(-(e.clientX-down.lx)*radpx*(view.u[2]<0?-1:1),(e.clientY-down.ly)*radpx)}down.lx=e.clientX;down.ly=e.clientY;});
const up=e=>{ptr.delete(e.pointerId);if(ptr.size<2)pinch0=null;if(down&&!down.moved&&ptr.size===0)tap(e.clientX-cv.getBoundingClientRect().left,e.clientY-cv.getBoundingClientRect().top);if(ptr.size===0)down=null};
cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',e=>{ptr.delete(e.pointerId);down=null});
cv.addEventListener('wheel',e=>{st.fov=Math.max(20,Math.min(130,st.fov*(e.deltaY>0?1.1:0.9)));e.preventDefault()},{passive:false});
let hits=[];
function tap(x,y){let best=null,bd=34;for(const h of hits){const d=Math.hypot(h.x-x,h.y-y)-(h.pri||0);if(d<bd){bd=d;best=h}}if(best)openCard(best.o);else closeCard()}
// card
const card=document.getElementById('card');let cur=null,tabK='sailors';
document.getElementById('cClose').onclick=closeCard;
function closeCard(){card.classList.add('hidden');st.sel=null}
document.querySelectorAll('#cTabs button').forEach(b=>b.onclick=()=>{tabK=b.dataset.t;fillTab()});
function constOf(v){let best=null,bd=9;for(const c of cons){const d=1-dot(c.v,v);if(d<bd){bd=d;best=c}}return best}
function openCard(o){st.sel=o;cur=o;tabK='sailors';const e=enu(o.v),aa=altaz(e);
  const pos=`Now ${aa.alt.toFixed(0)}° up in the ${App.dirName(aa.az)} (az ${aa.az.toFixed(0)}°)`+(aa.alt<0?' — below the horizon':'');
  let t,sub,data;
  if(o.kind==='planet'){data=F.planets[o.name]||{};t=o.name;sub=(data.sub||'')+' · '+(o.name==='Moon'?(o.dist*149597870.7).toFixed(0)+' km away':o.dist.toFixed(2)+' AU away');
    if(o.name==='Moon'){const ill=A.Illumination('Moon',A.MakeTime(now));data=Object.assign({},data,{f:[[Math.round(ill.phase_fraction*100)+'%','lit'],...data.f.slice(0,2)]})}
    else if(o.mag!=null)data=Object.assign({},data,{f:[[o.mag.toFixed(1),'magnitude now'],...data.f.slice(1)]})}
  else if(o.kind==='star'){data=F.stars[o.name];const c=constOf(o.v);t=o.name;sub=data?data.sub:`${o.des||''} ${c?c.n:''} · mag ${o.m.toFixed(1)}`;
    if(!data)data={s:`${o.name} is a magnitude ${o.m.toFixed(1)} star in ${c?c.n:'the sky'}. ${pos}. Bright named stars like this one were catalogued by navigators so they could take star sights with a sextant.`,
      m:`Most traditional star names come to us from Arabic astronomy, passed through medieval Latin translations of Ptolemy’s Almagest. ${o.name} lies in ${c?c.n:'this constellation'}${F.cons[c&&c.id]?': '+F.cons[c.id].m:'.'}`,
      c:`Its B−V colour index is ${o.bv.toFixed(2)} — ${o.bv<0?'hot and blue-white':o.bv<.6?'white to yellow-white':o.bv<1.2?'yellow-orange':'cool and orange-red'}. Magnitude ${o.m.toFixed(1)}; lower numbers are brighter, each step ≈2.5× in brightness.`,
      f:[[o.m.toFixed(1),'magnitude'],[o.bv.toFixed(2),'B−V colour'],['HIP '+o.hip,'catalog']]}}
  else{const c=F.cons[o.id]||{};t=o.n;sub='Constellation · '+o.id;data={s:c.s||`${o.n} is one of the 88 official constellations. ${pos}.`,m:c.m||`${o.n} comes down to us from classical or later European star charts.`,c:c.c||`The IAU fixed the 88 constellation boundaries in 1930, so every point in the sky belongs to exactly one constellation.`,f:[[o.id,'IAU abbr.'],[aa.alt.toFixed(0)+'°','altitude now'],[App.dirName(aa.az),'direction']]}}
  cur.data=data;cur.pos=pos;
  document.getElementById('cTitle').textContent=t;document.getElementById('cSub').textContent=sub;
  document.getElementById('cFacts').innerHTML=(data.f||[]).map(x=>`<div><b>${x[0]}</b>${x[1]}</div>`).join('');
  fillTab();card.classList.remove('hidden');
}
function fillTab(){document.querySelectorAll('#cTabs button').forEach(b=>b.classList.toggle('a',b.dataset.t===tabK));
  const k={sailors:'s',myth:'m',science:'c'}[tabK];let txt=cur.data[k]||'';if(tabK==='sailors')txt+=' '+cur.pos+'.';document.getElementById('cText').textContent=txt}
window.SkyOpen=name=>{const p=planets.find(x=>x.name===name);if(p){App.show('sky');openCard({kind:'planet',...p});const a=altaz(enu(p.v));if(!st.sensor)setView(a.az,a.alt)}};
// horizon circle in stereographic projection
function circle3(a,b,c){const d=2*(a[0]*(b[1]-c[1])+b[0]*(c[1]-a[1])+c[0]*(a[1]-b[1]));if(Math.abs(d)<1e-6)return null;
  const s=p=>p[0]*p[0]+p[1]*p[1];const ux=(s(a)*(b[1]-c[1])+s(b)*(c[1]-a[1])+s(c)*(a[1]-b[1]))/d,uy=(s(a)*(c[0]-b[0])+s(b)*(a[0]-c[0])+s(c)*(b[0]-a[0]))/d;return [ux,uy,Math.hypot(a[0]-ux,a[1]-uy)]}
function draw(){
  requestAnimationFrame(draw);
  if(App.view!=='sky')return;
  if(!M||performance.now()-lastCalc>5000)recalc();
  B=st.sensor&&sens?sens:dragBasis();
  S=st.cam?(H/2)/Math.tan(st.camVfov*R/2):(W/2)/(2*Math.tan(st.fov*R/4));
  const g=cx.createRadialGradient(W*.3,H*.2,0,W*.5,H*.5,Math.max(W,H));g.addColorStop(0,'#1b2350');g.addColorStop(.45,'#0a0f2a');g.addColorStop(1,'#04050d');
  if(st.cam)cx.clearRect(0,0,W,H);else{cx.fillStyle=g;cx.fillRect(0,0,W,H)}
  // sky brightness from sun altitude
  const sun=planets[0],sunAlt=altaz(enu(sun.v)).alt;
  if(sunAlt>-18&&!st.cam){const k=Math.min(1,(sunAlt+18)/18);cx.fillStyle=`rgba(60,90,170,${0.55*k})`;cx.fillRect(0,0,W,H)}
  hits=[];
  const fa=altaz(B.f);
  // constellation lines
  cx.lineWidth=1;cx.strokeStyle='rgba(150,175,255,.45)';cx.beginPath();
  for(const L of lines)for(const sg of L.segs){let p0=null;for(const v of sg){const p=proj(enu(v));if(p&&p0&&Math.abs(p[0]-p0[0])<W*1.5){cx.moveTo(p0[0],p0[1]);cx.lineTo(p[0],p[1])}p0=p}}
  cx.stroke();
  // stars
  const fH=curFovH(),lim=fH>90?5:fH>50?5.5:6.5;if(st.cam){cx.shadowColor='#000'}
  for(const s of stars){if(s.m>lim)continue;const p=proj(enu(s.v));if(!p||p[0]<-10||p[0]>W+10||p[1]<-10||p[1]>H+10)continue;
    const r=Math.max(0.7,(4.8-s.m)*0.8*(80/st.fov)**0.4);cx.fillStyle=bvColor(s.bv);
    if(s.m<1.5){cx.shadowColor=cx.fillStyle;cx.shadowBlur=10}cx.beginPath();cx.arc(p[0],p[1],r,0,7);cx.fill();cx.shadowBlur=0;
    if(s.name&&(s.m<2.3||(st.fov<60&&s.m<3.5))){cx.fillStyle='rgba(185,198,255,.85)';cx.font='10px system-ui';cx.fillText(s.name,p[0]+r+3,p[1]+3)}
    if(s.name)hits.push({x:p[0],y:p[1],o:{kind:'star',...s},pri:s.m<1?6:0})}
  // constellation labels
  cx.font='11px system-ui';cx.fillStyle='rgba(150,175,255,.6)';cx.textAlign='center';
  for(const c of cons){if(c.r>2&&st.fov>60)continue;const p=proj(enu(c.v));if(!p||p[2]<.2)continue;cx.fillText(c.n.toUpperCase(),p[0],p[1]);hits.push({x:p[0],y:p[1],o:{kind:'con',...c}})}
  cx.textAlign='left';
  // planets
  for(const pl of planets){const p=proj(enu(pl.v));if(!p)continue;const big=pl.name==='Sun'||pl.name==='Moon';const r=big?Math.max(6,0.25*2*S*R*2):Math.max(2.5,4-(pl.mag||3)*0.4);
    cx.fillStyle=PCOL[pl.name];cx.shadowColor=PCOL[pl.name];cx.shadowBlur=big?24:12;cx.beginPath();cx.arc(p[0],p[1],r,0,7);cx.fill();cx.shadowBlur=0;
    if(pl.name==='Moon'){const ph=A.MoonPhase(A.MakeTime(now)),k=A.Illumination('Moon',A.MakeTime(now)).phase_fraction,wax=ph<180,x=p[0],y=p[1];
      cx.fillStyle='#2a2c3a';cx.beginPath();cx.arc(x,y,r,0,7);cx.fill();cx.fillStyle=PCOL.Moon;cx.beginPath();
      if(wax)cx.arc(x,y,r,-Math.PI/2,Math.PI/2,false);else cx.arc(x,y,r,Math.PI/2,-Math.PI/2,false);cx.fill();
      const ex=r*Math.abs(2*k-1);cx.fillStyle=k>0.5?PCOL.Moon:'#2a2c3a';cx.beginPath();cx.ellipse(x,y,Math.max(.01,ex),r,0,0,7);cx.fill()}
    cx.fillStyle=PCOL[pl.name];cx.font='bold 11px system-ui';cx.fillText(pl.name,p[0]+r+4,p[1]+4);hits.push({x:p[0],y:p[1],o:{kind:'planet',...pl},pri:8})}
  // ground
  // horizon reference azimuth: horizontal part of view dir; near zenith/nadir fall back to the screen-up axis (no gimbal singularity)
  const hz=Math.hypot(B.f[0],B.f[1])>0.05?B.f:(B.f[2]>0?B.u.map(v=>-v):B.u),haz=((Math.atan2(hz[0],hz[1])/R)+360)%360;
  const spread=st.cam?40:90;
  const hp=[fromAltAz(0,haz-spread),fromAltAz(0,haz),fromAltAz(0,haz+spread)].map(proj);
  let test=proj(fromAltAz(Math.min(-10,fa.alt-30),haz));
  if(!test&&st.cam)test=fa.alt>0?null:[W/2,H/2];
  if(hp.every(Boolean)){const c=st.cam?null:circle3(hp[0],hp[1],hp[2]);cx.fillStyle=st.cam?'rgba(3,4,10,.22)':'rgba(3,4,10,.88)';cx.beginPath();
    if(c&&c[2]<1e5){const inside=test?Math.hypot(test[0]-c[0],test[1]-c[1])<c[2]:fa.alt>0===false;
      if(inside){cx.arc(c[0],c[1],c[2],0,7)}else{cx.rect(0,0,W,H);cx.moveTo(c[0]+c[2],c[1]);cx.arc(c[0],c[1],c[2],0,7,true)}cx.fill('evenodd');
      cx.strokeStyle='rgba(120,140,200,.5)';cx.beginPath();cx.arc(c[0],c[1],c[2],0,7);cx.stroke()}
    else{/*line*/const a=hp[0],b=hp[2],nx=-(b[1]-a[1]),ny=b[0]-a[0];const sgn=test?Math.sign((test[0]-a[0])*nx+(test[1]-a[1])*ny)||1:-(Math.sign((W/2-a[0])*nx+(H/2-a[1])*ny)||1);const L=1e4;
      cx.moveTo(a[0]-(b[0]-a[0])*L,a[1]-(b[1]-a[1])*L);cx.lineTo(a[0]+(b[0]-a[0])*L,a[1]+(b[1]-a[1])*L);cx.lineTo(a[0]+(b[0]-a[0])*L+nx*L*sgn,a[1]+(b[1]-a[1])*L+ny*L*sgn);cx.lineTo(a[0]-(b[0]-a[0])*L+nx*L*sgn,a[1]-(b[1]-a[1])*L+ny*L*sgn);cx.fill();cx.strokeStyle='rgba(140,170,255,.7)';cx.beginPath();cx.moveTo(a[0]-(b[0]-a[0])*L,a[1]-(b[1]-a[1])*L);cx.lineTo(a[0]+(b[0]-a[0])*L,a[1]+(b[1]-a[1])*L);cx.stroke()}}
  // cardinal labels
  cx.font='bold 13px system-ui';cx.textAlign='center';
  [['N',0],['NE',45],['E',90],['SE',135],['S',180],['SW',225],['W',270],['NW',315]].forEach(([n,az])=>{const p=proj(fromAltAz(0,az));if(p&&p[2]>0){cx.fillStyle=n==='N'?'#ff8a8a':'#9aa6d8';cx.fillText(n,p[0],p[1]+16)}});
  cx.textAlign='left';
  // selection reticle
  if(st.sel){const p=proj(enu(st.sel.v));if(p){cx.strokeStyle='#ffd77a';cx.lineWidth=1.5;cx.shadowColor='#ffd77a';cx.shadowBlur=12;cx.beginPath();cx.arc(p[0],p[1],18,0,7);cx.stroke();cx.shadowBlur=0}}
  // hud
  const vis=planets.filter(p=>p.name!=='Sun'&&altaz(enu(p.v)).alt>0).map(p=>p.name+' '+App.dirName(altaz(enu(p.v)).az)).slice(0,3).join(' · ');
  hud.textContent=`Facing ${App.dirName(fa.az)} ${fa.az.toFixed(0)}° · ${fa.alt.toFixed(0)}° up${st.sensor?' · live':''}${vis?' · '+vis:''}`;
}
const hud=document.getElementById('hud');
window.Sky={resize,st,openCard,recalc,setView,dragBy,get view(){return view}};
App.onLoc(recalc);
App.view=App.view||'sky';resize();recalc();draw();
})();
