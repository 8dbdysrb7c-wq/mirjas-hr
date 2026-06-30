import os
import re

directories = ['src/pages/hr', 'src/pages/admin']

for directory in directories:
    if not os.path.exists(directory): continue
    for filename in os.listdir(directory):
        if filename.endswith('.jsx'):
            file_path = os.path.join(directory, filename)
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            original_content = content
            
            # Replace option
            # We want to replace <option value="all">جميع الأقسام</option>
            content = re.sub(
                r'<option value="all">\s*جميع الأقسام\s*</option>',
                '<option value="all" hidden>جميع الأقسام</option>\n                  <option value="all_content">جميع الأقسام الوظيفية</option>',
                content
            )

            # Some options might already have "جميع الأقسام الوظيفية" but we want to apply the same trick
            # In HRSalaryReports.jsx line 924 we found <option value="all">جميع الأقسام الوظيفية</option>
            # Let's replace it as well so the trick works consistently
            content = re.sub(
                r'<option value="all">\s*جميع الأقسام الوظيفية\s*</option>',
                '<option value="all" hidden>جميع الأقسام</option>\n                  <option value="all_content">جميع الأقسام الوظيفية</option>',
                content
            )

            # Update onChange for selectedDepartment
            # Example: onChange={(e) => setSelectedDepartment(e.target.value)}
            content = re.sub(
                r'onChange={\(e\) => setSelectedDepartment\(e\.target\.value\)}',
                "onChange={(e) => setSelectedDepartment(e.target.value === 'all_content' ? 'all' : e.target.value)}",
                content
            )
            
            # Just in case there are other variations of onChange for selectedDepartment
            content = re.sub(
                r'onChange={e => setSelectedDepartment\(e\.target\.value\)}',
                "onChange={e => setSelectedDepartment(e.target.value === 'all_content' ? 'all' : e.target.value)}",
                content
            )

            if content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f'Updated {file_path}')
