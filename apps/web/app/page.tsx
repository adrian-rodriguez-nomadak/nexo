"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronRight, CircleDollarSign, Clock3, LogOut, Pencil, Sparkles, Target, UserRound, WalletCards, X } from "lucide-react";
import { api, DashboardData, getTokens, Person, Profile, setTokens } from "../lib/api";

const emptyProfile: Profile = {
  preferred_name: "", occupation: "", city: "", timezone: "", life_stage: "",
  priorities: [], routines: [], goals: [], support_preferences: [], additional_context: "",
};

const priorityOptions = ["Mi familia", "Mi salud", "Mi carrera", "Mis finanzas", "Mi tiempo", "Aprender", "Viajar", "Crear"];
const supportOptions = ["Recordarme lo importante", "Ayudarme a priorizar", "Detectar patrones", "Cuidar mis gastos", "Planear con anticipación", "Hacerme preguntas útiles"];

export default function Home() {
  const [view, setView] = useState<"loading" | "login" | "onboarding" | "dashboard">("loading");
  const [person, setPerson] = useState<Person | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData>({ finance: null, tasks: [], events: [], subscriptions: [], movements: [], payments: [] });
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

function Dashboard({ person, data, editing, setEditing, onSaved, onLogout }: { person: Person; data: DashboardData; editing: boolean; setEditing: (x:boolean)=>void; onSaved:(p:Person)=>void; onLogout:()=>void }) {
  const [section, setSection] = useState<"context"|"goals"|"activity"|"finances">("context");
  const completeness = useMemo(() => Math.round(Object.values(person.profile).filter((x) => Array.isArray(x) ? x.length : Boolean(x)).length / Object.keys(person.profile).length * 100), [person]);
  return <main className="dashboard-page"><aside className="sidebar"><div className="brand"><Mark/><span>Nexo</span></div><nav><button className={section==="context"?"active":""} onClick={()=>setSection("context")}><UserRound size={18}/>Mi contexto</button><button className={section==="goals"?"active":""} onClick={()=>setSection("goals")}><Target size={18}/>Objetivos</button><button className={section==="activity"?"active":""} onClick={()=>setSection("activity")}><CalendarDays size={18}/>Actividad</button><button className={section==="finances"?"active":""} onClick={()=>setSection("finances")}><CircleDollarSign size={18}/>Finanzas</button></nav><button className="logout" onClick={onLogout}><LogOut size={17}/>Cerrar sesión</button></aside>
    <section className="content">{section === "context" && <><header><div><span className="eyebrow">TU ESPACIO PERSONAL</span><h1>Hola, {person.profile.preferred_name || person.user.name.split(" ")[0]}.</h1><p>Esto es lo que Nexo sabe de ti y usa para darte mejores respuestas.</p></div><button className="edit" onClick={() => setEditing(true)}><Pencil size={16}/>Editar mi contexto</button></header>
      <div className="context-score"><div><Sparkles size={21}/><div><strong>Tu contexto está al {completeness}%</strong><p>Agrega detalles cuando quieras para que Nexo sea cada vez más útil.</p></div></div><div className="progress"><i style={{width:`${completeness}%`}}/></div></div>
      <div className="dashboard-grid"><article className="profile-card"><span className="card-kicker">SOBRE TI</span><h2>{person.profile.occupation || "Cuéntanos a qué te dedicas"}</h2><p>{person.profile.life_stage || "Aún no has descrito tu momento actual."}</p><div className="meta"><span>{person.profile.city || "Sin ciudad"}</span><span>{person.user.email}</span></div></article>
        <article><span className="card-kicker">LO QUE MÁS TE IMPORTA</span><div className="tags">{person.profile.priorities.length ? person.profile.priorities.map(x=><span key={x}>{x}</span>) : <p>Agrega tus prioridades.</p>}</div></article>
        <article><span className="card-kicker">TUS METAS</span><ul>{person.profile.goals.length ? person.profile.goals.map(x=><li key={x}><span/><p>{x}</p></li>) : <li><p>Aún no hay metas registradas.</p></li>}</ul></article>
        <article><span className="card-kicker">PANORAMA DE HOY</span><div className="stats"><div><strong>{data.tasks.length}</strong><span>tareas</span></div><div><strong>{data.events.length}</strong><span>eventos</span></div><div><strong>{data.subscriptions.length}</strong><span>suscripciones</span></div></div><p className="muted">{data.finance ? `Disponible real: ${money(data.finance.availableReal, person.user.currency)}` : "Tus datos se sincronizan con la app."}</p></article>
      </div></>}
      {section === "goals" && <GoalsView person={person} onEdit={()=>setEditing(true)}/>}
      {section === "activity" && <ActivityView data={data}/>}
      {section === "finances" && <FinancesView data={data} currency={person.user.currency}/>}
    </section>{editing && <ProfileEditor person={person} onClose={() => setEditing(false)} onSaved={(p)=>{onSaved(p);setEditing(false);}} />}
  </main>;
}

function money(value: number | string, currency = "MXN") { return new Intl.NumberFormat("es-MX", { style:"currency", currency, maximumFractionDigits:2 }).format(Number(value ?? 0)); }
function dateLabel(value?: string) { if(!value) return "Sin fecha"; return new Intl.DateTimeFormat("es-MX", { day:"numeric", month:"short", year:"numeric" }).format(new Date(`${value.slice(0,10)}T12:00:00`)); }

function SectionHeader({ kicker, title, copy }: { kicker:string; title:string; copy:string }) { return <header className="section-header"><div><span className="eyebrow">{kicker}</span><h1>{title}</h1><p>{copy}</p></div></header>; }

function GoalsView({ person, onEdit }: {person:Person; onEdit:()=>void}) { return <><SectionHeader kicker="TU DIRECCIÓN" title="Objetivos y prioridades" copy="El mapa personal que Nexo usa para ayudarte a decidir qué merece tu atención."/><div className="wide-grid"><article className="goals-hero"><span className="card-kicker">LO IMPORTANTE AHORA</span><h2>{person.profile.goals.length ? `${person.profile.goals.length} metas en tu horizonte` : "Tu siguiente capítulo empieza aquí"}</h2><p>{person.profile.life_stage || "Describe tu momento de vida para conectar tus decisiones con un propósito más claro."}</p><button className="light-action" onClick={onEdit}><Pencil size={15}/>Actualizar objetivos</button></article><article className="goal-list"><span className="card-kicker">METAS PERSONALES</span>{person.profile.goals.length ? person.profile.goals.map((goal,i)=><div className="goal-row" key={goal}><span>{String(i+1).padStart(2,"0")}</span><p>{goal}</p></div>) : <Empty title="No hay metas registradas" copy="Agrega metas concretas para que Nexo pueda relacionarlas con tu agenda y tus finanzas."/>}</article><article><span className="card-kicker">PRIORIDADES</span><div className="priority-cloud">{person.profile.priorities.map((x,i)=><span className={i===0?"major":""} key={x}>{x}</span>)}{!person.profile.priorities.length&&<p className="muted">Aún no has elegido prioridades.</p>}</div></article><article><span className="card-kicker">CÓMO QUIERES RECIBIR AYUDA</span><div className="support-list">{person.profile.support_preferences.map(x=><p key={x}><Check size={14}/>{x}</p>)}{!person.profile.support_preferences.length&&<p className="muted">Configura cómo quieres que Nexo te acompañe.</p>}</div></article></div></>; }

function ActivityView({data}:{data:DashboardData}) { const pending=data.tasks.filter(x=>x.status!=="completed"&&x.status!=="done"); const upcoming=[...data.events].sort((a,b)=>a.start_at.localeCompare(b.start_at)); return <><SectionHeader kicker="TU RITMO" title="Agenda y actividad" copy="Una lectura clara de lo próximo, lo pendiente y lo que ya está en movimiento."/><div className="activity-summary"><div><strong>{pending.length}</strong><span>tareas pendientes</span></div><div><strong>{upcoming.length}</strong><span>eventos registrados</span></div><div><strong>{pending.filter(x=>x.priority==="high").length}</strong><span>prioridades altas</span></div></div><div className="split-list"><article><span className="card-kicker">PRÓXIMOS EVENTOS</span>{upcoming.length?upcoming.slice(0,8).map(event=><div className="timeline-row" key={event.id}><div className="date-tile"><strong>{new Date(event.start_at).getDate()}</strong><span>{new Intl.DateTimeFormat("es-MX",{month:"short"}).format(new Date(event.start_at))}</span></div><div><h3>{event.title}</h3><p><Clock3 size={13}/>{new Intl.DateTimeFormat("es-MX",{hour:"numeric",minute:"2-digit"}).format(new Date(event.start_at))}{event.location_name?` · ${event.location_name}`:""}</p></div><span className="status-pill">{event.status}</span></div>):<Empty title="Tu agenda está libre" copy="Los eventos que agregues en la app aparecerán aquí."/>}</article><article><span className="card-kicker">TAREAS</span>{pending.length?pending.slice(0,10).map(task=><div className="task-row" key={task.id}><span className={`priority-dot ${task.priority}`}/><div><h3>{task.title}</h3><p>{dateLabel(task.due_date)} · {task.priority}</p></div></div>):<Empty title="Todo al día" copy="No tienes tareas pendientes en este momento."/>}</article></div></>; }

function FinancesView({data,currency}:{data:DashboardData;currency:string}) { const f=data.finance; const monthly=data.subscriptions.filter(x=>x.status==="active").reduce((sum,x)=>sum+Number(x.amount),0); return <><SectionHeader kicker="TU DINERO" title="Panorama financiero" copy="Ingresos, gastos y compromisos reunidos para entender lo que realmente tienes disponible."/><div className="money-cards"><article className="balance-card"><span>DISPONIBLE REAL</span><strong>{money(f?.availableReal??0,currency)}</strong><p>Después de gastos y próximos pagos</p></article><article><ArrowDownLeft/><span>INGRESOS</span><strong>{money(f?.totalIncome??0,currency)}</strong></article><article><ArrowUpRight/><span>GASTOS</span><strong>{money(f?.totalExpenses??0,currency)}</strong></article><article><WalletCards/><span>SUSCRIPCIONES</span><strong>{money(monthly,currency)}</strong></article></div><div className="split-list finance-lists"><article><span className="card-kicker">MOVIMIENTOS RECIENTES</span>{data.movements.length?data.movements.slice(0,10).map(item=><div className="movement-row" key={item.id}><span className={item.type}><>{item.type==="income"?<ArrowDownLeft size={16}/>:<ArrowUpRight size={16}/>}</></span><div><h3>{item.description|| (item.type==="income"?"Ingreso":"Gasto")}</h3><p>{dateLabel(item.movement_date)}{item.payment_method?` · ${item.payment_method}`:""}</p></div><strong className={item.type}>{item.type==="income"?"+":"−"}{money(item.amount,currency)}</strong></div>):<Empty title="Sin movimientos" copy="Tus ingresos y gastos de la app aparecerán aquí."/>}</article><article><span className="card-kicker">PRÓXIMOS COMPROMISOS</span>{data.payments.filter(x=>x.status==="pending").length?data.payments.filter(x=>x.status==="pending").slice(0,8).map(item=><div className="payment-row" key={item.id}><div><h3>{item.name}</h3><p>{dateLabel(item.due_date)}{item.category?` · ${item.category}`:""}</p></div><strong>{money(item.amount,currency)}</strong></div>):<Empty title="Sin pagos pendientes" copy="No hay compromisos próximos registrados."/>}</article></div></>; }

function Empty({title,copy}:{title:string;copy:string}) { return <div className="empty-block"><Sparkles size={20}/><h3>{title}</h3><p>{copy}</p></div>; }

function ProfileEditor({ person, onClose, onSaved }: { person: Person; onClose:()=>void; onSaved:(p:Person)=>void }) {
  const [profile, setProfile] = useState(person.profile); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  async function save(){setBusy(true);setError("");try{onSaved(await api.updateProfile(profile));}catch(e){setError(e instanceof Error?e.message:"No se pudo guardar");setBusy(false)}}
  return <div className="modal-backdrop"><div className="editor"><header><div><span className="eyebrow">MI CONTEXTO</span><h2>Editar lo que Nexo sabe de mí</h2></div><button onClick={onClose} aria-label="Cerrar"><X/></button></header><div className="editor-body"><div className="two-col"><label>Nombre preferido<input value={profile.preferred_name} onChange={e=>setProfile({...profile,preferred_name:e.target.value})}/></label><label>Ciudad<input value={profile.city} onChange={e=>setProfile({...profile,city:e.target.value})}/></label></div><label>Ocupación<input value={profile.occupation} onChange={e=>setProfile({...profile,occupation:e.target.value})}/></label><label>Momento de vida<textarea value={profile.life_stage} onChange={e=>setProfile({...profile,life_stage:e.target.value})}/></label><label>Metas (una por línea)<textarea value={profile.goals.join("\n")} onChange={e=>setProfile({...profile,goals:e.target.value.split("\n").filter(Boolean)})}/></label><label>Contexto adicional<textarea value={profile.additional_context} onChange={e=>setProfile({...profile,additional_context:e.target.value})}/></label>{error&&<p className="form-error">{error}</p>}</div><footer><button className="text-button" onClick={onClose}>Cancelar</button><button className="primary" onClick={()=>void save()} disabled={busy}>{busy?"Guardando…":"Guardar cambios"}</button></footer></div></div>;
}
