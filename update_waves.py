import sys
import re

file_path = r'c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\EmployeeDashboard.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the wavy lines div
old_waves_pattern = r'\{/\* Decorative Wavy Lines in Bottom Left \(Perfected based on image\) \*/\}.*?</div>'
# Need to match across multiple lines
old_waves_match = re.search(r'\{/\* Decorative Wavy Lines in Bottom Left.*?</div>', content, re.DOTALL)

new_waves = """{/* Decorative Wavy Lines in Bottom Left (Perfected based on image) */}
              <div style={{ position: 'absolute', left: 0, bottom: 0, width: '320px', height: '65px', opacity: 0.85, pointerEvents: 'none', zIndex: 0 }}>
                <svg viewBox="0 0 400 100" style={{ width: '100%', height: '100%', overflow: 'visible' }} preserveAspectRatio="none">
                  {Array.from({length: 25}).map((_, i) => {
                    const sy = 75 + i * 1.8;
                    const cp1x = 80 + i * 4.5;
                    const cp1y = 5 + i * 3.5;
                    const cp2x = 280 - i * 3.5;
                    const cp2y = 95 - i * 2.5;
                    const ey = 25 + i * 2.2;
                    return (
                      <path 
                        key={i} 
                        d={`M-20,${sy} C${cp1x},${cp1y} ${cp2x},${cp2y} 420,${ey}`} 
                        fill="none" 
                        stroke="#0d9488" 
                        strokeWidth={0.4 + (i%2)*0.4} 
                        style={{ opacity: 0.15 + (i%4)*0.08 }}
                      />
                    );
                  })}
                </svg>
              </div>"""

if old_waves_match:
    content = content[:old_waves_match.start()] + new_waves + content[old_waves_match.end():]
else:
    print("Could not find waves block to replace.")
    sys.exit(1)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated wavy lines to mathematical ribbon mesh.")
