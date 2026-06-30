import re

with open(r'c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\EmployeeDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

start_str = '{/* تقديم طلب - Action Buttons */}'
idx1 = content.find(start_str)

if idx1 == -1:
    start_str = '{/*   - Action Buttons */}'
    idx1 = content.find(start_str)

if idx1 == -1:
    start_str = 'Action Buttons'
    idx1 = content.find(start_str)

print(f"Start index: {idx1}")
if idx1 != -1:
    print(content[idx1-100:idx1+1500])
