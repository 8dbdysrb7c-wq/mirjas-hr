import re
import sys

file_path = r'c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\EmployeeDashboard.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the custom icons block
new_custom_icons = """
const CustomFolder = ({ size, style }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
    <defs>
      <filter id="folderShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#126a75" floodOpacity="0.4"/>
      </filter>
      <linearGradient id="folderGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#2dd4bf" />
        <stop offset="100%" stopColor="#115e59" />
      </linearGradient>
    </defs>
    <g filter="url(#folderShadow)">
      {/* Back flap */}
      <path d="M6 16 C6 13.5 8 11.5 10.5 11.5 L25 11.5 L29 16 L53.5 16 C56 16 58 18 58 20.5 L58 48 C58 50.5 56 52.5 53.5 52.5 L10.5 52.5 C8 52.5 6 50.5 6 48 Z" fill="#0f766e" />
      {/* Paper inside */}
      <path d="M12 18 L52 18 L52 44 L12 44 Z" fill="#ffffff" />
      {/* Front flap (slanted) */}
      <path d="M4 28 C4 25.5 6 23.5 8.5 23.5 L55.5 23.5 C58 23.5 60 25.5 60 28 L56 51 C56 53.5 54 55.5 51.5 55.5 L8.5 55.5 C6 55.5 4 53.5 4 51 Z" fill="url(#folderGrad)" />
    </g>
  </svg>
);

const CustomReport = ({ size, style }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
    <defs>
      <filter id="reportShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="2" dy="5" stdDeviation="3" floodColor="#0f766e" floodOpacity="0.3"/>
      </filter>
    </defs>
    <g filter="url(#reportShadow)">
      {/* Body with fold cut out */}
      <path d="M16 8 C16 5.8 17.8 4 20 4 L38 4 L50 16 L50 56 C50 58.2 48.2 60 46 60 L20 60 C17.8 60 16 58.2 16 56 Z" fill="#f8fafc" stroke="#115e59" strokeWidth="4.5" strokeLinejoin="round" />
      {/* Folded corner */}
      <path d="M38 4 L38 16 L50 16 Z" fill="#14b8a6" stroke="#115e59" strokeWidth="4.5" strokeLinejoin="round" />
      {/* Lines */}
      <line x1="25" y1="32" x2="41" y2="32" stroke="#14b8a6" strokeWidth="4.5" strokeLinecap="round" />
      <line x1="25" y1="44" x2="41" y2="44" stroke="#14b8a6" strokeWidth="4.5" strokeLinecap="round" />
    </g>
  </svg>
);

const CustomCalendar = ({ size, style }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
    <defs>
      <filter id="calShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="5" stdDeviation="3" floodColor="#0f766e" floodOpacity="0.3"/>
      </filter>
    </defs>
    <g filter="url(#calShadow)">
      {/* Main body */}
      <rect x="10" y="14" width="44" height="42" rx="6" fill="#f8fafc" />
      {/* Top bar */}
      <path d="M10 20 C10 16.7 12.7 14 16 14 L48 14 C51.3 14 54 16.7 54 20 L54 28 L10 28 Z" fill="#14b8a6" />
      {/* Loops */}
      <rect x="18" y="8" width="6" height="14" rx="3" fill="#0f766e" />
      <rect x="40" y="8" width="6" height="14" rx="3" fill="#0f766e" />
      {/* Grid squares */}
      <rect x="16" y="34" width="6" height="6" rx="1.5" fill="#115e59" />
      <rect x="25" y="34" width="6" height="6" rx="1.5" fill="#115e59" />
      <rect x="34" y="34" width="6" height="6" rx="1.5" fill="#115e59" />
      <rect x="43" y="34" width="6" height="6" rx="1.5" fill="#115e59" />
      
      <rect x="16" y="44" width="6" height="6" rx="1.5" fill="#115e59" />
      <rect x="25" y="44" width="6" height="6" rx="1.5" fill="#115e59" />
      <rect x="34" y="44" width="6" height="6" rx="1.5" fill="#115e59" />
      <rect x="43" y="44" width="6" height="6" rx="1.5" fill="#115e59" />
    </g>
  </svg>
);
"""

# Find the old block and replace
start_idx = content.find('const CustomFolder = ({ size, style }) => (')
end_idx = content.find('const DashboardCard =')

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + new_custom_icons + content[end_idx:]

# Update the size of custom icons in DashboardCard
old_size = '<Icon size={46} style={{ filter: \'none\' }} />'
new_size = '<Icon size={56} style={{ filter: \'none\' }} />'
content = content.replace(old_size, new_size)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated SVGs for size and aesthetics.")
