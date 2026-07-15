(function(){
"use strict";

/* ===================== SETTINGS + STORAGE ===================== */
const LS_HISTORY = 'calc_history_v1';
const LS_SETTINGS = 'calc_settings_v1';

let settings = Object.assign({
  theme:'glass', saveHistory:true, sound:true, vibrate:true, voiceOut:false, lang:'en', font:1
}, JSON.parse(localStorage.getItem(LS_SETTINGS) || '{}'));

let history = JSON.parse(localStorage.getItem(LS_HISTORY) || '[]');

function saveSettings(){ localStorage.setItem(LS_SETTINGS, JSON.stringify(settings)); }
function saveHistoryLS(){ localStorage.setItem(LS_HISTORY, JSON.stringify(history)); }

function applyTheme(){
  document.documentElement.dataset.theme = settings.theme;
  document.documentElement.style.setProperty('--font-scale', settings.font);
}
applyTheme();

function beep(){
  if(!settings.sound) return;
  try{
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type='sine'; o.frequency.value=680; g.gain.value=0.04;
    o.connect(g); g.connect(ctx.destination); o.start();
    setTimeout(()=>{ o.stop(); ctx.close(); }, 40);
  }catch(e){}
}
function vibrate(){ if(settings.vibrate && navigator.vibrate) navigator.vibrate(12); }
function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 1400);
}

/* ===================== TAB NAVIGATION ===================== */
document.querySelectorAll('#mainTabs .tab-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('#mainTabs .tab-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    document.getElementById('view-'+btn.dataset.view).classList.add('active');
  });
});

/* overlays */
function openOverlay(id){ document.getElementById(id).classList.add('show'); }
function closeOverlay(id){ document.getElementById(id).classList.remove('show'); }
document.getElementById('openHistory').addEventListener('click', ()=>{ renderHistory(); openOverlay('historyOverlay'); });
document.getElementById('openDashboard').addEventListener('click', ()=>{ renderDashboard(); openOverlay('dashboardOverlay'); });
document.getElementById('openSettings').addEventListener('click', ()=> openOverlay('settingsOverlay'));
document.querySelectorAll('[data-close]').forEach(b=> b.addEventListener('click', ()=> closeOverlay(b.dataset.close)));
document.querySelectorAll('.overlay').forEach(o=> o.addEventListener('click', (e)=>{ if(e.target===o) o.classList.remove('show'); }));

/* ===================== CALCULATOR CORE ===================== */
const exprEl = document.getElementById('expr');
const resultEl = document.getElementById('result');
const modeLabel = document.getElementById('modeLabel');
const memIndicator = document.getElementById('memIndicator');
const degToggle = document.getElementById('degToggle');

let expression = '';
let justEvaluated = false;
let memory = 0, hasMemory = false;
let degrees = true;

const OPS = ['+','-','×','÷','^'];
const FN_NAMES = ['sin','cos','tan','sinh','cosh','tanh','log','ln','sqrt','cbrt','abs','fact'];

function tokenize(str){
  const tokens = []; let i=0;
  const s = str.replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-').replace(/π/g,'pi');
  while(i<s.length){
    const c = s[i];
    if(/\s/.test(c)){ i++; continue; }
    if(/[0-9.]/.test(c)){ let num=''; while(i<s.length && /[0-9.]/.test(s[i])){ num+=s[i]; i++; } tokens.push({t:'num', v:parseFloat(num)}); continue; }
    if(/[a-z]/i.test(c)){
      let name=''; while(i<s.length && /[a-z]/i.test(s[i])){ name+=s[i]; i++; }
      if(name==='pi'){ tokens.push({t:'num', v:Math.PI}); }
      else if(name==='e'){ tokens.push({t:'num', v:Math.E}); }
      else if(name==='mod'){ tokens.push({t:'op', v:'mod'}); }
      else if(FN_NAMES.includes(name)){ tokens.push({t:'fn', v:name}); }
      else { throw new Error('unknown token: '+name); }
      continue;
    }
    if('+-*/^()'.includes(c)){ tokens.push({t:'op', v:c}); i++; continue; }
    throw new Error('bad char: '+c);
  }
  return tokens;
}

function toRPN(tokens){
  const out=[], stack=[];
  const prec={'+':1,'-':1,'*':2,'/':2,'mod':2,'^':3};
  const rightAssoc={'^':true};
  for(let idx=0; idx<tokens.length; idx++){
    const tok = tokens[idx];
    if(tok.t==='num'){ out.push(tok); continue; }
    if(tok.t==='fn'){ stack.push(tok); continue; }
    if(tok.t==='op'){
      if(tok.v==='('){ stack.push(tok); continue; }
      if(tok.v===')'){
        while(stack.length && !(stack[stack.length-1].t==='op' && stack[stack.length-1].v==='(')){ out.push(stack.pop()); }
        if(!stack.length) throw new Error('mismatched parens');
        stack.pop();
        if(stack.length && stack[stack.length-1].t==='fn'){ out.push(stack.pop()); }
        continue;
      }
      const prevTok = tokens[idx-1];
      const isUnary = (tok.v==='-') && (!prevTok || (prevTok.t==='op' && prevTok.v!==')'));
      if(isUnary){ stack.push({t:'op', v:'u-'}); continue; }
      while(stack.length){
        const top = stack[stack.length-1];
        if(top.t==='op' && top.v!=='(' && (prec[top.v] > prec[tok.v] || (prec[top.v]===prec[tok.v] && !rightAssoc[tok.v])) ){ out.push(stack.pop()); }
        else break;
      }
      stack.push(tok); continue;
    }
  }
  while(stack.length){ const top=stack.pop(); if(top.v==='(') throw new Error('mismatched parens'); out.push(top); }
  return out;
}

function factorial(n){
  n = Math.round(n);
  if(n<0) throw new Error('neg factorial');
  if(n>170) return Infinity;
  let r=1; for(let i=2;i<=n;i++) r*=i; return r;
}

function evalRPN(rpn){
  const st = [];
  const toRad = (v)=> degrees ? v*Math.PI/180 : v;
  for(const tok of rpn){
    if(tok.t==='num'){ st.push(tok.v); continue; }
    if(tok.t==='fn'){
      const a = st.pop(); let r;
      switch(tok.v){
        case 'sin': r=Math.sin(toRad(a)); break;
        case 'cos': r=Math.cos(toRad(a)); break;
        case 'tan': r=Math.tan(toRad(a)); break;
        case 'sinh': r=Math.sinh(a); break;
        case 'cosh': r=Math.cosh(a); break;
        case 'tanh': r=Math.tanh(a); break;
        case 'log': r=Math.log10(a); break;
        case 'ln': r=Math.log(a); break;
        case 'sqrt': r=Math.sqrt(a); break;
        case 'cbrt': r=Math.cbrt(a); break;
        case 'abs': r=Math.abs(a); break;
        case 'fact': r=factorial(a); break;
        default: throw new Error('unknown fn');
      }
      st.push(r); continue;
    }
    if(tok.t==='op'){
      if(tok.v==='u-'){ st.push(-st.pop()); continue; }
      const b=st.pop(), a=st.pop(); let r;
      switch(tok.v){
        case '+': r=a+b; break;
        case '-': r=a-b; break;
        case '*': r=a*b; break;
        case '/': r=a/b; break;
        case '^': r=Math.pow(a,b); break;
        case 'mod': r=a%b; break;
        default: throw new Error('unknown op');
      }
      st.push(r);
    }
  }
  if(st.length!==1) throw new Error('bad expression');
  const val = st[0];
  if(typeof val !== 'number' || !isFinite(val)) throw new Error('bad result');
  return val;
}

function safeEvaluate(str){
  if(str.trim()==='') return 0;
  return evalRPN(toRPN(tokenize(str)));
}

function formatNumber(n){
  if(Object.is(n,-0)) n=0;
  let s;
  if(Math.abs(n)>0 && (Math.abs(n)<1e-9 || Math.abs(n)>=1e15)) s = n.toExponential(6);
  else s = parseFloat(n.toFixed(10)).toString();
  return s;
}

function render(){
  exprEl.textContent = expression ? expression : '\u00A0';
  if(expression===''){ resultEl.textContent='0'; return; }
  try{ resultEl.textContent = formatNumber(safeEvaluate(expression)); }
  catch(e){ const m = expression.match(/[0-9.]+$/); resultEl.textContent = m ? m[0] : '0'; }
}

function lastChar(){ return expression.length ? expression[expression.length-1] : ''; }

function appendDigit(d){ if(justEvaluated){ expression=''; justEvaluated=false; } expression+=d; render(); }
function appendDot(){
  if(justEvaluated){ expression=''; justEvaluated=false; }
  const parts = expression.split(/[+\-×÷^(]/); const current = parts[parts.length-1];
  if(current.includes('.')) return;
  if(current==='') expression+='0';
  expression+='.'; render();
}
function appendOperator(op){
  if(justEvaluated){ justEvaluated=false; }
  if(expression==='' && op!=='-') return;
  if(OPS.includes(lastChar()) && op!=='('){ expression = expression.slice(0,-1)+op; }
  else expression += op;
  render();
}
function appendFn(name){ if(justEvaluated){ expression=''; justEvaluated=false; } expression += name+'('; render(); }
function appendParen(p){ if(justEvaluated && p==='('){ expression=''; justEvaluated=false; } expression+=p; render(); }
function insertRaw(str){ if(justEvaluated){ expression=''; justEvaluated=false; } expression+=str; render(); }
function del(){ justEvaluated=false; expression = expression.slice(0,-1); render(); }
function clearAll(){ expression=''; justEvaluated=false; render(); }

function percent(){
  if(expression==='') return;
  try{ expression = formatNumber(safeEvaluate(expression)/100); render(); }catch(e){}
}
function transformCurrent(fn){
  if(expression==='') return;
  try{ expression = formatNumber(fn(safeEvaluate(expression))); justEvaluated=true; render(); }catch(e){}
}

function pushHistory(expr, res, note){
  if(!settings.saveHistory) return;
  history.unshift({ id: Date.now()+Math.random().toString(16).slice(2), expr, res, ts: Date.now(), fav:false, pin:false, note: note||'' });
  if(history.length>500) history.pop();
  saveHistoryLS();
}

function equals(){
  if(expression==='') return;
  try{
    const val = safeEvaluate(expression);
    const resStr = formatNumber(val);
    pushHistory(expression, resStr);
    expression = resStr; justEvaluated = true; render();
    if(settings.voiceOut) speak(resStr);
  }catch(e){ resultEl.textContent = 'Error'; }
}

/* memory */
function updateMemIndicator(){ memIndicator.classList.toggle('show', hasMemory); }
function currentVal(){ try{ return expression? safeEvaluate(expression) : (parseFloat(resultEl.textContent)||0); }catch(e){ return 0; } }
function mPlus(){ memory += currentVal(); hasMemory=true; updateMemIndicator(); }
function mMinus(){ memory -= currentVal(); hasMemory=true; updateMemIndicator(); }
function mRecall(){ if(!hasMemory) return; if(justEvaluated){ expression=''; justEvaluated=false; } expression += formatNumber(memory); render(); }
function mClear(){ memory=0; hasMemory=false; updateMemIndicator(); }

/* mode pills (basic/scientific) */
document.querySelectorAll('.pill').forEach(p=>{
  p.addEventListener('click', ()=>{
    document.querySelectorAll('.pill').forEach(x=>x.classList.remove('active'));
    p.classList.add('active');
    const sci = p.dataset.mode==='sci';
    document.getElementById('sciBlock').style.display = sci ? 'block' : 'none';
    modeLabel.textContent = sci ? 'SCIENTIFIC' : 'READY';
  });
});
degToggle.addEventListener('click', ()=>{ degrees=!degrees; degToggle.textContent = degrees?'DEG':'RAD'; });

/* button wiring */
document.querySelectorAll('#view-calc .keys').forEach(kw=>{
  kw.addEventListener('click', (e)=>{
    const btn = e.target.closest('button'); if(!btn) return;
    btn.classList.add('flash'); setTimeout(()=>btn.classList.remove('flash'),150);
    beep(); vibrate();

    const action = btn.dataset.action, value = btn.dataset.value, fn = btn.dataset.fn;
    if(action==='clear') return clearAll();
    if(action==='del') return del();
    if(action==='percent') return percent();
    if(action==='equals') return equals();
    if(action==='mplus') return mPlus();
    if(action==='mminus') return mMinus();
    if(action==='mr') return mRecall();
    if(action==='mc') return mClear();
    if(action==='pi') return insertRaw('π');
    if(action==='euler') return insertRaw('e');
    if(action==='sq') return transformCurrent(v=>Math.pow(v,2));
    if(action==='cube') return transformCurrent(v=>Math.pow(v,3));
    if(action==='pow10') return transformCurrent(v=>Math.pow(10,v));
    if(action==='inv') return transformCurrent(v=>1/v);
    if(action==='fact') return transformCurrent(v=>factorial(v));
    if(action==='rand') return insertRaw(Math.random().toFixed(4));
    if(action==='roundf') return transformCurrent(v=>Math.round(v));
    if(action==='floorf') return transformCurrent(v=>Math.floor(v));
    if(action==='modop') return appendOperator('mod');

    if(fn) return appendFn(fn);
    if(value==='.') return appendDot();
    if(value==='(' || value===')') return appendParen(value);
    if(OPS.includes(value)) return appendOperator(value);
    if(value!==undefined) return appendDigit(value);
  });
});

document.getElementById('doNpr').addEventListener('click', ()=>{
  const n = parseInt(document.getElementById('nprN').value), r = parseInt(document.getElementById('nprR').value);
  if(isNaN(n)||isNaN(r)||r>n){ toast('Invalid n,r'); return; }
  const val = factorial(n)/factorial(n-r);
  expression = formatNumber(val); justEvaluated=true; render();
  pushHistory('nPr('+n+','+r+')', formatNumber(val));
});
document.getElementById('doNcr').addEventListener('click', ()=>{
  const n = parseInt(document.getElementById('nprN').value), r = parseInt(document.getElementById('nprR').value);
  if(isNaN(n)||isNaN(r)||r>n){ toast('Invalid n,r'); return; }
  const val = factorial(n)/(factorial(r)*factorial(n-r));
  expression = formatNumber(val); justEvaluated=true; render();
  pushHistory('nCr('+n+','+r+')', formatNumber(val));
});

/* copy result */
resultEl.addEventListener('click', async ()=>{
  try{ await navigator.clipboard.writeText(resultEl.textContent); toast('Result copied!'); }catch(e){}
});

/* keyboard */
const keyMap = { '+':'+', '-':'-', '*':'×', '/':'÷', '^':'^' };
window.addEventListener('keydown', (e)=>{
  const active = document.activeElement;
  if(active && (active.tagName==='INPUT' || active.tagName==='SELECT')) return;
  if(/^[0-9]$/.test(e.key)) return appendDigit(e.key);
  if(e.key==='.') return appendDot();
  if(keyMap[e.key]) return appendOperator(keyMap[e.key]);
  if(e.key==='(' || e.key===')') return appendParen(e.key);
  if(e.key==='Enter' || e.key==='=') { e.preventDefault(); return equals(); }
  if(e.key==='Backspace') return del();
  if(e.key==='Escape') return clearAll();
  if(e.key==='%') return percent();
});

render(); updateMemIndicator();

/* ===================== VOICE INPUT / OUTPUT ===================== */
function speak(text){
  if(!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = settings.lang==='hi' ? 'hi-IN' : 'en-US';
  speechSynthesis.speak(u);
}
document.getElementById('voiceOutToggle').addEventListener('click', (e)=>{
  settings.voiceOut = !settings.voiceOut; saveSettings();
  e.target.classList.toggle('active-toggle', settings.voiceOut);
  toast('Voice output: ' + (settings.voiceOut?'ON':'OFF'));
});

const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
document.getElementById('voiceInBtn').addEventListener('click', ()=>{
  if(!SpeechRec){ toast('Voice input not supported in this browser'); return; }
  const rec = new SpeechRec();
  rec.lang = settings.lang==='hi' ? 'hi-IN' : 'en-US';
  rec.onresult = (ev)=>{
    let text = ev.results[0][0].transcript.toLowerCase();
    text = text.replace(/plus/g,'+').replace(/minus/g,'-')
      .replace(/into|times|multiplied by|multiply/g,'*')
      .replace(/divide(d)? by|divide/g,'/')
      .replace(/percent/g,'%').replace(/point/g,'.')
      .replace(/open bracket/g,'(').replace(/close bracket/g,')');
    const clean = text.replace(/[^0-9+\-*/.() ]/g,'').trim();
    if(clean){ expression += clean.replace(/\s+/g,''); render(); toast('Heard: '+clean); }
    if(/equal/.test(text)) equals();
  };
  rec.onerror = ()=> toast('Voice input error');
  rec.start();
  toast('Listening...');
});

/* ===================== OCR ===================== */
document.getElementById('ocrInput').addEventListener('change', (e)=>{
  const file = e.target.files[0]; if(!file) return;
  const status = document.getElementById('ocrStatus');
  if(typeof Tesseract === 'undefined'){ status.textContent='OCR library load nahi hui (internet check karo)'; return; }
  status.textContent = 'Reading image...';
  Tesseract.recognize(file, 'eng').then(({data})=>{
    const text = data.text;
    const match = text.match(/[0-9+\-*/.() ]{3,}/);
    if(match){
      expression = match[0].replace(/\s+/g,'');
      render();
      status.textContent = 'Detected: ' + expression;
    } else {
      status.textContent = 'Koi calculation image me nahi mila';
    }
  }).catch(()=>{ status.textContent = 'OCR fail ho gaya'; });
});

/* ===================== SHARE / PRINT ===================== */
document.getElementById('shareBtn').addEventListener('click', async ()=>{
  const text = `${expression} = ${resultEl.textContent}`;
  if(navigator.share){ try{ await navigator.share({text}); }catch(e){} }
  else { await navigator.clipboard.writeText(text); toast('Copied (share not supported)'); }
});
document.getElementById('printBtn').addEventListener('click', ()=>{
  const w = window.open('', '_blank');
  w.document.write(`<pre style="font-size:22px;font-family:monospace;padding:40px;">${expression}\n= ${resultEl.textContent}</pre>`);
  w.document.close(); w.print();
});

/* ===================== PROGRAMMER CALCULATOR ===================== */
(function(){
  let pBase = 16;
  let acc = 0, pending = null, pendingOp = null;

  const disp = { hex: document.getElementById('pHex'), dec: document.getElementById('pDec'), oct: document.getElementById('pOct'), bin: document.getElementById('pBin') };

  function updateDisp(v){
    disp.hex.textContent = (v>>>0).toString(16).toUpperCase();
    disp.dec.textContent = v.toString(10);
    disp.oct.textContent = (v>>>0).toString(8);
    disp.bin.textContent = (v>>>0).toString(2);
  }
  updateDisp(0);

  document.querySelectorAll('#view-programmer .sub-tab').forEach(t=>{
    t.addEventListener('click', ()=>{
      document.querySelectorAll('#view-programmer .sub-tab').forEach(x=>x.classList.remove('active'));
      t.classList.add('active');
      pBase = parseInt(t.dataset.base);
      updateKeyState();
    });
  });
  function updateKeyState(){
    document.querySelectorAll('[data-pk]').forEach(btn=>{
      const val = parseInt(btn.dataset.pk, 16);
      btn.disabled = val >= pBase;
    });
  }
  updateKeyState();

  let entry = '0';
  document.getElementById('progKeys').addEventListener('click', (e)=>{
    const btn = e.target.closest('button'); if(!btn) return;
    beep(); vibrate();
    const pk = btn.dataset.pk, pa = btn.dataset.pa;
    if(pk !== undefined){
      entry = (entry==='0') ? pk : entry+pk;
      const v = parseInt(entry, pBase) || 0;
      updateDisp(v);
      return;
    }
    const current = parseInt(entry, pBase) || 0;
    if(pa==='clear'){ entry='0'; acc=0; pending=null; pendingOp=null; updateDisp(0); return; }
    if(pa==='del'){ entry = entry.length>1 ? entry.slice(0,-1) : '0'; updateDisp(parseInt(entry,pBase)||0); return; }
    if(pa==='NOT'){ const v = ~current; entry = (v>>>0).toString(pBase); updateDisp(v); return; }
    if(['AND','OR','XOR','LSH','RSH','+','-','*'].includes(pa)){
      pending = current; pendingOp = pa; entry='0'; return;
    }
    if(pa==='='){
      if(pendingOp===null){ return; }
      let r;
      switch(pendingOp){
        case 'AND': r = pending & current; break;
        case 'OR': r = pending | current; break;
        case 'XOR': r = pending ^ current; break;
        case 'LSH': r = pending << current; break;
        case 'RSH': r = pending >> current; break;
        case '+': r = pending + current; break;
        case '-': r = pending - current; break;
        case '*': r = pending * current; break;
      }
      updateDisp(r); entry = (r>>>0).toString(pBase);
      pushHistory(`${pending} ${pendingOp} ${current} (base ${pBase})`, r.toString());
      pending=null; pendingOp=null;
    }
  });
})();

/* ===================== FINANCIAL CALCULATOR ===================== */
const finForms = {
  emi: { title:'EMI Calculator', fields:[['principal','Loan Amount (₹)'],['rate','Interest Rate (% p.a.)'],['tenure','Tenure (months)']],
    calc:(v)=>{ const P=+v.principal, r=+v.rate/12/100, n=+v.tenure;
      const emi = r===0 ? P/n : P*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1);
      const total = emi*n, interest = total-P;
      return [['EMI', '₹'+emi.toFixed(2), true],['Total Payment','₹'+total.toFixed(2)],['Total Interest','₹'+interest.toFixed(2)]]; } },
  gst: { title:'GST Calculator', fields:[['amount','Amount (₹)'],['gst','GST %']],
    calc:(v)=>{ const A=+v.amount, g=+v.gst; const gstAmt = A*g/100;
      return [['GST Amount','₹'+gstAmt.toFixed(2), true],['Amount + GST','₹'+(A+gstAmt).toFixed(2)],['Amount - GST (if inclusive)','₹'+(A-(A*g/(100+g))).toFixed(2)]]; } },
  discount: { title:'Discount Calculator', fields:[['price','Original Price (₹)'],['discount','Discount %']],
    calc:(v)=>{ const P=+v.price, d=+v.discount; const saved=P*d/100;
      return [['Final Price','₹'+(P-saved).toFixed(2), true],['You Save','₹'+saved.toFixed(2)]]; } },
  tip: { title:'Tip Calculator', fields:[['bill','Bill Amount (₹)'],['tip','Tip %'],['people','Split Between (people)']],
    calc:(v)=>{ const B=+v.bill, t=+v.tip, p=+v.people||1; const tipAmt=B*t/100; const total=B+tipAmt;
      return [['Tip Amount','₹'+tipAmt.toFixed(2), true],['Total Bill','₹'+total.toFixed(2)],['Per Person','₹'+(total/p).toFixed(2)]]; } },
  loan: { title:'Loan Calculator', fields:[['principal','Loan Amount (₹)'],['rate','Interest Rate (% p.a.)'],['tenure','Tenure (years)']],
    calc:(v)=>{ const P=+v.principal, r=+v.rate/12/100, n=+v.tenure*12;
      const emi = r===0 ? P/n : P*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1);
      const total = emi*n;
      return [['Monthly EMI','₹'+emi.toFixed(2), true],['Total Payable','₹'+total.toFixed(2)],['Total Interest','₹'+(total-P).toFixed(2)]]; } },
  sip: { title:'SIP Calculator', fields:[['monthly','Monthly Investment (₹)'],['rate','Expected Return (% p.a.)'],['years','Duration (years)']],
    calc:(v)=>{ const P=+v.monthly, i=+v.rate/12/100, n=+v.years*12;
      const fv = i===0 ? P*n : P*((Math.pow(1+i,n)-1)/i)*(1+i);
      const invested = P*n;
      return [['Maturity Value','₹'+fv.toFixed(2), true],['Total Invested','₹'+invested.toFixed(2)],['Wealth Gained','₹'+(fv-invested).toFixed(2)]]; } },
  fd: { title:'FD Calculator', fields:[['principal','Principal (₹)'],['rate','Interest Rate (% p.a.)'],['years','Tenure (years)']],
    calc:(v)=>{ const P=+v.principal, r=+v.rate/100, n=+v.years; const m=4; const maturity = P*Math.pow(1+r/m, m*n);
      return [['Maturity Amount','₹'+maturity.toFixed(2), true],['Interest Earned','₹'+(maturity-P).toFixed(2)]]; } },
  rd: { title:'RD Calculator', fields:[['monthly','Monthly Deposit (₹)'],['rate','Interest Rate (% p.a.)'],['months','Tenure (months)']],
    calc:(v)=>{ const P=+v.monthly, r=+v.rate/100, n=+v.months;
      const maturity = P*n + P*n*(n+1)/2*(r/12);
      return [['Maturity Amount','₹'+maturity.toFixed(2), true],['Total Deposited','₹'+(P*n).toFixed(2)],['Interest Earned','₹'+(maturity-P*n).toFixed(2)]]; } },
  si: { title:'Simple Interest', fields:[['principal','Principal (₹)'],['rate','Rate (% p.a.)'],['time','Time (years)']],
    calc:(v)=>{ const P=+v.principal, R=+v.rate, T=+v.time; const si=P*R*T/100;
      return [['Simple Interest','₹'+si.toFixed(2), true],['Total Amount','₹'+(P+si).toFixed(2)]]; } },
  ci: { title:'Compound Interest', fields:[['principal','Principal (₹)'],['rate','Rate (% p.a.)'],['time','Time (years)'],['freq','Compounding per year']],
    calc:(v)=>{ const P=+v.principal, R=+v.rate, T=+v.time, n=+v.freq||1;
      const amt = P*Math.pow(1+R/(100*n), n*T); const ci = amt-P;
      return [['Compound Interest','₹'+ci.toFixed(2), true],['Total Amount','₹'+amt.toFixed(2)]]; } },
};

function renderFinForm(key){
  const cfg = finForms[key];
  const form = document.getElementById('finForm');
  form.innerHTML = `<div class="form-title">${cfg.title}</div>` +
    cfg.fields.map(([id,label])=>`<div class="field"><label>${label}</label><input type="number" id="fin_${id}" step="any"></div>`).join('') +
    `<button class="btn-primary" id="finCalc">Calculate</button>`;
  document.getElementById('finCalc').addEventListener('click', ()=>{
    const v = {}; cfg.fields.forEach(([id])=> v[id] = document.getElementById('fin_'+id).value || 0);
    try{
      const rows = cfg.calc(v);
      const resBox = document.getElementById('finResult');
      resBox.innerHTML = rows.map(([l,val,main])=> main ? `<div class="r-main">${val}</div><div class="mode-label">${l}</div>` : `<div class="r-line">${l}<b>${val}</b></div>`).join('');
      pushHistory(cfg.title, rows[0][1]);
    }catch(e){ toast('Invalid input'); }
  });
}
document.querySelectorAll('#finTabs .sub-tab').forEach(t=>{
  t.addEventListener('click', ()=>{
    document.querySelectorAll('#finTabs .sub-tab').forEach(x=>x.classList.remove('active'));
    t.classList.add('active'); renderFinForm(t.dataset.fin);
  });
});
renderFinForm('emi');

/* ===================== HEALTH CALCULATOR ===================== */
const healthForms = {
  bmi: { title:'BMI Calculator', fields:[['weight','Weight (kg)'],['height','Height (cm)']],
    calc:(v)=>{ const w=+v.weight, h=+v.height/100; const bmi=w/(h*h);
      let cat = bmi<18.5?'Underweight':bmi<25?'Normal':bmi<30?'Overweight':'Obese';
      return [['BMI', bmi.toFixed(1), true],['Category', cat]]; } },
  age: { title:'Age Calculator', fields:[['dob','Date of Birth']], types:{dob:'date'},
    calc:(v)=>{ const dob=new Date(v.dob); const now=new Date();
      let y=now.getFullYear()-dob.getFullYear(), m=now.getMonth()-dob.getMonth(), d=now.getDate()-dob.getDate();
      if(d<0){ m--; d += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
      if(m<0){ y--; m+=12; }
      return [['Age', `${y}y ${m}m ${d}d`, true]]; } },
  bmr: { title:'BMR Calculator', fields:[['weight','Weight (kg)'],['height','Height (cm)'],['age','Age (years)'],['gender','Gender (m/f)']],
    calc:(v)=>{ const w=+v.weight, h=+v.height, a=+v.age; const isM = String(v.gender).toLowerCase().startsWith('m');
      const bmr = isM ? 10*w+6.25*h-5*a+5 : 10*w+6.25*h-5*a-161;
      return [['BMR (kcal/day)', bmr.toFixed(0), true]]; } },
  ideal: { title:'Ideal Weight Calculator', fields:[['height','Height (cm)'],['gender','Gender (m/f)']],
    calc:(v)=>{ const hIn = (+v.height)/2.54; const isM = String(v.gender).toLowerCase().startsWith('m');
      const ideal = isM ? 50+2.3*(hIn-60) : 45.5+2.3*(hIn-60);
      return [['Ideal Weight (kg)', ideal.toFixed(1), true]]; } },
};
function renderHealthForm(key){
  const cfg = healthForms[key];
  const form = document.getElementById('healthForm');
  form.innerHTML = `<div class="form-title">${cfg.title}</div>` +
    cfg.fields.map(([id,label])=>{ const type = (cfg.types&&cfg.types[id]) || (id==='gender'?'text':'number');
      return `<div class="field"><label>${label}</label><input type="${type}" id="health_${id}" ${id==='gender'?'placeholder="m or f"':''}></div>`; }).join('') +
    `<button class="btn-primary" id="healthCalc">Calculate</button>`;
  document.getElementById('healthCalc').addEventListener('click', ()=>{
    const v={}; cfg.fields.forEach(([id])=> v[id]=document.getElementById('health_'+id).value);
    try{
      const rows = cfg.calc(v);
      const resBox = document.getElementById('healthResult');
      resBox.innerHTML = rows.map(([l,val,main])=> main ? `<div class="r-main">${val}</div><div class="mode-label">${l}</div>` : `<div class="r-line">${l}<b>${val}</b></div>`).join('');
      pushHistory(cfg.title, String(rows[0][1]));
    }catch(e){ toast('Invalid input'); }
  });
}
document.querySelectorAll('#healthTabs .sub-tab').forEach(t=>{
  t.addEventListener('click', ()=>{
    document.querySelectorAll('#healthTabs .sub-tab').forEach(x=>x.classList.remove('active'));
    t.classList.add('active'); renderHealthForm(t.dataset.health);
  });
});
renderHealthForm('bmi');

/* ===================== UNIT CONVERTER ===================== */
const unitCategories = {
  Length: { m:1, km:1000, cm:0.01, mm:0.001, mile:1609.34, yard:0.9144, foot:0.3048, inch:0.0254 },
  Weight: { kg:1, g:0.001, mg:0.000001, ton:1000, pound:0.453592, ounce:0.0283495 },
  Area: { sqm:1, sqkm:1e6, sqft:0.092903, sqyard:0.836127, acre:4046.86, hectare:10000 },
  Volume: { liter:1, ml:0.001, gallon:3.78541, cubicm:1000, cubicft:28.3168 },
  Speed: { 'm/s':1, 'km/h':0.277778, mph:0.44704, knot:0.514444 },
  Time: { sec:1, min:60, hour:3600, day:86400, week:604800 },
  Data: { byte:1, KB:1024, MB:1048576, GB:1073741824, TB:1099511627776, bit:0.125 },
  Pressure: { pascal:1, bar:100000, atm:101325, psi:6894.76, torr:133.322 },
  Energy: { joule:1, kJ:1000, calorie:4.184, kcal:4184, kWh:3600000 },
  Temperature: { celsius:'C', fahrenheit:'F', kelvin:'K' },
};
const catSel = document.getElementById('convCategory'), fromSel = document.getElementById('convFrom'), toSel = document.getElementById('convTo');
Object.keys(unitCategories).forEach(c=> catSel.innerHTML += `<option value="${c}">${c}</option>`);
function populateUnits(cat){
  const units = Object.keys(unitCategories[cat]);
  fromSel.innerHTML = units.map(u=>`<option value="${u}">${u}</option>`).join('');
  toSel.innerHTML = units.map(u=>`<option value="${u}">${u}</option>`).join('');
  if(units.length>1) toSel.selectedIndex = 1;
}
populateUnits(catSel.value);
catSel.addEventListener('change', ()=> populateUnits(catSel.value));

function convertTemp(val, from, to){
  let c;
  if(from==='celsius') c=val; else if(from==='fahrenheit') c=(val-32)*5/9; else c=val-273.15;
  if(to==='celsius') return c; if(to==='fahrenheit') return c*9/5+32; return c+273.15;
}
document.getElementById('convGo').addEventListener('click', ()=>{
  const cat = catSel.value, from = fromSel.value, to = toSel.value, val = parseFloat(document.getElementById('convValue').value)||0;
  let result;
  if(cat==='Temperature'){ result = convertTemp(val, from, to); }
  else { const table = unitCategories[cat]; result = val * table[from] / table[to]; }
  const box = document.getElementById('convResult');
  box.style.display='block';
  box.innerHTML = `<div class="r-main">${formatNumber(result)} ${to}</div><div class="mode-label">${val} ${from} =</div>`;
  pushHistory(`${val} ${from} → ${to}`, formatNumber(result));
});

/* ===================== CURRENCY CONVERTER ===================== */
const currencies = ['INR','USD','EUR','GBP','JPY','AED'];
const curFrom = document.getElementById('curFrom'), curTo = document.getElementById('curTo');
currencies.forEach(c=>{ curFrom.innerHTML += `<option ${c==='USD'?'selected':''}>${c}</option>`; curTo.innerHTML += `<option ${c==='INR'?'selected':''}>${c}</option>`; });

let rates = null;
const rateStatus = document.getElementById('rateStatus');
function fetchRates(){
  rateStatus.textContent = ' (fetching live rates...)';
  fetch('https://open.er-api.com/v6/latest/USD').then(r=>r.json()).then(data=>{
    if(data && data.rates){ rates = data.rates; rateStatus.textContent = ' (live rates loaded)'; }
    else throw new Error('bad data');
  }).catch(()=>{ rateStatus.textContent = ' (live rates unavailable — check internet)'; });
}
fetchRates();
document.getElementById('curRefresh').addEventListener('click', fetchRates);
document.getElementById('curGo').addEventListener('click', ()=>{
  const from = curFrom.value, to = curTo.value, val = parseFloat(document.getElementById('curValue').value)||0;
  const box = document.getElementById('curResult'); box.style.display='block';
  if(!rates){ box.innerHTML = `<div class="mode-label">Live rates load nahi hui — Refresh dabao (internet chahiye)</div>`; return; }
  const usdVal = val / (rates[from]||1);
  const result = usdVal * (rates[to]||1);
  box.innerHTML = `<div class="r-main">${result.toFixed(2)} ${to}</div><div class="mode-label">${val} ${from} =</div>`;
  pushHistory(`${val} ${from} → ${to}`, result.toFixed(2));
});

/* ===================== HISTORY PANEL ===================== */
function renderHistory(){
  const list = document.getElementById('historyList');
  const q = (document.getElementById('histSearch').value||'').toLowerCase();
  let items = history.filter(h => h.expr.toLowerCase().includes(q) || h.res.toLowerCase().includes(q));
  items.sort((a,b)=> (b.pin-a.pin) || (b.ts-a.ts));
  if(!items.length){ list.innerHTML = '<div class="hist-empty">Koi calculation nahi mili</div>'; return; }
  list.innerHTML = items.map(h => `
    <div class="hist-item" data-id="${h.id}">
      <div class="h-top">
        <div>
          <div class="h-expr">${h.expr}</div>
          <div class="h-res">= ${h.res}</div>
        </div>
        <div class="hist-actions">
          <button data-act="fav" class="${h.fav?'on':''}" title="Favorite">⭐</button>
          <button data-act="pin" class="${h.pin?'on':''}" title="Pin">📌</button>
          <button data-act="note" title="Add note">📝</button>
          <button data-act="del" title="Delete">🗑️</button>
        </div>
      </div>
      ${h.note ? `<div class="h-note">📝 ${h.note}</div>` : ''}
    </div>`).join('');
}
document.getElementById('histSearch').addEventListener('input', renderHistory);
document.getElementById('historyList').addEventListener('click', (e)=>{
  const btn = e.target.closest('button');
  const item = e.target.closest('.hist-item'); if(!item) return;
  const id = item.dataset.id;
  const h = history.find(x=>x.id===id); if(!h) return;
  if(!btn){
    expression = h.expr; justEvaluated = false; render(); closeOverlay('historyOverlay'); return;
  }
  const act = btn.dataset.act;
  if(act==='fav'){ h.fav = !h.fav; }
  else if(act==='pin'){ h.pin = !h.pin; }
  else if(act==='del'){ history = history.filter(x=>x.id!==id); }
  else if(act==='note'){ const n = prompt('Note likho:', h.note||''); if(n!==null) h.note = n; }
  saveHistoryLS(); renderHistory();
});
document.getElementById('histClearAll').addEventListener('click', ()=>{
  if(confirm('Puri history delete karni hai?')){ history = []; saveHistoryLS(); renderHistory(); }
});
document.getElementById('histExportCsv').addEventListener('click', ()=>{
  const rows = [['Expression','Result','Note','Date']].concat(history.map(h=>[h.expr,h.res,h.note||'', new Date(h.ts).toLocaleString()]));
  const csv = rows.map(r=> r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'calculator-history.csv'; a.click();
});
document.getElementById('histExportPdf').addEventListener('click', ()=>{
  if(typeof window.jspdf === 'undefined'){ toast('PDF library load nahi hui'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(14); doc.text('Calculator History', 14, 16);
  doc.setFontSize(10);
  let y = 28;
  history.slice(0,60).forEach(h=>{
    doc.text(`${h.expr} = ${h.res}`, 14, y); y += 7;
    if(y>280){ doc.addPage(); y=20; }
  });
  doc.save('calculator-history.pdf');
});
document.getElementById('histPrint').addEventListener('click', ()=>{
  const w = window.open('', '_blank');
  w.document.write('<h2>Calculator History</h2>' + history.map(h=>`<p>${h.expr} = <b>${h.res}</b></p>`).join(''));
  w.document.close(); w.print();
});

/* ===================== DASHBOARD ===================== */
function renderDashboard(){
  document.getElementById('statTotal').textContent = history.length;
  const todayStr = new Date().toDateString();
  document.getElementById('statToday').textContent = history.filter(h=> new Date(h.ts).toDateString()===todayStr).length;
  document.getElementById('statFav').textContent = history.filter(h=>h.fav).length;

  const opCount = {'+':0,'-':0,'*':0,'/':0,'^':0};
  history.forEach(h=> Object.keys(opCount).forEach(op=>{ opCount[op] += (h.expr.match(new RegExp('\\'+op,'g'))||[]).length; }));
  const best = Object.entries(opCount).sort((a,b)=>b[1]-a[1])[0];
  document.getElementById('statOp').textContent = best && best[1]>0 ? best[0] : '-';

  const days = [];
  for(let i=6;i>=0;i--){
    const d = new Date(); d.setDate(d.getDate()-i);
    const count = history.filter(h=> new Date(h.ts).toDateString()===d.toDateString()).length;
    days.push({label: d.toLocaleDateString(undefined,{weekday:'short'}), count});
  }
  const max = Math.max(1, ...days.map(d=>d.count));
  document.getElementById('weekBars').innerHTML = days.map(d=>`<div class="bar" style="height:${Math.max(4,(d.count/max)*80)}px"></div>`).join('');
  document.getElementById('weekLbls').innerHTML = days.map(d=>`<span>${d.label}</span>`).join('');
}

/* ===================== SETTINGS PANEL ===================== */
const themes = ['glass','light','neon','material','ocean','sunset','forest','mono','pastel'];
const themeGrid = document.getElementById('themeGrid');
const themeSwatch = { glass:'#7dffb3', light:'#0e9f6e', neon:'#ff2ec4', material:'#03dac6', ocean:'#4fd1c5', sunset:'#ff7e5f', forest:'#7bd389', mono:'#e6e6e6', pastel:'#f7a1c4' };
themes.forEach(t=>{
  const dot = document.createElement('div');
  dot.className = 'theme-dot' + (settings.theme===t ? ' active' : '');
  dot.style.background = themeSwatch[t];
  dot.title = t;
  dot.addEventListener('click', ()=>{
    settings.theme = t; saveSettings(); applyTheme();
    document.querySelectorAll('.theme-dot').forEach(d=>d.classList.remove('active'));
    dot.classList.add('active');
  });
  themeGrid.appendChild(dot);
});

function wireSwitch(id, key){
  const el = document.getElementById(id);
  el.classList.toggle('on', settings[key]);
  el.addEventListener('click', ()=>{
    settings[key] = !settings[key]; saveSettings();
    el.classList.toggle('on', settings[key]);
  });
}
wireSwitch('swSaveHistory','saveHistory');
wireSwitch('swSound','sound');
wireSwitch('swVibrate','vibrate');
wireSwitch('swVoiceOut','voiceOut');

const langSelect = document.getElementById('langSelect');
langSelect.value = settings.lang;
const i18n = {
  en:{ title:'Advanced Calculator Pro', history:'History', dashboard:'Dashboard', settings:'Settings', tabCalc:'🧮 Calculator', tabProg:'🟣 Programmer', tabFin:'🟡 Financial', tabHealth:'🟢 Health', tabConv:'🔵 Unit Converter', tabCur:'🟣 Currency' },
  hi:{ title:'एडवांस्ड कैलकुलेटर प्रो', history:'हिस्ट्री', dashboard:'डैशबोर्ड', settings:'सेटिंग्स', tabCalc:'🧮 कैलकुलेटर', tabProg:'🟣 प्रोग्रामर', tabFin:'🟡 फाइनेंशियल', tabHealth:'🟢 हेल्थ', tabConv:'🔵 यूनिट कन्वर्टर', tabCur:'🟣 करेंसी' },
};
function applyLang(){
  const dict = i18n[settings.lang] || i18n.en;
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const key = el.dataset.i18n; if(dict[key]) el.textContent = dict[key];
  });
}
applyLang();
langSelect.addEventListener('change', ()=>{ settings.lang = langSelect.value; saveSettings(); applyLang(); });

const fontSelect = document.getElementById('fontSelect');
fontSelect.value = settings.font;
fontSelect.addEventListener('change', ()=>{ settings.font = parseFloat(fontSelect.value); saveSettings(); applyTheme(); });

})();