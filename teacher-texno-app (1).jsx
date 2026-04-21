import { useState, useEffect, useRef, useCallback } from "react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const SK = "texno_v3";
const TP_KEY = "tpwd";
const DEFAULT_TP = "Ustoz2023";

const NAMES = [
  "Bahodirjonov Sardor","Bahodirov Asadbek","Farangiz","Farxodjon 08",
  "Hikmatillo","Ibrohim","Mashrapov Azizbek","Muhiddinov Nurillo",
  "Dadajonova Munavvara","Og'abek","Omonov Alisher","Shavkatova Fotima",
  "Shaxboz","Shodiyona","Tojaliyev G'ayratjon","Tolipjonov Asadbek",
  "Tursunaliyev Abdulaziz","Umaraliyev Ozodbek"
];

const MEDALS = ["🥇","🥈","🥉"];
const BADGE_LEVELS = (c) => c < 100 ? "Starter" : c < 300 ? "Active" : c < 600 ? "Pro" : "Elite";
const LEVEL = (c) => Math.floor(c / 100) + 1;

function genPass(name) {
  const safe = (name || "").replace(/[^a-zA-Z0-9]/g, "");
  return (safe.slice(0, 3).toUpperCase() || "STU") + (Math.floor(Math.random() * 900) + 100);
}
function genRef(id) { return `REF${id}${Math.floor(Math.random() * 100)}`; }

// ─── STORAGE ─────────────────────────────────────────────────────────────────
function saveLocal(students, txs, nid) {
  try { localStorage.setItem(SK, JSON.stringify({ students, transactions: txs, nextStudentId: nid })); } catch {}
}
function loadLocal() {
  try { const r = localStorage.getItem(SK); if (r) return JSON.parse(r); } catch {}
  return null;
}
function mkDefault() {
  let id = 1; const students = [];
  for (const name of NAMES) {
    const curId = id++;
    students.push({ id: curId, name, refCode: genRef(curId), password: genPass(name), totalCoins: 0, streak: 0, lastDailyDate: null });
  }
  return { students, txs: [], nid: id };
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function earned(sid, txs, students, mode) {
  if (mode === "weekly") { const w = Date.now() - 7 * 864e5; return txs.filter(t => t.studentId === sid && t.timestamp >= w).reduce((a, b) => a + b.amount, 0); }
  if (mode === "monthly") { const m = Date.now() - 30 * 864e5; return txs.filter(t => t.studentId === sid && t.timestamp >= m).reduce((a, b) => a + b.amount, 0); }
  return students.find(s => s.id === sid)?.totalCoins || 0;
}
function sorted(students, txs, mode) {
  return [...students].map(s => ({ ...s, score: earned(s.id, txs, students, mode) })).sort((a, b) => b.score - a.score);
}
function rankOf(sid, students, txs, mode) {
  return sorted(students, txs, mode).findIndex(s => s.id === sid) + 1;
}
function fmtDate(ts) {
  return new Date(ts).toLocaleDateString("uz-UZ", { day: "numeric", month: "short", year: "numeric" });
}

// ─── TOAST ───────────────────────────────────────────────────────────────────
let toastId = 0;
function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((msg, type = "info") => {
    const id = ++toastId;
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);
  return { toasts, show };
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Inter:wght@300;400;500;600&display=swap');
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg-deep:#111825;--bg-main:#1a2235;--bg-card:#1e2a3d;--bg-card2:#243047;--bg-hover:#2a3a55;
  --gold-dark:#9a7818;--gold:#c8a020;--gold-mid:#e4c040;--gold-light:#f5d860;--gold-glow:rgba(200,160,32,.25);
  --blue-dark:#1a4fb0;--blue:#2b7de9;--blue-mid:#4a96ff;--blue-light:#80bfff;--blue-glow:rgba(43,125,233,.25);
  --text:#e8edf5;--text-muted:#7a8aaa;--text-dim:#4a5878;
  --border:rgba(255,255,255,.07);--border-gold:rgba(200,160,32,.3);--border-blue:rgba(43,125,233,.3);
  --green:#2aab6a;--red:#e04a4a;--sw:250px;--hh:60px;--r:8px;--rl:14px
}
html,body,#root{height:100%;font-family:'Inter',sans-serif;background:var(--bg-deep);color:var(--text);font-size:14px;overflow-x:hidden}
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-track{background:var(--bg-deep)}
::-webkit-scrollbar-thumb{background:var(--border-gold);border-radius:3px}

/* LOADING */
.loading{position:fixed;inset:0;background:var(--bg-deep);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999;transition:opacity .5s}
.load-logo{width:80px;height:80px;border-radius:50%;object-fit:cover;animation:pulse 2s ease-in-out infinite;border:2px solid var(--gold)}
@keyframes pulse{0%,100%{opacity:.6;transform:scale(.95)}50%{opacity:1;transform:scale(1.05)}}
.load-title{font-family:'Rajdhani',sans-serif;font-size:28px;font-weight:700;letter-spacing:2px;background:linear-gradient(90deg,var(--gold),var(--blue-mid));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-top:16px}
.load-sub{color:var(--text-muted);font-size:12px;margin-top:4px;letter-spacing:1px}
.load-bar{width:160px;height:3px;background:var(--bg-card2);border-radius:2px;margin-top:22px;overflow:hidden}
.load-fill{height:100%;background:linear-gradient(90deg,var(--gold),var(--blue-mid));border-radius:2px;animation:lf 1.8s ease-in-out forwards}
@keyframes lf{from{width:0}to{width:100%}}

/* LOGIN */
.login-screen{position:fixed;inset:0;background:var(--bg-deep);display:flex;align-items:center;justify-content:center;z-index:1000}
.lg-pattern{position:absolute;inset:0;opacity:.04;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='92'%3E%3Cpolygon points='40,4 76,24 76,68 40,88 4,68 4,24' fill='none' stroke='%23c8a020' stroke-width='1'/%3E%3C/svg%3E");background-size:80px 92px}
.lg-glow{position:absolute;width:500px;height:500px;border-radius:50%;background:radial-gradient(circle,rgba(43,125,233,.1) 0%,transparent 70%);top:50%;left:50%;transform:translate(-50%,-50%)}
.lg-card{position:relative;width:400px;max-width:95vw;background:var(--bg-card);border-radius:var(--rl);border:1px solid var(--border-gold);box-shadow:0 0 40px rgba(200,160,32,.1),0 20px 60px rgba(0,0,0,.5);overflow:hidden}
.lg-top{background:linear-gradient(135deg,#0d1628,var(--bg-card2));padding:28px 32px 22px;text-align:center;border-bottom:1px solid var(--border-gold)}
.lg-logo{width:68px;height:68px;border-radius:50%;object-fit:cover;border:2px solid var(--gold);margin-bottom:10px}
.lg-title{font-family:'Rajdhani',sans-serif;font-size:26px;font-weight:700;letter-spacing:2px;background:linear-gradient(90deg,var(--gold-mid),var(--blue-mid));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.lg-sub{color:var(--text-muted);font-size:11px;letter-spacing:1.5px;text-transform:uppercase;margin-top:3px}
.lg-body{padding:22px 30px 26px}

/* TABS */
.tab-row{display:flex;background:var(--bg-deep);border-radius:var(--r);padding:3px;margin-bottom:18px;border:1px solid var(--border)}
.tab-btn{flex:1;padding:8px;border:none;background:transparent;border-radius:6px;font-family:'Inter',sans-serif;font-size:13px;font-weight:600;color:var(--text-muted);cursor:pointer;transition:all .2s}
.tab-btn.active{background:linear-gradient(135deg,var(--blue-dark),var(--blue));color:#fff}

/* FORM */
.form-group{margin-bottom:13px}
.form-group label{display:block;font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:5px;text-transform:uppercase;letter-spacing:.8px}
.form-control{width:100%;padding:10px 13px;border:1px solid var(--border);border-radius:var(--r);font-family:'Inter',sans-serif;font-size:14px;background:var(--bg-deep);color:var(--text);transition:border-color .2s;outline:none}
.form-control:focus{border-color:var(--blue);box-shadow:0 0 0 3px var(--blue-glow)}
select.form-control{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%237a8aaa'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:30px}

/* BUTTONS */
.btn{display:inline-flex;align-items:center;gap:7px;padding:9px 18px;border:none;border-radius:var(--r);font-family:'Inter',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s;text-decoration:none;white-space:nowrap}
.btn-gold{background:linear-gradient(135deg,var(--gold-dark),var(--gold-mid));color:#0d1628}
.btn-gold:hover{background:linear-gradient(135deg,var(--gold),var(--gold-light));transform:translateY(-1px)}
.btn-blue{background:linear-gradient(135deg,var(--blue-dark),var(--blue));color:#fff}
.btn-blue:hover{background:linear-gradient(135deg,var(--blue),var(--blue-mid));transform:translateY(-1px)}
.btn-outline{background:transparent;border:1px solid var(--border);color:var(--text-muted)}
.btn-outline:hover{border-color:var(--border-blue);color:var(--blue-light)}
.btn-og{background:transparent;border:1px solid var(--border-gold);color:var(--gold)}
.btn-og:hover{background:var(--gold-glow)}
.btn-danger{background:rgba(224,74,74,.15);border:1px solid rgba(224,74,74,.3);color:#ff8080}
.btn-danger:hover{background:rgba(224,74,74,.25)}
.btn-success{background:rgba(42,171,106,.15);border:1px solid rgba(42,171,106,.3);color:#60d090}
.btn-success:hover{background:rgba(42,171,106,.25)}
.btn-sm{padding:6px 11px;font-size:12px}
.btn-block{width:100%;justify-content:center;padding:12px;font-size:14px}

/* APP SHELL */
.app-shell{display:flex;min-height:100vh}

/* SIDEBAR */
.sidebar{width:var(--sw);background:var(--bg-card);position:fixed;top:0;left:0;bottom:0;z-index:100;display:flex;flex-direction:column;border-right:1px solid var(--border-gold);transition:transform .3s}
.sb-brand{padding:16px 16px 12px;border-bottom:1px solid var(--border-gold);background:linear-gradient(135deg,#0d1628,var(--bg-card2))}
.sb-brand-row{display:flex;align-items:center;gap:10px}
.sb-logo{width:40px;height:40px;border-radius:50%;object-fit:cover;border:1.5px solid var(--gold);flex-shrink:0}
.sb-txt h2{font-family:'Rajdhani',sans-serif;font-size:16px;font-weight:700;letter-spacing:1px;color:var(--gold-mid)}
.sb-txt span{font-size:10px;color:var(--text-muted);letter-spacing:1px;text-transform:uppercase}
.sb-user{margin:10px;padding:10px 12px;background:var(--bg-deep);border-radius:var(--r);border:1px solid var(--border);display:flex;align-items:center;gap:10px}
.u-av{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--blue-dark),var(--blue));display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:12px;flex-shrink:0;border:2px solid var(--border-blue)}
.u-nm{font-size:13px;font-weight:600;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.u-role{font-size:11px;color:var(--gold)}
.app-nav{flex:1;padding:6px 0;overflow-y:auto}
.nav-sec{padding:12px 14px 4px;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--text-dim);font-weight:600}
.nav-item{display:flex;align-items:center;gap:10px;padding:9px 14px;color:var(--text-muted);cursor:pointer;border-left:3px solid transparent;transition:all .15s;font-size:13px;font-weight:500;margin:1px 0}
.nav-item:hover{background:var(--bg-hover);color:var(--text)}
.nav-item.active{background:linear-gradient(90deg,rgba(43,125,233,.15),transparent);color:var(--blue-light);border-left-color:var(--blue)}
.nav-item i{width:15px;text-align:center;font-size:12px}
.sb-footer{padding:12px;border-top:1px solid var(--border)}

/* MAIN */
.main-content{margin-left:var(--sw);flex:1;min-height:100vh;display:flex;flex-direction:column}
.topbar{height:var(--hh);background:var(--bg-card);border-bottom:1px solid var(--border-gold);display:flex;align-items:center;padding:0 20px;gap:12px;position:sticky;top:0;z-index:50}
.tb-title{font-family:'Rajdhani',sans-serif;font-size:18px;font-weight:700;color:var(--gold-mid);letter-spacing:1px;flex:1}
.tb-right{display:flex;align-items:center;gap:8px}
.top-badge{display:flex;align-items:center;gap:5px;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700}
.tb-gold{background:rgba(200,160,32,.12);border:1px solid var(--border-gold);color:var(--gold-mid)}
.tb-blue{background:rgba(43,125,233,.12);border:1px solid var(--border-blue);color:var(--blue-light)}
.pc{padding:20px;flex:1}

/* STAT CARDS */
.srow{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}
.sc{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--r);padding:14px 16px;position:relative;overflow:hidden}
.sc::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--gold),var(--gold-light))}
.sc.bt::before{background:linear-gradient(90deg,var(--blue-dark),var(--blue-mid))}
.sc.gt::before{background:linear-gradient(90deg,#1a7a50,var(--green))}
.sc.rt::before{background:linear-gradient(90deg,#8a1a1a,var(--red))}
.sl{font-size:11px;font-weight:600;letter-spacing:.8px;text-transform:uppercase;color:var(--text-dim);margin-bottom:7px}
.sv{font-family:'Rajdhani',sans-serif;font-size:30px;font-weight:700;color:var(--gold-mid);line-height:1}
.sc.bt .sv{color:var(--blue-light)}
.sc.gt .sv{color:#60d090}
.sc.rt .sv{color:#ff9090}
.ss{font-size:11px;color:var(--text-muted);margin-top:4px}

/* CARD */
.card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--r)}
.ch{padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.ch h4{font-family:'Rajdhani',sans-serif;font-size:15px;font-weight:700;color:var(--gold-mid);letter-spacing:.8px}
.cb{padding:14px 16px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}

/* TABLE */
.tw{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:13px}
thead tr{background:var(--bg-deep)}
th{padding:9px 12px;text-align:left;font-size:11px;font-weight:700;color:var(--text-dim);letter-spacing:.8px;text-transform:uppercase;border-bottom:1px solid var(--border-gold)}
td{padding:9px 12px;border-bottom:1px solid var(--border);vertical-align:middle}
tr:last-child td{border-bottom:none}
tr:hover td{background:var(--bg-hover)}

/* BADGE */
.badge{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600}
.bg{background:rgba(200,160,32,.15);color:var(--gold-mid);border:1px solid var(--border-gold)}
.bb{background:rgba(43,125,233,.15);color:var(--blue-light);border:1px solid var(--border-blue)}
.bgg{background:rgba(42,171,106,.15);color:#60d090;border:1px solid rgba(42,171,106,.3)}

/* PROGRESS */
.pbar{height:6px;background:var(--bg-deep);border-radius:3px;overflow:hidden}
.pfill{height:100%;border-radius:3px;background:linear-gradient(90deg,var(--blue),var(--gold-mid));transition:width .5s}

/* LB */
.lb-item{display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:var(--r);margin-bottom:3px;transition:background .15s}
.lb-item:hover{background:var(--bg-hover)}
.lb-item.me{background:rgba(43,125,233,.1);border-left:2px solid var(--blue)}
.lb-rank{width:25px;font-family:'Rajdhani',sans-serif;font-size:15px;font-weight:700;color:var(--text-dim);text-align:center;flex-shrink:0}
.lb-name{flex:1;font-size:13px;font-weight:500}
.lb-score{font-family:'Rajdhani',sans-serif;font-weight:700;font-size:13px;color:var(--gold-mid)}

/* ACTIVITY */
.ai{display:flex;justify-content:space-between;align-items:center;padding:7px 10px;border-radius:var(--r);border:1px solid var(--border);background:var(--bg-deep);margin-bottom:5px}
.at{font-size:12px;color:var(--text-muted)}
.ac{font-size:12px;font-weight:700;color:var(--green);white-space:nowrap;margin-left:8px}
.acd{font-size:12px;font-weight:700;color:var(--red);white-space:nowrap;margin-left:8px}

/* GIVE CARD */
.gc{background:var(--bg-card2);border:1px solid var(--border);border-radius:var(--r);padding:14px}
.gc h5{font-family:'Rajdhani',sans-serif;font-size:13px;font-weight:700;color:var(--gold);margin-bottom:10px;letter-spacing:.8px;text-transform:uppercase}
.rr{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.rr input[type=range]{flex:1;accent-color:var(--blue);height:4px}
.rv{width:28px;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:15px;color:var(--gold-mid);text-align:right}

/* TOAST */
.toast-container{position:fixed;top:16px;right:16px;z-index:9000;display:flex;flex-direction:column;gap:7px;pointer-events:none}
.toast{background:var(--bg-card);border:1px solid var(--border);border-left:3px solid var(--blue);border-radius:var(--r);padding:11px 15px;font-size:13px;box-shadow:0 8px 24px rgba(0,0,0,.4);min-width:230px;animation:tin .3s ease}
.toast.success{border-left-color:var(--green)}
.toast.error{border-left-color:var(--red)}
@keyframes tin{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:translateX(0)}}

/* REF */
.ref-box{background:var(--bg-deep);border:1px dashed var(--border-gold);border-radius:10px;padding:18px;text-align:center}
.ref-code{font-family:'Rajdhani',sans-serif;font-size:28px;font-weight:700;letter-spacing:5px;color:var(--gold-mid);margin:7px 0}

/* MODAL */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:900}
.modal-box{background:var(--bg-card);border-radius:var(--rl);width:420px;max-width:95vw;border:1px solid var(--border-gold);box-shadow:0 20px 60px rgba(0,0,0,.6);overflow:hidden}
.modal-head{background:linear-gradient(135deg,var(--bg-deep),var(--bg-card2));padding:15px 20px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border-gold)}
.modal-head h3{font-family:'Rajdhani',sans-serif;font-size:17px;color:var(--gold-mid);letter-spacing:1px}
.modal-close{background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:16px}
.modal-close:hover{color:var(--text)}
.modal-body{padding:20px}
.modal-foot{padding:10px 20px 18px;display:flex;gap:8px;justify-content:flex-end}

/* MOBILE */
.sb-toggle{display:none;background:var(--bg-card2);border:1px solid var(--border-gold);color:var(--gold);width:35px;height:35px;border-radius:var(--r);cursor:pointer;font-size:14px;align-items:center;justify-content:center}
.sb-bg{display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99}
.sb-bg.open{display:block}

/* HINT */
.hint{font-size:11px;color:var(--text-dim);margin-top:8px;text-align:center}
.hint b{color:var(--gold)}

@media(max-width:900px){
  .sidebar{transform:translateX(-100%)}
  .sidebar.open{transform:translateX(0)}
  .main-content{margin-left:0}
  .sb-toggle{display:flex}
  .srow{grid-template-columns:1fr 1fr}
  .g2,.g3{grid-template-columns:1fr}
}
@media(max-width:480px){
  .srow{grid-template-columns:1fr 1fr}
  .pc{padding:13px}
  .sv{font-size:26px}
  .lg-body{padding:16px 18px 20px}
}
`;

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

function Toasts({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => <div key={t.id} className={`toast ${t.type}`}>{t.msg}</div>)}
    </div>
  );
}

function Modal({ open, title, onClose, children, footer }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}><i className="fas fa-times" /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
function LoginScreen({ students, onStudentLogin, onTeacherLogin }) {
  const [tab, setTab] = useState("student");
  const [sSel, setSSel] = useState("");
  const [sPwd, setSPwd] = useState("");
  const [tPwd, setTPwd] = useState("");
  const [fpOpen, setFpOpen] = useState(false);
  const [fpSel, setFpSel] = useState("");
  const [fpRef, setFpRef] = useState("");
  const [fpNew, setFpNew] = useState("");
  const [fpCnf, setFpCnf] = useState("");
  const { toasts, show } = useToast();

  function handleSLogin() {
    if (!sSel) { show("Talabani tanlang!", "error"); return; }
    const s = students.find(x => x.id === Number(sSel));
    if (!s) { show("Topilmadi!", "error"); return; }
    if (s.password !== sPwd) { show("Parol xato!", "error"); return; }
    onStudentLogin(s.id);
  }
  function handleTLogin() {
    const saved = localStorage.getItem(TP_KEY) || DEFAULT_TP;
    if (tPwd !== saved) { show("Parol xato!", "error"); return; }
    onTeacherLogin();
  }
  function handleFPReset() {
    if (!fpSel) { show("Talabani tanlang!", "error"); return; }
    const s = students.find(x => x.id === Number(fpSel));
    if (!s) { show("Topilmadi!", "error"); return; }
    if (s.refCode !== fpRef) { show("Referral kod xato!", "error"); return; }
    if (fpNew.length < 3) { show("Parol kamida 3 belgi", "error"); return; }
    if (fpNew !== fpCnf) { show("Parollar mos emas", "error"); return; }
    s.password = fpNew;
    saveLocal(students, [], 1);
    show("Parol yangilandi!", "success");
    setFpOpen(false);
  }

  return (
    <div className="login-screen">
      <Toasts toasts={toasts} />
      <div style={{ position: "absolute", inset: 0 }}>
        <div className="lg-pattern" />
        <div className="lg-glow" />
      </div>
      <div className="lg-card">
        <div className="lg-top">
          <div style={{ fontSize: 48, marginBottom: 8 }}>👨‍💻</div>
          <div className="lg-title">Teacher_texno</div>
          <div className="lg-sub">IT Instructor · Valiyev Omadbek</div>
        </div>
        <div className="lg-body">
          <div className="tab-row">
            <button className={`tab-btn ${tab === "student" ? "active" : ""}`} onClick={() => setTab("student")}>Talaba</button>
            <button className={`tab-btn ${tab === "teacher" ? "active" : ""}`} onClick={() => setTab("teacher")}>O'qituvchi</button>
          </div>
          {tab === "student" && (
            <div>
              <div className="form-group">
                <label>Talaba ismi</label>
                <select className="form-control" value={sSel} onChange={e => setSSel(e.target.value)}>
                  <option value="">-- Tanlang --</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Parol</label>
                <input type="password" className="form-control" placeholder="Parolni kiriting" value={sPwd}
                  onChange={e => setSPwd(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSLogin()} />
              </div>
              <button className="btn btn-blue btn-block" onClick={handleSLogin}>
                <i className="fas fa-sign-in-alt" /> Kirish
              </button>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, flexWrap: "wrap", gap: 8 }}>
                <span className="hint">Parol esimdan chiqdi</span>
                <button className="btn btn-outline btn-sm" onClick={() => setFpOpen(true)}>
                  <i className="fas fa-unlock-alt" /> Tiklash
                </button>
              </div>
            </div>
          )}
          {tab === "teacher" && (
            <div>
              <div className="form-group">
                <label>O'qituvchi paroli</label>
                <input type="password" className="form-control" placeholder="Maxfiy parol" value={tPwd}
                  onChange={e => setTPwd(e.target.value)} onKeyDown={e => e.key === "Enter" && handleTLogin()} />
              </div>
              <button className="btn btn-gold btn-block" onClick={handleTLogin}>
                <i className="fas fa-chalkboard-teacher" /> Kirish
              </button>
            </div>
          )}
        </div>
      </div>

      <Modal open={fpOpen} title={<><i className="fas fa-unlock-alt" style={{ color: "var(--gold)", marginRight: 8 }} />Parolni tiklash</>}
        onClose={() => setFpOpen(false)}
        footer={<>
          <button className="btn btn-outline btn-sm" onClick={() => setFpOpen(false)}>Bekor</button>
          <button className="btn btn-blue btn-sm" onClick={handleFPReset}><i className="fas fa-save" /> Saqlash</button>
        </>}>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>Referral kod orqali yangi parol o'rnating.</p>
        <div className="form-group"><label>Talaba</label>
          <select className="form-control" value={fpSel} onChange={e => setFpSel(e.target.value)}>
            <option value="">-- Tanlang --</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="form-group"><label>Referral kod</label>
          <input className="form-control" placeholder="Masalan: REF102" value={fpRef} onChange={e => setFpRef(e.target.value)} />
        </div>
        <div className="form-group"><label>Yangi parol</label>
          <input type="password" className="form-control" placeholder="Kamida 3 belgi" value={fpNew} onChange={e => setFpNew(e.target.value)} />
        </div>
        <div className="form-group"><label>Yangi parol (takror)</label>
          <input type="password" className="form-control" value={fpCnf} onChange={e => setFpCnf(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}

// ─── STUDENT DASHBOARD ────────────────────────────────────────────────────────
function StudentDash({ student, students, txs, lbMode, setLbMode }) {
  const wk = earned(student.id, txs, students, "weekly");
  const l7 = [];
  for (let i = 6; i >= 0; i--) {
    let d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
    l7.push(txs.filter(t => t.studentId === student.id && t.timestamp >= d.getTime() && t.timestamp < d.getTime() + 86400000).reduce((a, b) => a + b.amount, 0));
  }
  const maxBar = Math.max(...l7, 1);
  const recent = txs.filter(t => t.studentId === student.id).slice(0, 8);
  const lb = sorted(students, txs, lbMode);

  return (
    <div>
      <div className="srow">
        <div className="sc"><div className="sl">Tangalar</div><div className="sv">{student.totalCoins}</div><div className="ss">Jami to'plangan</div></div>
        <div className="sc bt"><div className="sl">Daraja</div><div className="sv">{LEVEL(student.totalCoins)}</div><div className="ss">{BADGE_LEVELS(student.totalCoins)}</div></div>
        <div className="sc gt"><div className="sl">Streak</div><div className="sv">{student.streak || 0}</div><div className="ss">Ketma-ket kun</div></div>
        <div className="sc rt"><div className="sl">Reyting</div><div className="sv">#{rankOf(student.id, students, txs, "overall")}</div><div className="ss">{students.length} talabadan</div></div>
      </div>
      <div className="g2" style={{ marginBottom: 14 }}>
        <div className="card">
          <div className="ch"><h4>Haftalik progress</h4><span className="badge bg">{wk}/100</span></div>
          <div className="cb">
            <div className="pbar"><div className="pfill" style={{ width: Math.min(100, (wk / 100) * 100) + "%" }} /></div>
            <p style={{ fontSize: 11, color: "var(--text-dim)", margin: "5px 0 12px" }}>Maqsad: 100 tanga/hafta</p>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 100 }}>
              {l7.map((v, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <div style={{ width: "100%", background: "rgba(43,125,233,.6)", borderRadius: 4, height: Math.max(4, (v / maxBar) * 80) + "px", transition: "height .5s" }} />
                  <span style={{ fontSize: 9, color: "var(--text-dim)" }}>{["D-6","D-5","D-4","D-3","D-2","Ke","Bu"][i]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="ch">
            <h4>TOP-10 Reyting</h4>
            <div style={{ display: "flex", gap: 4 }}>
              {["overall","weekly","monthly"].map(m => (
                <button key={m} className={`btn btn-sm btn-outline ${lbMode === m ? "active" : ""}`}
                  style={lbMode === m ? { borderColor: "var(--border-blue)", color: "var(--blue-light)" } : {}}
                  onClick={() => setLbMode(m)}>
                  {m === "overall" ? "Umumiy" : m === "weekly" ? "Hafta" : "Oy"}
                </button>
              ))}
            </div>
          </div>
          <div className="cb" style={{ padding: "10px 12px", maxHeight: 260, overflowY: "auto" }}>
            {lb.slice(0, 10).map((s, i) => (
              <div key={s.id} className={`lb-item ${s.id === student.id ? "me" : ""}`}>
                <div className="lb-rank">{MEDALS[i] || i + 1}</div>
                <div className="lb-name">{s.name}{s.id === student.id ? <span style={{ fontSize: 10, color: "var(--blue-light)" }}> (Siz)</span> : ""}</div>
                <div className="lb-score">{s.score}🪙</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="card">
        <div className="ch"><h4>So'nggi faollik</h4></div>
        <div className="cb" style={{ padding: "12px 14px" }}>
          {recent.length ? recent.map(t => (
            <div key={t.id} className="ai">
              <span className="at">{t.details}</span>
              <span className={t.amount < 0 ? "acd" : "ac"}>{t.amount > 0 ? "+" : ""}{t.amount} 🪙</span>
            </div>
          )) : <p style={{ color: "var(--text-dim)", textAlign: "center", padding: 14, fontSize: 13 }}>Hozircha faollik yo'q</p>}
        </div>
      </div>
    </div>
  );
}

// ─── LEADERBOARD PAGE ─────────────────────────────────────────────────────────
function LeaderboardPage({ students, txs, curId }) {
  const [mode, setMode] = useState("overall");
  const lb = sorted(students, txs, mode);
  return (
    <div>
      <div className="ph" style={{ marginBottom: 16 }}><h2 style={{ fontFamily: "Rajdhani", fontSize: 22, color: "var(--gold-mid)" }}>Reyting jadvali</h2><p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Barcha talabalar reytingi</p></div>
      <div className="card">
        <div className="ch"><h4>To'liq reyting</h4>
          <div style={{ display: "flex", gap: 4 }}>
            {["overall","weekly","monthly"].map(m => (
              <button key={m} className={`btn btn-sm btn-outline`}
                style={mode === m ? { borderColor: "var(--border-blue)", color: "var(--blue-light)" } : {}}
                onClick={() => setMode(m)}>{m === "overall" ? "Umumiy" : m === "weekly" ? "Haftalik" : "Oylik"}</button>
            ))}
          </div>
        </div>
        <div className="cb" style={{ padding: 8 }}>
          <div className="tw">
            <table>
              <thead><tr><th>#</th><th>Ism</th><th>Tanga</th><th>Daraja</th><th>Nishon</th></tr></thead>
              <tbody>
                {lb.map((s, i) => (
                  <tr key={s.id} style={s.id === curId ? { background: "rgba(43,125,233,.08)" } : {}}>
                    <td style={{ fontFamily: "Rajdhani", fontWeight: 700, color: "var(--text-muted)" }}>{MEDALS[i] || i + 1}</td>
                    <td style={{ fontWeight: s.id === curId ? 700 : 400, color: s.id === curId ? "var(--blue-light)" : "var(--text)" }}>{s.name}{s.id === curId ? " ✓" : ""}</td>
                    <td style={{ fontFamily: "Rajdhani", fontWeight: 700, color: "var(--gold-mid)" }}>{s.score}</td>
                    <td><span className="badge bb">D{LEVEL(s.totalCoins)}</span></td>
                    <td><span className="badge bg">{BADGE_LEVELS(s.totalCoins)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── HISTORY PAGE ─────────────────────────────────────────────────────────────
function HistoryPage({ txs, curId }) {
  const ut = txs.filter(t => t.studentId === curId);
  return (
    <div>
      <div style={{ marginBottom: 16 }}><h2 style={{ fontFamily: "Rajdhani", fontSize: 22, color: "var(--gold-mid)" }}>Faollik tarixi</h2><p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Barcha tangalar va o'zgarishlar</p></div>
      <div className="card"><div className="cb" style={{ padding: "12px 14px" }}>
        {ut.length ? ut.map(t => (
          <div key={t.id} className="ai">
            <div>
              <div className="at">{t.details}</div>
              <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 2 }}>{fmtDate(t.timestamp)}</div>
            </div>
            <span className={t.amount < 0 ? "acd" : "ac"}>{t.amount > 0 ? "+" : ""}{t.amount} 🪙</span>
          </div>
        )) : <p style={{ color: "var(--text-dim)", textAlign: "center", padding: 20 }}>Faollik yo'q</p>}
      </div></div>
    </div>
  );
}

// ─── PROFILE PAGE ─────────────────────────────────────────────────────────────
function ProfilePage({ student, students, txs, onChangePwd }) {
  const wk = earned(student.id, txs, students, "weekly");
  const mo = earned(student.id, txs, students, "monthly");
  const rk = rankOf(student.id, students, txs, "overall");
  return (
    <div>
      <div style={{ marginBottom: 16 }}><h2 style={{ fontFamily: "Rajdhani", fontSize: 22, color: "var(--gold-mid)" }}>Profilim</h2></div>
      <div className="g2">
        <div className="card"><div className="ch"><h4>Ma'lumotlar</h4></div>
          <div className="cb">
            <table style={{ width: "100%", border: "none" }}>
              {[["Ism:", student.name], ["Daraja:", <span className="badge bb">Daraja {LEVEL(student.totalCoins)}</span>],
                ["Nishon:", <span className="badge bg">{BADGE_LEVELS(student.totalCoins)}</span>],
                ["Tanga:", <span style={{ fontFamily: "Rajdhani", fontWeight: 700, fontSize: 16, color: "var(--gold-mid)" }}>{student.totalCoins} 🪙</span>],
                ["Streak:", <span style={{ fontWeight: 700, color: "var(--green)" }}>🔥 {student.streak || 0} kun</span>],
                ["Haftalik:", <span style={{ fontWeight: 700, color: "var(--blue-light)" }}>{wk} 🪙</span>],
                ["Oylik:", <span style={{ fontWeight: 700, color: "var(--blue-light)" }}>{mo} 🪙</span>],
                ["Reyting:", <span style={{ fontWeight: 700, color: "var(--blue-light)" }}>#{rk} / {students.length}</span>]
              ].map(([l, v], i) => (
                <tr key={i}><td style={{ color: "var(--text-dim)", padding: "7px 0", fontSize: 12, width: 100, border: "none" }}>{l}</td>
                  <td style={{ padding: "7px 0", border: "none" }}>{v}</td></tr>
              ))}
            </table>
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 4 }}>
              <button className="btn btn-og btn-sm" onClick={onChangePwd}><i className="fas fa-key" /> Parolni o'zgartirish</button>
            </div>
          </div>
        </div>
        <div className="card"><div className="ch"><h4>Referral kod</h4></div>
          <div className="cb">
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>Do'stingizni taklif qiling!</p>
            <div className="ref-box">
              <p style={{ fontSize: 11, color: "var(--text-dim)" }}>Sizning kodingiz</p>
              <div className="ref-code">{student.refCode || `REF${student.id}`}</div>
              <button className="btn btn-og btn-sm" style={{ marginTop: 8 }}
                onClick={() => navigator.clipboard.writeText(student.refCode || `REF${student.id}`).then(() => {})}>
                <i className="fas fa-copy" /> Nusxalash
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TEACHER DASHBOARD ────────────────────────────────────────────────────────
function TeacherDash({ students, txs }) {
  const tc = txs.reduce((a, b) => a + b.amount, 0);
  const ac = students.filter(s => s.lastDailyDate && (Date.now() - new Date(s.lastDailyDate)) / 864e5 <= 7).length;
  const rc = txs.filter(t => t.reason === "referral").length;
  const top = sorted(students, txs, "overall").slice(0, 5);
  return (
    <div>
      <div style={{ marginBottom: 16 }}><h2 style={{ fontFamily: "Rajdhani", fontSize: 22, color: "var(--gold-mid)" }}>O'qituvchi paneli</h2><p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Umumiy statistika</p></div>
      <div className="srow">
        <div className="sc"><div className="sl">Talabalar</div><div className="sv">{students.length}</div><div className="ss">Jami</div></div>
        <div className="sc"><div className="sl">Berilgan tanga</div><div className="sv">{tc}</div><div className="ss">Jami</div></div>
        <div className="sc gt"><div className="sl">Faol (7 kun)</div><div className="sv">{ac}</div><div className="ss">Talabalar</div></div>
        <div className="sc bt"><div className="sl">Referallar</div><div className="sv">{rc}</div><div className="ss">Jami</div></div>
      </div>
      <div className="card"><div className="ch"><h4>Top talabalar</h4></div>
        <div className="cb" style={{ padding: 10 }}>
          {top.map((s, i) => (
            <div key={s.id} className="lb-item">
              <div className="lb-rank">{MEDALS[i] || i + 1}</div>
              <div className="lb-name">{s.name}</div>
              <div className="lb-score">{s.totalCoins}🪙</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── STUDENTS TABLE ───────────────────────────────────────────────────────────
function StudentsPage({ students, onAdd, onDelete, show }) {
  const [name, setName] = useState("");
  const [showPwds, setShowPwds] = useState({});

  function handleAdd() {
    if (!name.trim()) { show("Ism kiriting!", "error"); return; }
    onAdd(name.trim());
    setName("");
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}><h2 style={{ fontFamily: "Rajdhani", fontSize: 22, color: "var(--gold-mid)" }}>Talabalar ro'yxati</h2></div>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="ch"><h4>Yangi talaba qo'shish</h4></div>
        <div className="cb">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input className="form-control" placeholder="Ism familiya" value={name}
              onChange={e => setName(e.target.value)} style={{ maxWidth: 280, flex: 1 }}
              onKeyDown={e => e.key === "Enter" && handleAdd()} />
            <button className="btn btn-success" onClick={handleAdd}><i className="fas fa-user-plus" /> Qo'shish</button>
          </div>
          <p style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 5 }}>Avtomatik parol yaratiladi</p>
        </div>
      </div>
      <div className="card"><div className="cb" style={{ padding: 8 }}><div className="tw">
        <table>
          <thead><tr><th>#</th><th>Ism</th><th>Tanga</th><th>Daraja</th><th>Parol</th><th>Amal</th></tr></thead>
          <tbody>
            {students.length ? students.map((s, i) => (
              <tr key={s.id}>
                <td>{i + 1}</td>
                <td style={{ fontWeight: 600 }}>{s.name}</td>
                <td style={{ fontFamily: "Rajdhani", fontWeight: 700, color: "var(--gold-mid)" }}>{s.totalCoins}</td>
                <td><span className="badge bb">D{LEVEL(s.totalCoins)}</span></td>
                <td>
                  <code style={{ background: "var(--bg-deep)", padding: "2px 8px", borderRadius: 4, fontSize: 12, border: "1px solid var(--border)" }}>
                    {showPwds[s.id] ? s.password : "••••••"}
                  </code>
                  <button className="btn btn-outline btn-sm" style={{ padding: "3px 7px", marginLeft: 4 }}
                    onClick={() => setShowPwds(p => ({ ...p, [s.id]: !p[s.id] }))}>
                    <i className={`fas fa-${showPwds[s.id] ? "eye-slash" : "eye"}`} />
                  </button>
                  <button className="btn btn-outline btn-sm" style={{ padding: "3px 7px", marginLeft: 4 }}
                    onClick={() => navigator.clipboard.writeText(s.password).then(() => show("Nusxalandi!", "success"))}>
                    <i className="fas fa-copy" />
                  </button>
                </td>
                <td>
                  <button className="btn btn-danger btn-sm" onClick={() => { if (confirm("O'chirilsinmi?")) onDelete(s.id); }}>
                    <i className="fas fa-trash" />
                  </button>
                </td>
              </tr>
            )) : <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--text-dim)", padding: 18 }}>Talabalar yo'q</td></tr>}
          </tbody>
        </table>
      </div></div></div>
    </div>
  );
}

// ─── COINS PAGE ───────────────────────────────────────────────────────────────
function CoinsPage({ students, onGive, onDeduct, show }) {
  const cats = [
    { key: "attendance", label: "Davomat", icon: "fa-book-open", min: 1, max: 5, def: 3 },
    { key: "homework", label: "Uy vazifasi", icon: "fa-tasks", min: 5, max: 10, def: 7 },
    { key: "participation", label: "Faollik", icon: "fa-hand-paper", min: 5, max: 10, def: 8 },
    { key: "referral", label: "Referal", icon: "fa-user-friends", min: 12, max: 20, def: 15 },
  ];
  const [vals, setVals] = useState(() => Object.fromEntries(cats.map(c => [c.key, c.def])));
  const [sels, setSels] = useState(() => Object.fromEntries(cats.map(c => [c.key, students[0]?.id || ""])));
  const [mSel, setMSel] = useState(students[0]?.id || "");
  const [mAmt, setMAmt] = useState("");
  const [mReason, setMReason] = useState("");
  const [dSel, setDSel] = useState(students[0]?.id || "");
  const [dAmt, setDAmt] = useState("");
  const [dReason, setDReason] = useState("");

  return (
    <div>
      <div style={{ marginBottom: 16 }}><h2 style={{ fontFamily: "Rajdhani", fontSize: 22, color: "var(--gold-mid)" }}>Tanga berish tizimi</h2></div>
      <div className="g2" style={{ marginBottom: 14 }}>
        {cats.map(c => (
          <div key={c.key} className="gc">
            <h5><i className={`fas ${c.icon}`} /> {c.label}</h5>
            <div className="rr">
              <input type="range" min={c.min} max={c.max} value={vals[c.key]}
                onChange={e => setVals(p => ({ ...p, [c.key]: Number(e.target.value) }))} />
              <span className="rv">{vals[c.key]}</span>
            </div>
            <select className="form-control" style={{ marginBottom: 8 }} value={sels[c.key]}
              onChange={e => setSels(p => ({ ...p, [c.key]: Number(e.target.value) }))}>
              {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.totalCoins}🪙)</option>)}
            </select>
            <button className="btn btn-blue btn-sm btn-block" onClick={() => { if (!sels[c.key]) { show("Tanlang!", "error"); return; } onGive(sels[c.key], vals[c.key], c.key, c.label); }}>Berish</button>
          </div>
        ))}
      </div>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="ch"><h4>Qo'lda tanga berish</h4></div>
        <div className="cb">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
            <div><label style={{ fontSize: 11, color: "var(--text-dim)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".5px" }}>Talaba</label>
              <select className="form-control" style={{ minWidth: 180 }} value={mSel} onChange={e => setMSel(Number(e.target.value))}>
                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select></div>
            <div><label style={{ fontSize: 11, color: "var(--text-dim)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".5px" }}>Miqdor</label>
              <input type="number" className="form-control" placeholder="Tanga" style={{ width: 90 }} value={mAmt} onChange={e => setMAmt(e.target.value)} min={1} /></div>
            <div style={{ flex: 1, minWidth: 150 }}><label style={{ fontSize: 11, color: "var(--text-dim)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".5px" }}>Sabab</label>
              <input className="form-control" placeholder="Izoh" value={mReason} onChange={e => setMReason(e.target.value)} /></div>
            <button className="btn btn-gold" onClick={() => { if (!mSel || !mAmt || !mReason) { show("To'liq kiriting", "error"); return; } onGive(mSel, Number(mAmt), "manual", mReason); setMAmt(""); setMReason(""); }}>
              <i className="fas fa-coins" /> Berish</button>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="ch"><h4>Tanga ayrish</h4></div>
        <div className="cb">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
            <div><label style={{ fontSize: 11, color: "var(--text-dim)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".5px" }}>Talaba</label>
              <select className="form-control" style={{ minWidth: 180 }} value={dSel} onChange={e => setDSel(Number(e.target.value))}>
                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select></div>
            <div><label style={{ fontSize: 11, color: "var(--text-dim)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".5px" }}>Miqdor</label>
              <input type="number" className="form-control" placeholder="Tanga" style={{ width: 90 }} value={dAmt} onChange={e => setDAmt(e.target.value)} min={1} /></div>
            <div style={{ flex: 1, minWidth: 150 }}><label style={{ fontSize: 11, color: "var(--text-dim)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".5px" }}>Sabab</label>
              <input className="form-control" placeholder="Nima uchun ayirildi" value={dReason} onChange={e => setDReason(e.target.value)} /></div>
            <button className="btn btn-danger" onClick={() => { if (!dSel || !dAmt || !dReason) { show("To'liq kiriting", "error"); return; } onDeduct(dSel, Number(dAmt), dReason); setDAmt(""); setDReason(""); }}>
              <i className="fas fa-minus-circle" /> Ayrish</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [txs, setTxs] = useState([]);
  const [nid, setNid] = useState(1);
  const [curType, setCurType] = useState(null); // "student" | "teacher"
  const [curId, setCurId] = useState(null);
  const [page, setPage] = useState("dpg");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lbMode, setLbMode] = useState("overall");
  const [cpOpen, setCpOpen] = useState(false);
  const [cpOld, setCpOld] = useState("");
  const [cpNew, setCpNew] = useState("");
  const [cpCnf, setCpCnf] = useState("");
  const { toasts, show } = useToast();

  useEffect(() => {
    const d = loadLocal();
    if (d?.students?.length) {
      const sts = d.students.map(s => ({ ...s, id: Number(s.id) }));
      const txList = (d.transactions || []).map(t => ({ ...t, studentId: Number(t.studentId) }));
      setStudents(sts);
      setTxs(txList);
      const maxId = Math.max(...sts.map(s => s.id));
      setNid(Math.max(Number(d.nextStudentId) || 1, maxId + 1));
    } else {
      const def = mkDefault();
      setStudents(def.students);
      setTxs(def.txs);
      setNid(def.nid);
      saveLocal(def.students, def.txs, def.nid);
    }
    setTimeout(() => setLoading(false), 1800);
  }, []);

  function persist(sts, txList, nextId) {
    setStudents(sts); setTxs(txList);
    if (nextId !== undefined) setNid(nextId);
    saveLocal(sts, txList, nextId ?? nid);
  }

  function addCoin(sid, amt, reason, details) {
    const numSid = Number(sid);
    const sts = students.map(s => {
      if (s.id !== numSid) return s;
      const td = new Date().toDateString();
      return { ...s, totalCoins: s.totalCoins + amt, streak: s.lastDailyDate !== td ? (s.streak || 0) + 1 : s.streak, lastDailyDate: td };
    });
    const newTx = { id: Date.now() + Math.random(), studentId: numSid, amount: amt, reason, timestamp: Date.now(), details: details || `${reason} uchun ${amt} tanga` };
    const txList = [newTx, ...txs];
    persist(sts, txList);
  }

  function handleStudentLogin(id) { setCurType("student"); setCurId(id); setPage("dpg"); }
  function handleTeacherLogin() { setCurType("teacher"); setCurId(null); setPage("adpg"); }
  function handleLogout() { setCurType(null); setCurId(null); setSidebarOpen(false); }

  function handleAddStudent(name) {
    const id = nid;
    const s = { id, name, refCode: genRef(id), password: genPass(name), totalCoins: 0, streak: 0, lastDailyDate: null };
    persist([...students, s], txs, nid + 1);
    show(`${name} qo'shildi! Parol: ${s.password}`, "success");
  }
  function handleDeleteStudent(id) {
    const numId = Number(id);
    persist(students.filter(s => s.id !== numId), txs.filter(t => t.studentId !== numId));
    show("O'chirildi", "success");
  }
  function handleGive(sid, amt, reason, label) {
    addCoin(Number(sid), amt, reason, `${label} uchun ${amt} tanga`);
    const sName = students.find(s => s.id === Number(sid))?.name || "Talaba";
    show(`${sName}ga ${amt} tanga berildi!`, "success");
  }
  function handleDeduct(sid, amt, reason) {
    addCoin(Number(sid), -amt, "deduct", `Ayrish: ${reason} (${amt} tanga)`);
    const sName = students.find(s => s.id === Number(sid))?.name || "Talaba";
    show(`${sName}dan ${amt} tanga ayrildi`, "success");
  }
  function handleChangePwd() {
    const s = students.find(x => x.id === curId);
    if (!s) { show("Topilmadi!", "error"); return; }
    if (cpOld !== s.password) { show("Eski parol xato!", "error"); return; }
    if (cpNew.length < 3) { show("Parol kamida 3 belgi", "error"); return; }
    if (cpNew !== cpCnf) { show("Parollar mos emas", "error"); return; }
    const sts = students.map(x => x.id === curId ? { ...x, password: cpNew } : x);
    persist(sts, txs);
    setCpOpen(false); setCpOld(""); setCpNew(""); setCpCnf("");
    show("Parol yangilandi!", "success");
  }

  const curStudent = students.find(s => s.id === curId);

  const PAGE_TITLES = { dpg: "Bosh sahifa", rpg: "Reyting", hpg: "Faollik tarixi", ppg: "Profilim", adpg: "Statistika", stpg: "Talabalar", cpg: "Tanga berish" };

  if (loading) return (
    <div className="loading">
      <style>{css}</style>
      <div style={{ fontSize: 64, marginBottom: 8, animation: "pulse 2s ease-in-out infinite" }}>👨‍💻</div>
      <div className="load-title">Teacher_texno</div>
      <div className="load-sub">Valiyev Omadbek · IT Instructor</div>
      <div className="load-bar"><div className="load-fill" /></div>
    </div>
  );

  if (!curType) return (
    <>
      <style>{css}</style>
      <LoginScreen students={students} onStudentLogin={handleStudentLogin} onTeacherLogin={handleTeacherLogin} />
    </>
  );

  return (
    <>
      <style>{css}</style>
      <Toasts toasts={toasts} />

      {/* Change Password Modal */}
      <Modal open={cpOpen} title={<><i className="fas fa-key" style={{ color: "var(--gold)", marginRight: 8 }} />Parolni o'zgartirish</>}
        onClose={() => setCpOpen(false)}
        footer={<>
          <button className="btn btn-outline btn-sm" onClick={() => setCpOpen(false)}>Bekor</button>
          <button className="btn btn-blue btn-sm" onClick={handleChangePwd}><i className="fas fa-save" /> Saqlash</button>
        </>}>
        <div className="form-group"><label>Joriy parol</label><input type="password" className="form-control" value={cpOld} onChange={e => setCpOld(e.target.value)} /></div>
        <div className="form-group"><label>Yangi parol</label><input type="password" className="form-control" value={cpNew} onChange={e => setCpNew(e.target.value)} /></div>
        <div className="form-group"><label>Takrorlang</label><input type="password" className="form-control" value={cpCnf} onChange={e => setCpCnf(e.target.value)} /></div>
      </Modal>

      <div className="app-shell">
        <div className={`sb-bg ${sidebarOpen ? "open" : ""}`} onClick={() => setSidebarOpen(false)} />
        <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="sb-brand">
            <div className="sb-brand-row">
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,var(--gold-dark),var(--blue))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0, border: "1.5px solid var(--gold)" }}>👨‍💻</div>
              <div className="sb-txt"><h2>Teacher_texno</h2><span>IT Instructor</span></div>
            </div>
          </div>
          <div className="sb-user">
            <div className="u-av">{curType === "teacher" ? "OQ" : curStudent?.name.slice(0, 2).toUpperCase() || "?"}</div>
            <div>
              <div className="u-nm">{curType === "teacher" ? "O'qituvchi" : curStudent?.name || "-"}</div>
              <div className="u-role">{curType === "teacher" ? "Administrator" : `${BADGE_LEVELS(curStudent?.totalCoins || 0)} · D${LEVEL(curStudent?.totalCoins || 0)}`}</div>
            </div>
          </div>
          <nav className="app-nav">
            {curType === "student" ? <>
              <div className="nav-sec">Mening sahifam</div>
              {[["dpg", "fa-th-large", "Bosh sahifa"], ["rpg", "fa-trophy", "Reyting"], ["hpg", "fa-history", "Faollik tarixi"]].map(([p, ic, lbl]) => (
                <div key={p} className={`nav-item ${page === p ? "active" : ""}`} onClick={() => { setPage(p); setSidebarOpen(false); }}>
                  <i className={`fas ${ic}`} /> {lbl}
                </div>
              ))}
              <div className="nav-sec">Profil</div>
              <div className={`nav-item ${page === "ppg" ? "active" : ""}`} onClick={() => { setPage("ppg"); setSidebarOpen(false); }}>
                <i className="fas fa-user-circle" /> Profilim
              </div>
            </> : <>
              <div className="nav-sec">Boshqaruv</div>
              {[["adpg", "fa-chart-bar", "Statistika"], ["stpg", "fa-users", "Talabalar"], ["cpg", "fa-coins", "Tanga berish"]].map(([p, ic, lbl]) => (
                <div key={p} className={`nav-item ${page === p ? "active" : ""}`} onClick={() => { setPage(p); setSidebarOpen(false); }}>
                  <i className={`fas ${ic}`} /> {lbl}
                </div>
              ))}
            </>}
          </nav>
          <div className="sb-footer">
            <button className="btn btn-outline btn-sm" style={{ width: "100%", justifyContent: "center", borderColor: "var(--border-gold)", color: "var(--text-muted)" }} onClick={handleLogout}>
              <i className="fas fa-sign-out-alt" /> Chiqish
            </button>
          </div>
        </aside>

        <div className="main-content">
          <div className="topbar">
            <button className="sb-toggle" onClick={() => setSidebarOpen(p => !p)}><i className="fas fa-bars" /></button>
            <div className="tb-title">{PAGE_TITLES[page] || ""}</div>
            <div className="tb-right">
              {curType === "student" && curStudent && <>
                <div className="top-badge tb-gold">🪙 {curStudent.totalCoins}</div>
                <div className="top-badge tb-blue">🔥 {curStudent.streak || 0}</div>
              </>}
            </div>
          </div>
          <div className="pc">
            {curType === "student" && curStudent && page === "dpg" && <StudentDash student={curStudent} students={students} txs={txs} lbMode={lbMode} setLbMode={setLbMode} />}
            {curType === "student" && page === "rpg" && <LeaderboardPage students={students} txs={txs} curId={curId} />}
            {curType === "student" && page === "hpg" && <HistoryPage txs={txs} curId={curId} />}
            {curType === "student" && curStudent && page === "ppg" && <ProfilePage student={curStudent} students={students} txs={txs} onChangePwd={() => setCpOpen(true)} />}
            {curType === "teacher" && page === "adpg" && <TeacherDash students={students} txs={txs} />}
            {curType === "teacher" && page === "stpg" && <StudentsPage students={students} onAdd={handleAddStudent} onDelete={handleDeleteStudent} show={show} />}
            {curType === "teacher" && page === "cpg" && <CoinsPage students={students} onGive={handleGive} onDeduct={handleDeduct} show={show} />}
          </div>
        </div>
      </div>
    </>
  );
}
