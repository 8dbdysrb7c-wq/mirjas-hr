import sys
import re

file_path = r'c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\EmployeeDashboard.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the messy waves
old_waves_match = re.search(r'\{/\* Decorative Wavy Lines.*?</svg>\s*</div>', content, re.DOTALL)

new_waves = """{/* Decorative Wavy Lines in Bottom Left (Elegant and loose) */}
              <div style={{ 
                position: 'absolute', 
                left: 0, 
                bottom: 0, 
                width: '60%', 
                height: '100%', 
                opacity: 0.7, 
                pointerEvents: 'none', 
                zIndex: 0,
                WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)',
                maskImage: 'linear-gradient(to right, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)'
              }}>
                <svg viewBox="0 0 300 100" style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
                  <path d="M0,80 C100,100 200,40 300,60" fill="none" stroke="#2dd4bf" strokeWidth="1.5" opacity="0.6"/>
                  <path d="M0,90 C80,70 150,110 300,50" fill="none" stroke="#14b8a6" strokeWidth="1" opacity="0.5"/>
                  <path d="M0,75 C120,50 180,90 300,70" fill="none" stroke="#0d9488" strokeWidth="2" opacity="0.3"/>
                  <path d="M0,85 C90,110 160,30 300,80" fill="none" stroke="#99f6e4" strokeWidth="1" opacity="0.7"/>
                  <path d="M0,95 C110,80 190,100 300,40" fill="none" stroke="#5eead4" strokeWidth="1.2" opacity="0.4"/>
                </svg>
              </div>"""

if old_waves_match:
    content = content[:old_waves_match.start()] + new_waves + content[old_waves_match.end():]
else:
    print("Could not find waves block to replace.")
    sys.exit(1)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated waves to elegant loose paths with gradient fade.")
