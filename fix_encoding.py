import sys

def fix_encoding(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # The content was double encoded by powershell. 
        # It read UTF-8 bytes but interpreted them as Windows-1256.
        # So we encode as Windows-1256 to get the original UTF-8 bytes,
        # and decode as UTF-8.
        fixed_content = content.encode('cp1256').decode('utf-8')
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(fixed_content)
        print("Successfully fixed encoding!")
    except Exception as e:
        print("Error:", e)

fix_encoding('src/pages/admin/AdminReports.jsx')
