import * as THREE from 'three';
import {SVGLoader} from 'three/addons/loaders/SVGLoader.js';
import FONT from './font-data.json';
import logoSVG from '../assets/openai.svg';
import { layoutName, validateName } from './name-layout.js';
const config=window.launcherConfig||{};
const theme=(config.theme??new URLSearchParams(location.search).get('theme'))==='light'?'light':'dark';
const background=theme==='light'?'#ffffff':'#181818';
document.documentElement.dataset.theme=theme;
document.documentElement.style.setProperty('--surface',background);
document.body.dataset.theme=theme;
const requestedName=config.name??new URLSearchParams(location.search).get('name')??'Alex';
const validated=validateName(requestedName);
if(!validated.ok){document.body.textContent=validated.error;document.body.className='validation-error';throw new Error(validated.error)}
const DATA={...layoutName(validated.name),svg:logoSVG};
document.title='GPT Launcher · '+DATA.name;
document.body.dataset.displayName=DATA.name;
document.body.dataset.glyphCount=String(DATA.glyphs.length);
document.querySelector('#welcome-title').textContent=`Welcome, ${DATA.name}.`;
const bridge=!!window.webkit?.messageHandlers?.splash;
const $=s=>document.querySelector(s), clamp=THREE.MathUtils.clamp;
const native=bridge&&config.mode!=='preview';
const notify=(event)=>{if(bridge)window.webkit.messageHandlers.splash.postMessage(event);if(parent!==window)parent.postMessage({type:'launcher-state',event,name:DATA.name},location.origin==='null'?'*':location.origin)};
if(native)document.body.classList.add('native');
const smooth=t=>{t=clamp(t,0,1);return t*t*t*(t*(t*6-15)+10)};
const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(38,innerWidth/innerHeight,12,12000);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=theme==='light'?.88:1.05;$('#stage').appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xf6f4ff,0x151320,2.1));
for(const [p,col,intensity] of [[[100,400,600],0xfff3e8,3.4],[[-500,-200,300],0x8baeff,2.2],[[300,0,-100],0xff9bd9,2]]){let l=new THREE.DirectionalLight(col,intensity);l.position.set(...p);scene.add(l)}
const palette=(theme==='light'?['#df313d','#db7327','#bf9d25','#359968','#268cbc','#7060ce','#bf5fa3']:['#ff595a','#ff9b45','#f6d960','#81dba1','#55b8ec','#8b81ed','#e992cf']).map(c=>new THREE.Color(c));
function colorAt(t){let x=clamp(t,0,.9999)*(palette.length-1), i=Math.floor(x);return palette[i].clone().lerp(palette[i+1],x-i)}
const material=new THREE.MeshPhysicalMaterial({vertexColors:true,metalness:.08,roughness:.38,clearcoat:1,clearcoatRoughness:.2,side:THREE.FrontSide});
document.body.dataset.renderCheck=JSON.stringify({near:camera.near,far:camera.far,depthBits:renderer.getContext().getParameter(renderer.getContext().DEPTH_BITS),frontFacesOnly:true});
const textGroup=new THREE.Group();scene.add(textGroup);
let segments=[], offsetTime=.8,last=null,letterIndex=0;
function makeTip(size=2){const g=new THREE.Group(),ball=new THREE.Mesh(new THREE.SphereGeometry(size,16,12),new THREE.MeshBasicMaterial({color:0xffecd2}));g.add(ball);const cv=document.createElement('canvas');cv.width=cv.height=64;let cx=cv.getContext('2d'),gr=cx.createRadialGradient(32,32,1,32,32,32);gr.addColorStop(0,'rgba(255,238,213,0.75)');gr.addColorStop(.2,'rgba(255,201,160,0.3)');gr.addColorStop(1,'rgba(255,160,120,0)');cx.fillStyle=gr;cx.fillRect(0,0,64,64);let sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));sp.scale.setScalar(size*12);g.add(sp);scene.add(g);return g}
const pen=makeTip(1.55);
function ribbon(points,width,startColor,endColor,parent=textGroup){const closed=points[0].distanceTo(points.at(-1))<.01;const curve=new THREE.CatmullRomCurve3(closed?points.slice(0,-1):points,closed,'centripetal');curve.arcLengthDivisions=Math.max(5000,points.length*4);const count=Math.min(16000,Math.max(36,Math.ceil(curve.getLength()*2)));let geo=new THREE.TubeGeometry(curve,count,1,12,false);let pos=geo.attributes.position,norm=geo.attributes.normal;const colors=[],pressures=[];const frames=curve.computeFrenetFrames(count,false);
// Flatten the circular cross-section into a rounded satin ribbon; width follows the writing pressure.
for(let i=0;i<=count;i++){const u=i/count,p=curve.getPointAt(u),tan=curve.getTangentAt(u);let side=new THREE.Vector3(-tan.y,tan.x,0).normalize();if(side.length()<.1)side.copy(frames.normals[i]);let bin=new THREE.Vector3().crossVectors(tan,side).normalize();const twist=0,s=side.clone().multiplyScalar(Math.cos(twist)).addScaledVector(bin,Math.sin(twist)),b=new THREE.Vector3().crossVectors(tan,s);const ti=curve.getUtoTmapping(u)*(points.length-1),ia=Math.min(points.length-1,Math.floor(ti)),ib=Math.min(points.length-1,ia+1);const pressure=THREE.MathUtils.lerp(points[ia].w??1,points[ib].w??1,ti-ia),c=colorAt(parent===textGroup?clamp((p.x+550)/1100,0,1):THREE.MathUtils.lerp(startColor,endColor,u));pressures.push(pressure);for(let j=0;j<=12;j++){const a=j/12*Math.PI*2,v=p.clone().addScaledVector(s,Math.cos(a)*width*.5*pressure).addScaledVector(b,Math.sin(a)*width*.15*pressure);pos.setXYZ(i*13+j,v.x,v.y,v.z);const outward=s.clone().multiplyScalar(Math.cos(a)/.5).addScaledVector(b,Math.sin(a)/.15).normalize();norm.setXYZ(i*13+j,outward.x,outward.y,outward.z);colors.push(c.r,c.g,c.b)}}
// Include the longitudinal slope of the rounded terminal in its surface normal.
// This avoids a lighting discontinuity where the section narrows into a pen lift.
for(let i=0;i<=count;i++){
 const h=curve.getLength()/count,dp=(pressures[Math.min(count,i+1)]-pressures[Math.max(0,i-1)])/(h*(i===0||i===count?1:2));
 if(Math.abs(dp)<1e-5)continue;
 const tan=curve.getTangentAt(i/count),side=new THREE.Vector3(-tan.y,tan.x,0).normalize(),bin=new THREE.Vector3().crossVectors(tan,side).normalize();
 for(let j=0;j<=12;j++){const a=j/12*Math.PI*2,n=side.clone().multiplyScalar(Math.cos(a)/(width*.5)).addScaledVector(bin,Math.sin(a)/(width*.15)).addScaledVector(tan,-dp).normalize();norm.setXYZ(i*13+j,n.x,n.y,n.z)}
}
// The custom ellipse uses +cos, whereas TubeGeometry uses -cos. Reverse triangle winding.
const index=geo.index;for(let i=0;i<index.count;i+=3){const j=index.getX(i+1);index.setX(i+1,index.getX(i+2));index.setX(i+2,j)}
geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));const ns=geo.attributes.normal;
function weld(a,b){const n=new THREE.Vector3().fromBufferAttribute(ns,a).add(new THREE.Vector3().fromBufferAttribute(ns,b)).normalize();ns.setXYZ(a,n.x,n.y,n.z);ns.setXYZ(b,n.x,n.y,n.z)}
for(let i=0;i<=count;i++)weld(i*13,i*13+12);
if(closed)for(let j=0;j<=12;j++)weld(j,count*13+j);
geo.setDrawRange(0,0);const mesh=new THREE.Mesh(geo,material);parent.add(mesh);const caps=[0,1].map(()=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(39),3));g.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(39),3));const ix=[];for(let j=0;j<12;j++)ix.push(12,j,(j+1)%12);g.setIndex(ix);const capMaterial=material.clone();capMaterial.side=THREE.DoubleSide;const m=new THREE.Mesh(g,capMaterial);m.frustumCulled=false;parent.add(m);return m});
const nibMaterial=material.clone();nibMaterial.vertexColors=false;
const nib=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),nibMaterial);parent.add(nib);nib.visible=false;
return{curve,geo,mesh,count,ring:72,width,caps,closed,nib};}
function add(points,width,duration,c0,c1){let r=ribbon(points,width,c0,c1);r.start=offsetTime;r.duration=duration;offsetTime+=duration;segments.push(r);last=points.at(-1).clone();return r}
let RIBBON_WIDTH=Math.min(13,Math.max(6,105*1100/DATA.total));
const oLoops=[];const allPoints=[],fontScale=1100/DATA.total;
const textBends=[];
// Lightly fair tight turns without shrinking the source glyphs. Acute
// reversals are then finished by explicit round joins below.
function roundStroke(source,closed=false){
 let points=(closed?source.slice(0,-1):source).map(p=>p.clone());
 const targetRadius=RIBBON_WIDTH*.28,n=points.length,original=points.map(p=>p.clone());
 let passes=0;
 for(;passes<65;passes++){
  const strength=new Float64Array(n);let needsWork=false;
  for(let i=closed?0:1;i<(closed?n:n-1);i++){
   const radius=bendRadius(points[(i+n-1)%n],points[i],points[(i+1)%n]);
   if(radius>=targetRadius)continue;
   needsWork=true;const amount=clamp(1-radius/targetRadius,0,1);
   for(let j=-5;j<=5;j++){let k=i+j;if(closed)k=(k+n)%n;else if(k<=0||k>=n-1)continue;strength[k]=Math.max(strength[k],amount*Math.exp(-j*j/12));}
  }
  if(!needsWork)break;
  points=points.map((p,i)=>{
   if(strength[i]<.0001)return p;
   const mean=points[(i+n-1)%n].clone().add(points[(i+1)%n]).multiplyScalar(.5);
   const q=p.clone().lerp(mean,.45*strength[i]);
   // Limit the edit to local corner rounding, retaining the font's proportions.
   const delta=q.clone().sub(original[i]);if(delta.length()>RIBBON_WIDTH*.28)q.copy(original[i]).add(delta.setLength(RIBBON_WIDTH*.28));
   return q;
  });
 }
 let minRadius=Infinity;for(let i=closed?0:1;i<(closed?n:n-1);i++)minRadius=Math.min(minRadius,bendRadius(points[(i+n-1)%n],points[i],points[(i+1)%n]));
 textBends.push({passes,minRadius});
 if(closed)points.push(points[0].clone());return points;
}
const strokeRecords=[];
let pathExport=[];
// Refine the existing Allure contours only at the marked joins.
const strokeOverrides={
 // Enter the ascender from the baseline, descend through the loop, then
 // return from the descender into the cross-stroke instead of starting below it.
 f:'M 0 183 C 159 274.67 393 840.17 523 696 C 576 637 328 305.33 173 220 C 107 104 12 -360 -110 -365 C -182 -369 -41 138 28 208 C 30 229.17 270 102.33 364 177.17',
 W:FONT.W.d.replace('C 339.8 686.83 418.5 684.33 488 652 M 416 709','C 355 696 426 770 416 709'),
 o:'M 231 337 C 197 425.33 7 252.17 -4 161 C -47 -165.67 331 122.33 275 284 C 267 311 247 331 231 337 M 231 337 C 255 274 323 163 395 183',
 Z:FONT.Z.d.replace('M 239 340 L 236 321 L 621 340','M 236 330 C 338 331 499 335 621 340'),
 // Start at the upper right, close the counterclockwise bowl, then descend
 // the right stem and leave toward n. Keep the source font's lower contours.
 a:'M 362 345.33 C 256.3 413.5 6.2 248 -14.2 149.5 C -59 -68.83 110.2 57.5 208 145 C 251.7 184 305.2 222.5 334 274 C 346 302 355 329 362 345.33 C 338 267 243 42 309.8 26.5 C 350.65 16.91 392.61 33.6 437.16 74.74 C 475.39 110.03 497.46 146.65 527 183'
};
// Crossbars and dots follow the body of each word. They must never become
// accidental connectors into the next letter, or the final logo transition.
const sequence=[];let deferred=[];
for(let i=0;i<DATA.glyphs.length;i++){
 const g=DATA.glyphs[i],parts=g.d.match(/M[^M]+/g)||[];
 if(['i','j','t','x'].includes(g.char)&&parts.length>1){
  sequence.push({...g,d:parts[0],body:true});
  deferred.push({...g,d:parts.slice(1).join(' '),mark:true});
 }else sequence.push({...g,body:true});
 if(!DATA.glyphs[i+1]||DATA.glyphs[i+1].word!==g.word){sequence.push(...deferred);deferred=[];}
}
let finalInkEnd=null,finalInkTangent=null;
for(const glyph of sequence){
 // The source font's s starts with an entry flourish. Traverse its upper curve
 // right-to-left, then its lower curve, without the unrelated entry spur.
 const strokePath=strokeOverrides[glyph.char]??(glyph.char==='s'?'M 0 183 C 64 256 82 295.33 98 328 L 92 312.5 C 81 191.33 349 197.83 186 31.5 C 158 3 -52 -91.17 16 34.67':glyph.d);
 const parsed=new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${strokePath}"/></svg>`);
 let subIndex=0;
 for(const path of parsed.paths) for(const sub of path.subPaths){
 const oLoop=glyph.char==='o'&&subIndex===0;subIndex++;
 let ps=sub.getSpacedPoints(Math.max(12,Math.ceil(sub.getLength()*fontScale/1.5))).map(p=>new THREE.Vector3((p.x+glyph.x-DATA.total/2)*fontScale,(p.y-260)*fontScale*1.15,2.5*Math.sin((p.x+glyph.x)*fontScale*.012)));
 if(glyph.char==='n'||glyph.char==='p')ps.reverse();
 if(oLoop){
  ps.pop();
  for(let pass=0;pass<7;pass++)ps=ps.map((p,i)=>p.clone().multiplyScalar(.5).addScaledVector(ps[(i+ps.length-1)%ps.length],.25).addScaledVector(ps[(i+1)%ps.length],.25));
  ps.push(ps[0].clone());
 }else for(let pass=0;pass<(['m','n','e'].includes(glyph.char)?7:2);pass++)ps=ps.map((p,i)=>i===0||i===ps.length-1?p:p.clone().multiplyScalar(.5).addScaledVector(ps[i-1],.25).addScaledVector(ps[i+1],.25));
 ps=roundStroke(ps,oLoop);
 // Round real pen lifts over physical distance, independent of SVG sample count.
 const strokeDistance=[0];for(let i=1;i<ps.length;i++)strokeDistance.push(strokeDistance[i-1]+ps[i].distanceTo(ps[i-1]));
 const strokeLength=strokeDistance.at(-1),capLength=Math.min(RIBBON_WIDTH*.65,strokeLength*.2);
 const roundPressure=d=>Math.sqrt(Math.max(0,1-Math.pow(1-clamp(d/capLength,0,1),2)));
 ps.forEach((p,i)=>p.w=Math.min(roundPressure(strokeDistance[i]),roundPressure(strokeLength-strokeDistance[i])));
 let joinedToPrevious=false;
 if(allPoints.length){
  const a=allPoints.at(-1),b=ps[0],d=a.distanceTo(b),closeJoin=d<9&&!oLoop&&!glyph.mark&&strokeRecords.at(-1)?.word===glyph.word&&!strokeRecords.at(-1)?.mark;
  if(closeJoin){
   joinedToPrevious=true;
   // Exact shared endpoints also need joining; the old distance guard left a zero-width notch.
   for(let i=allPoints.length-1;i>=0&&a.distanceTo(allPoints[i])<capLength+2;i--)allPoints[i].w=1;
   for(let i=0;i<ps.length&&strokeDistance[i]<capLength+2;i++)ps[i].w=1;
   if(d<.15&&!oLoop)ps.shift();
   else {
    const incoming=a.clone().sub(allPoints.at(-2)).normalize(),outgoing=ps[1].clone().sub(b).normalize();
    const join=new THREE.CubicBezierCurve3(a,a.clone().addScaledVector(incoming,d/3),b.clone().addScaledVector(outgoing,-d/3),b);
    const jp=join.getPoints(Math.max(4,Math.ceil(d/.75))).slice(1,-1);jp.forEach(p=>p.w=1);allPoints.push(...jp);
   }
  }else {
   // Preserve the written stroke's tangent on either side of the invisible lift.
   const incoming=a.clone().sub(allPoints.at(-2)).normalize(),outgoing=ps[1].clone().sub(b).normalize();
   const lift=new THREE.CubicBezierCurve3(a,a.clone().addScaledVector(incoming,Math.min(12,d*.2)),b.clone().addScaledVector(outgoing,-Math.min(12,d*.2)),b);
   const lp=lift.getPoints(Math.max(12,Math.ceil(d/1.5))).slice(1,-1);lp.forEach((p,i)=>{p.z+=Math.min(55,d*.45)*Math.sin(Math.PI*(i+1)/(lp.length+1))**2;p.w=0});allPoints.push(...lp);
  }
 }
 strokeRecords.push({char:glyph.char,word:glyph.word,mark:!!glyph.mark,sub:subIndex-1,joinedToPrevious,first:allPoints.length,last:allPoints.length+ps.length-1,loop:oLoop});
 if(oLoop)oLoops.push({char:glyph.char,points:ps.map(p=>p.clone()),first:allPoints.length,last:allPoints.length+ps.length-1});
 allPoints.push(...ps);
 if(!glyph.mark&&glyph===sequence.filter(g=>!g.mark).at(-1)){
  finalInkEnd=ps.at(-1).clone();finalInkTangent=ps.at(-1).clone().sub(ps.at(-2)).normalize();
 }
 }
}
// Return to the last main stroke after final dots/crossbars without leaving ink.
if(finalInkEnd&&allPoints.at(-1).distanceTo(finalInkEnd)>.15){
 const a=allPoints.at(-1),d=a.distanceTo(finalInkEnd);
 const c=new THREE.CubicBezierCurve3(a,a.clone().add(new THREE.Vector3(0,0,Math.min(d*.4,35))),finalInkEnd.clone().addScaledVector(finalInkTangent,-12),finalInkEnd);
 const lift=c.getSpacedPoints(Math.max(12,Math.ceil(d/1.5))).slice(1);lift.forEach(p=>p.w=0);allPoints.push(...lift);
}
// Fit the actual contours, including capital flourishes, into the same safe frame.
const inkBox=new THREE.Box3().setFromPoints(allPoints.filter(p=>p.w>0));
const center=inkBox.getCenter(new THREE.Vector3()),fit=Math.min(1,1100/(inkBox.max.x-inkBox.min.x));
for(const p of allPoints){p.x=(p.x-center.x)*fit;p.y*=fit;p.z*=fit;}
RIBBON_WIDTH*=fit;
document.body.dataset.layout=JSON.stringify({name:DATA.name,width:1100,strokeWidth:RIBBON_WIDTH,fontScale,fit});
document.body.dataset.textBends=JSON.stringify(textBends);
// Separate genuine stroke crossings in depth instead of leaving coincident surfaces.
const cumulative=[0];for(let i=1;i<allPoints.length;i++)cumulative.push(cumulative[i-1]+allPoints[i].distanceTo(allPoints[i-1]));
const crossings=[];
for(let i=1;i<allPoints.length;i++){
 const a=allPoints[i-1],b=allPoints[i];if((a.w??1)<.95||(b.w??1)<.95)continue;
 for(let j=1;j<i-12;j++){
  if(cumulative[i]-cumulative[j]<32)continue;
  // Bowl closure and its outgoing ligature are one joined stroke, not a weave crossing.
  if(oLoops.some(o=>(i>=o.first&&i<=o.last&&j>=o.first&&j<=o.last)||(j>=o.first&&j<=o.last&&i>o.last&&i<=o.last+32)))continue;
  const c=allPoints[j-1],d=allPoints[j];if((c.w??1)<.95||(d.w??1)<.95)continue;
  if(Math.max(a.x,b.x)<Math.min(c.x,d.x)||Math.max(c.x,d.x)<Math.min(a.x,b.x)||Math.max(a.y,b.y)<Math.min(c.y,d.y)||Math.max(c.y,d.y)<Math.min(a.y,b.y))continue;
  const ux=b.x-a.x,uy=b.y-a.y,vx=d.x-c.x,vy=d.y-c.y,den=ux*vy-uy*vx;if(Math.abs(den)<1e-8)continue;
  const dx=c.x-a.x,dy=c.y-a.y,t=(dx*vy-dy*vx)/den,q=(dx*uy-dy*ux)/den;
  if(t>=0&&t<=1&&q>=0&&q<=1){const at=cumulative[i-1]+t*(cumulative[i]-cumulative[i-1]);if(crossings.every(x=>Math.abs(x.at-at)>12))crossings.push({at,i,j,t,q})}
 }
}
for(const cross of crossings){
 const {at,i,j,t,q}=cross,under=THREE.MathUtils.lerp(allPoints[j-1].z,allPoints[j].z,q),over=THREE.MathUtils.lerp(allPoints[i-1].z,allPoints[i].z,t);
 const lift=Math.max(0,under+RIBBON_WIDTH*.42-over);
 for(let k=0;k<allPoints.length;k++)if(Math.abs(cumulative[k]-at)<64)allPoints[k].z+=lift*Math.exp(-Math.pow((cumulative[k]-at)/18,2));
}
// A ligature should leave the o as a light connector rather than a second full-width bowl.
for(let si=0;si<strokeRecords.length;si++){
 const r=strokeRecords[si];if(r.char!=='o'||r.sub!==1)continue;
 const bowl=strokeRecords[si-1];for(let i=bowl.last+1;i<r.first;i++)allPoints[i].w=.2;
 for(let i=r.first;i<=r.last;i++)allPoints[i].w=.2+.45*smooth((i-r.first)/(r.last-r.first));
 const next=strokeRecords[si+1];if(next)for(let i=next.first;i<=next.last&&cumulative[i]-cumulative[next.first]<16;i++)allPoints[i].w=.65+.35*smooth((cumulative[i]-cumulative[next.first])/16);
 for(let i=r.last+1;next&&i<next.first;i++)allPoints[i].w=.65;
}
// The final body and the outgoing connector share a full-width opening.
const finalBodyRecord=strokeRecords.filter(s=>!s.mark).at(-1);
for(let i=finalBodyRecord.last;i>=finalBodyRecord.first&&cumulative[finalBodyRecord.last]-cumulative[i]<RIBBON_WIDTH;i--)allPoints[i].w=1;
// Draw the two closed o bowls as genuinely closed ribbons. Their exit strokes
// start underneath the bowl with rounded pressure, without retracing its closing arc.
for(const o of oLoops){
 // A closed loop must keep its first/last position identical, including depth.
 for(let i=o.first;i<=o.last;i++)allPoints[i].z=2.5*Math.sin((allPoints[i].x+DATA.total*.5*fontScale)*.012);
 o.points=allPoints.slice(o.first,o.last+1).map(p=>p.clone());o.points[o.points.length-1].copy(o.points[0]);
}
const textPoints=allPoints.map(p=>{const q=p.clone();q.w=p.w;return q});
for(const o of oLoops)for(let i=o.first;i<=o.last;i++)textPoints[i].w=0;
const textRibbon=add(textPoints,RIBBON_WIDTH,clamp(3+DATA.glyphs.length*.52,7.5,18),0,1);
const arcAtIndex=i=>{const t=i/(allPoints.length-1),x=t*textRibbon.curve.arcLengthDivisions,lo=Math.floor(x),a=textRibbon.curve.getLengths();return THREE.MathUtils.lerp(a[lo],a[Math.min(a.length-1,lo+1)],x-lo)};
for(const o of oLoops){
 const d0=arcAtIndex(o.first),d1=arcAtIndex(o.last),length=textRibbon.curve.getLength();
 o.ribbon=ribbon(o.points,RIBBON_WIDTH,d0/length,d1/length);
 o.ribbon.start=textRibbon.start+textRibbon.duration*d0/length;o.ribbon.duration=textRibbon.duration*(d1-d0)/length;
}

// Keep the pen's complete travel curve for timing, but model each inked run
// independently. Invisible lifts must not bend the terminal geometry of a letter.
textRibbon.timelineOnly=true;textRibbon.mesh.visible=false;
const inkStrokes=[];
for(let i=0;i<strokeRecords.length;i++){
 const r=strokeRecords[i];if(r.loop)continue;
 const prev=inkStrokes.at(-1);
 if(r.joinedToPrevious&&prev&&prev.recordIndex===i-1){prev.last=r.last;prev.recordIndex=i;}
 else inkStrokes.push({first:r.first,last:r.last,recordIndex:i});
}
for(const run of inkStrokes){
 const points=allPoints.slice(run.first,run.last+1).map(p=>{const q=p.clone();q.w=p.w;return q});
 const d0=arcAtIndex(run.first),d1=arcAtIndex(run.last),length=textRibbon.curve.getLength();
 run.ribbon=ribbon(points,RIBBON_WIDTH,d0/length,d1/length);
 run.ribbon.start=textRibbon.start+textRibbon.duration*d0/length;run.ribbon.duration=textRibbon.duration*(d1-d0)/length;
}

// A true round join at each acute reversal. The swept tube alone creates a
// bevel-like outer corner at these places; an elliptic join closes that corner.
const jointProgress={value:0},roundJoints=[];
let cornerCandidates=[];
for(let i=2;i<allPoints.length-2;i++){
 if(allPoints[i].w<.98||allPoints[i-1].w<.98||allPoints[i+1].w<.98)continue;
 if(oLoops.some(o=>i>=o.first&&i<=o.last))continue;
 const radius=bendRadius(allPoints[i-1],allPoints[i],allPoints[i+1]);
 if(radius<RIBBON_WIDTH*.44){
  const previous=cornerCandidates.at(-1);
  if(previous&&cumulative[i]-cumulative[previous.i]<RIBBON_WIDTH){if(radius<previous.radius){previous.i=i;previous.radius=radius}}
  else cornerCandidates.push({i,radius});
 }
}
for(const {i} of cornerCandidates){
 const center=allPoints[i],u=arcAtIndex(i)/textRibbon.curve.getLength(),tangent=textRibbon.curve.getTangentAt(u);
 const geometry=new THREE.SphereGeometry(1,32,20);geometry.scale(RIBBON_WIDTH*.5,RIBBON_WIDTH*.5,RIBBON_WIDTH*.15);
 const pos=geometry.attributes.position,at=[];
 for(let j=0;j<pos.count;j++)at.push(u+(pos.getX(j)*tangent.x+pos.getY(j)*tangent.y+pos.getZ(j)*tangent.z)/textRibbon.curve.getLength());
 geometry.setAttribute('cornerTime',new THREE.Float32BufferAttribute(at,1));
 const mat=material.clone();mat.vertexColors=false;mat.color.copy(colorAt(clamp((center.x+550)/1100,0,1)));
 mat.onBeforeCompile=shader=>{
  shader.uniforms.cornerProgress=jointProgress;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float cornerTime; varying float vCornerTime;').replace('#include <begin_vertex>','#include <begin_vertex>\nvCornerTime=cornerTime;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float cornerProgress; varying float vCornerTime;').replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(vCornerTime>cornerProgress)discard;');
 };
 const mesh=new THREE.Mesh(geometry,mat);mesh.position.copy(center);mesh.position.z+=.08;textGroup.add(mesh);roundJoints.push(mesh);
}
document.body.dataset.roundJoins=String(roundJoints.length);
document.body.dataset.strokeTimes=JSON.stringify(strokeRecords.map(s=>({...s,start:textRibbon.start+textRibbon.duration*arcAtIndex(s.first)/textRibbon.curve.getLength(),end:textRibbon.start+textRibbon.duration*arcAtIndex(s.last)/textRibbon.curve.getLength()})));

const writingEnd=offsetTime,logoY=0,logoX=1500;const logoGroup=new THREE.Group();logoGroup.position.set(logoX,logoY,0);scene.add(logoGroup);
// Preserve the exact Simple Icons silhouette. Sort its mesh into six growing strands.
let svg=new SVGLoader().parse(DATA.svg),shapes=svg.paths.flatMap(p=>SVGLoader.createShapes(p));let logoPieces=[];
// Derive six writing guides from the official SVG's six petal apertures.
const holes=shapes.flatMap(s=>s.holes).map(h=>{const pts=h.getSpacedPoints(180).slice(0,-1);let c=pts.reduce((s,p)=>s.add(p),new THREE.Vector2()).multiplyScalar(1/pts.length);return {pts,c}}).filter(h=>h.c.distanceTo(new THREE.Vector2(12,12))>2);
const guides=holes.map((h,k)=>{const area=h.pts.reduce((a,p,i)=>{const q=h.pts[(i+1)%h.pts.length];return a+p.x*q.y-q.x*p.y},0);let pts=h.pts.map((p,i)=>{let prev=h.pts[(i+h.pts.length-1)%h.pts.length],next=h.pts[(i+1)%h.pts.length],t=next.clone().sub(prev).normalize(),n=new THREE.Vector2(t.y,-t.x).multiplyScalar(area>0?1:-1);return new THREE.Vector3((p.x+n.x*.72-12)*11,-(p.y+n.y*.72-12)*11,2)});for(let pass=0;pass<14;pass++){pts=pts.map((p,i)=>p.clone().multiplyScalar(.5).addScaledVector(pts[(i+pts.length-1)%pts.length],.25).addScaledVector(pts[(i+1)%pts.length],.25))}let start=0;for(let i=1;i<pts.length;i++)if(pts[i].distanceToSquared(new THREE.Vector3(-200,0,0))<pts[start].distanceToSquared(new THREE.Vector3(-200,0,0)))start=i;pts=pts.slice(start).concat(pts.slice(0,start));return new THREE.CatmullRomCurve3(pts,true,'centripetal')});
const guideAngle=g=>{let c=g.getPoints(48).reduce((a,p)=>a.add(p),new THREE.Vector3()).multiplyScalar(1/49);return (Math.atan2(c.y,c.x)+Math.PI*3)%(Math.PI*2)};guides.sort((a,b)=>guideAngle(a)-guideAngle(b));
// Separate depth slabs keep complete strands and their incoming branches physically disjoint.
const bendRadii=[];
function bendRadius(a,b,c){const ab=b.clone().sub(a),bc=c.clone().sub(b),ac=c.clone().sub(a),twiceArea=ab.clone().cross(bc).length();return twiceArea<1e-10?1e9:ab.length()*bc.length()*ac.length()/(2*twiceArea)}
// The canonical mark has six-fold symmetry. Reuse one verified SVG-derived petal,
// so resampling an individual aperture cannot introduce a cusp in just one loop.
let template=guides[0].getSpacedPoints(320).slice(0,-1),minRadius=0,passes=0;
while(passes<150){minRadius=Math.min(...template.map((p,i)=>bendRadius(template[(i+template.length-1)%template.length],p,template[(i+1)%template.length])));if(minRadius>RIBBON_WIDTH*.85)break;template=template.map((p,i)=>p.clone().multiplyScalar(.5).addScaledVector(template[(i+template.length-1)%template.length],.25).addScaledVector(template[(i+1)%template.length],.25));passes++}
const samples=guides.map((g,k)=>{
 const angle=k*Math.PI/3,cos=Math.cos(angle),sin=Math.sin(angle);
 let points=template.map(p=>new THREE.Vector3(p.x*cos-p.y*sin,p.x*sin+p.y*cos,0));
 let start=0;for(let i=1;i<points.length;i++)if(points[i].x<points[start].x)start=i;
 points=points.slice(start).concat(points.slice(0,start));bendRadii.push({minRadius,passes});return [...points,points[0].clone()];
});
document.body.dataset.bends=JSON.stringify(bendRadii);
for(let k=0;k<samples.length;k++){
 const ps=samples[k];ps.forEach(p=>p.z=(k-2.5)*9);
 const r=ribbon(ps,RIBBON_WIDTH,k/5,k/5,logoGroup);r.guide=r.curve;guides[k]=r.curve;r.tip=makeTip(1.55);logoPieces.push(r);
}
document.body.dataset.geometry=JSON.stringify({strandSpacing:9,sectionDepth:RIBBON_WIDTH*.3,clearance:9-RIBBON_WIDTH*.3});
function logoHue(p){return clamp((p.x+145)/290,0,1)}
function paint(r,fn){const colors=r.geo.attributes.color;for(let i=0;i<=r.count;i++){const c=colorAt(fn(r.curve.getPointAt(i/r.count),i/r.count));for(let j=0;j<=12;j++)colors.setXYZ(i*13+j,c.r,c.g,c.b)}colors.needsUpdate=true}
for(const r of logoPieces)paint(r,p=>logoHue(p));
const connector=ribbon([last,last.clone().addScaledVector(textRibbon.curve.getTangentAt(1),100),new THREE.Vector3(740,-80,30),new THREE.Vector3(1070,90,50),new THREE.Vector3(1140,70,25),new THREE.Vector3(logoX-260,0,0)],RIBBON_WIDTH,clamp((last.x+550)/1100,0,1),1,scene);
const writingSpeed=textRibbon.curve.getLength()/textRibbon.duration,connectorDuration=connector.curve.getLength()/writingSpeed;
const hub=connector.curve.getPointAt(1);
const branches=guides.map((guide,k)=>{let end=guide.getPointAt(0).add(new THREE.Vector3(logoX,logoY,0)),tangent=guide.getTangentAt(0);const branchCurve=new THREE.CubicBezierCurve3(hub,hub.clone().addScaledVector(connector.curve.getTangentAt(1),65),end.clone().addScaledVector(tangent,-48),end);const branchPoints=branchCurve.getPoints(180),leftEdge=logoX+Math.min(...samples.flat().map(p=>p.x))-RIBBON_WIDTH*2;for(const p of branchPoints)p.z=THREE.MathUtils.lerp(p.z,end.z,smooth((p.x-hub.x)/Math.max(1,leftEdge-hub.x)));let r=ribbon(branchPoints,RIBBON_WIDTH,1,logoHue(guide.getPointAt(0)),scene);paint(r,(p,u)=>THREE.MathUtils.lerp(1,logoHue(guide.getPointAt(0)),smooth(u)));r.tip=makeTip(1.55);return r;});
// Opaque black surround with a real hexagonal aperture: the destination lives behind it.
const surround=new THREE.Shape();surround.moveTo(-12000,-12000);surround.lineTo(12000,-12000);surround.lineTo(12000,12000);surround.lineTo(-12000,12000);surround.closePath();const hole=new THREE.Path();for(let i=0;i<6;i++){let a=Math.PI/6+i*Math.PI/3;let x=Math.cos(a)*31,y=Math.sin(a)*31;i?hole.lineTo(x,y):hole.moveTo(x,y)}hole.closePath();surround.holes.push(hole);const curtain=new THREE.Mesh(new THREE.ShapeGeometry(surround),new THREE.MeshBasicMaterial({color:background,side:THREE.DoubleSide,toneMapped:false,transparent:true,depthWrite:false}));curtain.position.set(logoX,logoY,-70);curtain.renderOrder=-10;
// Feather the opening so page details emerge softly instead of crossing a hard hexagonal edge.
curtain.material.onBeforeCompile=shader=>{
 shader.vertexShader='varying vec2 aperturePosition;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\naperturePosition=position.xy;');
 shader.fragmentShader='varying vec2 aperturePosition;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=smoothstep(28.0,48.0,length(aperturePosition));');
};scene.add(curtain);
let waitingNotified=false;let frameTimes=[];let elapsed=0,prev=performance.now(),paused=false,speed=1,ready=false,enterTime=null,hold=false,finished=false,state='writing',entryScale=1,entryVelocity=0;
const splitStart=writingEnd+connectorDuration;
// A single distance clock drives both sides of every branch/letter join.
// Its velocity begins at the incoming pen speed and settles continuously.
const settledSpeed=writingSpeed*.6,settleTime=.6;
function splitDistance(t){t=Math.max(0,t);return settledSpeed*t+(writingSpeed-settledSpeed)*settleTime*(1-Math.exp(-t/settleTime))}
function distanceTime(d){let lo=0,hi=30;for(let i=0;i<50;i++){let m=(lo+hi)/2;splitDistance(m)<d?lo=m:hi=m}return (lo+hi)/2}
branches.forEach((r,k)=>{r.length=r.curve.getLength();r.arrival=distanceTime(r.length);r.logoLength=logoPieces[k].curve.getLength()});
const weaveStart=splitStart+Math.min(...branches.map(r=>r.arrival)),waitStart=splitStart+Math.max(.15+(connector.curve.getLength()+Math.max(...branches.map(r=>r.length)))/(writingSpeed*1.2),...branches.map(r=>distanceTime(r.length+r.logoLength)));
// AppleHello studies: continuous path reveal with rounded ends and a broad ease-in/out.
// Extend that idea with a positive, smoothed speed field; never stop at each letter.
const performanceSamples=4096;
const performanceSpeed=new Float64Array(performanceSamples+1);
for(let i=0;i<=performanceSamples;i++){
 const t=i/performanceSamples*waitStart;
 let v=1;
 if(t>=textRibbon.start&&t<=writingEnd){
  const u=clamp((t-textRibbon.start)/textRibbon.duration,0,1),du=.003;
  const a=textRibbon.curve.getTangentAt(clamp(u-du,0,1)),b=textRibbon.curve.getTangentAt(clamp(u+du,0,1));
  const bend=Math.acos(clamp(a.dot(b),-1,1));
  v=1.22/(1+.48*bend); // Broad loops move freely; tight bends gather the motion.
  v*=.62+.38*smooth(u/.045);
  v*=1-.12*Math.exp(-Math.pow((u-.38)/.035,2))-.12*Math.exp(-Math.pow((u-.69)/.035,2));
 }else if(t>writingEnd){
  const q=(t-writingEnd)/(waitStart-writingEnd);
  v=1.03+.34*Math.sin(Math.PI*q)-.48*smooth((q-.80)/.20);
 }
 performanceSpeed[i]=Math.max(.48,v);
}
// Symmetric smoothing removes local fluctuations in source glyph curvature.
for(let pass=0;pass<5;pass++){
 const src=performanceSpeed.slice();
 for(let i=0;i<=performanceSamples;i++){
  let sum=0,weight=0;
  for(let j=-18;j<=18;j++){const w=Math.exp(-j*j/160);sum+=src[clamp(i+j,0,performanceSamples)]*w;weight+=w}
  performanceSpeed[i]=sum/weight;
 }
}
const performanceTime=new Float64Array(performanceSamples+1);
for(let i=1;i<=performanceSamples;i++)performanceTime[i]=performanceTime[i-1]+2/(performanceSpeed[i]+performanceSpeed[i-1]);
const clockScale=waitStart/performanceTime[performanceSamples];
for(let i=0;i<=performanceSamples;i++)performanceTime[i]*=clockScale;
function performanceClock(t){
 if(t<=0||t>=waitStart)return t;
 let lo=0,hi=performanceSamples;
 while(hi-lo>1){let mid=(lo+hi)>>1;if(performanceTime[mid]<=t)lo=mid;else hi=mid}
 return (lo+(t-performanceTime[lo])/(performanceTime[hi]-performanceTime[lo]))/performanceSamples*waitStart;
}
const sourceToElapsed=t=>{const x=clamp(t/waitStart*performanceSamples,0,performanceSamples),i=Math.floor(x);return THREE.MathUtils.lerp(performanceTime[i],performanceTime[Math.min(i+1,performanceSamples)],x-i)};
document.body.dataset.strokeReview=JSON.stringify(strokeRecords.map(s=>({char:s.char,sub:s.sub,start:sourceToElapsed(textRibbon.start+textRibbon.duration*arcAtIndex(s.first)/textRibbon.curve.getLength()),end:sourceToElapsed(textRibbon.start+textRibbon.duration*arcAtIndex(s.last)/textRibbon.curve.getLength())})));
document.body.dataset.motion=JSON.stringify({version:'hello-motion-v2',clock:'smooth positive arc-speed field',samples:performanceSamples,minSpeed:Math.min(...performanceSpeed),maxSpeed:Math.max(...performanceSpeed)});
document.body.dataset.timing=JSON.stringify({writingEnd,splitStart,weaveStart,waitStart,writingSpeed,textConnector:{positionError:connector.curve.getPointAt(0).distanceTo(last),textHue:clamp((last.x+550)/1100,0,1),connectorColor:Array.from(connector.geo.attributes.color.array.slice(0,3))},connectorSpeed:connector.curve.getLength()/connectorDuration,widths:[textRibbon.width,connector.width,...branches.map(r=>r.width),...logoPieces.map(r=>r.width)],joins:branches.map((r,k)=>({positionError:r.curve.getPointAt(1).distanceTo(logoPieces[k].curve.getPointAt(0).add(new THREE.Vector3(logoX,logoY,0))),tangentDot:r.curve.getTangentAt(1).dot(logoPieces[k].curve.getTangentAt(0)),branchColor:r.geo.attributes.color.array.slice(-3),logoColor:logoPieces[k].geo.attributes.color.array.slice(0,3)}))});
const breathingDuration=4*Math.PI/2.1; // Exactly two full cycles of the existing breathing curve.
function reveal(r,u,tip){u=clamp(u,0,1);let rings=Math.floor(u*r.count);r.geo.setDrawRange(0,rings*r.ring);if(tip){tip.position.copy(r.curve.getPointAt(rings/r.count));tip.visible=u>0&&u<1}}
function seal(r){
if(r.timelineOnly){r.nib.visible=false;r.caps.forEach(c=>c.visible=false);return;}
const stop=Math.min(r.count,Math.floor((r.geo.drawRange.start+r.geo.drawRange.count)/r.ring));
r.nib.visible=stop>0&&(stop<r.count||!r.closed)&&r.geo.drawRange.count>0;
if(r.nib.visible){const p=r.curve.getPointAt(stop/r.count),t=r.curve.getTangentAt(stop/r.count),side=new THREE.Vector3(-t.y,t.x,0).normalize(),bin=new THREE.Vector3().crossVectors(t,side).normalize(),src=r.geo.attributes.position;
 const edge=new THREE.Vector3().fromBufferAttribute(src,stop*13);const radius=edge.distanceTo(p);
 r.nib.visible=radius>.05;r.nib.position.copy(p);r.nib.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(side,t,bin.clone().negate()));r.nib.scale.set(radius,radius*.8,radius*.3);
 const col=r.geo.attributes.color;r.nib.material.color.setRGB(col.getX(stop*13),col.getY(stop*13),col.getZ(stop*13));}
const start=Math.floor(r.geo.drawRange.start/r.ring),end=Math.min(r.count,start+Math.floor(r.geo.drawRange.count/r.ring));r.caps.forEach((cap,k)=>{cap.visible=end>start&&!(r.closed&&start===0&&end===r.count)&&!(k===1&&r.nib.visible);if(!cap.visible)return;const idx=k?end:start,pa=cap.geometry.attributes.position,co=cap.geometry.attributes.color,src=r.geo.attributes.position,col=r.geo.attributes.color;const center=new THREE.Vector3();for(let j=0;j<12;j++){let n=idx*13+j;pa.setXYZ(j,src.getX(n),src.getY(n),src.getZ(n));co.setXYZ(j,col.getX(n),col.getY(n),col.getZ(n));center.add(new THREE.Vector3(src.getX(n),src.getY(n),src.getZ(n)))}center.multiplyScalar(1/12);pa.setXYZ(12,center.x,center.y,center.z);co.setXYZ(12,col.getX(idx*13),col.getY(idx*13),col.getZ(idx*13));pa.needsUpdate=co.needsUpdate=true;cap.geometry.computeVertexNormals()})}
function readySignal(){ready=true;$('#status').textContent='已就绪 · 等待镜头衔接'}window.splashReady=readySignal;
function reset(){document.body.classList.remove('revealing');$('#handoff-veil').style.opacity=1;waitingNotified=false;elapsed=0;ready=false;enterTime=null;finished=false;paused=false;$('#pause').textContent='暂停';$('#destination').style.opacity=0;$('#destination').style.transform='scale(.2)';$('#controls').classList.remove('arrived');renderer.domElement.style.visibility='visible';$('#stage').style.pointerEvents='auto'}
$('#progress').oninput=e=>{elapsed=+e.target.value;paused=true;$('#handoff-veil').style.opacity=1;document.body.classList.remove('revealing');if(elapsed<=waitStart+breathingDuration){$('#destination').style.opacity=0;$('#destination').style.transform='scale(.2)';}enterTime=!hold&&elapsed>waitStart+breathingDuration?waitStart+breathingDuration:null;ready=false;finished=false;renderer.domElement.style.visibility='visible';$('#stage').style.pointerEvents='auto';$('#pause').textContent='继续';};$('#replay').onclick=reset;$('#pause').onclick=()=>{paused=!paused;$('#pause').textContent=paused?'继续':'暂停'};$('#slow').onclick=()=>{speed=speed===1?.25:1;$('#slow').textContent=speed===1?'¼ 慢放':'1× 常速'};$('#hold').onchange=e=>{hold=e.target.checked};$('#ready').onclick=readySignal;$('#fullscreen').onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();$('#stage').onclick=()=>{};$('#again').onclick=reset;document.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();if(bridge)notify('enterRequested');else readySignal()}if(e.key==='Escape'){notify('cancel')}if(e.code==='Space'){e.preventDefault();$('#pause').click()}if(e.key.toLowerCase()==='r')reset()});
const inspection=new URLSearchParams(location.search),inspectTime=Number(inspection.get('at'));
if(inspection.has('at')){elapsed=inspectTime;paused=true;}if(inspection.has('source'))paused=true;
function render(now){if(!inspection.has('source'))requestAnimationFrame(render);if(finished){prev=now;return;}let raw=(now-prev)/1000;let dt=Math.max(0,Math.min(raw,.1));if(raw>0&&raw<.2){frameTimes.push(raw);if(frameTimes.length>120)frameTimes.shift();if(frameTimes.length%30===0)document.body.dataset.fps=(frameTimes.length/frameTimes.reduce((a,b)=>a+b,0)).toFixed(1);}prev=now;if(!paused&&!finished)elapsed+=dt*speed;let t=inspection.has('source')?Number(inspection.get('source')):performanceClock(elapsed);jointProgress.value=clamp((t-textRibbon.start)/textRibbon.duration,0,1);state=t<writingEnd?'writing':t<splitStart?'connecting':t<waitStart?'weaving':'waiting';
pen.visible=false;for(let r of segments){let u=(t-r.start)/r.duration;reveal(r,u,u>=0&&u<1?pen:null)}
for(const o of oLoops){const r=o.ribbon,u=(t-r.start)/r.duration;reveal(r,u,u>=0&&u<1?pen:null)}
for(const run of inkStrokes){const r=run.ribbon,u=(t-r.start)/r.duration;reveal(r,u,u>=0&&u<1?pen:null);}
// A shallow camera arc accompanies the final flourish, then settles with the knot.
// The ribbon stays physically still; all strands share the same camera transform.
let move=smooth((t-writingEnd)/connectorDuration),cameraBase=Math.max(980,620/Math.tan(THREE.MathUtils.degToRad(19))/camera.aspect);
const writeU=clamp((t-textRibbon.start)/textRibbon.duration,0,1),push=1-.022*smooth(writeU);
const flight=Math.sin(Math.PI*move);
camera.position.set(logoX*move,22*flight,cameraBase*(push+.075*flight+.022*move));
camera.lookAt(logoX*move,8*flight,0);
if(inspection.has('focus')){const [x,y,z]=inspection.get('focus').split(',').map(Number);camera.position.set(x,y,z);camera.lookAt(x,y,0);}
reveal(connector,(t-writingEnd)/connectorDuration,t>=writingEnd&&t<splitStart?pen:null);
const distance=splitDistance(t-splitStart),tailDistance=Math.max(0,t-splitStart-.15)*writingSpeed*1.2;
for(let k=0;k<branches.length;k++){
 const branch=branches[k],logo=logoPieces[k],u=distance/branch.length,logoU=clamp((distance-branch.length)/branch.logoLength,0,1);
 branch.tip.visible=false;logo.tip.visible=false;reveal(branch,t<splitStart?0:u);
 if(t>=splitStart&&u<1){branch.tip.visible=true;branch.tip.position.copy(branch.curve.getPointAt(Math.floor(clamp(u,0,1)*branch.count)/branch.count))}
 if(tailDistance>connector.curve.getLength()){const eaten=Math.floor(clamp((tailDistance-connector.curve.getLength())/branch.length,0,1)*branch.count)*branch.ring;const end=Math.floor(clamp(u,0,1)*branch.count)*branch.ring;branch.geo.setDrawRange(eaten,Math.max(0,end-eaten));}
 reveal(logo,logoU);
 if(logoU>0&&logoU<1){logo.tip.visible=true;let q=logo.curve.getPointAt(Math.floor(logoU*logo.count)/logo.count);logo.tip.position.set(q.x+logoX,q.y+logoY,q.z)}
}
if(t>=splitStart){let eaten=Math.floor(clamp(tailDistance/connector.curve.getLength(),0,1)*connector.count)*connector.ring;connector.geo.setDrawRange(eaten,Math.max(0,connector.count*connector.ring-eaten));}
let pulse=t>=waitStart?1+.035*(1-Math.cos((t-waitStart)*2.1)):1;logoGroup.scale.setScalar(pulse);curtain.scale.setScalar(pulse);
if(t>=waitStart){if(!waitingNotified){waitingNotified=true;notify('waiting')}if(!hold&&t>waitStart+breathingDuration)ready=true;if(ready&&enterTime===null){enterTime=t;entryScale=pulse;entryVelocity=.0735*Math.sin((t-waitStart)*2.1);notify('entering')}}
if(enterTime!==null){state='entering';if(native)document.body.classList.add('revealing');let u=clamp((t-enterTime)/2.15,0,1);let travel=u*u*u*(10-15*u+6*u*u); // Smooth velocity and acceleration at both ends.
let z0=Math.max(980,620/Math.tan(THREE.MathUtils.degToRad(19))/camera.aspect);camera.position.set(logoX,logoY,z0-(z0+80)*travel);camera.lookAt(logoX,logoY,camera.position.z-100);let scale=entryScale+entryVelocity*(1-Math.exp(-5*(t-enterTime)))/5;logoGroup.scale.setScalar(scale);curtain.scale.setScalar(scale);const contentReveal=smooth((u-.10)/.82);$('#handoff-veil').style.opacity=1-contentReveal;$('#destination').style.opacity=1;$('#destination').style.transform=`scale(${.90+.10*smooth(u)})`;document.body.dataset.handoff=JSON.stringify({progress:u,contentOpacity:contentReveal,duration:2.15});if(u>=1){if(!finished)notify('complete');finished=true;state='complete';$('#controls').classList.add('arrived');$('#destination').style.transform='scale(1)';renderer.domElement.style.visibility='hidden';$('#stage').style.pointerEvents='none'}}
$('#status').textContent=({writing:'一笔，向你问好',connecting:'沿着彩带，继续向前',weaving:'六道光，交织成形',waiting:hold?'轻触画面，穿过此刻':'正在准备你的空间',entering:`欢迎，${DATA.name}`,complete:native?`欢迎，${DATA.name}`:'预览完成'})[state];$('#time').textContent=t.toFixed(1)+' s';$('#progress').value=elapsed;$('#progress').max=waitStart+breathingDuration+2.5;document.body.dataset.state=state;if(native&&state==='waiting'&&!ready)$('#status').textContent=window.nativeStatus||'正在准备 ChatGPT';
for(const r of [textRibbon,...inkStrokes.map(s=>s.ribbon),...oLoops.map(o=>o.ribbon),connector,...branches,...logoPieces])seal(r);
// Joined surfaces share an opening. Do not draw coincident caps inside a continuous strand.
if(t>=writingEnd&&connector.geo.drawRange.count>0){const r=inkStrokes.find(s=>s.last===finalBodyRecord.last)?.ribbon;if(r){r.caps[1].visible=false;r.nib.visible=false;}connector.caps[0].visible=false;}
if(t>=splitStart&&connector.geo.drawRange.count>0){connector.caps[1].visible=false;connector.nib.visible=false;}
for(let k=0;k<branches.length;k++){
 const branch=branches[k],logo=logoPieces[k];
 if(branch.geo.drawRange.start===0&&connector.geo.drawRange.count>0)branch.caps[0].visible=false;
 if(logo.geo.drawRange.count>0&&branch.geo.drawRange.count>0){branch.caps[1].visible=false;branch.nib.visible=false;logo.caps[0].visible=false}
}

if(!finished){renderer.setRenderTarget(null);renderer.clear();renderer.render(scene,camera)}}
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}addEventListener('resize',resize);resize();requestAnimationFrame(render);$('#loading').remove();notify('loaded');
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();notify('renderFailed')});
