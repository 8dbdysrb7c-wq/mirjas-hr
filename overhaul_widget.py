import sys

file_path = r'c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\EmployeeDashboard.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

widget_start = content.find('{/* الختمات الناقصة Widget */}')
if widget_start == -1:
    print("Widget start not found")
    sys.exit(1)
    
widget_end = content.find('</motion.div>', widget_start)
if widget_end == -1:
    print("Widget end not found")
    sys.exit(1)

new_widget = """{/* الختمات الناقصة Widget */}
            <div 
              onClick={() => {
                if (remainingPunches <= 0) {
                  MySwal.fire('تنبيه', 'لا يوجد لديك ختمات ناقصة متبقية لهذا الشهر.', 'success');
                } else {
                  setShowMissingPunchModal(true);
                }
              }}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '24px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
                border: '1px solid #f8fafc',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '2rem',
                cursor: 'pointer',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 35px rgba(26, 141, 155, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.04)';
              }}
              dir="rtl"
            >
              {/* Decorative Dot Grid in Top Right */}
              <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '5px', opacity: 0.12 }}>
                {Array.from({length: 16}).map((_, i) => (
                  <div key={i} style={{width:'4px',height:'4px',borderRadius:'50%',background:'#475569'}}></div>
                ))}
              </div>

              {/* Decorative Wavy Lines in Bottom Left (Perfected based on image) */}
              <div style={{ position: 'absolute', left: 0, bottom: '8px', width: '260px', height: '40px', opacity: 1, pointerEvents: 'none', zIndex: 0 }}>
                <svg viewBox="0 0 250 40" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                  <path d="M-10,20 C40,40 80,-5 150,15 C200,30 230,10 260,20" fill="none" stroke="#99f6e4" strokeWidth="1" />
                  <path d="M-10,30 C50,50 100,5 180,25 C220,35 240,15 260,25" fill="none" stroke="#5eead4" strokeWidth="1" />
                  <path d="M-10,10 C30,-10 120,40 190,10 C220,-5 240,25 260,15" fill="none" stroke="#ccfbf1" strokeWidth="1.5" />
                  <path d="M-10,25 C60,0 110,45 200,20 C230,10 250,35 260,30" fill="none" stroke="#2dd4bf" strokeWidth="0.8" />
                </svg>
              </div>

              {/* Right Side: Hexagon + Text */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', zIndex: 1 }}>
                {/* Hexagon */}
                <div style={{
                  position: 'relative',
                  width: '74px',
                  height: '74px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.06))' }}>
                    <path fill="#ffffff" d="M30 5 L70 5 C75 5 80 8 82 12 L98 42 C100 47 100 53 98 58 L82 88 C80 92 75 95 70 95 L30 95 C25 95 20 92 18 88 L2 58 C0 53 0 47 2 42 L18 12 C20 8 25 5 30 5 Z" />
                    <path fill="none" stroke="#e2e8f0" strokeWidth="0.5" d="M30 5 L70 5 C75 5 80 8 82 12 L98 42 C100 47 100 53 98 58 L82 88 C80 92 75 95 70 95 L30 95 C25 95 20 92 18 88 L2 58 C0 53 0 47 2 42 L18 12 C20 8 25 5 30 5 Z" />
                  </svg>
                  <Fingerprint size={38} color="#0f766e" strokeWidth={2} style={{ position: 'relative', zIndex: 10 }} />
                </div>
                
                {/* Text */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <h4 style={{ fontWeight: '800', color: '#115e59', fontSize: '1.25rem', margin: 0 }}>الختمات الناقصة</h4>
                </div>
              </div>

              {/* Left Side: Number box */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                borderRadius: '18px',
                width: '75px',
                height: '75px',
                boxShadow: '0 6px 16px rgba(0,0,0,0.05)',
                border: 'none',
                flexShrink: 0,
                zIndex: 10
              }}>
                <span style={{ fontSize: '3rem', fontWeight: '900', color: '#0f766e', lineHeight: '1' }}>{remainingPunches}</span>
              </div>
            </div>
            """

content = content[:widget_start] + new_widget + content[widget_end:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Widget completely overhauled to match crop exactly.")
