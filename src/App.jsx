import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { auth, googleProvider, db } from './firebase';
import { signInWithPopup, onAuthStateChanged, signOut, deleteUser } from "firebase/auth";
import {
  collection, query, onSnapshot, addDoc, deleteDoc, updateDoc, doc, orderBy,
  setDoc, getDoc, getDocs, writeBatch
} from "firebase/firestore";
import { format, differenceInDays, differenceInCalendarDays } from 'date-fns';
import { ro } from 'date-fns/locale';
import { CATEGORIES, getCategoryById, QUICK_TEMPLATES, COUPLE_SUGGESTIONS } from './utils/categories';
import { THEMES, getThemeById, applyTheme } from './utils/themes';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import {
  FaPlus, FaGoogle, FaTrash, FaCalendarAlt, FaBell, FaTimes, FaSearch,
  FaChevronLeft, FaEdit, FaSignOutAlt, FaCheck, FaSortAmountDown,
  FaClock, FaExclamationTriangle, FaCheckCircle, FaTimesCircle, FaEllipsisV,
  FaCog, FaPalette, FaUsers, FaUser, FaHeart, FaDownload,
  FaTrashAlt, FaUserTimes, FaMobileAlt, FaArrowLeft,
  FaShieldAlt, FaBolt, FaRocket, FaGift
} from 'react-icons/fa';

// ── Helpers ───────────────────────────────────────────────────
const ease = [0.4, 0, 0.2, 1];
const spring = { type: 'spring', damping: 28, stiffness: 300 };

function getStatusInfo(d) {
  if (d < 0) return { label: 'Expirat', cls: 'badge-expired', color: 'rgba(255,255,255,0.3)', Icon: FaTimesCircle };
  if (d === 0) return { label: 'AZI!', cls: 'badge-urgent', color: 'var(--danger)', Icon: FaExclamationTriangle };
  if (d <= 7) return { label: `${d}z`, cls: 'badge-urgent', color: 'var(--danger)', Icon: FaExclamationTriangle };
  if (d <= 30) return { label: `${d}z`, cls: 'badge-warning', color: 'var(--warning)', Icon: FaClock };
  return { label: `${d}z`, cls: 'badge-safe', color: 'var(--success)', Icon: FaCheckCircle };
}

function getProgress(created, date) {
  if (!created) return 0;
  const t = differenceInCalendarDays(new Date(date), new Date(created));
  const e = differenceInCalendarDays(new Date(), new Date(created));
  return t <= 0 ? 100 : Math.min(Math.max((e / t) * 100, 0), 100);
}

function openGoogleCalendar(r) {
  const s = r.date.replace(/-/g, '') + 'T090000Z';
  const e = r.date.replace(/-/g, '') + 'T100000Z';
  window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('⏰ ' + r.title)}&dates=${s}/${e}&details=${encodeURIComponent(r.notes || 'Adăugat din Remindly')}`, '_blank');
}

function downloadIcs(r) {
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Remindly//RO',
    'BEGIN:VEVENT',
    `SUMMARY:⏰ ${r.title}`,
    `DTSTART:${r.date.replace(/-/g, '')}T090000Z`,
    `DTEND:${r.date.replace(/-/g, '')}T100000Z`,
    `DESCRIPTION:${r.notes || 'Adăugat din Remindly'}`,
    'BEGIN:VALARM', 'TRIGGER:-P7D', 'ACTION:DISPLAY', 'DESCRIPTION:Reminder', 'END:VALARM',
    'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:Reminder', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'
  ].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = `${r.title}.ics`; a.click();
}

// ── Progress Ring ─────────────────────────────────────────────
function Ring({ progress, size = 50, sw = 3, color, children }) {
  const r = (size - sw) / 2, c = r * 2 * Math.PI;
  const o = c - (Math.min(Math.max(progress, 0), 100) / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} strokeWidth={sw} stroke="rgba(255,255,255,0.06)" fill="none" />
        <circle cx={size/2} cy={size/2} r={r} strokeWidth={sw} stroke={color} fill="none"
          strokeLinecap="round" style={{ strokeDasharray: c, strokeDashoffset: o, transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────
function Confirm({ open, title, msg, onYes, onNo }) {
  if (!open) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }} onClick={onNo}>
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="liquid-glass-strong rounded-3xl p-6 max-w-sm w-full"
        onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>{msg}</p>
        <div className="flex gap-3">
          <button onClick={onNo} className="btn-glass flex-1">Anulează</button>
          <button onClick={onYes} className="flex-1 font-bold rounded-xl py-3 text-sm text-white"
            style={{ background: 'var(--danger)' }}>Confirmă</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Ambient Background ────────────────────────────────────────
function AmbientBG() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <div className="ambient-orb" style={{ width: 400, height: 400, top: '-10%', left: '-10%', background: 'var(--accent)', animation: 'float 8s ease-in-out infinite' }} />
      <div className="ambient-orb" style={{ width: 350, height: 350, bottom: '5%', right: '-15%', background: 'var(--accent-2)', animation: 'float 10s ease-in-out infinite 3s' }} />
      <div className="ambient-orb" style={{ width: 250, height: 250, top: '50%', left: '60%', background: 'var(--accent)', opacity: 0.08, animation: 'float 12s ease-in-out infinite 1s' }} />
    </div>
  );
}

// ── Login Screen ──────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <AmbientBG />
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease }}
        className="relative z-10 text-center max-w-sm w-full">
        <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
          className="w-28 h-28 mx-auto mb-10 rounded-[32px] flex items-center justify-center relative"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', boxShadow: '0 0 60px var(--accent-glow)', animation: 'pulse-glow 3s ease infinite' }}>
          <FaBell className="text-white text-4xl" />
          <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black"
            style={{ background: 'var(--danger)', boxShadow: '0 0 15px rgba(255,59,92,0.4)' }}>!</div>
        </motion.div>

        <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="text-6xl font-black mb-4 tracking-tight gradient-text">Remindly</motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
          className="text-lg mb-14 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Nu mai uita de documente importante.<br />
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>RCA · ITP · Buletin · Pașaport</span>
        </motion.p>

        <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={onLogin}
          className="w-full liquid-glass-strong rounded-2xl px-6 py-4 font-bold text-base flex items-center justify-center gap-3 transition-all">
          <FaGoogle className="text-xl" /> Continuă cu Google
        </motion.button>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}
          className="flex items-center justify-center gap-4 text-xs mt-8" style={{ color: 'var(--text-muted)' }}>
          <span className="flex items-center gap-1"><FaShieldAlt size={10} /> Securizat</span>
          <span>·</span>
          <span className="flex items-center gap-1"><FaBolt size={10} /> Instant</span>
          <span>·</span>
          <span className="flex items-center gap-1"><FaMobileAlt size={10} /> PWA</span>
        </motion.div>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }}
          className="text-[10px] mt-12" style={{ color: 'var(--text-muted)' }}>
          © {new Date().getFullYear()} Cristian Puravu. Toate drepturile rezervate.
        </motion.p>
      </motion.div>
    </div>
  );
}

// ── Stats Bar ─────────────────────────────────────────────────
function Stats({ reminders }) {
  const s = useMemo(() => {
    let exp = 0, urg = 0, ok = 0;
    reminders.forEach(r => { const d = differenceInDays(new Date(r.date), new Date()); d < 0 ? exp++ : d <= 30 ? urg++ : ok++; });
    return [
      { label: 'Total', v: reminders.length, emoji: '📋', color: 'var(--accent)' },
      { label: 'Urgente', v: urg, emoji: '⚠️', color: 'var(--warning)' },
      { label: 'Expirate', v: exp, emoji: '❌', color: 'var(--danger)' },
      { label: 'OK', v: ok, emoji: '✅', color: 'var(--success)' },
    ];
  }, [reminders]);

  return (
    <div className="grid grid-cols-4 gap-2 px-4 py-3">
      {s.map((x, i) => (
        <motion.div key={x.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07, ease }}
          className="liquid-glass-card !rounded-2xl p-3 text-center">
          <div className="text-lg mb-0.5">{x.emoji}</div>
          <div className="text-2xl font-black" style={{ color: x.color }}>{x.v}</div>
          <div className="text-[8px] font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--text-muted)' }}>{x.label}</div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Quick Add ─────────────────────────────────────────────────
function QuickAdd({ onAdd, existing, coupleMode }) {
  const items = (coupleMode
    ? [...QUICK_TEMPLATES.filter(t => t.popular), ...COUPLE_SUGGESTIONS.slice(0, 2)]
    : QUICK_TEMPLATES.filter(t => t.popular)
  ).filter(t => !existing.includes(t.title));
  if (!items.length) return null;

  return (
    <div className="px-4 py-2">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
          <FaRocket size={9} style={{ color: 'var(--accent)' }} />
        </div>
        <span className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-secondary)' }}>Adaugă Rapid</span>
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {items.map((t, i) => (
          <motion.button key={t.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }} whileTap={{ scale: 0.95 }}
            onClick={() => onAdd(t)}
            className="liquid-glass-card !rounded-2xl shrink-0 flex items-center gap-3 px-4 py-3 active:scale-95">
            <span className="text-xl">{t.icon}</span>
            <div className="text-left">
              <div className="text-[11px] font-bold whitespace-nowrap">{t.title}</div>
              <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{t.desc}</div>
            </div>
            <FaPlus size={9} style={{ color: 'var(--accent)' }} />
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ── Welcome / Empty State ─────────────────────────────────────
function Welcome({ onAdd, name, coupleMode }) {
  const popular = QUICK_TEMPLATES.filter(t => t.popular);
  const rest = QUICK_TEMPLATES.filter(t => !t.popular);

  return (
    <div className="px-4 py-4 space-y-6">
      {/* Hero card */}
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ ease }}
        className="rounded-3xl p-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', boxShadow: '0 12px 60px var(--accent-glow)' }}>
        <div className="absolute inset-0 opacity-10"
          style={{ background: 'radial-gradient(circle at 30% 20%, white 0%, transparent 60%)' }} />
        <div className="relative z-10">
          <div className="text-4xl mb-3" style={{ animation: 'float 3s ease-in-out infinite' }}>🚀</div>
          <h2 className="text-2xl font-black text-white mb-2">Bine ai venit, {name}!</h2>
          <p className="text-sm text-white/70 leading-relaxed mb-5">
            Adaugă documentele tale cu un singur tap.<br />Te alertăm automat înainte să expire.
          </p>
          <div className="flex flex-wrap gap-3 text-[10px] text-white/50 font-semibold">
            <span className="flex items-center gap-1"><FaCheckCircle size={9} /> Auto Calendar</span>
            <span className="flex items-center gap-1"><FaBell size={9} /> Notificări</span>
            <span className="flex items-center gap-1"><FaShieldAlt size={9} /> Privat</span>
          </div>
        </div>
      </motion.div>

      {/* Popular */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
            <FaGift size={9} style={{ color: 'var(--accent)' }} />
          </div>
          <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>Remindere Populare</span>
          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>1 TAP</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {popular.map((t, i) => (
            <motion.button key={t.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.05, ease }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onAdd(t)}
              className="liquid-glass-card !rounded-2xl p-3.5 flex items-center gap-3 text-left">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                style={{ background: 'var(--accent-glow)' }}>{t.icon}</div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold truncate">{t.title}</div>
                <div className="text-[9px] truncate" style={{ color: 'var(--text-muted)' }}>{t.desc}</div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* All templates */}
      <details>
        <summary className="text-[11px] font-bold cursor-pointer py-1" style={{ color: 'var(--accent)' }}>
          ▸ Toate templateurile ({QUICK_TEMPLATES.length})
        </summary>
        <div className="grid grid-cols-1 gap-1.5 mt-2">
          {rest.map((t, i) => (
            <motion.button key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onAdd(t)}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="text-base">{t.icon}</span>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-[11px] font-bold">{t.title}</div>
                <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{t.desc}</div>
              </div>
              <FaPlus size={10} style={{ color: 'var(--accent)' }} />
            </motion.button>
          ))}
        </div>
      </details>

      {coupleMode && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FaHeart size={11} style={{ color: 'var(--danger)' }} />
            <span className="text-xs font-bold">Pentru Cuplu</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {COUPLE_SUGGESTIONS.map((t, i) => (
              <motion.button key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => onAdd(t)}
                className="liquid-glass-card !rounded-2xl p-3 flex items-center gap-2.5 text-left">
                <span className="text-base">{t.icon}</span>
                <div className="text-[11px] font-bold truncate">{t.title}</div>
              </motion.button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Reminder Card ─────────────────────────────────────────────
function Card({ item, idx, onEdit, onDel, coupleMode }) {
  const [menu, setMenu] = useState(false);
  const ref = useRef(null);
  const days = differenceInDays(new Date(item.date), new Date());
  const st = getStatusInfo(days);
  const prog = getProgress(item.createdAt, item.date);
  const cat = getCategoryById(item.category);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setMenu(false); };
    if (menu) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [menu]);

  return (
    <motion.div layout initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -80, scale: 0.9 }} transition={{ duration: 0.35, delay: idx * 0.03, ease }}
      className="liquid-glass-card overflow-hidden">
      {/* Accent line */}
      <div className="h-[2px]" style={{ background: `linear-gradient(90deg, var(--accent), var(--accent-2))`, opacity: 0.6 }} />

      <div className="p-4 flex items-start gap-3.5">
        <Ring progress={prog} size={50} sw={3} color={st.color}>
          <span className="text-[11px] font-black" style={{ color: st.color }}>
            {days < 0 ? '!' : days}
          </span>
        </Ring>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span className={`badge ${st.cls}`}><st.Icon size={8} /> {st.label}</span>
            <span className="badge" style={{ background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid rgba(99,102,241,0.15)' }}>
              {cat.emoji}
            </span>
            {coupleMode && item.forWhom && item.forWhom !== 'me' && (
              <span className="badge" style={{ background: 'rgba(255,59,92,0.08)', color: 'var(--danger)', border: '1px solid rgba(255,59,92,0.12)' }}>
                {item.forWhom === 'partner' ? '💑' : '👫'}
              </span>
            )}
          </div>
          <h3 className="font-bold text-[15px] leading-tight truncate mb-0.5">{item.title}</h3>
          {item.notes && <p className="text-[11px] leading-relaxed line-clamp-1 mb-1" style={{ color: 'var(--text-muted)' }}>{item.notes}</p>}
          <span className="text-[10px] font-semibold flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
            <FaCalendarAlt size={8} /> {format(new Date(item.date), 'dd MMM yyyy', { locale: ro })}
          </span>
        </div>

        <div className="relative" ref={ref}>
          <button onClick={() => setMenu(!menu)} className="p-2 rounded-xl transition-colors" style={{ color: 'var(--text-muted)' }}>
            <FaEllipsisV size={14} />
          </button>
          <AnimatePresence>
            {menu && (
              <motion.div initial={{ opacity: 0, scale: 0.9, y: -5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                className="absolute right-0 top-full mt-1 liquid-glass-strong rounded-2xl py-1.5 min-w-[180px] z-30">
                {[
                  { icon: FaEdit, label: 'Editează', fn: () => onEdit(item) },
                  { icon: FaGoogle, label: 'Google Calendar', fn: () => { openGoogleCalendar(item); toast.success('Calendar deschis! 📅'); } },
                  { icon: FaCalendarAlt, label: 'Export .ics', fn: () => { downloadIcs(item); toast.success('.ics descărcat!'); } },
                  null,
                  { icon: FaTrash, label: 'Șterge', fn: () => onDel(item), danger: true },
                ].map((a, i) => a === null
                  ? <div key={i} className="h-px mx-3 my-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  : <button key={i} onClick={() => { a.fn(); setMenu(false); }}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] w-full transition-colors font-medium"
                      style={{ color: a.danger ? 'var(--danger)' : 'var(--text-secondary)' }}>
                      <a.icon size={12} /> {a.label}
                    </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// ── Add / Edit Modal ──────────────────────────────────────────
function Modal({ user, editItem, onClose, coupleMode, partnerName, settings }) {
  const [step, setStep] = useState(editItem ? 3 : 1);
  const [cat, setCat] = useState(editItem ? getCategoryById(editItem.category) : null);
  const [form, setForm] = useState(editItem
    ? { title: editItem.title, date: editItem.date, notes: editItem.notes || '', remindDays: editItem.remindDaysBefore || 7, forWhom: editItem.forWhom || 'me', addToCalendar: false }
    : { title: '', date: '', notes: '', remindDays: settings.defaultRemindDays || 7, forWhom: 'me', addToCalendar: true }
  );
  const isEdit = !!editItem;

  const save = async () => {
    if (!form.title || !form.date) return toast.error('Completează titlul și data!');
    try {
      const data = { title: form.title, date: form.date, notes: form.notes, category: cat?.id || 'custom', remindDaysBefore: Number(form.remindDays) || 0, forWhom: coupleMode ? form.forWhom : 'me' };
      if (isEdit) {
        await updateDoc(doc(db, 'users', user.uid, 'reminders', editItem.id), data);
        toast.success('Actualizat! ✏️');
      } else {
        data.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'users', user.uid, 'reminders'), data);
        toast.success('Adăugat! 🎉');
        // Auto calendar
        if (form.addToCalendar) {
          openGoogleCalendar(data);
          toast.success('Adăugat în Google Calendar! 📅', { duration: 3000 });
        }
      }
      onClose();
    } catch (e) { toast.error('Eroare.'); console.error(e); }
  };

  const pickSub = (sub) => {
    const d = new Date(); d.setDate(d.getDate() + (sub.defaultDays || 30));
    setForm({ ...form, title: sub.label, date: d.toISOString().split('T')[0] });
    setStep(3);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)' }} onClick={onClose}>
      <motion.div initial={{ y: 120 }} animate={{ y: 0 }} exit={{ y: 120 }} transition={spring}
        className="w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden liquid-glass-strong"
        style={{ borderRadius: '28px 28px 0 0' }}
        onClick={e => e.stopPropagation()}>
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} /></div>

        <div className="flex items-center justify-between px-5 py-3">
          <h3 className="text-lg font-black">{isEdit ? '✏️ Editează' : '➕ Adaugă Reminder'}</h3>
          <button onClick={onClose} className="p-2 rounded-xl" style={{ color: 'var(--text-muted)' }}><FaTimes size={16} /></button>
        </div>

        {/* Step dots */}
        {!isEdit && (
          <div className="flex items-center justify-center gap-2 pb-3">
            {[1,2,3].map(s => (
              <div key={s} className="h-1 rounded-full transition-all duration-500"
                style={{ width: step === s ? 24 : 8, background: step >= s ? 'var(--accent)' : 'rgba(255,255,255,0.08)' }} />
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 pb-6">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}
                className="grid grid-cols-2 gap-2.5 pt-2">
                {CATEGORIES.map((c, i) => {
                  const I = c.icon;
                  return (
                    <motion.button key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }} whileTap={{ scale: 0.96 }}
                      onClick={() => { setCat(c); c.id === 'custom' ? setStep(3) : setStep(2); }}
                      className="liquid-glass-card !rounded-2xl p-4 flex flex-col items-center justify-center gap-2.5 h-24">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.gradient} flex items-center justify-center text-white shadow-lg`}>
                        <I size={16} />
                      </div>
                      <span className="text-[10px] font-bold" style={{ color: 'var(--text-secondary)' }}>{c.label}</span>
                    </motion.button>
                  );
                })}
              </motion.div>
            )}

            {step === 2 && cat && (
              <motion.div key="s2" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}>
                <button onClick={() => setStep(1)} className="flex items-center gap-1.5 text-[12px] mb-4 font-semibold" style={{ color: 'var(--text-muted)' }}>
                  <FaChevronLeft size={9} /> Categorii
                </button>
                <div className="space-y-2">
                  {cat.subcategories.map((sub, i) => (
                    <motion.button key={sub.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }} whileTap={{ scale: 0.98 }}
                      onClick={() => pickSub(sub)}
                      className="w-full text-left p-4 rounded-2xl flex items-center gap-3 transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span className="text-xl">{sub.icon}</span>
                      <div>
                        <div className="text-[13px] font-bold">{sub.label}</div>
                        {sub.defaultDays > 0 && <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{sub.defaultDays} zile</div>}
                      </div>
                    </motion.button>
                  ))}
                  <button onClick={() => { setForm({ ...form, title: '' }); setStep(3); }}
                    className="w-full text-left p-4 rounded-2xl flex items-center gap-3 border-2 border-dashed"
                    style={{ borderColor: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}>
                    <FaPlus size={12} /> Custom
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}
                className="space-y-5 pt-1">
                {!isEdit && (
                  <button onClick={() => cat?.subcategories?.length ? setStep(2) : setStep(1)}
                    className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                    <FaChevronLeft size={9} /> Înapoi
                  </button>
                )}

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2 block" style={{ color: 'var(--text-muted)' }}>Titlu</label>
                  <input className="input-glass" placeholder="ex: RCA Dacia Logan" value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })} />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2 block" style={{ color: 'var(--text-muted)' }}>Data Expirării</label>
                  <input type="date" className="input-glass" value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>

                {coupleMode && (
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2 block" style={{ color: 'var(--text-muted)' }}>Pentru cine?</label>
                    <div className="flex gap-2">
                      {[
                        { id: 'me', label: 'Eu', icon: '👤' },
                        { id: 'partner', label: partnerName || 'Partener/ă', icon: '💑' },
                        { id: 'both', label: 'Amândoi', icon: '👫' },
                      ].map(w => (
                        <button key={w.id} onClick={() => setForm({ ...form, forWhom: w.id })}
                          className="flex-1 py-3 rounded-xl text-[11px] font-bold text-center transition-all"
                          style={{
                            background: form.forWhom === w.id ? 'var(--accent)' : 'rgba(255,255,255,0.04)',
                            color: form.forWhom === w.id ? 'white' : 'var(--text-secondary)',
                            border: `1.5px solid ${form.forWhom === w.id ? 'var(--accent)' : 'rgba(255,255,255,0.06)'}`,
                            boxShadow: form.forWhom === w.id ? '0 4px 20px var(--accent-glow)' : 'none',
                          }}>
                          {w.icon} {w.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2 block" style={{ color: 'var(--text-muted)' }}>Remind cu X zile înainte</label>
                  <div className="flex gap-2">
                    {[0, 3, 7, 14, 30].map(d => (
                      <button key={d} onClick={() => setForm({ ...form, remindDays: d })}
                        className="flex-1 py-2.5 rounded-xl text-[11px] font-bold transition-all"
                        style={{
                          background: Number(form.remindDays) === d ? 'var(--accent)' : 'rgba(255,255,255,0.04)',
                          color: Number(form.remindDays) === d ? 'white' : 'var(--text-secondary)',
                          border: `1.5px solid ${Number(form.remindDays) === d ? 'var(--accent)' : 'rgba(255,255,255,0.06)'}`,
                          boxShadow: Number(form.remindDays) === d ? '0 4px 20px var(--accent-glow)' : 'none',
                        }}>
                        {d === 0 ? 'Off' : `${d}z`}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2 block" style={{ color: 'var(--text-muted)' }}>Notițe</label>
                  <textarea className="input-glass resize-none h-20" placeholder="Detalii opționale..."
                    value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                </div>

                {/* Auto Calendar Toggle */}
                {!isEdit && (
                  <div className="flex items-center justify-between py-3 px-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-2.5">
                      <FaGoogle size={14} style={{ color: 'var(--accent)' }} />
                      <div>
                        <div className="text-[12px] font-bold">Adaugă în Google Calendar</div>
                        <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Se deschide automat la salvare</div>
                      </div>
                    </div>
                    <button onClick={() => setForm({ ...form, addToCalendar: !form.addToCalendar })}
                      className="w-11 h-6 rounded-full transition-all relative"
                      style={{ background: form.addToCalendar ? 'var(--accent)' : 'rgba(255,255,255,0.08)', boxShadow: form.addToCalendar ? '0 0 15px var(--accent-glow)' : 'none' }}>
                      <div className="w-4.5 h-4.5 rounded-full absolute top-[3px] transition-all"
                        style={{ width: 18, height: 18, background: 'white', left: form.addToCalendar ? '22px' : '3px' }} />
                    </button>
                  </div>
                )}

                <motion.button whileTap={{ scale: 0.98 }} onClick={save} className="btn-glow w-full flex items-center justify-center gap-2 py-4">
                  {isEdit ? <><FaCheck /> Salvează</> : <><FaPlus /> Adaugă Reminder</>}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Settings Page ─────────────────────────────────────────────
function Settings({ user, settings, update, onBack, delAll, delAccount, installPrompt }) {
  const [pName, setPName] = useState(settings.partnerName || '');
  const [confirm, setConfirm] = useState(null);

  const handleInstall = async () => {
    if (installPrompt) { installPrompt.prompt(); } 
    else toast('Meniu browser → "Add to Home Screen"', { icon: '📱', duration: 4000 });
  };

  const Section = ({ icon, title, children }) => (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-3 px-1">{icon}
        <span className="text-[12px] font-bold">{title}</span>
      </div>
      <div className="liquid-glass-card !rounded-2xl p-4 space-y-4">{children}</div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
      <div className="liquid-glass sticky top-0 z-30 px-4 py-3 flex items-center gap-3" style={{ borderRadius: 0 }}>
        <button onClick={onBack} className="p-2 rounded-xl" style={{ color: 'var(--text-secondary)' }}><FaArrowLeft size={16} /></button>
        <h2 className="text-lg font-black">Setări</h2>
      </div>

      <div className="px-4 py-4">
        <Section icon={<FaUser size={12} style={{ color: 'var(--accent)' }} />} title="Profil">
          <div className="flex items-center gap-3">
            <img src={user.photoURL} alt="" className="w-12 h-12 rounded-2xl object-cover" style={{ border: '2px solid var(--accent)', boxShadow: '0 0 20px var(--accent-glow)' }} />
            <div>
              <div className="text-sm font-bold">{user.displayName}</div>
              <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{user.email}</div>
            </div>
          </div>
        </Section>

        <Section icon={<FaPalette size={12} style={{ color: 'var(--accent)' }} />} title="Culoare Accent">
          <div className="grid grid-cols-4 gap-2">
            {THEMES.map(t => (
              <button key={t.id} onClick={() => update({ theme: t.id })}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all"
                style={{ border: `2px solid ${settings.theme === t.id ? 'var(--accent)' : 'rgba(255,255,255,0.06)'}`, background: settings.theme === t.id ? 'var(--accent-glow)' : 'transparent' }}>
                <div className="w-8 h-8 rounded-lg" style={{ background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`, boxShadow: settings.theme === t.id ? `0 0 15px ${t.glow}` : 'none' }}>
                  {settings.theme === t.id && <div className="w-full h-full flex items-center justify-center"><FaCheck size={10} className="text-white" /></div>}
                </div>
                <span className="text-[8px] font-bold" style={{ color: settings.theme === t.id ? 'var(--accent)' : 'var(--text-muted)' }}>{t.name}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section icon={<FaUsers size={12} style={{ color: 'var(--accent)' }} />} title="Mod Utilizare">
          <div className="flex gap-2">
            {[{ id: false, label: 'Individual', icon: <FaUser size={11} /> }, { id: true, label: 'Cuplu', icon: <FaHeart size={11} /> }].map(m => (
              <button key={String(m.id)} onClick={() => update({ coupleMode: m.id })}
                className="flex-1 p-3.5 rounded-xl text-center transition-all font-bold text-[13px]"
                style={{
                  background: settings.coupleMode === m.id ? 'var(--accent)' : 'rgba(255,255,255,0.04)',
                  color: settings.coupleMode === m.id ? 'white' : 'var(--text-secondary)',
                  border: `1.5px solid ${settings.coupleMode === m.id ? 'var(--accent)' : 'rgba(255,255,255,0.06)'}`,
                  boxShadow: settings.coupleMode === m.id ? '0 4px 20px var(--accent-glow)' : 'none',
                }}>
                <div className="flex items-center justify-center gap-1.5">{m.icon} {m.label}</div>
              </button>
            ))}
          </div>
          {settings.coupleMode && (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Numele partenerului/ei</label>
              <input className="input-glass" placeholder="ex: Maria" value={pName}
                onChange={e => setPName(e.target.value)} onBlur={() => update({ partnerName: pName })} />
            </div>
          )}
        </Section>

        <Section icon={<FaBell size={12} style={{ color: 'var(--accent)' }} />} title="Notificări">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[13px] font-bold">Notificări Push</div>
              <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Alerte înainte de expirare</div>
            </div>
            <button onClick={async () => {
              if (!('Notification' in window)) return toast.error('Browser-ul nu suportă notificări.');
              const p = await Notification.requestPermission();
              update({ notificationsEnabled: p === 'granted' });
              toast(p === 'granted' ? 'Notificări activate! 🔔' : 'Blocate de browser.');
            }}
              className="w-12 h-7 rounded-full transition-all relative"
              style={{ background: settings.notificationsEnabled ? 'var(--accent)' : 'rgba(255,255,255,0.08)', boxShadow: settings.notificationsEnabled ? '0 0 15px var(--accent-glow)' : 'none' }}>
              <div className="rounded-full absolute top-[3px] transition-all"
                style={{ width: 20, height: 20, background: 'white', left: settings.notificationsEnabled ? '26px' : '3px' }} />
            </button>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Zile de remind implicit</label>
            <div className="flex gap-2">
              {[3, 7, 14, 30].map(d => (
                <button key={d} onClick={() => update({ defaultRemindDays: d })}
                  className="flex-1 py-2 rounded-xl text-[11px] font-bold transition-all"
                  style={{
                    background: (settings.defaultRemindDays || 7) === d ? 'var(--accent)' : 'rgba(255,255,255,0.04)',
                    color: (settings.defaultRemindDays || 7) === d ? 'white' : 'var(--text-secondary)',
                    border: `1.5px solid ${(settings.defaultRemindDays || 7) === d ? 'var(--accent)' : 'rgba(255,255,255,0.06)'}`,
                  }}>{d}z</button>
              ))}
            </div>
          </div>
        </Section>

        <Section icon={<FaMobileAlt size={12} style={{ color: 'var(--accent)' }} />} title="Instalare PWA">
          <button onClick={handleInstall} className="btn-glow w-full flex items-center justify-center gap-2">
            <FaDownload size={13} /> Instalează pe telefon
          </button>
          <p className="text-[9px] text-center" style={{ color: 'var(--text-muted)' }}>Funcționează ca o aplicație nativă</p>
        </Section>

        <Section icon={<FaExclamationTriangle size={12} style={{ color: 'var(--danger)' }} />} title="Zona Periculoasă">
          {[
            { label: 'Șterge toate reminderele', icon: FaTrashAlt, fn: () => setConfirm('data') },
            { label: 'Șterge contul complet', icon: FaUserTimes, fn: () => setConfirm('account') },
          ].map(b => (
            <button key={b.label} onClick={b.fn}
              className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-[13px] font-bold transition-all"
              style={{ background: 'rgba(255,59,92,0.06)', color: 'var(--danger)', border: '1px solid rgba(255,59,92,0.12)' }}>
              <b.icon size={13} /> {b.label}
            </button>
          ))}
        </Section>

        {/* Footer */}
        <div className="text-center py-8" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="text-xl font-black gradient-text mb-1">Remindly</div>
          <div className="text-[10px] mb-0.5" style={{ color: 'var(--text-muted)' }}>v1.0.0</div>
          <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>© {new Date().getFullYear()} Cristian Puravu</div>
          <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Made with ❤️ in Romania 🇷🇴</div>
        </div>
      </div>

      <Confirm open={confirm === 'data'} title="Șterge toate reminderele"
        msg="Acțiune permanentă. Toate reminderele vor fi șterse."
        onYes={() => { delAll(); setConfirm(null); }} onNo={() => setConfirm(null)} />
      <Confirm open={confirm === 'account'} title="Șterge contul"
        msg="Contul, setările și toate datele vor fi șterse permanent."
        onYes={() => { delAccount(); setConfirm(null); }} onNo={() => setConfirm(null)} />
    </motion.div>
  );
}

// ── Main App ──────────────────────────────────────────────────
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('urgency');
  const [showSearch, setShowSearch] = useState(false);
  const [confirm, setConfirm] = useState({ open: false });
  const [page, setPage] = useState('home');
  const [settings, setSettings] = useState({ theme: 'indigo', coupleMode: false, partnerName: '', notificationsEnabled: false, defaultRemindDays: 7 });
  const [installPrompt, setInstallPrompt] = useState(null);
  const [profileMenu, setProfileMenu] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const h = e => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', h);
    return () => window.removeEventListener('beforeinstallprompt', h);
  }, []);

  useEffect(() => { applyTheme(settings.theme); }, [settings.theme]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u); setLoading(false);
      if (u) { fetchReminders(u.uid); loadSettings(u.uid); }
    });
    return () => unsub();
  }, []);

  // Notifications
  useEffect(() => {
    if (!reminders.length || !settings.notificationsEnabled || !('Notification' in window) || Notification.permission !== 'granted') return;
    const key = `remindly_n_${new Date().toDateString()}`;
    const done = JSON.parse(localStorage.getItem(key) || '[]');
    reminders.forEach(r => {
      if (done.includes(r.id)) return;
      const d = differenceInDays(new Date(r.date), new Date());
      const rb = r.remindDaysBefore || settings.defaultRemindDays || 7;
      if (d >= 0 && d <= rb) {
        new Notification(`⏰ ${r.title}`, { body: d === 0 ? 'Expiră AZI!' : `Expiră în ${d} zile`, icon: '/icon-192.png', tag: r.id });
        done.push(r.id);
      }
    });
    localStorage.setItem(key, JSON.stringify(done));
  }, [reminders, settings.notificationsEnabled]);

  useEffect(() => {
    const h = e => { if (profileRef.current && !profileRef.current.contains(e.target)) setProfileMenu(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);

  const loadSettings = async (uid) => {
    try { const s = await getDoc(doc(db, 'users', uid)); if (s.exists()) { const d = s.data(); setSettings(p => ({ ...p, ...d })); if (d.theme) applyTheme(d.theme); } } catch (e) {}
  };

  const updateSettings = async (partial) => {
    setSettings(p => ({ ...p, ...partial }));
    if (partial.theme) applyTheme(partial.theme);
    if (user) try { await setDoc(doc(db, 'users', user.uid), partial, { merge: true }); } catch (e) {}
  };

  const handleLogin = async () => {
    try { await signInWithPopup(auth, googleProvider); } catch (e) { if (e.code !== 'auth/popup-closed-by-user') toast.error('Login eșuat.'); }
  };

  const fetchReminders = uid => {
    const q = query(collection(db, 'users', uid, 'reminders'), orderBy('date', 'asc'));
    onSnapshot(q, snap => setReminders(snap.docs.map(d => ({ ...d.data(), id: d.id }))));
  };

  const handleDel = item => setConfirm({
    open: true, title: 'Șterge', msg: `Sigur ștergi "${item.title}"?`,
    onYes: async () => { await deleteDoc(doc(db, 'users', user.uid, 'reminders', item.id)); toast.success('Șters!'); setConfirm({ open: false }); },
    onNo: () => setConfirm({ open: false }),
  });

  const delAll = async () => {
    try { const s = await getDocs(collection(db, 'users', user.uid, 'reminders')); const b = writeBatch(db); s.docs.forEach(d => b.delete(d.ref)); await b.commit(); toast.success('Toate șterse!'); } catch (e) { toast.error('Eroare.'); }
  };

  const delAccount = async () => {
    try {
      const s = await getDocs(collection(db, 'users', user.uid, 'reminders'));
      const b = writeBatch(db); s.docs.forEach(d => b.delete(d.ref)); b.delete(doc(db, 'users', user.uid)); await b.commit();
      await deleteUser(auth.currentUser); toast.success('Cont șters. 👋');
    } catch (e) { toast.error('Re-autentifică-te.'); }
  };

  const quickAdd = async t => {
    if (!user) return;
    const d = new Date(); d.setDate(d.getDate() + (t.defaultDays || 365));
    const data = { title: t.title, date: d.toISOString().split('T')[0], notes: t.desc || '', category: t.category || 'custom', forWhom: t.forWhom || 'me', remindDaysBefore: settings.defaultRemindDays || 7, createdAt: new Date().toISOString() };
    try {
      await addDoc(collection(db, 'users', user.uid, 'reminders'), data);
      toast.success(`${t.title} adăugat! 🎉`);
      // Auto open calendar
      openGoogleCalendar(data);
    } catch (e) { toast.error('Eroare.'); }
  };

  const filtered = useMemo(() => {
    let items = [...reminders];
    if (search.trim()) { const q = search.toLowerCase(); items = items.filter(r => r.title.toLowerCase().includes(q) || (r.notes && r.notes.toLowerCase().includes(q))); }
    if (filter === 'urgent') items = items.filter(r => { const d = differenceInDays(new Date(r.date), new Date()); return d >= 0 && d <= 30; });
    else if (filter === 'expired') items = items.filter(r => differenceInDays(new Date(r.date), new Date()) < 0);
    else if (filter !== 'all') items = items.filter(r => r.category === filter);
    items.sort((a, b) => {
      if (sort === 'date-asc') return new Date(a.date) - new Date(b.date);
      if (sort === 'date-desc') return new Date(b.date) - new Date(a.date);
      if (sort === 'alpha') return a.title.localeCompare(b.title);
      const dA = differenceInDays(new Date(a.date), new Date()), dB = differenceInDays(new Date(b.date), new Date());
      if (dA < 0 && dB >= 0) return 1; if (dB < 0 && dA >= 0) return -1; return dA - dB;
    });
    return items;
  }, [reminders, search, filter, sort]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-16 h-16 rounded-[20px] flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', animation: 'pulse-glow 2s ease infinite' }}>
        <FaBell className="text-white text-2xl" />
      </div>
    </div>
  );

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  const tabs = [
    { id: 'all', label: 'Toate' },
    { id: 'urgent', label: '⚠️ Urgente' },
    { id: 'expired', label: '❌ Expirate' },
    ...CATEGORIES.filter(c => c.id !== 'custom').map(c => ({ id: c.id, label: `${c.emoji} ${c.label}` })),
  ];

  return (
    <div className="min-h-screen bg-black relative">
      <AmbientBG />
      <Toaster position="top-center" toastOptions={{
        style: { background: 'rgba(20,20,20,0.95)', color: 'white', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, fontSize: 13, fontWeight: 600, backdropFilter: 'blur(20px)' },
        duration: 2500,
      }} />

      <div className="max-w-lg mx-auto pb-28 relative z-10">
        <AnimatePresence mode="wait">
          {page === 'settings' ? (
            <Settings key="settings" user={user} settings={settings} update={updateSettings} onBack={() => setPage('home')}
              delAll={delAll} delAccount={delAccount} installPrompt={installPrompt} />
          ) : (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Header */}
              <header className="liquid-glass sticky top-0 z-30 px-4 py-3.5" style={{ borderRadius: 0 }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-[17px] font-black tracking-tight">Salut, {user.displayName?.split(' ')[0]} 👋</h1>
                    <p className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                      {reminders.length === 0 ? 'Niciun reminder' : `${reminders.length} documente tracked`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setShowSearch(!showSearch)}
                      className="p-2.5 rounded-xl transition-all"
                      style={{ background: showSearch ? 'var(--accent)' : 'transparent', color: showSearch ? 'white' : 'var(--text-muted)' }}>
                      <FaSearch size={13} />
                    </button>
                    <button onClick={() => setPage('settings')} className="p-2.5 rounded-xl" style={{ color: 'var(--text-muted)' }}>
                      <FaCog size={13} />
                    </button>
                    <div className="relative" ref={profileRef}>
                      <button onClick={() => setProfileMenu(!profileMenu)}
                        className="w-8 h-8 rounded-xl overflow-hidden ml-1"
                        style={{ border: '2px solid var(--accent)', boxShadow: '0 0 12px var(--accent-glow)' }}>
                        <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                      </button>
                      <AnimatePresence>
                        {profileMenu && (
                          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                            className="absolute right-0 top-full mt-2 liquid-glass-strong rounded-2xl py-2 min-w-[200px] z-50">
                            <div className="px-4 py-2 mb-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                              <p className="text-[12px] font-bold truncate">{user.displayName}</p>
                              <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                            </div>
                            <button onClick={() => { signOut(auth); setProfileMenu(false); }}
                              className="flex items-center gap-2 px-4 py-2.5 text-[12px] w-full font-bold" style={{ color: 'var(--danger)' }}>
                              <FaSignOutAlt size={12} /> Deconectare
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {showSearch && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="pt-3 relative">
                        <FaSearch className="absolute left-4 top-1/2 mt-1.5 -translate-y-1/2" size={12} style={{ color: 'var(--text-muted)' }} />
                        <input className="input-glass pl-10 text-[13px]" placeholder="Caută remindere..." value={search}
                          onChange={e => setSearch(e.target.value)} autoFocus />
                        {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 mt-1.5 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}><FaTimes size={11} /></button>}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </header>

              {reminders.length === 0 ? (
                <Welcome onAdd={quickAdd} name={user.displayName?.split(' ')[0]} coupleMode={settings.coupleMode} />
              ) : (
                <>
                  <Stats reminders={reminders} />
                  <QuickAdd onAdd={quickAdd} existing={reminders.map(r => r.title)} coupleMode={settings.coupleMode} />

                  <div className="px-4 pb-2">
                    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-1">
                      {tabs.map(t => (
                        <button key={t.id} onClick={() => setFilter(t.id)}
                          className="shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap"
                          style={{
                            background: filter === t.id ? 'var(--accent)' : 'rgba(255,255,255,0.04)',
                            color: filter === t.id ? 'white' : 'var(--text-muted)',
                            border: `1px solid ${filter === t.id ? 'var(--accent)' : 'rgba(255,255,255,0.06)'}`,
                            boxShadow: filter === t.id ? '0 2px 12px var(--accent-glow)' : 'none',
                          }}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>{filtered.length} rezultate</span>
                      <select value={sort} onChange={e => setSort(e.target.value)}
                        className="text-[10px] font-bold bg-transparent border-none outline-none cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                        <option value="urgency">Urgență</option>
                        <option value="date-asc">Dată ↑</option>
                        <option value="date-desc">Dată ↓</option>
                        <option value="alpha">A → Z</option>
                      </select>
                    </div>
                  </div>

                  <div className="px-4 space-y-2.5 pb-4">
                    <AnimatePresence mode="popLayout">
                      {filtered.length === 0 ? (
                        <motion.div key="e" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
                          <FaSearch size={24} style={{ color: 'var(--text-muted)', margin: '0 auto 12px', opacity: 0.3 }} />
                          <p className="text-[13px] font-bold" style={{ color: 'var(--text-secondary)' }}>Niciun rezultat</p>
                        </motion.div>
                      ) : filtered.map((item, i) => (
                        <Card key={item.id} item={item} idx={i}
                          onEdit={it => { setEditItem(it); setShowModal(true); }}
                          onDel={handleDel} coupleMode={settings.coupleMode} />
                      ))}
                    </AnimatePresence>
                  </div>
                </>
              )}

              {/* Copyright footer */}
              <div className="text-center py-6 mx-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <p className="text-[9px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                  © {new Date().getFullYear()} Cristian Puravu · Remindly v1.0 · Made with ❤️ in Romania 🇷🇴
                </p>
              </div>

              <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                onClick={() => { setEditItem(null); setShowModal(true); }} className="fab-glow">
                <FaPlus size={22} />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showModal && (
          <Modal user={user} editItem={editItem} onClose={() => { setShowModal(false); setEditItem(null); }}
            coupleMode={settings.coupleMode} partnerName={settings.partnerName} settings={settings} />
        )}
      </AnimatePresence>

      <Confirm {...confirm} onYes={confirm.onYes} onNo={confirm.onNo} />
    </div>
  );
}

export default App;
