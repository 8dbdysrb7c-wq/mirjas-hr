import sys

file_path = 'src/pages/hr/HRSalaryReports.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Make the outer container transparent if isNested
if 'className="min-h-screen bg-slate-50/50 p-6"' in content:
    content = content.replace('className="min-h-screen bg-slate-50/50 p-6"', 'className={`min-h-screen ${isNested ? \'\' : \'bg-slate-50/50 p-6\'}`}')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done')
