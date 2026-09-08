import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ACCESS_SECTIONS, ACCESS_ACTIONS, ACCESS_FIELDS, ACCESS_WAREHOUSES, createAccessDraft, setAccessMode, evaluateDraft, describeDraftChanges } from '../utils/accessPolicy';
import './user-access-designer.css';

const modes = { hidden: 'مخفي', view: 'مشاهدة فقط', use: 'استخدام', custom: 'مخصص' };
const storageKey = (actor, employee) => `mrsleep.access-draft.v1.${actor.id}.${employee.id}`;
export default function UserAccessDesigner({ employee, employees, actor, onClose }) {
  const [initial] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey(actor, employee)) || 'null');
      if (saved?.policy?.version === 1 && saved.policy.userId === employee.id) return saved;
    } catch { /* An unreadable local draft must not affect existing access. */ }
    return { policy: createAccessDraft(employee), history: [] };
  });
  const [policy, setPolicy] = useState(initial.policy);
  const [savedPolicy, setSavedPolicy] = useState(initial.policy);
  const [history, setHistory] = useState(initial.history);
  const [active, setActive] = useState('inventory');
  const [preview, setPreview] = useState(false);
  const [copyId, setCopyId] = useState('');
  const [message, setMessage] = useState('');
  const section = ACCESS_SECTIONS.find(s => s.id === active);
  const config = policy.sections[active];
  const dirty = JSON.stringify(policy) !== JSON.stringify(savedPolicy);
  const update = change => setPolicy(previous => {
    const next = structuredClone(previous);
    change(next.sections[active]);
    return next;
  });
  const close = () => { if (!dirty || window.confirm('توجد تعديلات غير محفوظة. إغلاق المحرر؟')) onClose(); };
  const save = () => {
    const changes = describeDraftChanges(savedPolicy, policy);
    const nextHistory = changes.length ? [...history, { at: new Date().toISOString(), actorId: actor.id, actorName: actor.name, changes }] : history;
    try {
      localStorage.setItem(storageKey(actor, employee), JSON.stringify({ policy, history: nextHistory }));
      setSavedPolicy(structuredClone(policy)); setHistory(nextHistory); setMessage('حُفظت المسودة على هذا الجهاز. لم تتغيّر صلاحيات الحساب الفعلية.');
    } catch { setMessage('تعذر حفظ المسودة على الجهاز. احتفظ بالنافذة مفتوحة وحاول مجددًا.'); }
  };
  const copy = () => {
    const source = employees.find(e => e.id === copyId);
    if (!source || !window.confirm('استبدال المسودة بصلاحيات المستخدم المحدد؟')) return;
    let next = createAccessDraft(source);
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey(actor, source)) || 'null');
      if (stored?.policy?.version === 1) next = structuredClone(stored.policy);
    } catch { /* Use current permissions when no valid draft exists. */ }
    next.userId = employee.id;
    setPolicy(next); setMessage('نُسخت الصلاحيات إلى المسودة؛ راجعها قبل الحفظ.');
  };
  return createPortal(<div className="access-designer-overlay" dir="rtl">
    <section className="access-designer" role="dialog" aria-modal="true" aria-labelledby="access-title">
      <header><div><h2 id="access-title">تخصيص واجهة وصلاحيات المستخدم</h2><p>{employee.name} · {employee.id}</p></div><button onClick={close} aria-label="إغلاق">×</button></header>
      <p className="access-draft-notice">مسودة مستقلة — المعاينة توضيحية، والحساب الحالي لا يتأثر. التفعيل ينتظر اكتمال حماية الخادم.</p>
      <div className="access-toolbar">
        <button onClick={() => setPreview(!preview)}>{preview ? 'العودة للتصميم' : 'معاينة المسودة'}</button>
        <select aria-label="نسخ صلاحيات من مستخدم" value={copyId} onChange={e => setCopyId(e.target.value)}><option value="">نسخ صلاحيات من مستخدم</option>{employees.filter(e => e.id !== employee.id).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
        <button disabled={!copyId} onClick={copy}>نسخ</button>
        <button onClick={() => { if (window.confirm('إعادة المسودة إلى صلاحيات المستخدم الحالية؟')) setPolicy(createAccessDraft(employee)); }}>استيراد الصلاحيات الحالية</button>
        <button onClick={() => { if (window.confirm('بدء مسودة جديدة بجميع الأقسام مخفية؟')) setPolicy(createAccessDraft(employee, false)); }}>من الصفر</button>
      </div>
      <div className="access-workspace">
        <nav aria-label="أقسام صلاحيات المستخدم">{ACCESS_SECTIONS.filter(s => !preview || s.screens.some(sc => evaluateDraft(policy, s.id, sc.id, 'view'))).map(s => <button key={s.id} className={active === s.id ? 'active' : ''} onClick={() => setActive(s.id)}><span>{s.label}</span><small>{modes[policy.sections[s.id].mode]}</small></button>)}</nav>
        <main>
          <h3>{preview ? `معاينة مسودة ${employee.name} — ` : ''}{section.label}</h3>
          {!preview ? <>
            <div className="access-modes">{Object.entries(modes).map(([key, label]) => <button key={key} aria-pressed={config.mode === key} className={config.mode === key ? 'active' : ''} onClick={() => setPolicy(setAccessMode(policy, active, key))}>{label}</button>)}</div>
            <p className="access-help">«استخدام» يتيح المشاهدة والإضافة والتعديل والطباعة. العمليات الأخرى تُحدّد من «مخصص».</p>
            {config.mode !== 'hidden' && <>
              {config.mode === 'custom' && section.screens.map(screen => <details key={screen.id} className="access-screen" open={section.screens.length === 1 || undefined}><summary>{screen.label}</summary><div className="access-options">{Object.entries(ACCESS_ACTIONS).map(([key, label]) => <label key={key}><input type="checkbox" checked={config.screens[screen.id][key] === true} disabled={key !== 'view' && !config.screens[screen.id].view} onChange={e => update(s => { s.screens[screen.id][key] = e.target.checked; })} />{label}</label>)}</div></details>)}
              <h4>نطاق البيانات</h4><select aria-label="نطاق البيانات" value={config.scope} onChange={e => update(s => { s.scope = e.target.value; })}>{Object.entries({ self: 'بياناته فقط', team: 'فريقه', department: 'قسمه', all: 'جميع البيانات' }).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
              {active === 'inventory' && <><h4>المصانع المسموحة</h4><div className="access-options">{ACCESS_WAREHOUSES.map(w => <label key={w}><input type="checkbox" checked={config.warehouses.includes(w)} onChange={e => update(s => { s.warehouses = e.target.checked ? [...s.warehouses, w] : s.warehouses.filter(x => x !== w); })} />{w}</label>)}</div><h4>المعلومات الظاهرة</h4><div className="access-options">{Object.entries(ACCESS_FIELDS).map(([key, label]) => <label key={key}><input type="checkbox" checked={config.fields[key]} onChange={e => update(s => { s.fields[key] = e.target.checked; })} />{label}</label>)}</div><p className="access-help">راجع المعلومات الظاهرة يدويًا؛ الصلاحيات القديمة لا تحدّد وصول الأعمدة بشكل مستقل.</p></>}
              <h4>وصول مؤقت للقسم</h4><label>ينتهي في <input type="datetime-local" value={config.expiresAt ? (() => { const date = new Date(config.expiresAt); return new Date(date - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); })() : ''} onChange={e => update(s => { s.expiresAt = e.target.value ? new Date(e.target.value).toISOString() : ''; })} /></label><button onClick={() => update(s => { s.expiresAt = ''; })}>دون انتهاء</button>
            </>}
          </> : <>
            <p className="access-help">هذه معاينة للخيارات في المسودة وليست دخولًا للحساب أو نسخة من الصفحات الفعلية.</p>
            {section.screens.filter(sc => evaluateDraft(policy, active, sc.id, 'view')).map(sc => <div className="access-screen" key={sc.id}><h4>{sc.label}</h4><div className="access-options">{Object.entries(ACCESS_ACTIONS).filter(([key]) => evaluateDraft(policy, active, sc.id, key)).map(([key, label]) => <span className="access-preview-action" key={key}>{label}</span>)}</div></div>)}
            {!section.screens.some(sc => evaluateDraft(policy, active, sc.id, 'view')) && <p>هذا القسم مخفي أو انتهت مدة الوصول إليه.</p>}
            {active === 'inventory' && section.screens.some(sc => evaluateDraft(policy, active, sc.id, 'view')) && <><p>المصانع: {config.warehouses.join('، ') || 'لا يوجد'}</p><div className="access-options">{Object.entries(ACCESS_FIELDS).filter(([key]) => config.fields[key]).map(([key, label]) => <span className="access-preview-action" key={key}>{label}</span>)}</div></>}
          </>}
          <details className="access-screen"><summary>سجل حفظ المسودات المحلي ({history.length})</summary><p className="access-help">هذا السجل محلي قابل للتعديل، وليس سجل التدقيق الأمني للخادم.</p>{[...history].reverse().map((entry, index) => <p key={index}>{new Date(entry.at).toLocaleString('ar-JO')} — {entry.actorName} — {entry.changes.length} تغييرات</p>)}</details>
        </main>
      </div>
      <footer><span role="status">{message || (dirty ? 'تعديلات غير محفوظة' : 'الصلاحيات الحالية لم تتغير')}</span><button onClick={save}>حفظ المسودة</button><button onClick={close}>إغلاق</button></footer>
    </section>
  </div>, document.body);
}
