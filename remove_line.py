file_path = "c:/Users/a.awwad/.gemini/antigravity/mirjas-hr/src/pages/admin/AdminSettings.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# line 1225 is index 1224
if "</div>" in lines[1224]:
    del lines[1224]

with open(file_path, "w", encoding="utf-8") as f:
    f.writelines(lines)

print("Removed line 1225")
