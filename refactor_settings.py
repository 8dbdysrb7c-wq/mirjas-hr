import sys

file_path = r'c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\admin\AdminSettings.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip_until = -1

for i, line in enumerate(lines):
    if i < skip_until:
        continue
        
    # Remove missingpunches button
    if "<div className={`premium-tab ${activeTab === 'missingpunches'" in line:
        skip_until = i + 3
        continue
        
    # Remove leavepermissions button
    if "<div className={`premium-tab ${activeTab === 'leavepermissions'" in line:
        skip_until = i + 3
        continue
        
    # Remove departments button
    if "<div className={`premium-tab ${activeTab === 'departments'" in line:
        skip_until = i + 3
        continue
        
    # Rename jobtitles button text
    if "activeTab === 'jobtitles'" in line and "المسميات الوظيفية" in line:
        line = line.replace("المسميات الوظيفية", "المسميات والأقسام الوظيفية")
    elif "activeTab === 'jobtitles'" in lines[max(0, i-1)] and "المسميات الوظيفية" in line:
        line = line.replace("المسميات الوظيفية", "المسميات والأقسام الوظيفية")

    # Rename jobtitles header text inside the render section (optional but good)
    if "المسميات الوظيفية" in line and "<h3 className=" in line and "Briefcase" in line:
        line = line.replace("المسميات الوظيفية", "المسميات والأقسام الوظيفية")

    # Make departments render section render under jobtitles
    if "{activeTab === 'departments' && (" in line:
        line = line.replace("'departments'", "'jobtitles'")
        
    new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("AdminSettings.jsx updated successfully.")
