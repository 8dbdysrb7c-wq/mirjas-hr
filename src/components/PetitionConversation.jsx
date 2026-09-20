import React, { useEffect, useRef, useState } from 'react';
import { petitionStatus } from '../utils/petitionConversation';
import { canManagePetitions, markPetitionRead, sendPetitionMessage, watchPetition } from '../services/petitionConversation';
import { firestoreErrorMessage } from '../utils/firestoreError';

export default function PetitionConversation({ petitionId, user, adminView = false, onClose }) {
  const [petition, setPetition] = useState(null);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);
  const pendingRequest = useRef(null);
  const sending = useRef(false);
  useEffect(() => watchPetition(petitionId, user, adminView, row => { setPetition(row); setLoadError(''); }, err => setLoadError(firestoreErrorMessage(err, 'تحديث المحادثة'))), [petitionId, user.id, adminView, retry]);
  const lastMessageId = petition?.messages?.at(-1)?.id;
  useEffect(() => {
    if (lastMessageId) markPetitionRead(petitionId, user, adminView, petition).catch(() => setNotice('تعذر تحديث علامة القراءة فقط؛ هذا لا يعني فشل حفظ الرد.'));
  }, [petitionId, user.id, adminView, lastMessageId]);
  const admin = adminView && canManagePetitions(user);
  const closed = petition && petitionStatus(petition) === 'مغلق';
  const send = async action => {
    if (sending.current) return;
    sending.current = true;
    setBusy(true); setError(''); setNotice('');
    const signature = JSON.stringify([petitionId, user.id, action, text.trim()]);
    if (pendingRequest.current?.signature !== signature) pendingRequest.current = { signature, id: crypto.randomUUID() };
    try {
      const result = await sendPetitionMessage(petitionId, user, action, text, adminView, pendingRequest.current.id);
      setPetition(current => ({ ...current, ...result.petition }));
      setText('');
      pendingRequest.current = null;
      setNotice(`${action === 'close' ? 'تم حفظ النتيجة وإغلاق الاستدعاء بنجاح.' : 'تم حفظ الإجراء بنجاح.'}${result.notificationFailed ? ' تعذر إرسال الإشعار فقط؛ لا تعِد إرسال الرد.' : ''}`);
    } catch (err) { setError(firestoreErrorMessage(err, 'حفظ الرد والإجراء')); }
    finally { sending.current = false; setBusy(false); }
  };
  const labels = { close: 'إنهاء وإغلاق', reopen: 'إعادة فتح', 'request-reopen': 'طلب إعادة فتح', 'decline-reopen': 'رفض إعادة الفتح' };
  return <div role="dialog" aria-modal="true" aria-label="محادثة الاستدعاء" style={{ position: 'fixed', inset: 0, background: '#0f172a88', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} dir="rtl">
    <section style={{ background: 'white', width: 720, maxWidth: '100%', maxHeight: '90vh', borderRadius: 18, padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><div><h2>{petition?.title || 'محادثة الاستدعاء'}</h2><p>{petition?.employeeName} · {petition && petitionStatus(petition)}</p></div><button className="btn" onClick={onClose} aria-label="إغلاق النافذة">×</button></header>
      {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
      {loadError && <div role="alert" style={{ color: '#b91c1c' }}>{loadError} <button className="btn" disabled={busy} onClick={() => setRetry(value => value + 1)}>إعادة الاتصال</button></div>}
      {notice && <p role="status" style={{ color: '#0f766e' }}>{notice}</p>}
      {!petition ? <p>جاري تحميل الطلب أو أنه غير متاح...</p> : <>
        <div style={{ overflowY: 'auto', minHeight: 120, flex: 1 }} aria-live="polite">
          {[{ id: 'original', text: petition.text, senderName: petition.employeeName, sentAt: petition.createdAt || petition.date, role: 'employee' },
            ...(petition.approvalReason || petition.rejectionReason ? [{ id: 'legacy', text: petition.approvalReason || petition.rejectionReason, senderName: petition.actionBy || 'الإدارة', sentAt: petition.actionDate, role: 'admin', action: 'close' }] : []),
            ...(petition.messages || [])].map(message => <article key={message.id} style={{ background: message.role === 'admin' ? '#ecfdf5' : '#f1f5f9', padding: 14, marginBottom: 12, borderRadius: 12 }}>
              <strong>{message.senderName} {message.role === 'admin' ? '· الإدارة' : ''}</strong>
              <small style={{ display: 'block', color: '#64748b' }}>{message.sentAt ? new Date(message.sentAt).toLocaleString('ar-JO') : ''} {labels[message.action] || ''}</small>
              <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{message.text}</p>
            </article>)}
        </div>
        {closed && (
          <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', color: '#475569', fontSize: '14px' }}>
            المحادثة مغلقة ومكتملة من قبل الإدارة.
          </div>
        )}
        {((!closed && (!adminView || admin)) || (closed && admin)) && <>
          <label htmlFor="petition-reply">{closed ? 'سبب إعادة الفتح أو القرار' : 'الرد / نتيجة المعالجة عند الإغلاق'}</label>
          <textarea id="petition-reply" className="input-field" rows={3} maxLength={5000} value={text} onChange={event => setText(event.target.value)} disabled={busy} />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {!closed && <button className="btn btn-primary" disabled={busy || !text.trim()} onClick={() => send('reply')}>إرسال الرد</button>}
            {admin && !closed && <button className="btn" disabled={busy || !text.trim()} onClick={() => send('close')}>إنهاء وإغلاق مع حفظ النتيجة</button>}
            {admin && closed && <button className="btn btn-primary" disabled={busy || !text.trim()} onClick={() => send('reopen')}>إعادة فتح المحادثة</button>}
            {admin && closed && petition.reopenRequested && <button className="btn" disabled={busy || !text.trim()} onClick={() => send('decline-reopen')}>رفض إعادة الفتح مع السبب</button>}
          </div>
        </>}
      </>}
    </section>
  </div>;
}
