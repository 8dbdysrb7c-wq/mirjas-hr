import re

file_path = r'c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\EmployeeDashboard.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove the paragraph
p_pattern = r'<p style=\{\{ fontSize: \'0\.75rem\', color: \'#64748b\', lineHeight: \'1\.5\', margin: 0, maxWidth: \'200px\', fontWeight: \'500\' \}\}>\s*.*?\s*</p>'
content = re.sub(p_pattern, '', content, flags=re.DOTALL)

# 2. Remove the margin from h4 since it's alone now
content = content.replace('marginBottom: \'0.25rem\' }}>الختمات الناقصة</h4>', 'marginBottom: 0 }}>الختمات الناقصة</h4>')

# 3. Remove the span with "يوم متبقي"
span_pattern = r'<span style=\{\{ fontSize: \'0\.65rem\', fontWeight: \'700\', color: \'#64748b\' \}\}>.*?</span>'
content = re.sub(span_pattern, '', content, flags=re.DOTALL)

# 4. Remove the margin from the remainingPunches span
content = content.replace('marginBottom: \'0.25rem\' }}>{remainingPunches}</span>', 'marginBottom: 0 }}>{remainingPunches}</span>')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully replaced text.")
