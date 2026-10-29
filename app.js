const A=window.Astronomy;
const DEFAULT_LOC={lat:32.52,lon:-92.15,name:'West Monroe, LA'};
const App={loc:JSON.parse(localStorage.getItem('sg_loc')||'null')||DEFAULT_LOC,listeners:[]};
App.obs=()=>new A.Observer(App.loc.lat,App.loc.lon,30);
App.onLoc=f=>App.listeners.push(f);
App.setLoc=l=>{App.loc=l;localStorage.setItem('sg_loc',JSON.stringify(l));document.getElementById('locChip').textContent='📍 '+l.name.split(',')[0];App.listeners.forEach(f=>f())};
App.fmtT=d=>d?d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}):'—';
App.fmtD=d=>d.toLocaleDateString([], {weekday:'short',month:'short',day:'numeric'});
App.dirName=az=>['N','NE','E','SE','S','SW','W','NW'][Math.round(((az%360)+360)%360/45)%8];
App.geolocate=(quiet)=>new Promise(res=>{
  if(!navigator.geolocation){res(false);return}
  navigator.geolocation.getCurrentPosition(p=>{App.setLoc({lat:+p.coords.latitude.toFixed(3),lon:+p.coords.longitude.toFixed(3),name:'My location',gps:1});res(true)},
    e=>{if(!quiet)alert('Location not available ('+e.message+'). Using '+App.loc.name+'.');res(false)},{enableHighAccuracy:false,timeout:10000,maximumAge:600000});
});
document.getElementById('locChip').textContent='📍 '+App.loc.name.split(',')[0];
// auto-use GPS if already granted
if(navigator.permissions&&navigator.permissions.query){navigator.permissions.query({name:'geolocation'}).then(r=>{if(r.state==='granted')App.geolocate(true)}).catch(()=>{})}
document.getElementById('locChip').onclick=()=>{
  const s=document.createElement('div');s.className='sheet';
  s.innerHTML=`<div class=glass><h3>Location</h3><p style="font-size:12px;color:#9aa6d8;margin-bottom:10px">Now: ${App.loc.name} (${App.loc.lat.toFixed(2)}, ${App.loc.lon.toFixed(2)})</p>
  <button class=b id=lg>📡 Use my phone’s location</button><button class=b id=ld>🏠 West Monroe, LA (default)</button>
  <input id=lm placeholder="or type lat, lon  e.g. 32.52, -92.15"><button class=b id=ls>Set coordinates</button><button class=b id=lc>Cancel</button></div>`;
  document.body.appendChild(s);const c=()=>s.remove();
  s.onclick=e=>{if(e.target===s)c()};
  s.querySelector('#lg').onclick=()=>{c();App.geolocate(false)};
  s.querySelector('#ld').onclick=()=>{c();App.setLoc(DEFAULT_LOC)};
  s.querySelector('#lc').onclick=c;
  s.querySelector('#ls').onclick=()=>{const m=s.querySelector('#lm').value.split(/[ ,]+/).map(Number);if(m.length>=2&&Math.abs(m[0])<=90&&Math.abs(m[1])<=180){App.setLoc({lat:m[0],lon:m[1],name:'Custom'});c()}};
};
// tabs
document.querySelectorAll('.nav button').forEach(b=>b.onclick=()=>App.show(b.dataset.v));
App.show=v=>{document.querySelectorAll('.nav button').forEach(x=>x.classList.toggle('on',x.dataset.v===v));
  document.querySelectorAll('.view').forEach(x=>x.classList.toggle('on',x.id==='v-'+v));App.view=v;location.hash=v;
  if(v==='tonight'&&window.Tonight)Tonight.render();if(v==='sky'&&window.Sky)Sky.resize();};
// Bring It Home
const MODELS={
 saturn:{t:'Saturn',x:'Ringed gas giant, 9.5× Earth’s width. Its rings span ~280,000 km but are mostly only tens of metres thick. Its axis is tilted 26.7° (Earth’s is 23.4°), so it has seasons too. Tap “View in your room” and point at the floor or a table.'},
 jupiter:{t:'Jupiter',x:'The largest planet — 11× Earth’s diameter. Look for the Great Red Spot, a storm bigger than Earth, and the cloud belts made of ammonia ice.'},
 mars:{t:'Mars',x:'Half Earth’s size, rusty red from iron-oxide dust. Find Valles Marineris, a canyon as long as the USA, across the middle.'},
 moon:{t:'The Moon',x:'Real lunar map from NASA LRO data. The dark “seas” (maria) are ancient lava plains; the near side always faces Earth.'},
 solar_system:{t:'Solar system on your table',x:'The Sun and all eight planets. Sizes are exaggerated and distances squeezed so it fits a tabletop — at true scale, with a 20 cm Sun, Neptune would be ~650 m away.'}};
const mv=document.getElementById('mv');
App.pick=k=>{mv.src='models/'+k+'.glb';document.getElementById('mTitle').textContent=MODELS[k].t;document.getElementById('mText').textContent=MODELS[k].x;
  document.querySelectorAll('#pick button').forEach(b=>b.classList.toggle('a',b.dataset.m===k));mv.cameraOrbit=k==='solar_system'?'0deg 75deg 2.2m':'auto auto auto'};
document.querySelectorAll('#pick button').forEach(b=>b.onclick=()=>App.pick(b.dataset.m));
App.pick('saturn');
mv.addEventListener('load',()=>{const n=document.getElementById('arNote');n.textContent=mv.canActivateAR?'AR ready: uses WebXR in Chrome or Google’s Scene Viewer app on Android.':'AR needs an ARCore phone (like your Pixel) in Chrome. Drag to spin, pinch to zoom.';});
mv.addEventListener('ar-status',e=>{if(e.detail.status==='failed')document.getElementById('arNote').textContent='AR session failed to start — make sure Google Play Services for AR is installed/updated.'});
// service worker
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
window.addEventListener('load',()=>{const h=location.hash.slice(1);if(['sky','home','tonight'].includes(h))App.show(h)});
