import re

file_path = "c:/Users/a.awwad/.gemini/antigravity/mirjas-hr/src/pages/EmployeeDashboard.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

gps_start_marker = "{/* GPS Live Attendance Card */}"
gps_start = content.find(gps_start_marker)

gps_end_marker = """                </div>
              </div>
            </div>"""
gps_end = content.find(gps_end_marker, gps_start) + len(gps_end_marker)

if gps_start != -1 and gps_end != -1:
    gps_content = content[gps_start:gps_end]
    
    # Remove it from the original location
    content = content[:gps_start] + content[gps_end:]
    
    # Insert it into home tab
    home_start_marker = '<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="employee-home-container animate-fade-in">\n            '
    insert_idx = content.find(home_start_marker)
    if insert_idx != -1:
        insert_pos = insert_idx + len(home_start_marker)
        content = content[:insert_pos] + gps_content + "\n\n            " + content[insert_pos:]
        
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print("Successfully moved GPS card to home tab.")
    else:
        print("Could not find home tab insertion point.")
else:
    print("Could not find GPS card block.")
