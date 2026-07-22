"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Check, ChevronRight, CircleDollarSign, LogOut, Menu, Pencil, Sparkles, Target, UserRound, X } from "lucide-react";
import { api, getTokens, Person, Profile, setTokens } from "../lib/api";

const emptyProfile: Profile = {
  preferred_name: "", occupation: "", city: "", timezone: "", life_stage: "",
  priorities: [], routines: [], goals: [], support_preferences: [], additional_context: "",
};

const priorityOptions = ["Mi familia", "Mi salud", "Mi carrera", "Mis finanzas", "Mi tiempo", "Aprender", "Viajar", "Crear"];
const supportOptions = ["Recordarme lo importante", "Ayudarme a priorizar", "Detectar patrones", "Cuidar mis gastos", "Planear con anticipación", "Hacerme preguntas útiles"];

export default function Home() {
  const [view, setView] = useState<"loading" | "login" | "onboarding" | "dashboard">("loading");
  const [person, setPerson] = useState<Person | null>(null);
  const [dashboard, setDashboard] = useState<unknown[]>([]);
  const [editing, setEditing] = useState(false);

  async function load() {
    try {
      const next = await api.me();
      setPerson(next);
      if (next.onboarding_completed) {
        setView("dashboard");
        setDashboard(await api.dashboard());
      } else setView("onboarding");
    } catch { setTokens(null); setView("login"); }
  }

  useEffect(() => { if (getTokens()) void load(); else setView("login"); }, []);

  if (view === "loading") return <Loading />;
  if (view === "login") return <Login onSuccess={load} />;
  if (view === "onboarding" && person) return <Onboarding person={person} onComplete={(next) => { setPerson(next); setView("dashboard"); void api.dashboard().then(setDashboard); }} />;
  if (!person) return null;
  return <Dashboard person={person} data={dashboard} editing={editing} setEditing={setEditing} onSaved={setPerson} onLogout={() => { setTokens(null); setView("login"); }} />;
}

function Mark() { return <div className="mark"><span /><i /><b /></div>; }

function Loading() { return <main className="loading"><Mark /><p>Preparando tu Nexo…</p></main>; }

function Login({ onSuccess }: { onSuccess: () => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try { const result = await api.login(email, password); setTokens(result.tokens); await onSuccess(); }
    catch (err) { setError(err instanceof Error ? err.message : "No pudimos iniciar sesión"); }
    finally { setBusy(false); }
  }
  return <main className="login-page">
    <section className="login-story">
      <nav><div className="brand"><Mark /><span>Nexo</span></div><span className="eyebrow light">TU VIDA, EN CONTEXTO</span></nav>
      <div className="story-copy"><span className="story-number">01 / TU ESPACIO PERSONAL</span><h1>Todo lo que eres,<br /><em>en un solo lugar.</em></h1><p>Nexo conecta tus planes, tu dinero y tus prioridades para ayudarte de una forma que realmente se sienta tuya.</p></div>
      <div className="quote"><Sparkles size={18}/><span>Cuanto mejor te conoce Nexo,<br/>mejor puede acompañarte.</span></div>
    </section>
    <section className="login-panel"><div className="login-box"><span className="eyebrow">BIENVENIDO DE NUEVO</span><h2>Entra a tu espacio</h2><p>Usa la misma cuenta que ya tienes en la app.</p>
      <form onSubmit={submit}><label>Correo electrónico<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" autoComplete="email" /></label><label>Contraseña<input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" /></label>{error && <p className="form-error">{error}</p>}<button className="primary" disabled={busy}>{busy ? "Entrando…" : <>Entrar a Nexo <ArrowRight size={18}/></>}</button></form>
      <p className="privacy">Tus datos se sincronizan de forma segura con tu cuenta de Nexo.</p></div>
    </section>
  </main>;
}

function Onboarding({ person, onComplete }: { person: Person; onComplete: (p: Person) => void }) {
  const [step, setStep] = useState(0); const [profile, setProfile] = useState<Profile>({ ...emptyProfile, ...person.profile, preferred_name: person.profile.preferred_name || person.user.name.split(" ")[0], timezone: person.profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone }); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const steps = ["Sobre ti", "Lo que importa", "Cómo ayudarte"];
  const toggle = (key: "priorities" | "support_preferences", value: string) => setProfile((p) => ({ ...p, [key]: p[key].includes(value) ? p[key].filter((x) => x !== value) : [...p[key], value] }));
  async function finish() { setBusy(true); setError(""); try { onComplete(await api.updateProfile(profile, true)); } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar"); setBusy(false); } }
  return <main className="onboarding-page"><header className="simple-nav"><div className="brand"><Mark/><span>Nexo</span></div><div className="steps">{steps.map((label, i) => <div className={i <= step ? "active" : ""} key={label}><span>{i < step ? <Check size={13}/> : i + 1}</span>{label}</div>)}</div><span className="secure">Guardado seguro</span></header>
    <div className="onboarding-shell"><aside><span className="eyebrow">ANTES DE EMPEZAR</span><h1>{step === 0 ? <>Queremos conocerte,<br/><em>no encasillarte.</em></> : step === 1 ? <>Tu vida tiene<br/><em>sus propias prioridades.</em></> : <>Elige cómo quieres<br/><em>que Nexo te acompañe.</em></>}</h1><p>{step === 0 ? "Un poco de contexto nos ayuda a darte respuestas más relevantes desde el primer día." : step === 1 ? "No hay respuestas correctas. Selecciona lo que hoy ocupa más espacio en tu vida." : "Tú decides el tipo de ayuda que se siente útil y cuándo recibirla."}</p><div className="privacy-note">Esta información es privada y siempre podrás editarla.</div></aside>
      <section className="form-card"><div className="step-label">PASO {step + 1} DE 3</div>
        {step === 0 && <><h2>Empecemos por lo esencial</h2><div className="two-col"><label>¿Cómo te gusta que te llamen?<input value={profile.preferred_name} onChange={(e) => setProfile({...profile, preferred_name: e.target.value})} placeholder="Tu nombre" /></label><label>¿En qué ciudad vives?<input value={profile.city} onChange={(e) => setProfile({...profile, city: e.target.value})} placeholder="Monterrey, N.L." /></label></div><label>¿A qué dedicas la mayor parte de tu tiempo?<input value={profile.occupation} onChange={(e) => setProfile({...profile, occupation: e.target.value})} placeholder="Ej. Dirijo un negocio, estudio y trabajo…" /></label><label>¿Cómo describirías tu momento de vida?<textarea value={profile.life_stage} onChange={(e) => setProfile({...profile, life_stage: e.target.value})} placeholder="Ej. Estoy construyendo estabilidad y quiero tener más tiempo para mí…" /></label></>}
        {step === 1 && <><h2>¿Qué es importante para ti ahora?</h2><p className="helper">Elige todas las que apliquen.</p><div className="choice-grid">{priorityOptions.map((x) => <button type="button" className={profile.priorities.includes(x) ? "selected" : ""} onClick={() => toggle("priorities", x)} key={x}>{x}<span>{profile.priorities.includes(x) && <Check size={15}/>}</span></button>)}</div><label>¿Qué metas tienes en mente?<textarea value={profile.goals.join("\n")} onChange={(e) => setProfile({...profile, goals: e.target.value.split("\n").filter(Boolean)})} placeholder={'Una meta por línea\nEj. Crear un fondo de emergencia\nEj. Hacer ejercicio tres veces por semana'} /></label></>}
        {step === 2 && <><h2>¿Cómo puede ayudarte Nexo?</h2><p className="helper">Podrás cambiar esto cuando quieras.</p><div className="choice-list">{supportOptions.map((x) => <button type="button" className={profile.support_preferences.includes(x) ? "selected" : ""} onClick={() => toggle("support_preferences", x)} key={x}><span>{profile.support_preferences.includes(x) && <Check size={15}/>}</span>{x}</button>)}</div><label>Algo más que te gustaría que Nexo supiera<textarea value={profile.additional_context} onChange={(e) => setProfile({...profile, additional_context: e.target.value})} placeholder="Preferencias, responsabilidades, personas importantes o cualquier contexto que ayude…" /></label></>}
        {error && <p className="form-error">{error}</p>}<div className="form-actions">{step > 0 && <button className="text-button" onClick={() => setStep(step - 1)}>Atrás</button>}<button className="primary" disabled={busy || (step === 0 && !profile.preferred_name)} onClick={() => step < 2 ? setStep(step + 1) : void finish()}>{busy ? "Guardando…" : step < 2 ? <>Continuar <ChevronRight size={18}/></> : <>Entrar a mi Nexo <ArrowRight size={18}/></>}</button></div>
      </section></div>
  </main>;
}

function Dashboard({ person, data, editing, setEditing, onSaved, onLogout }: { person: Person; data: unknown[]; editing: boolean; setEditing: (x:boolean)=>void; onSaved:(p:Person)=>void; onLogout:()=>void }) {
  const finance = (data[0] ?? {}) as Record<string, unknown>; const tasks = Array.isArray(data[1]) ? data[1] : []; const events = Array.isArray(data[2]) ? data[2] : []; const subs = Array.isArray(data[3]) ? data[3] : [];
  const completeness = useMemo(() => Math.round(Object.values(person.profile).filter((x) => Array.isArray(x) ? x.length : Boolean(x)).length / Object.keys(person.profile).length * 100), [person]);
  return <main className="dashboard-page"><aside className="sidebar"><div className="brand"><Mark/><span>Nexo</span></div><nav><a className="active"><UserRound size={18}/>Mi contexto</a><a><Target size={18}/>Objetivos</a><a><CalendarDays size={18}/>Actividad</a><a><CircleDollarSign size={18}/>Finanzas</a></nav><button className="logout" onClick={onLogout}><LogOut size={17}/>Cerrar sesión</button></aside>
    <section className="content"><header><div><span className="eyebrow">TU ESPACIO PERSONAL</span><h1>Hola, {person.profile.preferred_name || person.user.name.split(" ")[0]}.</h1><p>Esto es lo que Nexo sabe de ti y usa para darte mejores respuestas.</p></div><button className="edit" onClick={() => setEditing(true)}><Pencil size={16}/>Editar mi contexto</button></header>
      <div className="context-score"><div><Sparkles size={21}/><div><strong>Tu contexto está al {completeness}%</strong><p>Agrega detalles cuando quieras para que Nexo sea cada vez más útil.</p></div></div><div className="progress"><i style={{width:`${completeness}%`}}/></div></div>
      <div className="dashboard-grid"><article className="profile-card"><span className="card-kicker">SOBRE TI</span><h2>{person.profile.occupation || "Cuéntanos a qué te dedicas"}</h2><p>{person.profile.life_stage || "Aún no has descrito tu momento actual."}</p><div className="meta"><span>{person.profile.city || "Sin ciudad"}</span><span>{person.user.email}</span></div></article>
        <article><span className="card-kicker">LO QUE MÁS TE IMPORTA</span><div className="tags">{person.profile.priorities.length ? person.profile.priorities.map(x=><span key={x}>{x}</span>) : <p>Agrega tus prioridades.</p>}</div></article>
        <article><span className="card-kicker">TUS METAS</span><ul>{person.profile.goals.length ? person.profile.goals.map(x=><li key={x}><span/><p>{x}</p></li>) : <li><p>Aún no hay metas registradas.</p></li>}</ul></article>
        <article><span className="card-kicker">PANORAMA DE HOY</span><div className="stats"><div><strong>{tasks.length}</strong><span>tareas</span></div><div><strong>{events.length}</strong><span>eventos</span></div><div><strong>{subs.length}</strong><span>suscripciones</span></div></div><p className="muted">{typeof finance.available_balance === "number" ? `Disponible: $${finance.available_balance.toLocaleString("es-MX")}` : "Tus datos se sincronizan con la app."}</p></article>
      </div>
    </section>{editing && <ProfileEditor person={person} onClose={() => setEditing(false)} onSaved={(p)=>{onSaved(p);setEditing(false);}} />}
  </main>;
}

function ProfileEditor({ person, onClose, onSaved }: { person: Person; onClose:()=>void; onSaved:(p:Person)=>void }) {
  const [profile, setProfile] = useState(person.profile); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  async function save(){setBusy(true);setError("");try{onSaved(await api.updateProfile(profile));}catch(e){setError(e instanceof Error?e.message:"No se pudo guardar");setBusy(false)}}
  return <div className="modal-backdrop"><div className="editor"><header><div><span className="eyebrow">MI CONTEXTO</span><h2>Editar lo que Nexo sabe de mí</h2></div><button onClick={onClose} aria-label="Cerrar"><X/></button></header><div className="editor-body"><div className="two-col"><label>Nombre preferido<input value={profile.preferred_name} onChange={e=>setProfile({...profile,preferred_name:e.target.value})}/></label><label>Ciudad<input value={profile.city} onChange={e=>setProfile({...profile,city:e.target.value})}/></label></div><label>Ocupación<input value={profile.occupation} onChange={e=>setProfile({...profile,occupation:e.target.value})}/></label><label>Momento de vida<textarea value={profile.life_stage} onChange={e=>setProfile({...profile,life_stage:e.target.value})}/></label><label>Metas (una por línea)<textarea value={profile.goals.join("\n")} onChange={e=>setProfile({...profile,goals:e.target.value.split("\n").filter(Boolean)})}/></label><label>Contexto adicional<textarea value={profile.additional_context} onChange={e=>setProfile({...profile,additional_context:e.target.value})}/></label>{error&&<p className="form-error">{error}</p>}</div><footer><button className="text-button" onClick={onClose}>Cancelar</button><button className="primary" onClick={()=>void save()} disabled={busy}>{busy?"Guardando…":"Guardar cambios"}</button></footer></div></div>;
}
