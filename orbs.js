/*!
 * Talking Orbs (Blu & Blaze) - embeddable widget
 * Created by Terminator Hub - https://terminator-hub.blogspot.com/
 * Copyright (c) 2026 Terminator Hub. MIT License.
 * Keep this notice and the "Orbs by Terminator Hub" credit link visible.
 *
 * Usage:
 *   script tag: src="orbs.js" data-ai-url="https://your-endpoint" data-orbs="both"
 *   data-ai-url : your AI endpoint. Receives POST {q, lang, bot, hist:[{q,a}]}, returns {answer:"..."}
 *   data-orbs   : "both" (default) | "blu" | "blaze"
 *   data-voice  : "on" (default) | "off"
 *   data-greeting : first message shown in the chat
 * Hooks: window.Orbs.onAsk(q) -> may return a string/Promise to answer without the endpoint
 *        window.Orbs.say(text, "blu"|"blaze")   window.Orbs.open()   window.Orbs.close()
 */
(function(){
'use strict';
if(window.Orbs&&window.Orbs._loaded)return;
var cs=document.currentScript||document.querySelector('script[data-orbs],script[src*="orbs"]')||{getAttribute:function(){return null}};
var AI=cs.getAttribute('data-ai-url')||'',WHICH=cs.getAttribute('data-orbs')||'both',VOICE=cs.getAttribute('data-voice')!=='off';
var GREET=cs.getAttribute('data-greeting')||'Hi! Ask me anything.';
var synth=window.speechSynthesis||null,hist=[],busy=false,muted=!VOICE;
var CSS="/* ===== Draggable 3D spheres: blue fire + orange fire, happy faces ===== */\n.t-orb{position:fixed;width:84px;height:100px;z-index:90;touch-action:none;cursor:grab;-webkit-user-select:none;user-select:none;\n filter:drop-shadow(0 0 12px var(--o-g1)) drop-shadow(0 0 26px var(--o-g2));transition:transform .45s cubic-bezier(.2,.8,.2,1)}\n.t-orb:active{cursor:grabbing}\n.t-orb-blue{right:10px;bottom:84px;--o-g1:rgba(40,150,255,.95);--o-g2:rgba(0,80,255,.6);--o-ink:#04103f;\n --o-body:radial-gradient(circle at 50% 58%,#fff 0,#d9f9ff 9%,#62dbff 26%,#2282ff 50%,#0b30cc 76%,#04085a 100%);\n --o-ring:0 0 16px 4px rgba(70,175,255,.95),0 0 36px 10px rgba(20,90,255,.65),inset 0 0 14px rgba(200,244,255,.85);\n --o-swirl:conic-gradient(from 0deg,rgba(255,255,255,0),rgba(160,235,255,.9) 12%,rgba(255,255,255,0) 28%,rgba(50,130,255,.85) 52%,rgba(255,255,255,0) 72%,rgba(170,240,255,.8) 88%,rgba(255,255,255,0));\n --o-flame:linear-gradient(to top,rgba(255,255,255,.95) 0,#9aebff 22%,#2d8fff 55%,rgba(10,40,255,0) 100%)}\n.t-orb-fire{left:10px;bottom:84px;--o-g1:rgba(255,150,40,.95);--o-g2:rgba(255,60,0,.6);--o-ink:#3a0a00;\n --o-body:radial-gradient(circle at 50% 58%,#fff 0,#fff1bf 9%,#ffd23f 26%,#ff7d14 50%,#d92a06 76%,#4d0700 100%);\n --o-ring:0 0 16px 4px rgba(255,170,60,.95),0 0 36px 10px rgba(255,70,0,.65),inset 0 0 14px rgba(255,240,200,.85);\n --o-swirl:conic-gradient(from 0deg,rgba(255,255,255,0),rgba(255,235,150,.9) 12%,rgba(255,255,255,0) 28%,rgba(255,90,20,.85) 52%,rgba(255,255,255,0) 72%,rgba(255,220,120,.8) 88%,rgba(255,255,255,0));\n --o-flame:linear-gradient(to top,rgba(255,255,255,.95) 0,#ffe27a 22%,#ff8a1f 55%,rgba(255,40,0,0) 100%)}\n.t-orb-fx{position:absolute;left:0;top:0;right:0;bottom:0;animation:tOrbBob 3.4s ease-in-out infinite}\n.t-orb-ball{position:absolute;left:13px;bottom:6px;width:58px;height:58px;border-radius:50%;overflow:hidden;z-index:3;background:var(--o-body);box-shadow:var(--o-ring)}\n.t-orb-swirl{position:absolute;left:-30%;top:-30%;width:160%;height:160%;mix-blend-mode:screen;filter:blur(3px);background:var(--o-swirl);animation:tOrbSpin 2.6s linear infinite}\n.t-orb-swirl2{animation-duration:4.1s;animation-direction:reverse;opacity:.75}\n.t-orb-shade{position:absolute;left:0;top:0;right:0;bottom:0;border-radius:50%;\n background:radial-gradient(circle at 34% 26%,rgba(255,255,255,.75) 0,rgba(255,255,255,0) 30%),radial-gradient(circle at 60% 70%,rgba(0,0,0,0) 45%,rgba(0,0,0,.45) 100%)}\n.t-orb-flame{position:absolute;bottom:30px;width:22px;border-radius:50% 50% 50% 50%/100% 100% 0 0;z-index:1;filter:blur(2.2px);mix-blend-mode:screen;transform-origin:50% 100%;\n background:var(--o-flame);animation:tOrbFlame .85s ease-in-out infinite alternate}\n.tf1{left:7px;height:40px;animation-delay:-.2s}\n.tf2{left:19px;height:58px;animation-delay:-.5s;animation-duration:.7s}\n.tf3{left:31px;height:70px;animation-delay:-.1s;animation-duration:.95s}\n.tf4{left:43px;height:56px;animation-delay:-.6s;animation-duration:.75s}\n.tf5{left:55px;height:38px;animation-delay:-.35s}\n.t-orb-face{position:absolute;left:0;top:0;right:0;bottom:0;z-index:5;pointer-events:none}\n.t-orb-eye{position:absolute;top:19px;width:8px;height:11px;border-radius:50%;background:var(--o-ink);box-shadow:0 0 3px rgba(255,255,255,.55);transform-origin:50% 60%;animation:tOrbBlink 2.8s ease-in-out infinite}\n.t-orb-eye:after{content:\"\";position:absolute;left:1.5px;top:1.5px;width:3px;height:3px;border-radius:50%;background:#fff}\n.t-orb-eye-l{left:16px}.t-orb-eye-r{left:35px}\n.t-orb-cheek{position:absolute;top:31px;width:8px;height:5px;border-radius:50%;background:rgba(255,150,210,.55);filter:blur(1.5px)}\n.t-orb-cheek-l{left:8px}.t-orb-cheek-r{left:42px}\n.t-orb-mouth{position:absolute;left:19px;top:34px;width:20px;height:11px;border-radius:0 0 20px 20px;background:var(--o-ink);overflow:hidden;animation:tOrbSmile 2.6s ease-in-out infinite;transform-origin:50% 0}\n.t-orb-mouth:after{content:\"\";position:absolute;left:5px;bottom:-4px;width:10px;height:8px;border-radius:50%;background:#ff7fb0}\n@keyframes tOrbFlame{0%{transform:scaleY(.82) scaleX(1.05) skewX(-5deg);opacity:.8}50%{transform:scaleY(1.12) scaleX(.9) skewX(6deg);opacity:1}100%{transform:scaleY(.92) scaleX(1) skewX(-2deg);opacity:.9}}\n@keyframes tOrbSpin{to{transform:rotate(360deg)}}\n@keyframes tOrbBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}\n@keyframes tOrbBlink{0%,78%,100%{transform:scaleY(1)}83%,90%{transform:scaleY(.06)}95%{transform:scaleY(1)}}\n.t-orb{cursor:pointer}\n.t-orb.talk .t-orb-fx{animation:tOrbTalk .42s ease-in-out infinite}\n.t-orb.talk .t-orb-mouth{animation:none;transform:scale(var(--mw,1),var(--mo,.5));transition:transform .07s linear}\n@keyframes tOrbTalk{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-3px) scale(1.04)}}\n.ob-panel{position:fixed;right:12px;bottom:12px;width:min(340px,calc(100vw - 24px));max-height:70vh;display:none;flex-direction:column;z-index:2147483000;background:#0A1530;color:#F3F6FF;border:1px solid rgba(120,170,255,.3);border-radius:18px;box-shadow:0 12px 40px rgba(0,0,0,.5);font:14px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;overflow:hidden}\n.ob-panel.open{display:flex}\n.ob-head{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#0F1D40;font-weight:600}\n.ob-head button{background:none;border:0;color:#8FA9D4;font-size:18px;cursor:pointer}\n.ob-log{flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:8px;min-height:120px}\n.ob-m{max-width:85%;padding:8px 11px;border-radius:14px;white-space:pre-wrap;word-wrap:break-word}\n.ob-me{align-self:flex-end;background:#3B82F6;color:#fff}\n.ob-bot{align-self:flex-start;background:#13244d}\n.ob-form{display:flex;gap:6px;padding:8px;border-top:1px solid rgba(120,170,255,.2)}\n.ob-form input{flex:1;background:#0F1D40;border:1px solid rgba(120,170,255,.25);color:#F3F6FF;border-radius:999px;padding:9px 14px;font:inherit;outline:none}\n.ob-form button{background:#3B82F6;border:0;color:#fff;border-radius:999px;padding:0 14px;cursor:pointer;font-size:16px}\n.ob-m a{color:#9fd4ff;text-decoration:underline;word-break:break-all}.ob-credit{padding:0 12px 9px;font-size:11px;color:#8FA9D4}\n.ob-credit a{color:#5CB8FF;text-decoration:none}\n";
var st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
function el(t,c,h){var e=document.createElement(t);if(c)e.className=c;if(h!==undefined)e.innerHTML=h;return e}
var ORB='<div class="t-orb-fx"><span class="t-orb-flame tf1"></span><span class="t-orb-flame tf2"></span><span class="t-orb-flame tf3"></span><span class="t-orb-flame tf4"></span><span class="t-orb-flame tf5"></span><div class="t-orb-ball"><span class="t-orb-swirl"></span><span class="t-orb-swirl t-orb-swirl2"></span><span class="t-orb-shade"></span><span class="t-orb-face"><i class="t-orb-eye t-orb-eye-l"></i><i class="t-orb-eye t-orb-eye-r"></i><i class="t-orb-cheek t-orb-cheek-l"></i><i class="t-orb-cheek t-orb-cheek-r"></i><i class="t-orb-mouth"></i></span></div></div>';
var bots={};
function mk(id,cls,label,pos){var o=el('div','t-orb '+cls,ORB);o.setAttribute('role','button');o.setAttribute('tabindex','0');o.setAttribute('aria-label','Chat with '+label);
  o.style.left=pos+'px';o.style.top=Math.max(60,innerHeight-200)+'px';document.body.appendChild(o);bots[id]={id:id,name:label,o:o};return bots[id]}
if(WHICH!=='blaze')mk('blu','t-orb-blue','Blu',Math.max(8,innerWidth-110));
if(WHICH!=='blu')mk('blaze','t-orb-fire','Blaze',10);
var ids=Object.keys(bots),active=bots[ids[0]];
/* chat panel */
var P=el('div','ob-panel');P.setAttribute('role','dialog');P.setAttribute('aria-label','Chat');
P.innerHTML='<div class="ob-head"><span class="ob-t"></span><button type="button" aria-label="Close chat">\u2715</button></div><div class="ob-log" aria-live="polite"></div><form class="ob-form" autocomplete="off"><input type="text" maxlength="300" placeholder="Type your question..." aria-label="Your question"><button type="submit" aria-label="Send">\u27A4</button></form><div class="ob-credit">Orbs by <a href="https://terminator-hub.blogspot.com/" target="_blank" rel="noopener">Terminator Hub</a> - open source (MIT)</div>';
document.body.appendChild(P);
var log=P.querySelector('.ob-log'),inp=P.querySelector('input'),form=P.querySelector('form'),title=P.querySelector('.ob-t');
function add(who,text){var m=el('div','ob-m ob-'+who);String(text).split(/(https?:\/\/[^\s]+)/).forEach(function(part,i){if(i%2){var a=el('a');a.href=part;a.target='_blank';a.rel='noopener';a.textContent=part;m.appendChild(a)}else if(part)m.appendChild(document.createTextNode(part))});log.appendChild(m);log.scrollTop=log.scrollHeight;return m}
function open(id){if(id&&bots[id])active=bots[id];title.textContent=active.name;P.classList.add('open');window.__tOrbPause=true;if(!log.children.length)add('bot',GREET);inp.focus()}
function close(){P.classList.remove('open');window.__tOrbPause=false;if(synth)synth.cancel();stopTalk()}
P.querySelector('.ob-head button').addEventListener('click',close);
/* talking + lip sync */
var lipT=null;
function stopTalk(){clearInterval(lipT);for(var k in bots)bots[k].o.classList.remove('talk')}
function speak(bot,text){if(muted||!synth||!text)return;try{synth.cancel();var u=new SpeechSynthesisUtterance(text.slice(0,600));
  u.onstart=function(){bot.o.classList.add('talk');lipT=setInterval(function(){bot.o.style.setProperty('--mo',(.25+Math.random()*.9).toFixed(2));bot.o.style.setProperty('--mw',(.85+Math.random()*.35).toFixed(2))},90)};
  u.onend=u.onerror=stopTalk;synth.speak(u)}catch(e){}}
function reply(bot,text){add('bot',text);speak(bot,text.replace(/https?:\/\/\S+/g,''))}
function ask(q){q=q.trim();if(!q||busy)return;add('me',q);inp.value='';busy=true;var bot=active;
  var p=Promise.resolve(window.Orbs.onAsk?window.Orbs.onAsk(q):null).then(function(r){
    if(r)return String(r);
    if(!AI)return 'I am not connected to a brain yet. The site owner needs to set data-ai-url.';
    return fetch(AI,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({q:q,lang:navigator.language||'en',bot:bot.name,hist:hist.slice(-4)})})
      .then(function(r){return r.ok?r.json():null}).then(function(j){return j&&j.answer?String(j.answer).slice(0,900):'I could not find an answer to that.'})});
  p.catch(function(){return 'Oops, I cannot reach my brain right now. Try again in a moment.'}).then(function(a){hist.push({q:q,a:a.slice(0,400)});reply(bot,a);busy=false;
    try{window.dispatchEvent(new CustomEvent('orbs:answer',{detail:{q:q,a:a,bot:bot.id}}))}catch(e){}})}
form.addEventListener('submit',function(e){e.preventDefault();ask(inp.value)});
/* drag + roam (click without moving opens chat) */
var items=[],reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function bounds(o){return{x0:4,y0:8,x1:Math.max(4,innerWidth-o.offsetWidth-4),y1:Math.max(8,innerHeight-o.offsetHeight-8)}}
ids.forEach(function(id){var o=bots[id].o,r=o.getBoundingClientRect(),it={o:o,id:id,x:r.left,y:r.top,vx:0,vy:0,drag:false,st:null,moved:0},sp=14+Math.random()*7,ang=Math.random()*6.283;
  it.vx=Math.cos(ang)*sp;it.vy=Math.sin(ang)*sp;items.push(it);
  o.addEventListener('pointerdown',function(e){var rr=o.getBoundingClientRect();it.drag=true;it.moved=0;it.st={x:e.clientX,y:e.clientY,l:rr.left,t:rr.top};try{o.setPointerCapture(e.pointerId)}catch(x){}e.preventDefault()});
  o.addEventListener('pointermove',function(e){if(!it.st)return;var dx=e.clientX-it.st.x,dy=e.clientY-it.st.y,b=bounds(o);it.moved=Math.max(it.moved,Math.abs(dx)+Math.abs(dy));
    it.x=clamp(it.st.l+dx,b.x0,b.x1);it.y=clamp(it.st.t+dy,b.y0,b.y1);o.style.left=it.x+'px';o.style.top=it.y+'px';
    o.style.transform='perspective(500px) rotateX('+clamp(-dy*.7,-35,35)+'deg) rotateY('+clamp(dx*.7,-35,35)+'deg)'});
  function end(){var tap=it.moved<6;it.st=null;it.drag=false;o.style.transform='';if(tap)open(id)}
  o.addEventListener('pointerup',end);o.addEventListener('pointercancel',function(){it.st=null;it.drag=false;o.style.transform=''});
  o.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();open(id)}})});
if(!reduce){var last=0;(function tick(ts){if(!last)last=ts;var dt=Math.min(.05,(ts-last)/1000);last=ts;
  items.forEach(function(it){if(it.drag||window.__tOrbPause)return;var b=bounds(it.o),t=(Math.random()-.5)*.6*dt,c=Math.cos(t),s=Math.sin(t),nx=it.vx*c-it.vy*s,ny=it.vx*s+it.vy*c;it.vx=nx;it.vy=ny;it.x+=it.vx*dt;it.y+=it.vy*dt;
    if(it.x<b.x0){it.x=b.x0;it.vx=Math.abs(it.vx)}if(it.x>b.x1){it.x=b.x1;it.vx=-Math.abs(it.vx)}if(it.y<b.y0){it.y=b.y0;it.vy=Math.abs(it.vy)}if(it.y>b.y1){it.y=b.y1;it.vy=-Math.abs(it.vy)}
    it.o.style.left=it.x.toFixed(1)+'px';it.o.style.top=it.y.toFixed(1)+'px'});requestAnimationFrame(tick)})(performance.now())}
addEventListener('resize',function(){items.forEach(function(it){var b=bounds(it.o);it.x=clamp(it.x,b.x0,b.x1);it.y=clamp(it.y,b.y0,b.y1);it.o.style.left=it.x+'px';it.o.style.top=it.y+'px'})});
window.Orbs={_loaded:true,onAsk:null,open:open,close:close,say:function(t,id){var b=bots[id]||active;reply(b,String(t))}};
})();
