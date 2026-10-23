import React, { useEffect, useRef, useState } from 'react';
import { canManagePetitions, issuePetitionDecision, watchPetition, acknowledgePetitionDecision } from '../services/petitionConversation';
import { firestoreErrorMessage } from '../utils/firestoreError';
import { X, FileText, CheckCircle2, Clock, User, Calendar, ShieldCheck, AlertCircle, MessageSquare, Send, RefreshCw } from 'lucide-react';

export default function PetitionConversation({ petitionId, user, adminView = false, onClose }) {
  const [petition, setPetition] = useState(null);
  const [decision, setDecision] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);
  const [retry, setRetry] = useState(0);
  const sending = useRef(false);

  useEffect(() => watchPetition(
    petitionId, 
    user, 
    adminView, 
    row => { setPetition(row); setError(''); }, 
    err => setError(firestoreErrorMessage(err, 'تحميل الاستدعاء'))
  ), [petitionId, user.id, adminView, retry]);

  const canDecide = adminView && canManagePetitions(user);

  const send = async () => {
    if (sending.current) return;
    sending.current = true; 
    setBusy(true); 
    setError('');
    try { 
      setPetition(await issuePetitionDecision(petitionId, user, decision)); 
      setDecision(''); 
    } catch (err) { 
      setError(firestoreErrorMessage(err, 'حفظ القرار وإرسال التنبيه')); 
    } finally { 
      sending.current = false; 
      setBusy(false); 
    }
  };

  const handleAcknowledge = async () => {
    if (acknowledging || !petition?.decisionAlertId) return;
    setAcknowledging(true);
    setError('');
    try {
      await acknowledgePetitionDecision(petition.decisionAlertId, user);
    } catch (err) {
      setError(firestoreErrorMessage(err, 'تأكيد استلام واطلاعك على القرار'));
    } finally {
      setAcknowledging(false);
    }
  };

  const decisionText = petition ? (petition.resolution || petition.approvalReason || petition.rejectionReason) : '';

  return (
    <div 
      role="dialog" 
      aria-modal="true" 
      aria-label="معاينة الاستدعاء" 
      dir="rtl" 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        zIndex: 10000, 
        background: 'rgba(15, 23, 42, 0.65)', 
        backdropFilter: 'blur(6px)',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: 'max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom))'
      }}
    >
      <section 
        style={{ 
          background: '#ffffff', 
          borderRadius: '24px', 
          width: '100%', 
          maxWidth: '640px', 
          maxHeight: 'calc(100dvh - 24px)', 
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.35)', 
          overflow: 'hidden',
          border: '1px solid rgba(226, 232, 240, 0.9)'
        }}
      >
        {/* Header */}
        <header 
          style={{ 
            flex: '0 0 auto',
            padding: '16px 20px',
            background: 'linear-gradient(to left, #f8fafc, #ffffff)',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
            <div 
              style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '12px', 
                background: '#f0fdfa', 
                color: '#0f766e', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flexShrink: 0,
                border: '1px solid #ccfbf1'
              }}
            >
              <FileText size={20} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <span style={{ display: 'inline-block', fontSize: '11px', fontWeight: 800, color: '#0f766e', marginBottom: '2px' }}>
                {adminView ? 'معالجة الاستدعاء' : 'معاينة طلب الاستدعاء'}
              </span>
              <h2 
                style={{ 
                  margin: 0, 
                  fontSize: '16px', 
                  fontWeight: 800, 
                  color: '#0f172a',
                  lineHeight: 1.4,
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere'
                }}
              >
                {petition?.title || 'تفاصيل الاستدعاء'}
              </h2>
            </div>
          </div>
          <button 
            type="button"
            disabled={busy || acknowledging} 
            onClick={onClose} 
            aria-label="إغلاق"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.15s ease'
            }}
          >
            <X size={18} />
          </button>
        </header>

        {/* Scrollable Body */}
        <div 
          style={{ 
            flex: '1 1 auto', 
            overflowY: 'auto', 
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {error && (
            <div 
              role="alert" 
              style={{ 
                background: '#fef2f2', 
                border: '1px solid #fecaca', 
                color: '#991b1b', 
                padding: '12px 14px', 
                borderRadius: '12px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
              <button 
                type="button"
                className="btn btn-outline" 
                disabled={busy} 
                onClick={() => setRetry(value => value + 1)}
                style={{ padding: '4px 10px', fontSize: '11px', height: 'auto', background: '#fff' }}
              >
                <RefreshCw size={12} style={{ display: 'inline', marginLeft: '4px' }} /> إعادة المحاولة
              </button>
            </div>
          )}

          {!petition ? (
            <div style={{ padding: '36px 0', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
              <RefreshCw size={24} className="animate-spin text-teal-600" style={{ margin: '0 auto 10px' }} />
              جارٍ تحميل تفاصيل الاستدعاء…
            </div>
          ) : (
            <>
              {/* Metadata chips */}
              <div 
                style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  gap: '8px',
                  background: '#f8fafc',
                  padding: '10px 14px',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  fontSize: '12px',
                  color: '#475569'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                  <User size={14} className="text-teal-600" />
                  <span>{petition.employeeName || 'الموظف'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b' }}>
                  <Calendar size={14} className="text-slate-400" />
                  <span dir="ltr">{petition.date || (petition.createdAt ? petition.createdAt.split('T')[0] : '')}</span>
                </div>
                <span 
                  style={{ 
                    padding: '3px 10px', 
                    borderRadius: '20px', 
                    fontSize: '11px', 
                    fontWeight: 800,
                    background: petition.resolution ? '#d1fae5' : (petition.status === 'مرفوض' ? '#ffe4e6' : '#fef3c7'),
                    color: petition.resolution ? '#065f46' : (petition.status === 'مرفوض' ? '#9f1239' : '#92400e')
                  }}
                >
                  {petition.resolution ? 'تم الرد والبت' : (petition.status || 'معلق')}
                </span>
              </div>

              {/* Request Details Box */}
              <div 
                style={{ 
                  background: '#f8fafc', 
                  borderRadius: '16px', 
                  border: '1px solid #e2e8f0', 
                  padding: '14px 16px' 
                }}
              >
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    fontSize: '12px', 
                    fontWeight: 800, 
                    color: '#64748b',
                    marginBottom: '8px'
                  }}
                >
                  <FileText size={15} className="text-slate-500" />
                  <span>نص الاستدعاء / التفاصيل المقدمة</span>
                </div>
                <div 
                  style={{ 
                    fontSize: '14.5px', 
                    lineHeight: '1.8', 
                    color: '#1e293b', 
                    whiteSpace: 'pre-wrap', 
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere'
                  }}
                >
                  {petition.text || 'لا توجد تفاصيل إضافية مكتوبة.'}
                </div>
              </div>

              {/* Management Decision Box */}
              {decisionText && (
                <section 
                  style={{ 
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)', 
                    borderRadius: '18px', 
                    border: '1.5px solid #a7f3d0', 
                    padding: '16px',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.06)',
                    position: 'relative'
                  }}
                >
                  <div 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      gap: '8px', 
                      marginBottom: '10px' 
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div 
                        style={{ 
                          width: '28px', 
                          height: '28px', 
                          borderRadius: '8px', 
                          background: '#059669', 
                          color: '#ffffff', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          boxShadow: '0 2px 6px rgba(5, 150, 105, 0.3)'
                        }}
                      >
                        <ShieldCheck size={16} />
                      </div>
                      <strong style={{ fontSize: '14px', fontWeight: 800, color: '#064e3b' }}>
                        قرار وتوجيه الإدارة
                      </strong>
                    </div>
                    {petition.closedBy && (
                      <span 
                        style={{ 
                          fontSize: '11px', 
                          background: 'rgba(255, 255, 255, 0.85)', 
                          color: '#047857', 
                          border: '1px solid #a7f3d0', 
                          padding: '2px 8px', 
                          borderRadius: '12px' 
                        }}
                      >
                        بواسطة: {petition.closedBy}
                      </span>
                    )}
                  </div>

                  {/* Decision Text Box */}
                  <div 
                    style={{ 
                      background: '#ffffff', 
                      borderRadius: '12px', 
                      padding: '14px 16px', 
                      border: '1px solid #bbf7d0',
                      color: '#064e3b', 
                      fontSize: '14.5px', 
                      fontWeight: 600,
                      lineHeight: '1.8', 
                      whiteSpace: 'pre-wrap', 
                      wordBreak: 'break-word',
                      overflowWrap: 'anywhere'
                    }}
                  >
                    {decisionText}
                  </div>

                  {/* Decision Acknowledgement status & action */}
                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(167, 243, 208, 0.7)' }}>
                    {petition.decisionReceivedAt ? (
                      <div 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px', 
                          background: 'rgba(255, 255, 255, 0.85)', 
                          padding: '10px 12px', 
                          borderRadius: '12px',
                          border: '1px solid #a7f3d0',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#065f46'
                        }}
                      >
                        <CheckCircle2 size={16} style={{ color: '#059669', flexShrink: 0 }} />
                        <span>
                          تم تأكيد استلام واطلاع الموظف على القرار بتاريخ{' '}
                          <span dir="ltr" style={{ fontFamily: 'monospace' }}>
                            {new Date(petition.decisionReceivedAt).toLocaleString('ar-JO')}
                          </span>
                        </span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px', 
                            fontSize: '12px', 
                            color: '#92400e', 
                            background: '#fef3c7', 
                            padding: '8px 12px', 
                            borderRadius: '10px',
                            border: '1px solid #fde68a'
                          }}
                        >
                          <Clock size={15} style={{ flexShrink: 0, color: '#d97706' }} />
                          <span>
                            {adminView 
                              ? 'تم إرسال القرار كتنبيه للموظف — بانتظار تأكيد الاطّلاع والاستلام.' 
                              : 'تم إرسال هذا القرار لك كملاحظة — يرجى تأكيد اطلاعك واستلامك له.'}
                          </span>
                        </div>
                        {!adminView && petition.decisionAlertId && (
                          <button 
                            type="button"
                            disabled={busy || acknowledging} 
                            onClick={handleAcknowledge}
                            style={{
                              width: '100%',
                              padding: '10px 16px',
                              borderRadius: '12px',
                              background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
                              color: '#ffffff',
                              border: 0,
                              fontSize: '14px',
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              cursor: acknowledging ? 'wait' : 'pointer',
                              boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)'
                            }}
                          >
                            <CheckCircle2 size={17} />
                            <span>{acknowledging ? 'جارٍ تسجيل الاطلاع...' : 'تأكيد استلام وقراءة القرار الآن'}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Admin decision input */}
              {canDecide && !petition.decisionAlertId && (
                <div 
                  style={{ 
                    marginTop: '8px', 
                    background: '#f8fafc', 
                    padding: '16px', 
                    borderRadius: '16px', 
                    border: '1px solid #e2e8f0' 
                  }}
                >
                  <label 
                    htmlFor="petition-decision" 
                    style={{ 
                      display: 'block', 
                      fontSize: '13px', 
                      fontWeight: 700, 
                      color: '#334155', 
                      marginBottom: '8px' 
                    }}
                  >
                    القرار / توجيه الإدارة (سيصل للموظف كتنبيه فوري يلزم تأكيد استلامه):
                  </label>
                  <textarea 
                    id="petition-decision" 
                    className="input-field" 
                    rows={4} 
                    maxLength={5000} 
                    placeholder="اكتب قرار الإدارة أو التوجيه هنا..."
                    value={decision} 
                    disabled={busy} 
                    onChange={event => setDecision(event.target.value)} 
                    style={{ width: '100%', fontSize: '14px', lineHeight: 1.6 }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {decision.length} / 5000 حرف
                    </span>
                    <button 
                      type="button"
                      className="btn btn-primary" 
                      disabled={busy || !decision.trim()} 
                      onClick={send}
                      style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 800 }}
                    >
                      <Send size={15} style={{ display: 'inline', marginLeft: '6px' }} />
                      {busy ? 'جارٍ إرسال القرار…' : 'إرسال القرار وإغلاق الاستدعاء'}
                    </button>
                  </div>
                </div>
              )}

              {/* Previous messages (if any) */}
              {adminView && petition.messages?.length > 0 && (
                <details 
                  style={{ 
                    background: '#f8fafc', 
                    borderRadius: '14px', 
                    border: '1px solid #e2e8f0', 
                    padding: '12px 14px',
                    fontSize: '13px'
                  }}
                >
                  <summary style={{ fontWeight: 700, cursor: 'pointer', color: '#475569' }}>
                    سجل المراسلات والردود ({petition.messages.length})
                  </summary>
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {petition.messages.map((message, index) => (
                      <div 
                        key={message.id || index} 
                        style={{ 
                          background: '#ffffff', 
                          padding: '10px 12px', 
                          borderRadius: '10px', 
                          border: '1px solid #e2e8f0',
                          fontSize: '12.5px',
                          whiteSpace: 'pre-wrap'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '11px', color: '#64748b' }}>
                          <strong>{message.senderName || (message.role === 'admin' ? 'الإدارة' : 'الموظف')}</strong>
                          {message.sentAt && <span dir="ltr">{new Date(message.sentAt).toLocaleTimeString('ar-JO')}</span>}
                        </div>
                        <div style={{ color: '#1e293b', lineHeight: 1.6 }}>{message.text}</div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <footer 
          style={{ 
            flex: '0 0 auto',
            padding: '12px 20px', 
            background: '#f8fafc', 
            borderTop: '1px solid #e2e8f0', 
            display: 'flex', 
            justifyContent: 'flex-end',
            gap: '8px'
          }}
        >
          <button 
            type="button"
            className="btn btn-outline" 
            onClick={onClose}
            style={{ 
              padding: '8px 20px', 
              fontSize: '13px', 
              fontWeight: 700, 
              borderRadius: '10px',
              background: '#ffffff'
            }}
          >
            إغلاق
          </button>
        </footer>
      </section>
    </div>
  );
}
