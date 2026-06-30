import sys

file_path = 'src/App.jsx'
try:
    with open(file_path, 'r', encoding='windows-1252') as f:
        content = f.read()
    
    # Attempt to restore
    restored = content.encode('windows-1252').decode('utf-8')
    
    # Now fix the 'currentUser.role ===' part that I broke
    restored = restored.replace("currentUser && (isAdmin(currentUser) || currentUser.role === 'ꬩ') && !isPreviewMode", "currentUser && (isAdmin(currentUser) || currentUser.role === 'مشرف') && !isPreviewMode")
    restored = restored.replace("currentUser && (isAdmin(currentUser) || currentUser.role === 'ꬩ') && !isPreviewMode", "currentUser && (isAdmin(currentUser) || currentUser.role === 'مشرف') && !isPreviewMode")
    
    # Just in case there are multiple variations of the corruption:
    if 'مشرف' not in restored:
        print("Could not restore string correctly.")
        
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(restored)
        
    print('SUCCESS')
except Exception as e:
    print('Error:', e)
