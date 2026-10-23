import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    const isChunkLoadError =
      error?.name === 'ChunkLoadError' ||
      /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(error?.message || '');

    if (isChunkLoadError) {
      const retryKey = 'chunk_reload_retry';
      const lastRetry = sessionStorage.getItem(retryKey);
      const now = Date.now();
      if (!lastRetry || now - parseInt(lastRetry, 10) > 15000) {
        sessionStorage.setItem(retryKey, now.toString());
        window.location.reload();
      }
    }
  }

  handleReload = async () => {
    try {
      if (typeof window !== 'undefined' && window.indexedDB?.databases) {
        const dbs = await window.indexedDB.databases();
        for (const dbInfo of dbs) {
          if (dbInfo.name && dbInfo.name.startsWith('firestore/')) {
            try { window.indexedDB.deleteDatabase(dbInfo.name); } catch (_) {}
          }
        }
      }
    } catch (_) {}
    window.location.reload();
  };

  handleReset = () => {
    localStorage.removeItem('currentUser');
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const isChunkLoadError =
        this.state.error?.name === 'ChunkLoadError' ||
        /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(this.state.error?.message || '');

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8fafc',
          padding: '24px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          direction: 'rtl',
          textAlign: 'center'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '36px 28px',
            maxWidth: '520px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
            border: isChunkLoadError ? '1px solid #bae6fd' : '1px solid #fee2e2'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              backgroundColor: isChunkLoadError ? '#e0f2fe' : '#fee2e2',
              color: isChunkLoadError ? '#0284c7' : '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto'
            }}>
              {isChunkLoadError ? <RotateCcw size={36} /> : <AlertTriangle size={36} />}
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1e293b', marginBottom: '10px' }}>
              {isChunkLoadError ? 'تم إصدار تحديث جديد للنظام' : 'حدث خطأ أثناء عرض الصفحة'}
            </h2>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px', lineHeight: '1.6' }}>
              {isChunkLoadError
                ? 'تم رفع تحديثات برمجية جديدة للنظام. يُرجى إعادة تحميل الصفحة لتطبيق التحديث الأخير ومتابعة العمل.'
                : 'تم رصد مشكلة غير متوقعة. يمكنك إعادة تحميل الصفحة، أو العودة لشاشة تسجيل الدخول.'}
            </p>

            {this.state.error && (
              <div style={{
                background: '#f1f5f9',
                borderRadius: '12px',
                padding: '12px',
                fontSize: '12px',
                color: '#475569',
                textAlign: 'left',
                direction: 'ltr',
                overflowX: 'auto',
                marginBottom: '24px',
                maxHeight: '120px',
                fontFamily: 'monospace'
              }}>
                {this.state.error?.toString()}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                <RotateCcw size={18} /> إعادة تحميل الصفحة
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                <Home size={18} /> شاشة الدخول
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
