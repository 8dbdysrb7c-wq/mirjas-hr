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
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                border: '1px solid #f1f5f9',
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
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(26, 141, 155, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.03)';
              }}
              dir="rtl"
            >
              {/* Decorative Dot Grid in Top Right */}
              <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', opacity: 0.15 }}>
                {Array.from({length: 16}).map((_, i) => (
                  <div key={i} style={{width:'4px',height:'4px',borderRadius:'50%',background:'#64748b'}}></div>
                ))}
              </div>

              {/* Decorative Wavy Lines in Bottom Left */}
              <div style={{ position: 'absolute', left: 0, bottom: 0, width: '220px', height: '60px', opacity: 0.5, pointerEvents: 'none' }}>
                <svg viewBox="0 0 200 60" style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
                  <path d="M0,40 C50,60 100,20 200,40" fill="none" stroke="#2dd4bf" strokeWidth="1" opacity="0.6"/>
                  <path d="M0,50 C60,70 120,10 200,50" fill="none" stroke="#14b8a6" strokeWidth="1.5" opacity="0.5"/>
                  <path d="M0,60 C80,80 140,20 200,55" fill="none" stroke="#0f766e" strokeWidth="1" opacity="0.4"/>
                  <path d="M0,35 C70,10 130,50 200,30" fill="none" stroke="#80cbc4" strokeWidth="0.8" opacity="0.7"/>
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
                  <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.08))' }}>
                    <path fill="#ffffff" d="M30 5 L70 5 C75 5 80 8 82 12 L98 42 C100 47 100 53 98 58 L82 88 C80 92 75 95 70 95 L30 95 C25 95 20 92 18 88 L2 58 C0 53 0 47 2 42 L18 12 C20 8 25 5 30 5 Z" />
                    <path fill="none" stroke="#f1f5f9" strokeWidth="1" d="M30 5 L70 5 C75 5 80 8 82 12 L98 42 C100 47 100 53 98 58 L82 88 C80 92 75 95 70 95 L30 95 C25 95 20 92 18 88 L2 58 C0 53 0 47 2 42 L18 12 C20 8 25 5 30 5 Z" />
                  </svg>
                  <Fingerprint size={38} color="#0f766e" strokeWidth={2} style={{ position: 'relative', zIndex: 10 }} />
                </div>
                
                {/* Text */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <h4 style={{ fontWeight: '800', color: '#0f766e', fontSize: '1.3rem', margin: 0 }}>الختمات الناقصة</h4>
                </div>
              </div>

              {/* Left Side: Number box */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
                borderRadius: '16px',
                width: '80px',
                height: '80px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 10px rgba(0,0,0,0.02), inset 0 2px 4px rgba(255,255,255,1)',
                flexShrink: 0,
                zIndex: 1
              }}>
                <span style={{ fontSize: '3rem', fontWeight: '800', color: '#0f766e', lineHeight: '1' }}>{remainingPunches}</span>
              </div>
            </div>
            """

content = content[:widget_start] + new_widget + content[widget_end:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Flipped layout to match exact RTL visual representation.")
