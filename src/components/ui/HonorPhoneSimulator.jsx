import React from 'react';
import { Smartphone, Monitor, X, CheckCircle, RefreshCw } from 'lucide-react';

export default function HonorPhoneSimulator({ isActive, onToggle, children, deviceName = "Honor Android X9" }) {
  if (!isActive) {
    return <>{children}</>;
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      padding: '20px 10px 60px 10px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      fontFamily: 'Tajawal, sans-serif',
      boxSizing: 'border-box'
    }}>
      {/* Top Floating Emulator Control Bar */}
      <div style={{
        position: 'sticky',
        top: '10px',
        zIndex: 9999,
        backgroundColor: '#1e293b',
        color: '#ffffff',
        padding: '10px 18px',
        borderRadius: '16px',
        border: '1.5px solid #334155',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        marginBottom: '24px',
        maxWidth: '90%',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Smartphone size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: '900', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>وضع معاينة هاتف {deviceName}</span>
              <span style={{ backgroundColor: '#0284c7', color: '#fff', fontSize: '10px', padding: '1px 6px', borderRadius: '6px', fontWeight: 'bold' }}>مفعّل</span>
            </div>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>أبعاد الشاشة: 412 × 892 بكسل (أندرويد)</span>
          </div>
        </div>

        <button
          onClick={onToggle}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: '#ef4444',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            fontSize: '12.5px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
            transition: 'all 0.2s'
          }}
        >
          <Monitor size={16} />
          <span>إغلاق المعاينة والعودة للشاشة الكبيرة</span>
        </button>
      </div>

      {/* Honor Phone Device Shell Container */}
      <div style={{
        width: '412px',
        maxWidth: '96vw',
        height: '860px',
        maxHeight: '88vh',
        backgroundColor: '#ffffff',
        borderRadius: '44px',
        border: '12px solid #1e293b',
        boxShadow: '0 0 0 3px #334155, 0 25px 60px rgba(0,0,0,0.6)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}>

        {/* Top Phone Notch / Punch Hole & Speaker */}
        <div style={{
          height: '28px',
          backgroundColor: '#0f172a',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          flexShrink: 0,
          userSelect: 'none',
          zIndex: 50
        }}>
          {/* Speaker Grill */}
          <div style={{ width: '48px', height: '3px', backgroundColor: '#334155', borderRadius: '3px' }}></div>
          {/* Honor Punch Hole Camera */}
          <div style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: '#000000',
            border: '1.5px solid #1e293b'
          }}></div>
        </div>

        {/* Android Top Status Bar (Time, Battery, Wifi) */}
        <div style={{
          height: '24px',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          fontWeight: 'bold',
          color: '#334155',
          flexShrink: 0,
          userSelect: 'none',
          zIndex: 45
        }}>
          <span>12:30</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px' }}>
            <span>HONOR 5G</span>
            <span>🔋 95%</span>
          </div>
        </div>

        {/* Scrollable Mobile Viewport Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          backgroundColor: '#f8fafc',
          position: 'relative',
          padding: '12px 8px'
        }} className="honor-mobile-viewport">
          {children}
        </div>

        {/* Android Bottom Navigation Bar */}
        <div style={{
          height: '26px',
          backgroundColor: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          userSelect: 'none'
        }}>
          <div style={{ width: '120px', height: '4px', backgroundColor: '#94a3b8', borderRadius: '2px' }}></div>
        </div>
      </div>
    </div>
  );
}
