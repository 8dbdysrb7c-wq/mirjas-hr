import re

file_path = "c:/Users/a.awwad/.gemini/antigravity/mirjas-hr/src/pages/EmployeeDashboard.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace the first instance of `case 'hr_requests':` by stripping it entirely
# Let's find the exact string that was duplicated.
# My injection script did: content.replace(anchor, anchor + ui_code)
# This means the anchor string is in the file twice right next to each other! Wait.
# If I replaced `anchor` with `anchor + ui_code`, it should only add `ui_code` AFTER `anchor`.
# But wait, `ui_code` does not contain `case 'hr_requests':`.
# Oh! Wait! Look at `anchor`:
anchor = """      case 'hr_requests':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
"""
# If `ui_code` did not contain `case 'hr_requests':`, how can it be duplicated?
# Let's print out all indices of `case 'hr_requests':`
indices = [m.start() for m in re.finditer(r"case 'hr_requests':", content)]
print(f"Indices: {indices}")

# Let's fix the file by taking the content and just removing the second one if it's right after? No.
# I'll just write the surrounding code to a log file so I can read it.
with open("c:/Users/a.awwad/.gemini/antigravity/mirjas-hr/debug_case.txt", "w", encoding="utf-8") as out:
    for idx in indices:
        out.write(f"--- MATCH AT {idx} ---\n")
        out.write(content[max(0, idx-100):min(len(content), idx+500)])
        out.write("\n\n")

print("Wrote debug log")
