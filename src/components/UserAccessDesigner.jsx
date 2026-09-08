import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { 
  ACCESS_SECTIONS, 
  ACCESS_ACTIONS, 
  ACCESS_FIELDS, 
  ACCESS_WAREHOUSES, 
  createAccessDraft, 
  setAccessMode, 
  evaluateDraft, 
  describeDraftChanges,
  syncLegacyPermissionsFromPolicy 
} from '../utils/accessPolicy';
import { saveEmployee } from '../services/settings';
import './user-access-designer.css';

const MySwal = withReactContent(Swal);
const modes = { hidden: 'مخفي', view: 'مشاهدة فقط', use: 'استخدام', custom: 'مخصص' };
const storageKey = (actor, employee) => `mrsleep.access-draft.v1.${actor?.id || 'admin'}.${employee.id}`;

export default function UserAccessDesigner({ employee, employees, actor, onClose, onSaved }) {
  const [initial] = useState(() => {
    // 1. If the employee already has a saved accessPolicy in Firestore:
    if (employee?.accessPolicy?.version === 1) {
      return { policy: structuredClone(employee.accessPolicy), history: employee.accessPolicyHistory || [] };
    }
    // 2. Check local draft
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey(actor, employee)) || 'null');
      if (saved?.policy?.version === 1 && saved.policy.userId === employee.id) return saved;
    } catch { /* An unreadable local draft must not affect existing access. */ }
    // 3. Generate from current permissions
    return { policy: createAccessDraft(employee), history: [] };
  });

  const [policy, setPolicy] = useState(initial.policy);
  const [savedPolicy, setSavedPolicy] = useState(initial.policy);
  const [history, setHistory] = useState(initial.history);
  const [active, setActive] = useState('inventory');
  const [preview, setPreview] = useState(false);
  const [copyId, setCopyId] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const section = ACCESS_SECTIONS.find(s => s.id === active);
  const config = policy.sections[active];
  const dirty = JSON.stringify(policy) !== JSON.stringify(savedPolicy);

  const update = change => setPolicy(previous => {
    const next = structuredClone(previous);
    change(next.sections[active]);
    return next;
  });

  const close = () => { if (!dirty || window.confirm('توجد تعديلات غير محفوظة. إغلاق المحرر؟')) onClose(); };

  const save = async () => {
    setSaving(true);
    setMessage('جاري حفظ وتطبيق الصلاحيات...');
    try {
      const changes = describeDraftChanges(savedPolicy, policy);
      const nextHistory = changes.length ? [...history, { at: new Date().toISOString(), actorId: actor?.id || 'admin', actorName: actor?.name || 'مدير النظام', changes }] : history;
      const policyToSave = { ...policy, status: 'active', updatedAt: new Date().toISOString(), updatedBy: actor?.id || 'admin' };
      const legacySync = syncLegacyPermissionsFromPolicy(policyToSave);

      // Save locally immediately
      localStorage.setItem(storageKey(actor, employee), JSON.stringify({ policy: policyToSave, history: nextHistory }));
      setSavedPolicy(structuredClone(policyToSave));
      setHistory(nextHistory);

      const updatedEmployee = {
        ...employee,
        ...legacySync,
        accessPolicy: policyToSave,
        accessPolicyHistory: nextHistory
      };

      const err = await saveEmployee(updatedEmployee);
      if (err) throw err;

      setMessage('تم حفظ وتطبيق الصلاحيات بنجاح على حساب الموظف في النظام.');

      if (onSaved) onSaved(updatedEmployee);

      MySwal.fire({
        icon: 'success',
        title: 'تم الحفظ والتطبيق',
        text: `تم حفظ وتفعيل الصلاحيات للموظف ${employee.name} بنجاح`,
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error saving access policy:', error);
      setMessage('تعذر حفظ وتطبيق الصلاحيات. احتفظ بالنافذة مفتوحة وحاول مجددًا.');
      MySwal.fire({
        icon: 'error',
        title: 'خطأ في الحفظ',
        text: 'حدث خطأ أثناء حفظ الصلاحيات في السحابة، يرجى المحاولة ثانية'
      });
    } finally {
      setSaving(false);
    }
  };

  const copy = () => {
    const source = employees.find(e => e.id === copyId);
    if (!source || !window.confirm('استبدال الإعدادات الحالية بصلاحيات المستخدم المحدد؟')) return;
    let next = source.accessPolicy ? structuredClone(source.accessPolicy) : createAccessDraft(source);
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey(actor, source)) || 'null');
      if (stored?.policy?.version === 1) next = structuredClone(stored.policy);
    } catch { /* Use current permissions when no valid draft exists. */ }
    next.userId = employee.id;
    setPolicy(next); setMessage('نُسخت الصلاحيات بنجاح؛ راجعها ثم اضغط حفظ وتطبيق.');
  };

  return createPortal(<div className="access-designer-overlay" dir="rtl">
    <section className="access-designer" role="dialog" aria-modal="true" aria-labelledby="access-title">
      <header>
        <div>
          <h2 id="access-title">تخصيص واجهة وصلاحيات المستخدم</h2>
          <p>{employee.name} · {employee.id}</p>
        </div>
        <button onClick={close} aria-label="إغلاق">×</button>
      </header>
      
      <p className="access-live-notice">
        <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: '#10b981', flexShrink: 0 }}></span>
        <span><strong>نظام الصلاحيات المباشر:</strong> أي تعديل يتم حفظه يُطبّق فوراً على حساب الموظف في النظام دون أي تكاليف إضافية (مسار مجاني 100%).</span>
      </p>

      <div className="access-toolbar">
        <button onClick={() => setPreview(!preview)}>{preview ? 'العودة للتصميم' : 'معاينة الصلاحيات'}</button>
        <select aria-label="نسخ صلاحيات من مستخدم" value={copyId} onChange={e => setCopyId(e.target.value)}>
          <option value="">نسخ صلاحيات من مستخدم آخر</option>
          {employees.filter(e => e.id !== employee.id).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <button disabled={!copyId} onClick={copy}>نسخ</button>
        <button onClick={() => { if (window.confirm('إعادة تعيين الصلاحيات للوضع الحالي المخزن في الحساب؟')) setPolicy(employee.accessPolicy ? structuredClone(employee.accessPolicy) : createAccessDraft(employee)); }}>استيراد الصلاحيات الحالية</button>
        <button onClick={() => { if (window.confirm('بدء تخصيص جديد بجميع الأقسام مخفية؟')) setPolicy(createAccessDraft(employee, false)); }}>من الصفر (حجب الكل)</button>
      </div>

      <div className="access-workspace">
        <nav aria-label="أقسام صلاحيات المستخدم">
          {ACCESS_SECTIONS.filter(s => !preview || s.screens.some(sc => evaluateDraft(policy, s.id, sc.id, 'view'))).map(s => (
            <button key={s.id} className={active === s.id ? 'active' : ''} onClick={() => setActive(s.id)}>
              <span>{s.label}</span>
              <small>{modes[policy.sections[s.id].mode]}</small>
            </button>
          ))}
        </nav>

        <main>
          <h3>{preview ? `معاينة صلاحيات ${employee.name} — ` : ''}{section.label}</h3>
          {!preview ? <>
            <div className="access-modes">
              {Object.entries(modes).map(([key, label]) => (
                <button key={key} aria-pressed={config.mode === key} className={config.mode === key ? 'active' : ''} onClick={() => setPolicy(setAccessMode(policy, active, key))}>
                  {label}
                </button>
              ))}
            </div>
            <p className="access-help">«استخدام» يتيح المشاهدة والإضافة والتعديل والطباعة. العمليات المتقدمة (الحذف والاعتماد وغيرها) تُحدّد من «مخصص».</p>

            {config.mode !== 'hidden' && <>
              {config.mode === 'custom' && section.screens.map(screen => (
                <details key={screen.id} className="access-screen" open={section.screens.length === 1 || undefined}>
                  <summary>{screen.label}</summary>
                  <div className="access-options">
                    {Object.entries(ACCESS_ACTIONS).map(([key, label]) => (
                      <label key={key}>
                        <input 
                          type="checkbox" 
                          checked={config.screens[screen.id][key] === true} 
                          disabled={key !== 'view' && !config.screens[screen.id].view} 
                          onChange={e => update(s => { s.screens[screen.id][key] = e.target.checked; })} 
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </details>
              ))}

              <h4>نطاق البيانات</h4>
              <select aria-label="نطاق البيانات" value={config.scope} onChange={e => update(s => { s.scope = e.target.value; })}>
                {Object.entries({ self: 'بياناته فقط', team: 'فريقه', department: 'قسمه', all: 'جميع البيانات' }).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>

              {active === 'inventory' && <>
                <h4>المصانع المسموحة</h4>
                <div className="access-options">
                  {ACCESS_WAREHOUSES.map(w => (
                    <label key={w}>
                      <input 
                        type="checkbox" 
                        checked={config.warehouses.includes(w)} 
                        onChange={e => update(s => { s.warehouses = e.target.checked ? [...s.warehouses, w] : s.warehouses.filter(x => x !== w); })} 
                      />
                      {w}
                    </label>
                  ))}
                </div>

                <h4>المعلومات الظاهرة في المخزون</h4>
                <div className="access-options">
                  {Object.entries(ACCESS_FIELDS).map(([key, label]) => (
                    <label key={key}>
                      <input 
                        type="checkbox" 
                        checked={config.fields[key]} 
                        onChange={e => update(s => { s.fields[key] = e.target.checked; })} 
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <p className="access-help">حدد الأعمدة والبيانات المالية التي يحق للموظف الاطلاع عليها في شاشات المخزون والتسعير.</p>
              </>}

              <h4>وصول مؤقت للقسم</h4>
              <label>ينتهي في <input type="datetime-local" value={config.expiresAt ? (() => { const date = new Date(config.expiresAt); return new Date(date - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); })() : ''} onChange={e => update(s => { s.expiresAt = e.target.value ? new Date(e.target.value).toISOString() : ''; })} /></label>
              <button onClick={() => update(s => { s.expiresAt = ''; })}>دون انتهاء (دائم)</button>
            </>}
          </> : <>
            <p className="access-help">هذه معاينة حية لما يستطيع الموظف مشاهدته واستخدامه وفق الإعدادات الحالية.</p>
            {section.screens.filter(sc => evaluateDraft(policy, active, sc.id, 'view')).map(sc => (
              <div className="access-screen" key={sc.id}>
                <h4>{sc.label}</h4>
                <div className="access-options">
                  {Object.entries(ACCESS_ACTIONS).filter(([key]) => evaluateDraft(policy, active, sc.id, key)).map(([key, label]) => (
                    <span className="access-preview-action" key={key}>{label}</span>
                  ))}
                </div>
              </div>
            ))}
            {!section.screens.some(sc => evaluateDraft(policy, active, sc.id, 'view')) && <p>هذا القسم مخفي كلياً أو انتهت مدة الوصول إليه.</p>}
            {active === 'inventory' && section.screens.some(sc => evaluateDraft(policy, active, sc.id, 'view')) && <>
              <p>المصانع المتاحة: {config.warehouses.join('، ') || 'لا يوجد مصانع محددة'}</p>
              <div className="access-options">
                {Object.entries(ACCESS_FIELDS).filter(([key]) => config.fields[key]).map(([key, label]) => (
                  <span className="access-preview-action" key={key}>{label}</span>
                ))}
              </div>
            </>}
          </>}

          <details className="access-screen">
            <summary>سجل التعديلات المحفوظة ({history.length})</summary>
            <p className="access-help">سجل تاريخي بالتعديلات التي تمت على صلاحيات هذا الحساب.</p>
            {[...history].reverse().map((entry, index) => (
              <p key={index} style={{ fontSize: 12, margin: '6px 0', color: '#475569' }}>
                {new Date(entry.at).toLocaleString('ar-JO')} — {entry.actorName || 'المدير'} — {entry.changes.length} تغييرات
              </p>
            ))}
          </details>
        </main>
      </div>

      <footer>
        <span role="status">
          {message || (dirty ? 'توجد تعديلات غير محفوظة' : (employee?.accessPolicy?.status === 'active' ? 'الصلاحيات مخصصة ونشطة في النظام' : 'صلاحيات قياسية'))}
        </span>
        <button disabled={saving} onClick={save} style={{ minWidth: 160 }}>
          {saving ? 'جاري الحفظ والتطبيق...' : 'حفظ وتطبيق الصلاحيات'}
        </button>
        <button onClick={close}>إغلاق</button>
      </footer>
    </section>
  </div>, document.body);
}
