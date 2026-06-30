import re

with open('src/pages/admin/AdminReports.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# The buttons container
container_start = '<div className="flex gap-2">'
start_idx = content.find(container_start)
if start_idx == -1:
    print("Container not found")
    exit(1)

# Find the matching closing div
end_idx = content.find('</div>', start_idx)

# Extract the block
block = content[start_idx + len(container_start):end_idx]

# Find the 4 unique buttons
# Each button starts with <button and ends with </button>
buttons = re.findall(r'<button[\s\S]*?</button>', block)

# We want exactly 4 unique buttons based on title
unique_buttons = {}
for btn in buttons:
    if 'title="طباعة"' in btn:
        unique_buttons['print'] = btn
    elif 'title="تصدير إلى Word"' in btn:
        unique_buttons['word'] = btn
    elif 'title="تصدير إلى Excel"' in btn:
        unique_buttons['excel'] = btn
    elif 'title="تصدير إلى PDF"' in btn:
        unique_buttons['pdf'] = btn

print(f"Found unique buttons: {list(unique_buttons.keys())}")

# Construct the new block
new_block = f"\n              {unique_buttons['print']}\n              {unique_buttons['word']}\n              {unique_buttons['excel']}\n              {unique_buttons['pdf']}\n            "

# Replace
new_content = content[:start_idx + len(container_start)] + new_block + content[end_idx:]

with open('src/pages/admin/AdminReports.jsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Fixed the buttons!")
