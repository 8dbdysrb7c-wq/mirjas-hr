import re
import io

with io.open('src/pages/EmployeeDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace everything from <div className="hidden"> to {renderContent()} with just {renderContent()}
new_content = re.sub(r'<div className="hidden">.*?\{renderContent\(\)\}', '\n          {renderContent()}', content, flags=re.DOTALL)

with io.open('src/pages/EmployeeDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Done via regex")
