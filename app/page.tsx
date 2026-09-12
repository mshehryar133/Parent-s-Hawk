'use client';

import { useState, useMemo } from 'react';

type Category = 'Food' | 'Entertainment' | 'Shopping' | 'Education' | 'Transportation';

interface Transaction { 
  id: number; 
  date: string; 
  amount: number; 
  category: Category; 
  description: string; 
  parent: string; 
  currency: Currency; 
}
interface TxRow { 
  id: string; 
  date: string; 
  amount: string; 
  category: Category; 
  description: string; 
  parent: string; 
  currency: Currency; 
}
type ViewMode = 'all' | 'daily' | 'weekly' | 'monthly';
type QuickFilter = 'all' | 'today' | 'week' | 'month' | 'year';
type Currency = 'PKR' | 'USD' | 'GBP' | 'EUR' | 'INR';

const CATEGORIES: Category[] = ['Food', 'Entertainment', 'Shopping', 'Education', 'Transportation'];

function startOfDay(d: Date) { 
  const x = new Date(d); 
  x.setHours(0,0,0,0); 
  return x; 
}
function endOfDay(d: Date) { 
  const x = new Date(d); 
  x.setHours(23,59,59,999); 
  return x; 
}
function startOfWeek(d: Date) { 
  const x = startOfDay(d); 
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); 
  return x; 
}
function endOfWeek(d: Date) { 
  const s = startOfWeek(d); 
  const e = new Date(s); 
  e.setDate(e.getDate()+6); 
  e.setHours(23,59,59,999); 
  return e; 
}
function startOfMonth(d: Date) { 
  return new Date(d.getFullYear(), d.getMonth(), 1); 
}
function endOfMonth(d: Date) { 
  return new Date(d.getFullYear(), d.getMonth()+1, 0, 23, 59, 59, 999); 
}
function startOfYear(d: Date) { 
  return new Date(d.getFullYear(), 0, 1); 
}
function endOfYear(d: Date) { 
  return new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999); 
}
function fmtDateLabel(d: Date) { 
  return d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }); 
}
function fmtWeekLabel(s: Date, e: Date) { 
  return `${fmtDateLabel(s)} - ${fmtDateLabel(e)}`; 
}
function fmtMonthLabel(d: Date) { 
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' }); 
}

function LedgerSeal() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="absolute top-6 right-6 opacity-15 pointer-events-none">
      <circle cx="40" cy="40" r="35" stroke="#0D4038" strokeWidth="2" fill="none"/>
      <circle cx="40" cy="40" r="20" stroke="#B45309" strokeWidth="1" fill="none"/>
      <path d="M40 10 L30 30 L50 30" stroke="#0D4038" strokeWidth="1.5" fill="none"/>
      <path d="M40 70 L30 50 L50 50" stroke="#0D4038" strokeWidth="1.5" fill="none"/>
    </svg>
  );
}

export default function HomePage() {
  const [view, setView] = useState<'login' | 'signup' | 'ledger'>('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [filter, setFilter] = useState<'All' | Category>('All');
  const [loggedIn, setLoggedIn] = useState(false);
const [role, setRole] = useState<'parent' | 'child'>('parent');
  const [isChild, setIsChild] = useState(false);
  const [childPhone, setChildPhone] = useState('');
  const [childPhoneError, setChildPhoneError] = useState('');
  const [currency, setCurrency] = useState<'PKR'|'USD'|'GBP'|'EUR'|'INR'>('USD');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [txRows, setTxRows] = useState<TxRow[]>([{
    id: 'tx-1',
    date: new Date().toISOString().slice(0,10),
    amount: '',
    category: 'Food',
    description: '',
    parent: '',
    currency: currency
  }]);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [pageIndex, setPageIndex] = useState(0);
  const [signinError, setSigninError] = useState('');
  const [signupError, setSignupError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [signupStep, setSignupStep] = useState<'details' | 'verify'>('details');
  const [otpCode, setOtpCode] = useState('');
  const [pendingUser, setPendingUser] = useState<{firstName:string;lastName:string;phone:string;countryCode:string;password:string}| null>(null);

  const SYMBOL: Record<string,string> = { PKR:'Rs', USD:'$', GBP:'£', EUR:'€', INR:'₹' };
  const CURRENCY_RATES: Record<Currency, number> = { USD: 1, PKR: 280, GBP: 1.3, EUR: 1.1, INR: 83 };
  const fmt = (n:number, txCurrency?: Currency) => `${SYMBOL[txCurrency ?? currency]}${n.toFixed(2)}`;
  const convertToSelectedCurrency = (amount: number, fromCurrency: Currency) => amount * (CURRENCY_RATES[currency] / CURRENCY_RATES[fromCurrency]);

  const today = useMemo(() => new Date(), []);

  // 1. Range filter
  const rangeFiltered = useMemo(() => {
    if (quickFilter === 'all') return transactions;
    let from: Date, to: Date;
    if (quickFilter === 'today') { from = startOfDay(today); to = endOfDay(today); }
    else if (quickFilter === 'week') { from = startOfWeek(today); to = endOfWeek(today); }
    else if (quickFilter === 'month') { from = startOfMonth(today); to = endOfMonth(today); }
    else { from = startOfYear(today); to = endOfYear(today); }
    return transactions.filter(t => { const d = new Date(t.date); return d >= from && d <= to; });
  }, [transactions, quickFilter, today]);

  // 2. Category filter
  const categoryFiltered = useMemo(() => filter === 'All' ? rangeFiltered : rangeFiltered.filter(t => t.category === filter), [rangeFiltered, filter]);

  const selectedTotal = categoryFiltered
    .filter(t => t.currency === currency)
    .reduce((s,t) => s + t.amount, 0);
  const overallTotal = categoryFiltered.reduce((s,t) => s + convertToSelectedCurrency(t.amount, t.currency), 0);

  // 3. Grouping
  const groups = useMemo(() => {
    if (viewMode === 'all') return null;
    const map = new Map<string, { label: string; items: Transaction[]; sortKey: number }>();
    for (const t of categoryFiltered) {
      const d = new Date(t.date);
      let key: string, label: string, sortKey: number;
      if (viewMode === 'daily') {
        const s = startOfDay(d);
        key = s.toISOString().slice(0,10);
        label = fmtDateLabel(s);
        sortKey = s.getTime();
      } else if (viewMode === 'weekly') {
        const s = startOfWeek(d);
        key = s.toISOString().slice(0,10);
        label = 'Week of ' + fmtWeekLabel(s, endOfWeek(d));
        sortKey = s.getTime();
      } else {
        const s = startOfMonth(d);
        key = `${s.getFullYear()}-${String(s.getMonth()+1).padStart(2,'0')}`;
        label = fmtMonthLabel(s);
        sortKey = s.getTime();
      }
      if (!map.has(key)) map.set(key, { label, items: [], sortKey });
      map.get(key)!.items.push(t);
    }
    return Array.from(map.values()).sort((a,b) => b.sortKey - a.sortKey);
  }, [categoryFiltered, viewMode]);

  const renderCard = (tx: Transaction) => (
    <div className="bg-white rounded-2xl shadow-xl border border-[#E8E4DD] hover:shadow-lg transition duration-300 p-4 mb-4">
      <div className="flex justify-between items-center pb-3">
        <div className="flex items-center gap-2">
          <span className="inline-block px-2.5 py-0.5 rounded-md bg-[#FDFBF7] text-[#0D4038] text-xs font-semibold">{tx.category}</span>
          <div className="text-[#64748B] text-sm">{tx.date}</div>
        </div>
        <div className="text-[#0D4038] font-medium">{fmt(tx.amount, tx.currency)}</div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-[#64748B]">{tx.parent}</span>
        <span className="ml-3 text-[#64748B] text-sm">{tx.description}</span>
      </div>
      <div className="flex justify-end pt-3">
        <button onClick={() => setTransactions(transactions.filter(x => x.id !== tx.id))} className="text-xs text-red-600 hover:text-red-800 font-medium">Delete</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1A202C] font-sans relative overflow-hidden">
      <LedgerSeal />

      {/* Signature: hawk silhouette — the brand's visual anchor */}
      <div aria-hidden="true" className="fixed bottom-8 left-8 opacity-[0.07] pointer-events-none z-0 rotate-[-8deg]">
        <svg width="160" height="160" viewBox="0 0 160 160" fill="none"><path d="M80 15 L105 55 L130 40 L120 70 L145 85 L110 90 L125 115 L90 105 L80 140 L60 105 L25 115 L40 85 L10 70 L35 55 L60 40 Z" fill="#0D4038"/><circle cx="95" cy="60" r="3.5" fill="#D4AF37"/></svg>
      </div>
      
      <header className="sticky top-0 z-50 bg-[#0D4038]/90 backdrop-blur-md border-b border-[#D4AF37]/25">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => setView('login')} className="flex items-center gap-3">
            <img src="/Logo.png" alt="Parent's Hawk Logo" className="w-10 h-10 object-contain" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Parent's Hawk</h1>
          </button>
          <nav className="flex items-center gap-6 text-sm font-medium text-white/85">
            {!loggedIn && view !== 'login' && <button onClick={() => setView('login')} className="hover:text-white transition">Login</button>}
            {!loggedIn && view !== 'signup' && <button onClick={() => setView('signup')} className="hover:text-white transition">Sign Up</button>}
            {loggedIn && <button onClick={() => { setLoggedIn(false); setView('login'); }} className="px-4 py-1.5 rounded-full bg-[#D4AF37] hover:bg-[#B45309] text-white text-sm font-semibold transition">Logout</button>}
            {showForm && <button onClick={() => setShowForm(false)} className="hover:text-white transition">Ledger</button>}
          </nav>
        </div>
      </header>

      {view === 'login' && (
        <main className="max-w-md mx-auto px-6 pt-24 pb-20">
          <h2 className="text-3xl font-extrabold mb-2 text-[#0D4038]">Parent Access</h2>
          <p className="text-[#64748B] mb-8">Securely monitor your family's spending with tamper-resistant records.</p>
          <form onSubmit={async (e) => { 
            e.preventDefault(); 
            setIsLoading(true); 
            setSigninError(''); 
            try {
              const res = await fetch('/api/auth/signin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ countryCode, phone, password })
              });
              const data = await res.json();
              if (!res.ok) {
                if (res.status === 404) setSigninError('User not found');
                else setSigninError(data.error || 'Login failed');
                setIsLoading(false); return;
              }
              setRole(data.user?.role || 'parent');
              setIsChild(data.user?.role === 'child');
              setLoggedIn(true); setView('ledger');
            } catch { setSigninError('Network error'); }
            setIsLoading(false);
          }} className="bg-white rounded-2xl shadow-xl shadow-[#0D4038]/15 p-8 border border-[#E8E4DD]">
            {signinError && <p className="text-xs text-center text-red-600 mt-2">{signinError}</p>}
            <label htmlFor="phone-login" className="block text-sm font-semibold text-[#475569] mb-2">Phone Number</label>
            <div className="flex gap-2 mb-5">
              <select value={countryCode} onChange={e => setCountryCode(e.target.value)} className="w-24 px-3 py-3 rounded-xl border border-[#E8E4DD] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 text-sm bg-white" aria-label="Country code">
                <option value="+1">+1</option><option value="+44">+44</option><option value="+91">+91</option><option value="+92">+92</option><option value="+86">+86</option><option value="+49">+49</option><option value="+33">+33</option><option value="+81">+81</option><option value="+61">+61</option><option value="+55">+55</option>
              </select>
              <input id="phone-login" type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="flex-1 px-4 py-3 rounded-xl border border-[#E8E4DD] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 text-sm" placeholder="555 123 4567" required />
            </div>
            <label htmlFor="password-login" className="block text-sm font-semibold text-[#475569] mb-2">Password</label>
            <input id="password-login" type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-[#E8E4DD] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 mb-6 text-sm" placeholder="••••••••" required />
            <button type="submit" className="w-full py-3 rounded-xl bg-[#0D4038] text-white font-bold hover:bg-[#13584C] transition shadow-lg shadow-[#0D4038]/20">Sign In</button>
            <p className="text-xs text-center mt-4 text-[#94A3B8]">Secure, independent records — notifications can't delete this.</p>
          </form>
          <div className="text-center mt-6"><button onClick={() => { setLoggedIn(true); setView('ledger'); }} className="text-sm text-[#D4AF37] hover:underline font-medium">View Ledger Without Account</button></div>
        </main>
      )}

      {view === 'signup' && (
        <main className="max-w-md mx-auto px-6 pt-20 pb-20">
          <h2 className="text-3xl font-extrabold mb-2 text-[#0D4038]">Create Parent Account</h2>
          <p className="text-[#64748B] mb-8">Start monitoring your family's spending with secure records.</p>

          {signupStep === 'details' && (
            <form onSubmit={async (e) => {
              e.preventDefault();
              setIsLoading(true);
              setSignupError('');
              try {
                const res = await fetch('/api/auth/signup', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ countryCode, phone, firstName, lastName, password })
                });
                const data = await res.json();
                if (!res.ok) {
                  setSignupError(data.error || 'Failed to send verification code');
                  setIsLoading(false); return;
                }
                // Move to OTP verification step
                setSignupStep('verify');
                setOtpCode('');
                setPendingUser({ firstName, lastName, phone, countryCode, password });
              } catch { setSignupError('Network error'); }
              setIsLoading(false);
            }} className="bg-white rounded-2xl shadow-xl shadow-[#0D4038]/15 p-8 border border-[#E8E4DD] space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-[#E8E4DD] text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40" required />
                <input placeholder="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-[#E8E4DD] text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40" required />
              </div>
              <div>
                <label htmlFor="phone-signup" className="block text-sm font-semibold text-[#475569] mb-2">Phone Number</label>
                <div className="flex gap-2">
                  <select value={countryCode} onChange={e => setCountryCode(e.target.value)} className="w-24 px-3 py-3 rounded-xl border border-[#E8E4DD] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 text-sm bg-white" aria-label="Country code">
                    <option value="+1">+1</option><option value="+44">+44</option><option value="+91">+91</option><option value="+92">+92</option><option value="+86">+86</option><option value="+49">+49</option><option value="+33">+33</option><option value="+81">+81</option><option value="+61">+61</option><option value="+55">+55</option>
                  </select>
                  <input id="phone-signup" type="tel" value={phone} onChange={e=>setPhone(e.target.value)} className="flex-1 px-4 py-3 rounded-xl border border-[#E8E4DD] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 text-sm" placeholder="555 123 4567" required />
                </div>
                {signupError && <p className="text-xs text-center text-red-600 mt-2">{signupError}</p>}
              </div>
              <input type="password" placeholder="Create a password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-[#E8E4DD] text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40" required />
              <button type="submit" disabled={isLoading} className="w-full py-3 rounded-xl bg-[#0D4038] text-white font-bold hover:bg-[#13584C] transition shadow-lg shadow-[#0D4038]/20 disabled:opacity-50 disabled:cursor-not-allowed">{isLoading ? 'Sending code...' : 'Send Verification Code'}</button>
            </form>
          )}

          {signupStep === 'verify' && (
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!pendingUser) { setSignupError('Missing user data. Please start over.'); return; }
              setIsLoading(true);
              setSignupError('');
              try {
                const res = await fetch('/api/auth/verify', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ...pendingUser, code: otpCode })
                });
                const data = await res.json();
                if (!res.ok) {
                  setSignupError(data.error || 'Verification failed');
                  setIsLoading(false); return;
                }
                // Success — log in
                setLoggedIn(true);
                setView('ledger');
                setSignupStep('details');
              } catch { setSignupError('Network error'); }
              setIsLoading(false);
            }} className="bg-white rounded-2xl shadow-xl shadow-[#0D4038]/15 p-8 border border-[#E8E4DD] space-y-5">
              <div className="text-center">
                <p className="text-sm text-[#64748B] mb-4">We sent a 6-digit verification code to <strong className="text-[#0D4038]">{pendingUser?.countryCode} {pendingUser?.phone}</strong>. Enter it below to activate your account.</p>
              </div>
              <input type="text" inputMode="numeric" maxLength={6} value={otpCode} onChange={e=>setOtpCode(e.target.value.replace(/\D/g,'').slice(0,6))} className="w-full px-4 py-3 rounded-xl border border-[#E8E4DD] text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 text-center text-2xl tracking-[0.5em] font-mono" placeholder="000000" required />
              {signupError && <p className="text-xs text-center text-red-600 mt-2">{signupError}</p>}
              <button type="submit" disabled={isLoading} className="w-full py-3 rounded-xl bg-[#0D4038] text-white font-bold hover:bg-[#13584C] transition shadow-lg shadow-[#0D4038]/20 disabled:opacity-50 disabled:cursor-not-allowed">{isLoading ? 'Verifying...' : 'Verify & Create Account'}</button>
              <button type="button" onClick={() => { setSignupStep('details'); setOtpCode(''); setSignupError(''); }} className="w-full text-sm text-[#D4AF37] hover:underline font-medium">Back to details</button>
            </form>
          )}
        </main>
      )}

      {view === 'ledger' && (
        <main className="max-w-6xl mx-auto px-6 pt-16 pb-20">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
            <div>
              <h2 className="text-4xl font-extrabold text-[#0D4038] tracking-tight">Parent's Hawk</h2>
              <p className="text-[#64748B] mt-2">A complete, tamper-resistant record of your family's financial activity.</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-[#0D4038] text-white px-6 py-4 rounded-2xl shadow-xl shadow-[#0D4038]/10">
                <div className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold">Total Spent ({SYMBOL[currency]})</div>
                <div className="text-3xl font-extrabold text-[#D4AF37]">{fmt(selectedTotal)}</div>
              </div>
              <div className="bg-[#0D4038] text-white px-6 py-4 rounded-2xl shadow-xl shadow-[#0D4038]/10">
                <div className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold">Overall Total</div>
                <div className="text-3xl font-extrabold text-[#D4AF37]">{fmt(overallTotal)}</div>
                <div className="text-[10px] text-white/60 mt-1">All currencies converted to {SYMBOL[currency]}</div>
              </div>
              <select value={currency} onChange={e=>setCurrency(e.target.value as typeof currency)} className="w-28 px-3 py-3 rounded-xl border border-[#E8E4DD] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40">
                <option value="USD">Dollar ($)</option><option value="PKR">PKR (Rs)</option><option value="GBP">Pound (£)</option><option value="EUR">Euro (€)</option><option value="INR">INR (₹)</option>
              </select>
            </div>
            <button onClick={()=>setShowForm(!showForm)} className="px-5 py-4 rounded-2xl bg-[#D4AF37] text-white font-bold hover:bg-[#B45309] shadow-lg">{showForm ? 'Cancel' : '+ Add Transaction'}</button>
          </div>

          <div className="flex gap-2 mb-6 flex-wrap">
            {(['all','today','week','month','year'] as QuickFilter[]).map(q => (
              <button key={q} onClick={() => { setQuickFilter(q); setPageIndex(0); }} className={`px-4 py-2 rounded-full text-sm font-medium border transition ${quickFilter===q?'bg-[#D4AF37] text-white border-[#D4AF37]':'bg-white text-[#64748B] border-[#E8E4DD] hover:border-[#D4AF37]'}`}>{q==='all'?'All':q==='today'?'Today':q==='week'?'This Week':q==='month'?'This Month':'This Year'}</button>
            ))}
          </div>

          {role === 'parent' && (
            <div className="bg-white rounded-2xl shadow-xl border border-[#E8E4DD] p-4 mb-6">
              <h3 className="text-sm font-bold text-[#0D4038] mb-2">Add Child Phone</h3>
              <div className="flex gap-2">
                <input type="tel" value={childPhone} onChange={e=>setChildPhone(e.target.value)} placeholder="Enter child phone number" className="flex-1 px-3 py-2 rounded-xl border border-[#E8E4DD] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40" />
                <button type="button" onClick={()=>{
                  if (!childPhone.trim()) { setChildPhoneError('Phone number required'); return; }
                  setChildPhoneError('');
                  // In a real app, persist to backend; here we store in localStorage for demo
                  const children = JSON.parse(localStorage.getItem('hawk_children') || '[]');
                  if (!children.includes(childPhone.trim())) {
                    children.push(childPhone.trim());
                    localStorage.setItem('hawk_children', JSON.stringify(children));
                  }
                  setChildPhone('');
                }} className="px-4 py-2 rounded-xl bg-[#0D4038] text-white text-sm font-semibold hover:bg-[#13584C] transition">Add Child</button>
              </div>
              {childPhoneError && <p className="text-xs text-red-600 mt-1">{childPhoneError}</p>}
            </div>
          )}

          <div className="flex items-center gap-4 mb-6">
            <label htmlFor="view-mode" className="text-sm font-semibold text-[#64748B]">View Mode:</label>
            <select id="view-mode" value={viewMode} onChange={e=>{setViewMode(e.target.value as ViewMode); setPageIndex(0);}} className="w-48 px-3 py-2 rounded-xl border border-[#E8E4DD] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40">
              <option value="all">Flat List (All)</option>
              <option value="daily">Daily (each day per page)</option>
              <option value="weekly">Weekly (each week per page)</option>
              <option value="monthly">Monthly (each month per page)</option>
            </select>
          </div>

          {showForm && (
            <form onSubmit={(e)=>{ e.preventDefault(); const newTx = txRows.filter(r=>r.amount.trim()!==''&&!isNaN(parseFloat(r.amount.replace(/[^0-9.-]/g,'')))&&parseFloat(r.amount.replace(/[^0-9.-]/g,''))>0).map(r=>({id:Date.now()+Math.random(),date:r.date,amount:parseFloat(r.amount.replace(/[^0-9.-]/g,'')),category:r.category,description:r.description||r.category,parent:r.parent||firstName||'Parent',currency:r.currency})); if (newTx.length===0) return; setTransactions(prev=>[...prev,...newTx]); setTxRows([{id:'tx-'+Date.now(),date:new Date().toISOString().slice(0,10),amount:'',category:'Food',description:'',parent:'',currency:currency}]); }} className="bg-white rounded-2xl shadow-xl border border-[#E8E4DD] p-6 mb-8 grid grid-cols-1 md:grid-cols-5 gap-4">
              {txRows.map((row,i) => (
                <div key={i} className="md:col-span-5 grid grid-cols-2 md:grid-cols-6 gap-3 bg-white rounded-2xl p-3 border border-[#E8E4DD] mb-2">
                  <input type="date" value={row.date} onChange={e=>{const r=[...txRows]; r[i].date=e.target.value; setTxRows(r);}} className="w-full px-3 py-2 rounded-xl border border-[#E8E4DD] text-sm bg-white"/>
                  <input type="number" step="0.01" min="0" placeholder="Amount" value={row.amount} onChange={e=>{const r=[...txRows]; r[i].amount=e.target.value; setTxRows(r);}} className="w-full px-3 py-2 rounded-xl border border-[#E8E4DD] text-sm bg-white"/>
                  <select value={row.category} onChange={e=>{const r=[...txRows]; r[i].category=e.target.value as Category; setTxRows(r);}} className="w-full px-3 py-2 rounded-xl border border-[#E8E4DD] text-sm bg-white">{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select>
                  <input type="text" placeholder="Description" value={row.description} onChange={e=>{const r=[...txRows]; r[i].description=e.target.value; setTxRows(r);}} className="w-full px-3 py-2 rounded-xl border border-[#E8E4DD] text-sm bg-white"/>
                  <input type="text" placeholder="Parent" value={row.parent} onChange={e=>{const r=[...txRows]; r[i].parent=e.target.value; setTxRows(r);}} className="w-full px-3 py-2 rounded-xl border border-[#E8E4DD] text-sm bg-white"/>
                  {txRows.length > 1 && (
                    <button type="button" aria-label={`Delete transaction row ${i + 1}`} onClick={() => setTxRows(prev => prev.filter((_, idx) => idx !== i))} className="col-span-2 md:col-span-1 text-xs text-red-600 hover:text-red-800 font-medium">Delete</button>
                  )}
                </div>
              ))}
              <div className="md:col-span-5 flex gap-2"><button type="button" onClick={()=>setTxRows(prev=>[...prev,{id:'tx-'+Date.now(),date:new Date().toISOString().slice(0,10), amount:'', category:'Food', description:'', parent:'', currency:currency}])} className="px-4 py-2 rounded-xl bg-[#D4AF37] text-white text-sm hover:bg-[#B45309] font-semibold transition">+ Add Row</button></div>
              <div className="md:col-span-5 flex justify-end"><button type="submit" className="px-6 py-2.5 rounded-xl bg-[#0D4038] text-white font-bold hover:bg-[#13584C] transition">Save Transactions</button></div>
            </form>
          )}

          {viewMode !== 'all' && groups && groups.length > 0 && (
            <div className="mb-6">
              {groups.slice(pageIndex*3, (pageIndex+1)*3).map(g => (
                <div key={g.sortKey} className="mb-6">
                  <h3 className="text-xl font-extrabold text-[#0D4038] mb-3">{g.label}</h3>
                  <div className="bg-white rounded-2xl shadow-xl border border-[#E8E4DD] overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-[#F5F1EB] text-[#64748B] font-semibold uppercase text-xs tracking-wider"><tr><th className="px-6 py-4">Date</th><th className="px-6 py-4">Category</th><th className="px-6 py-4">Description</th><th className="px-6 py-4">Parent</th><th className="px-6 py-4">Amount</th><th className="px-6 py-4"></th></tr></thead>
                      <tbody className="divide-y divide-[#E8E4DD]">
                        {g.items.map(t => (
                          <tr key={t.id} className="hover:bg-white transition">
                            <td className="px-6 py-4 text-[#64748B]">{t.date}</td>
                            <td className="px-6 py-4"><span className="inline-block px-2.5 py-0.5 rounded-md bg-[#FDFBF7] text-[#D4AF37] text-xs font-semibold">{t.category}</span></td>
                            <td className="px-6 py-4">{t.description}</td>
                            <td className="px-6 py-4 text-[#64748B]">{t.parent}</td>
                            <td className="px-6 py-4 font-bold text-[#0D4038]">{fmt(t.amount, t.currency)}</td>
                            <td className="px-6 py-4">{!isChild && <button onClick={()=>setTransactions(transactions.filter(x=>x.id!==t.id))} className="text-xs text-red-600 hover:text-red-800 font-medium">Delete</button>}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-[#FDFBF7] text-[#0D4038] font-semibold"><tr><td colSpan={4} className="px-6 py-3 text-right uppercase text-xs tracking-wider">Subtotal ({SYMBOL[currency]})</td><td className="px-6 py-3 font-extrabold">{fmt(g.items.filter(t => t.currency === currency).reduce((s,t)=>s+t.amount,0), currency)}</td><td></td></tr></tfoot>
                    </table>
                  </div>
                </div>
              ))}
              <div className="flex gap-2 mt-4">
                <button disabled={pageIndex<=0} onClick={()=>setPageIndex(p=>Math.max(0,p-1))} className="px-4 py-2 rounded-xl bg-[#0D4038] text-white text-sm font-semibold hover:bg-[#13584C] disabled:opacity-40">Previous</button>
                <span className="self-center text-sm text-[#64748B] font-medium">Page {pageIndex+1} of {Math.ceil(groups.length/3)}</span>
                <button disabled={(pageIndex+1)*3 >= groups.length} onClick={()=>setPageIndex(p=>p+1)} className="px-4 py-2 rounded-xl bg-[#0D4038] text-white text-sm font-semibold hover:bg-[#13584C] disabled:opacity-40">Next</button>
              </div>
            </div>
          )}

          {viewMode === 'all' && (
            categoryFiltered.length > 0 ? (
              <div className="bg-white rounded-2xl shadow-xl border border-[#E8E4DD] overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#F5F1EB] text-[#64748B] font-semibold uppercase text-xs tracking-wider"><tr><th className="px-6 py-4">Date</th><th className="px-6 py-4">Category</th><th className="px-6 py-4">Description</th><th className="px-6 py-4">Parent</th><th className="px-6 py-4">Amount</th><th className="px-6 py-4"></th></tr></thead>
                  <tbody className="divide-y divide-[#E8E4DD]">
                    {categoryFiltered.map(t => (
                      <tr key={t.id} className="hover:bg-white transition">
                        <td className="px-6 py-4 text-[#64748B]">{t.date}</td>
                        <td className="px-6 py-4"><span className="inline-block px-2.5 py-0.5 rounded-md bg-[#FDFBF7] text-[#D4AF37] text-xs font-semibold">{t.category}</span></td>
                        <td className="px-6 py-4">{t.description}</td>
                        <td className="px-6 py-4 text-[#64748B]">{t.parent}</td>
                        <td className="px-6 py-4 font-bold text-[#0D4038]">{fmt(t.amount, t.currency)}</td>
                        <td className="px-6 py-4">{!isChild && <button onClick={()=>setTransactions(transactions.filter(x=>x.id!==t.id))} className="text-xs text-red-600 hover:text-red-800 font-medium">Delete</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-[#FDFBF7] text-[#0D4038] font-semibold"><tr><td colSpan={4} className="px-6 py-3 text-right uppercase text-xs tracking-wider">Subtotal ({SYMBOL[currency]})</td><td className="px-6 py-3 font-extrabold">{fmt(selectedTotal)}</td><td></td></tr></tfoot>
                  <tfoot className="bg-[#FDFBF7] text-[#0D4038] font-semibold"><tr><td colSpan={4} className="px-6 py-3 text-right uppercase text-xs tracking-wider">Overall Total</td><td className="px-6 py-3 font-extrabold">{fmt(overallTotal)}</td><td></td></tr></tfoot>
                </table>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-xl border border-[#E8E4DD] p-16 text-center">
                <p className="text-[#94A3B8] mb-2">No transactions yet.</p>
                <p className="text-sm text-[#94A3B8]">Click <strong className="text-[#D4AF37]">+ Add Transaction</strong> to record your first entry.</p>
              </div>
            )
          )}
        </main>
      )}
    </div>
  );
}