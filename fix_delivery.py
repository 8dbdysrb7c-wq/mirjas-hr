import re

filepath = r"c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\admin\AdminDelivery.jsx"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Hide sourceEntity column
# Remove th
content = re.sub(r'<th onClick=\{\(\) => handleSort\(\'sourceEntity\'\)\}.*?<div className="flex items-center gap-1">.*?</div>\s*</th>', '', content, flags=re.DOTALL)
# Remove td
content = re.sub(r'<td data-label=".*?" className="font-semibold">\{mission\.sourceEntity \|\| \'---\'\}</td>', '', content, flags=re.DOTALL)

# 2. Adjust filter spacing (shrink search, expand date pickers)
# Search input wrapper
content = content.replace('md:max-w-xs', 'md:max-w-[200px]')
# Date pickers styling
content = content.replace("style={{ width: '160px', marginBottom: 0,", "style={{ width: '140px', marginBottom: 0, border: '1px solid #cbd5e1', borderRadius: '8px',")

# 3. Fix the flatpickr in SweetAlert by passing a config that attaches the calendar to the wrapper or fixes z-index
old_flatpickr = """flatpickr(document.getElementById('swal-date'), {
          locale: Arabic,
          dateFormat: "Y-m-d",
          allowInput: true
        });"""
new_flatpickr = """const fp = flatpickr(document.getElementById('swal-date'), {
          locale: Arabic,
          dateFormat: "Y-m-d",
          allowInput: true,
          onOpen: function(selectedDates, dateStr, instance) {
            // Fix z-index issue for SweetAlert
            if (instance.calendarContainer) {
              instance.calendarContainer.style.zIndex = 99999;
            }
          }
        });
        // Make the input look nicer
        const swalDate = document.getElementById('swal-date');
        if(swalDate) {
          swalDate.style.border = '1px solid #cbd5e1';
          swalDate.style.borderRadius = '8px';
          swalDate.style.padding = '0.5rem 1rem';
        }"""
content = content.replace(old_flatpickr, new_flatpickr)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Applied fixes to AdminDelivery.jsx")
