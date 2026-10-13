import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Routes, Route, Link, NavLink, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { Activity, ArrowDownRight, ArrowRight, Bell, Check, CheckCircle2, ChevronDown, Clock3, Droplet, HeartPulse, Hospital, LayoutDashboard, LogOut, MapPin, Menu, Plus, ShieldCheck, Users, X, AlertTriangle, CircleHelp, Phone, Filter } from 'lucide-react';
import { io } from 'socket.io-client';
import { api, SOCKET_URL } from './api.js';

const VAPID_PUBLIC_KEY_URL = '/notifications/vapid-public-key';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const raw = window.atob(base64);

  return Uint8Array.from(raw, char => char.charCodeAt(0));
}

function EnablePushNotifications() {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  async function enablePush() {
    setBusy(true);
    setStatus('');

    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Push notifications are not supported in this browser.');
      }

      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        throw new Error('Please allow notifications in your browser settings.');
      }

      const registration = await navigator.serviceWorker.ready;
      const keyResponse = await api(VAPID_PUBLIC_KEY_URL);
      const publicKey = keyResponse.publicKey;

      if (!publicKey) {
        throw new Error('The push notification public key is missing.');
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      await api('/notifications/subscribe', {
        method: 'POST',
        body: JSON.stringify(subscription)
      });

      setStatus('Push notifications enabled successfully.');
    } catch (error) {
      setStatus(error.message || 'Could not enable notifications.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel" style={{ marginBottom: 20 }}>
      <h2>Phone notifications</h2>
      <p>Enable browser push notifications for urgent blood requests.</p>
      <button className="btn btn-primary" onClick={enablePush} disabled={busy}>
        {busy ? 'Enabling…' : 'Enable push notifications'}
      </button>
      {status && <p role="status">{status}</p>}
    </section>
  );
}


const C = createContext(null);
const GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
function useAuth() { return useContext(C); }
function App() {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('bb_user') || 'null'); } catch { return null; } });
  const [toast, setToast] = useState('');
  const navigate = useNavigate();
  const logout = () => { localStorage.removeItem('bb_token'); localStorage.removeItem('bb_user'); setUser(null); navigate('/'); };
  const signIn = data => { localStorage.setItem('bb_token', data.token); localStorage.setItem('bb_user', JSON.stringify(data.user)); setUser(data.user); };
  useEffect(() => {
    if (!user?.id) return;
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socket.on('connect', () => socket.emit('authenticate', user.id));
    socket.on('notification:new', n => { setToast(n.title + ' — ' + n.message); setTimeout(() => setToast(''), 6500); });
    return () => socket.disconnect();
  }, [user?.id]);
  const value = useMemo(() => ({ user, signIn, logout, refreshUser: async () => { const d = await api('/auth/me'); setUser(d.user); localStorage.setItem('bb_user', JSON.stringify(d.user)); } }), [user]);
  return <C.Provider value={value}><div className="app-shell"><Header />{toast && <button className="live-toast" onClick={() => { setToast(''); navigate('/notifications'); }}><span className="toast-icon"><Bell size={17}/></span><span>{toast}</span><X size={16}/></button>}<Routes>
    <Route path="/" element={user ? <Navigate to="/dashboard" replace/> : <Landing/>}/>
    <Route path="/login" element={user ? <Navigate to="/dashboard" replace/> : <AuthPage mode="login"/>}/>
    <Route path="/register" element={user ? <Navigate to="/dashboard" replace/> : <AuthPage mode="register"/>}/>
    <Route path="/dashboard" element={<Protected><Dashboard/></Protected>}/>
    <Route path="/requests/new" element={<Protected role="hospital"><NewRequest/></Protected>}/>
    <Route path="/requests/:id" element={<Protected><RequestDetail/></Protected>}/>
    <Route path="/notifications" element={<Protected><Notifications/></Protected>}/>
    <Route path="/profile" element={<Protected><Profile/></Protected>}/>
    <Route path="*" element={<NotFound/>}/>
  </Routes><Footer/></div></C.Provider>;
}
function Header() {
  const { user, logout } = useAuth(); const [open, setOpen] = useState(false);
  return <header className="header"><div className="nav-wrap"><Link to="/" className="brand"><span className="brand-mark"><Droplet size={24} fill="currentColor"/></span><span>blood<span className="brand-light">bridge</span><small>CARE THAT CONNECTS</small></span></Link>
    <button className="mobile-menu" onClick={() => setOpen(!open)} aria-label="Toggle navigation">{open ? <X/> : <Menu/>}</button>
    <nav className={open ? 'nav-links open' : 'nav-links'}>{user ? <><NavLink to="/dashboard"><LayoutDashboard size={16}/> Dashboard</NavLink><NavLink to="/notifications"><Bell size={16}/> Notifications</NavLink><NavLink to="/profile">My profile</NavLink><button className="nav-logout" onClick={logout}><LogOut size={16}/> Sign out</button></> : <><a href="#how-it-works">How it works</a><Link to="/login" className="nav-login">Sign in</Link><Link to="/register" className="btn btn-primary btn-small">Join the network <ArrowRight size={15}/></Link></>}</nav>
  </div></header>;
}
function Landing() {
  return <><main><section className="hero"><div className="hero-grid"><div className="hero-copy"><div className="eyebrow"><span className="pulse-dot"/> A smarter way to save lives</div><h1>One connection.<br/><em>One more chance.</em></h1><p className="hero-lead">Bringing hospitals and willing blood donors together, right when every minute matters.</p><div className="hero-actions"><Link to="/register" className="btn btn-primary">Join BloodBridge <ArrowRight size={17}/></Link><a href="#how-it-works" className="btn btn-quiet">See how it works</a></div><div className="trust-row"><span><ShieldCheck size={16}/> Privacy-first</span><span><MapPin size={16}/> Location-aware</span><span><HeartPulse size={16}/> Community powered</span></div></div><div className="hero-art"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-card card-top"><span className="mini-icon"><Hospital size={18}/></span><span><b>Hospital request</b><small>Urgent · 4.2 km away</small></span><span className="live-pill">LIVE</span></div><div className="blood-drop"><Droplet size={92} fill="currentColor" strokeWidth={1.2}/><HeartPulse className="drop-heart" size={38}/></div><div className="art-card card-bottom"><span className="avatar-stack"><i>R</i><i>M</i><i>A</i></span><span><b>People ready to help</b><small>Every willing donor matters</small></span><span className="tiny-check"><Check size={16}/></span></div><div className="art-caption">A community connected by care.</div></div></div></section>
    <section className="stats-band"><div><span className="stat-icon"><Hospital/></span><b>For every hospital</b><small>One place to coordinate requests</small></div><div><span className="stat-icon"><MapPin/></span><b>Nearby-first matching</b><small>Reach eligible blood groups by radius</small></div><div><span className="stat-icon"><Bell/></span><b>Responses, not guesswork</b><small>See who is willing to help</small></div></section>
    <section className="how section" id="how-it-works"><div className="section-heading"><span className="eyebrow">HOW BLOODBRIDGE WORKS</span><h2>From urgent need to a willing hand.</h2><p>A clearer, more coordinated way to respond to blood requests.</p></div><div className="steps-grid"><Step n="01" icon={<Hospital/>} title="Hospitals post a request" text="Share the blood group, urgency, number of units and search radius."/><Step n="02" icon={<MapPin/>} title="Nearby donors are notified" text="Available donors with a compatible group receive an in-app alert."/><Step n="03" icon={<CheckCircle2/>} title="Donors respond" text="A donor accepts, and the hospital can see their response and contact details."/></div></section>
    <section className="cta"><div><span className="eyebrow light">BE PART OF THE NETWORK</span><h2>When the need is urgent,<br/>connection matters.</h2><p>Join a community designed to help hospitals reach willing donors faster.</p></div><Link to="/register" className="btn btn-white">Get started <ArrowRight size={17}/></Link></section>
    <section className="safety-note"><ShieldCheck size={20}/><p><b>Built for coordination.</b> BloodBridge does not determine medical eligibility or replace professional blood-bank screening. Hospitals must verify all donor and clinical requirements before proceeding.</p></section>
  </main></>;
}
function Step({n, icon, title, text}) { return <article className="step-card"><div className="step-top"><span className="step-icon">{icon}</span><span className="step-number">{n}</span></div><h3>{title}</h3><p>{text}</p></article>; }
function AuthPage({ mode }) {
  const isRegister = mode === 'register'; const [role, setRole] = useState('donor'); const [form, setForm] = useState({name:'', email:'', password:'', phone:'', organizationName:'', bloodGroup:'O+', latitude:'', longitude:'', address:''});
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const { signIn } = useAuth(); const nav = useNavigate();
  const set = (k,v) => setForm(p => ({...p,[k]:v}));
  async function submit(e) { e.preventDefault(); setError(''); setBusy(true); try { const data = await api(`/auth/${isRegister?'register':'login'}`, {method:'POST', body:JSON.stringify(isRegister ? {...form, role} : {email:form.email,password:form.password})}); signIn(data); nav('/dashboard'); } catch(e) { setError(e.message); } finally { setBusy(false); } }
  return <main className="auth-page"><div className="auth-aside"><div className="aside-pattern"/><span className="aside-symbol"><Droplet size={40} fill="currentColor"/></span><span className="eyebrow light">A NETWORK BUILT ON CARE</span><h2>Make the right connection at the right time.</h2><p>One shared network for hospitals and willing donors, with local requests and clear responses.</p><div className="aside-bottom"><ShieldCheck size={17}/> Your account. Your choice. Your information.</div></div><div className="auth-form-wrap"><form className="auth-form" onSubmit={submit}><span className="eyebrow">{isRegister?'JOIN THE NETWORK':'WELCOME BACK'}</span><h1>{isRegister?'Create your account':'Sign in'}</h1><p className="form-intro">{isRegister?'Choose how you want to participate in BloodBridge.':'Continue to your BloodBridge workspace.'}</p>
    {isRegister && <div className="role-picker"><button type="button" className={role==='donor'?'role-option selected':'role-option'} onClick={()=>setRole('donor')}><Droplet size={18}/><b>Blood donor</b><small>Respond to nearby needs</small></button><button type="button" className={role==='hospital'?'role-option selected':'role-option'} onClick={()=>setRole('hospital')}><Hospital size={18}/><b>Hospital</b><small>Request and coordinate</small></button></div>}
    {isRegister && <div className="field-grid"><Field label="Full name" value={form.name} onChange={v=>set('name',v)} placeholder="Your full name" required/><Field label="Phone number" value={form.phone} onChange={v=>set('phone',v)} placeholder="+91 ..." required type="tel"/></div>}
    {isRegister && role==='hospital' && <Field label="Hospital / organization name" value={form.organizationName} onChange={v=>set('organizationName',v)} placeholder="e.g. City Care Hospital" required/>}
    {isRegister && role==='donor' && <label className="field"><span>Blood group</span><select value={form.bloodGroup} onChange={e=>set('bloodGroup',e.target.value)}>{GROUPS.map(g=><option key={g}>{g}</option>)}</select><small>Choose the group confirmed by your blood-bank record.</small></label>}
    <Field label="Email address" value={form.email} onChange={v=>set('email',v)} placeholder="you@example.com" type="email" required/>
    <Field label="Password" value={form.password} onChange={v=>set('password',v)} placeholder={isRegister?'At least 8 characters':'Your password'} type="password" required/>
    {isRegister && <><div className="field"><span>Location coordinates</span><div className="field-grid"><Field label="Latitude" value={form.latitude} onChange={v=>set('latitude',v)} placeholder="e.g. 22.3072" required type="number" step="any"/><Field label="Longitude" value={form.longitude} onChange={v=>set('longitude',v)} placeholder="e.g. 73.1812" required type="number" step="any"/></div><small>Use your approximate location coordinates. The app does not access device location without permission.</small></div><Field label="Area / address (optional)" value={form.address} onChange={v=>set('address',v)} placeholder="Area, city"/></>}
    {error && <div className="error-box"><AlertTriangle size={16}/>{error}</div>}<button className="btn btn-primary submit-btn" disabled={busy}>{busy?'Please wait…':isRegister?'Create account':'Sign in'} <ArrowRight size={17}/></button><p className="auth-switch">{isRegister?'Already part of the network?':'New to BloodBridge?'} <Link to={isRegister?'/login':'/register'}>{isRegister?'Sign in':'Create an account'}</Link></p><p className="micro-copy"><ShieldCheck size={14}/> By continuing, you agree to use this service responsibly.</p>
  </form></div></main>;
}
function Field({label,value,onChange,placeholder,type='text',required=false,step}) { return <label className="field"><span>{label}</span><input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} type={type} step={step} required={required}/></label>; }
function Protected({children, role}) { const {user}=useAuth(); if(!user) return <Navigate to="/login" replace/>; if(role && user.role!==role) return <Navigate to="/dashboard" replace/>; return children; }
function Dashboard() {
  const {user}=useAuth(); const [requests,setRequests]=useState([]); const [notifications,setNotifications]=useState([]); const [loading,setLoading]=useState(true); const [error,setError]=useState('');
  async function load() { setLoading(true); try { const [r,n]=await Promise.all([api('/requests/mine'),api('/notifications')]); setRequests(r.requests); setNotifications(n.notifications); } catch(e){setError(e.message);} finally{setLoading(false);} }
  useEffect(()=>{load();},[]);
  const unread=notifications.filter(n=>!n.read).length;
  return <main className="workspace"><div className="welcome-row"><div><span className="eyebrow">YOUR BLOODBRIDGE WORKSPACE</span><h1>{user.role==='hospital'?'Good to see you, '+(user.organizationName||user.name):'Hello, '+user.name.split(' ')[0]+'.'}</h1><p>{user.role==='hospital'?'Coordinate requests and keep track of donor responses.':'Your willingness can make a meaningful difference.'}</p></div><span className="role-badge">{user.role==='hospital'?<Hospital size={16}/>:<HeartPulse size={16}/>} {user.role==='hospital'?'Hospital account':'Donor account'}</span></div>
    {error&&<div className="error-box">{error}</div>}
    <div className="metric-grid">{(user.role==='hospital'?[{icon:<Activity/>,label:'Requests created',value:requests.length},{icon:<Users/>,label:'Donor responses',value:requests.reduce((s,r)=>s+(r.acceptedBy?.length||0),0)},{icon:<Bell/>,label:'Unread alerts',value:unread}]:[{icon:<Bell/>,label:'Notifications',value:notifications.length},{icon:<CheckCircle2/>,label:'Requests responded to',value:notifications.filter(n=>n.accepted).length},{icon:<Droplet/>,label:'Your blood group',value:user.bloodGroup||'—'}]).map(m=><div className="metric-card" key={m.label}><span className="metric-icon">{m.icon}</span><span className="metric-label">{m.label}</span><b>{m.value}</b></div>)}</div>
    {user.role==='hospital'?<section className="panel"><div className="panel-heading"><div><h2>Recent blood requests</h2><p>Monitor open needs and donor responses.</p></div><Link className="btn btn-primary btn-small" to="/requests/new"><Plus size={16}/> New request</Link></div>{loading?<Loading/>:requests.length===0?<Empty icon={<Droplet/>} title="No requests yet" text="Create a request to notify compatible donors in your selected radius." action={<Link className="btn btn-primary" to="/requests/new">Create first request</Link>}/>:<div className="request-list">{requests.map(r=><RequestRow key={r.id} request={r} hospital/>)}</div>}</section>:<div className="dashboard-columns"><section className="panel"><div className="panel-heading"><div><h2>Nearby opportunities</h2><p>Blood requests delivered to your account.</p></div><Link to="/notifications" className="text-link">View all <ArrowRight size={15}/></Link></div>{loading?<Loading/>:requests.length===0?<Empty icon={<HeartPulse/>} title="You're all caught up" text="When a compatible hospital request is nearby, it will appear here and in your notifications."/>:<div className="request-list">{requests.slice(0,5).map(r=><RequestRow key={r.id} request={r}/>)}</div>}</section><section className="panel"><div className="panel-heading"><div><h2>Latest alerts</h2><p>Recent activity on your account.</p></div><Bell size={19} className="muted-icon"/></div>{loading?<Loading/>:notifications.slice(0,4).map(n=><NotificationMini key={n.id} n={n}/>)}<Link to="/notifications" className="btn btn-outline full-btn">Open notifications <ArrowRight size={16}/></Link></section></div>}
    <div className="workspace-note"><CircleHelp size={17}/><span>Keep your contact information and location up to date. Hospitals must verify donor eligibility and blood compatibility before any donation.</span><Link to="/profile">Review profile</Link></div>
    {user.role === 'donor' && <EnablePushNotifications />}
  </main>;
}
function RequestRow({request:r,hospital=false}) { return <Link to={`/requests/${r.id}`} className="request-row"><span className="blood-chip">{r.bloodGroup}</span><span className="request-main"><b>{r.hospitalName}</b><small>{r.units} unit(s) · {r.urgency} · {new Date(r.createdAt).toLocaleString()}</small></span><span className={`status-pill status-${(r.status||'open').toLowerCase().replaceAll(' ','-')}`}>{r.status}</span>{hospital&&<span className="response-count"><Users size={14}/>{r.acceptedBy?.length||0}</span>}<ArrowRight size={16} className="row-arrow"/></Link>; }
function NewRequest() {
  const [form,setForm]=useState({bloodGroup:'O+',units:'1',urgency:'Urgent',radiusKm:'25',patientReference:'',notes:''}); const [error,setError]=useState(''); const [busy,setBusy]=useState(false); const nav=useNavigate();
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));
  async function submit(e){e.preventDefault();setBusy(true);setError('');try{const d=await api('/requests',{method:'POST',body:JSON.stringify(form)});nav(`/requests/${d.request.id}`,{state:{notifiedDonors:d.notifiedDonors}});}catch(e){setError(e.message);}finally{setBusy(false);}}
  return <main className="workspace narrow-workspace"><Link to="/dashboard" className="back-link">← Back to dashboard</Link><div className="page-title"><span className="eyebrow">HOSPITAL WORKSPACE</span><h1>Create a blood request</h1><p>Share the need with compatible donors near your hospital.</p></div><form className="panel form-panel" onSubmit={submit}><div className="form-section-title"><span className="section-number">01</span><div><h2>Blood requirement</h2><p>Provide the essentials of the request.</p></div></div><div className="field-grid"><label className="field"><span>Required blood group</span><select value={form.bloodGroup} onChange={e=>set('bloodGroup',e.target.value)}>{GROUPS.map(g=><option key={g}>{g}</option>)}</select></label><label className="field"><span>Units needed</span><select value={form.units} onChange={e=>set('units',e.target.value)}>{Array.from({length:20},(_,i)=>i+1).map(n=><option key={n}>{n}</option>)}</select></label></div><label className="field"><span>Urgency level</span><div className="urgency-options">{['Routine','Urgent','Critical'].map(u=><button type="button" key={u} className={`urgency-option ${form.urgency===u?'selected '+u.toLowerCase():''}`} onClick={()=>set('urgency',u)}><span className="urgency-dot"/>{u}</button>)}</div></label><div className="field"><span>Search radius</span><div className="radius-row"><input type="range" min="1" max="100" value={form.radiusKm} onChange={e=>set('radiusKm',e.target.value)}/><b>{form.radiusKm} km</b></div><small>Available donors within this radius may be notified.</small></div><div className="form-section-title space-top"><span className="section-number">02</span><div><h2>Additional information</h2><p>Share only information needed to coordinate the request.</p></div></div><Field label="Patient reference (optional; no full patient name)" value={form.patientReference} onChange={v=>set('patientReference',v)} placeholder="e.g. Case ID 1042"/><label className="field"><span>Notes for donors (optional)</span><textarea value={form.notes} onChange={e=>set('notes',e.target.value)} rows="4" maxLength="1000" placeholder="Donation location instructions or contact process…"/></label>{error&&<div className="error-box">{error}</div>}<div className="privacy-callout"><ShieldCheck size={19}/><span>Only nearby donors with a compatible group and active availability will be notified. Please avoid including patient-identifying or sensitive medical details.</span></div><div className="form-actions"><Link to="/dashboard" className="btn btn-quiet">Cancel</Link><button className="btn btn-primary" disabled={busy}>{busy?'Sending notifications…':'Publish request'} <ArrowRight size={17}/></button></div></form></main>;
}
function RequestDetail() {
  const {id}=useParams(); const {user}=useAuth(); const [request,setRequest]=useState(null); const [error,setError]=useState(''); const [busy,setBusy]=useState(false); const [notice,setNotice]=useState(''); const loc=useLocation();
  async function load(){try{const d=await api(`/requests/${id}`);setRequest(d.request);}catch(e){setError(e.message);}}
  useEffect(()=>{load();},[id]);
  async function accept(){setBusy(true);setError('');try{const d=await api(`/requests/${id}/accept`,{method:'POST',body:'{}'});setRequest(d.request);setNotice(d.message);}catch(e){setError(e.message);}finally{setBusy(false);}}
  async function updateStatus(status){setBusy(true);setError('');try{const d=await api(`/requests/${id}/status`,{method:'PATCH',body:JSON.stringify({status})});setRequest(d.request);setNotice('Request status updated.');}catch(e){setError(e.message);}finally{setBusy(false);}}
  if(!request&&!error)return <main className="workspace"><Loading/></main>;
  if(error&&!request)return <main className="workspace"><div className="error-box">{error}</div><Link to="/dashboard">Return to dashboard</Link></main>;
  const owner=user.role==='hospital';
  return <main className="workspace narrow-workspace"><Link to="/dashboard" className="back-link">← Back to dashboard</Link>{loc.state?.notifiedDonors!==undefined&&<div className="success-banner"><CheckCircle2/> Request published. {loc.state.notifiedDonors} compatible donor(s) notified within the selected radius.</div>}<div className="request-detail-hero"><div className="blood-chip big">{request.bloodGroup}</div><div className="request-detail-title"><span className="eyebrow">{request.urgency.toUpperCase()} REQUEST</span><h1>{request.hospitalName}</h1><p><MapPin size={15}/> Hospital blood request · {new Date(request.createdAt).toLocaleString()}</p></div><span className={`status-pill status-${request.status.toLowerCase().replaceAll(' ','-')}`}>{request.status}</span></div>
    <div className="detail-stats"><div><span>Units required</span><b>{request.units}</b></div><div><span>Urgency</span><b>{request.urgency}</b></div><div><span>Search radius</span><b>{request.radiusKm} km</b></div></div>
    {request.notes&&<section className="panel detail-panel"><h2>Request notes</h2><p>{request.notes}</p></section>}{request.patientReference&&<section className="panel detail-panel"><h2>Patient reference</h2><p>{request.patientReference}</p></section>}
    {owner?<section className="panel detail-panel"><div className="panel-heading"><div><h2>Donor responses</h2><p>People who have accepted your request.</p></div><span className="count-badge">{request.acceptedBy.length}</span></div>{request.acceptedBy.length===0?<Empty icon={<Users/>} title="Waiting for responses" text="When a donor accepts, their contact details will appear here."/>:<div className="donor-response-list">{request.acceptedBy.map(d=><div className="donor-response" key={d.donorId}><span className="donor-avatar">{(d.name||'D').slice(0,1).toUpperCase()}</span><span className="request-main"><b>{d.name}</b><small>{d.bloodGroup} · Accepted {new Date(d.acceptedAt).toLocaleString()}</small></span><a href={`tel:${d.phone}`} className="btn btn-outline btn-small"><Phone size={15}/>{d.phone}</a></div>)}</div>}<div className="form-actions status-actions"><button className="btn btn-outline" disabled={busy} onClick={()=>updateStatus('Open')}>Reopen</button><button className="btn btn-outline" disabled={busy} onClick={()=>updateStatus('Cancelled')}>Cancel request</button><button className="btn btn-primary" disabled={busy} onClick={()=>updateStatus('Fulfilled')}>Mark fulfilled <Check size={16}/></button></div></section>:<section className="panel detail-panel response-panel"><span className="response-symbol"><HeartPulse size={28}/></span><div><h2>Can you help with this request?</h2><p>If you are willing to help, let the hospital know. They will contact you to coordinate next steps and verify eligibility.</p></div><button className="btn btn-primary" onClick={accept} disabled={busy||request.status==='Cancelled'||request.status==='Fulfilled'}>{busy?'Sending response…':'I can help'} <CheckCircle2 size={17}/></button></section>}
    {notice&&<div className="success-banner"><CheckCircle2/>{notice}</div>}{error&&<div className="error-box">{error}</div>}<div className="safety-note inline"><ShieldCheck size={18}/><p>Responding is an expression of willingness, not medical clearance. Confirm eligibility and donation arrangements with the hospital or licensed blood bank.</p></div>
  </main>;
}
function Notifications() {
  const [items,setItems]=useState([]);const [error,setError]=useState('');const [filter,setFilter]=useState('All');
  async function load(){try{const d=await api('/notifications');setItems(d.notifications);}catch(e){setError(e.message);}}
  useEffect(()=>{load();},[]);
  async function markRead(n){try{await api(`/notifications/${n.id}/read`,{method:'PATCH',body:'{}'});setItems(p=>p.map(x=>x.id===n.id?{...x,read:true}:x));}catch(e){setError(e.message);}}
  const visible=items.filter(n=>filter==='All'||(filter==='Unread'&&!n.read)||(filter==='Responded'&&n.accepted));
  return <main className="workspace"><div className="page-title"><span className="eyebrow">STAY IN THE LOOP</span><h1>Notifications</h1><p>Blood requests and responses relevant to your account.</p></div><section className="panel"><div className="panel-heading"><div><h2>Your alerts</h2><p>Recent updates from across your network.</p></div><span className="count-badge">{items.filter(n=>!n.read).length} unread</span></div><div className="filter-tabs">{['All','Unread','Responded'].map(f=><button key={f} className={filter===f?'active':''} onClick={()=>setFilter(f)}>{f}</button>)}</div>{error&&<div className="error-box">{error}</div>}{visible.length===0?<Empty icon={<Bell/>} title="Nothing to show here" text="New request alerts and donor responses will appear here."/>:<div className="notification-list">{visible.map(n=><article key={n.id} className={`notification-card ${n.read?'':'unread'}`}><span className="notification-symbol">{n.accepted?<CheckCircle2/>:<Droplet/>}</span><div className="notification-copy"><div className="notification-title-row"><h3>{n.title}</h3>{!n.read&&<span className="unread-dot"/>}</div><p>{n.message}</p><div className="notification-meta">{n.bloodGroup&&<span className="blood-mini">{n.bloodGroup}</span>}{n.urgency&&<span>{n.urgency}</span>}{n.distanceKm!=null&&<span><MapPin size={13}/>{n.distanceKm} km away</span>}<span><Clock3 size={13}/>{new Date(n.createdAt).toLocaleString()}</span></div><div className="notification-actions"><Link to={`/requests/${n.requestId}`} className="text-link" onClick={()=>markRead(n)}>View request <ArrowRight size={15}/></Link>{!n.read&&<button className="text-button" onClick={()=>markRead(n)}>Mark as read</button>}</div></div></article>)}</div>}</section></main>;
}
function Profile() {
  const {user,refreshUser}=useAuth(); const [form,setForm]=useState({phone:user.phone||'',bloodGroup:user.bloodGroup||'O+',available:user.available??false,address:user.address||'',latitude:String(user.location?.coordinates?.[1]??''),longitude:String(user.location?.coordinates?.[0]??'')});const [notice,setNotice]=useState('');const [error,setError]=useState('');
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));
  async function save(e){e.preventDefault();setNotice('');setError('');try{await api('/auth/profile',{method:'PATCH',body:JSON.stringify(form)});await refreshUser();setNotice('Your profile has been updated.');}catch(e){setError(e.message);}}
  return <main className="workspace narrow-workspace"><div className="page-title"><span className="eyebrow">ACCOUNT SETTINGS</span><h1>My profile</h1><p>Keep your contact and location details current.</p></div><form className="panel form-panel" onSubmit={save}><div className="profile-summary"><span className="profile-avatar">{user.name.slice(0,1).toUpperCase()}</span><span><b>{user.name}</b><small>{user.email} · {user.role==='hospital'?(user.organizationName||'Hospital account'):'Donor account'}</small></span></div><Field label="Phone number" value={form.phone} onChange={v=>set('phone',v)} required/>{user.role==='donor'&&<><label className="field"><span>Blood group</span><select value={form.bloodGroup} onChange={e=>set('bloodGroup',e.target.value)}>{GROUPS.map(g=><option key={g}>{g}</option>)}</select></label><label className="availability-toggle"><span><b>Available to receive requests</b><small>Turn off if you are temporarily unavailable.</small></span><input type="checkbox" checked={form.available} onChange={e=>set('available',e.target.checked)}/></label></>}<Field label="Area / address" value={form.address} onChange={v=>set('address',v)} placeholder="Area, city"/><div className="field-grid"><Field label="Latitude" value={form.latitude} onChange={v=>set('latitude',v)} required type="number" step="any"/><Field label="Longitude" value={form.longitude} onChange={v=>set('longitude',v)} required type="number" step="any"/></div>{error&&<div className="error-box">{error}</div>}{notice&&<div className="success-banner"><CheckCircle2/>{notice}</div>}<button className="btn btn-primary submit-btn">Save changes <Check size={17}/></button></form></main>;
}
function NotificationMini({n}){return <Link to={`/requests/${n.requestId}`} className="mini-notification"><span className="mini-notification-icon"><Bell size={16}/></span><span><b>{n.title}</b><small>{n.message}</small></span>{!n.read&&<i/>}</Link>;}
function Empty({icon,title,text,action}){return <div className="empty-state"><span className="empty-icon">{icon}</span><h3>{title}</h3><p>{text}</p>{action}</div>;}
function Loading(){return <div className="loading-state"><span className="spinner"/>Loading your workspace…</div>;}
function NotFound(){return <main className="workspace empty-page"><Empty icon={<CircleHelp/>} title="Page not found" text="The page you're looking for doesn't exist." action={<Link to="/" className="btn btn-primary">Go home</Link>}/></main>}
function Footer(){return <footer className="footer"><div className="footer-inner"><Link to="/" className="brand footer-brand"><span className="brand-mark"><Droplet size={20} fill="currentColor"/></span><span>blood<span className="brand-light">bridge</span><small>CARE THAT CONNECTS</small></span></Link><p>Connecting willingness with urgent need.</p><span>© {new Date().getFullYear()} BloodBridge · Built for care, powered by community.</span></div></footer>}
export default App;
