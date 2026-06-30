import re

with open('output2.txt', 'r', encoding='utf-8') as f:
    admin_content = f.read()

# Extract the base64 SVGs
pdf_match = re.search(r'(<img src="data:image/svg\+xml;base64,[^"]+" alt="PDF"[^>]+>)', admin_content)
excel_match = re.search(r'(<img src="data:image/svg\+xml;base64,[^"]+" alt="Excel"[^>]+>)', admin_content)
word_match = re.search(r'(<img src="data:image/svg\+xml;base64,[^"]+" alt="Word"[^>]+>)', admin_content)

if not pdf_match or not excel_match or not word_match:
    print("Could not find one or more SVGs!")
    exit(1)

pdf_img = pdf_match.group(1)
excel_img = excel_match.group(1)
word_img = word_match.group(1)

new_buttons = f'''            <div className="flex items-center gap-2">
              <button 
                className="bg-white shadow-sm hover:bg-slate-50 flex items-center justify-center rounded-lg transition-all cursor-pointer" 
                title="تصدير كـ PDF"
                onClick={{() => handleExport('pdf')}}
                style={{{{ width: '54px', height: '38px', border: '2px solid #3b82f6', padding: '0' }}}}
              >
                {pdf_img}
              </button>
              <button 
                className="bg-white shadow-sm hover:bg-slate-50 flex items-center justify-center rounded-lg transition-all cursor-pointer" 
                title="تصدير كـ Excel"
                onClick={{() => handleExport('excel')}}
                style={{{{ width: '54px', height: '38px', border: '2px solid #3b82f6', padding: '0' }}}}
              >
                {excel_img}
              </button>
              <button 
                className="bg-white shadow-sm hover:bg-slate-50 flex items-center justify-center rounded-lg transition-all cursor-pointer" 
                title="تصدير كـ Word"
                onClick={{() => handleExport('word')}}
                style={{{{ width: '54px', height: '38px', border: '2px solid #3b82f6', padding: '0' }}}}
              >
                {word_img}
              </button>
              <button 
                className="bg-white shadow-sm hover:bg-slate-50 flex items-center justify-center rounded-lg transition-all cursor-pointer" 
                title="طباعة التقرير"
                onClick={{handlePrint}}
                style={{{{ width: '54px', height: '38px', border: '2px solid #3b82f6', padding: '0', color: '#3b82f6' }}}}
              >
                <Printer size={{22}} strokeWidth={{2.5}} />
              </button>
            </div>'''

file_path = 'src/pages/hr/HRSalaryReports.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the block
pattern = r'<div className="flex items-center gap-2">\s*<button\s*title="طباعة التقرير".*?</div>\s*</div>\s*</div>'
new_content = re.sub(pattern, new_buttons + '\n          </div>\n        </div>', content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print('Success')
