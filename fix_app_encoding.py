import sys

def fix_app_encoding():
    try:
        with open('src/App.jsx', 'rb') as f:
            content = f.read()
            
        # Try decoding as utf-16le
        text = content.decode('utf-16le')
        
        with open('src/App.jsx', 'w', encoding='utf-8') as f:
            f.write(text)
        print("Successfully fixed App.jsx encoding!")
    except Exception as e:
        print("Error:", e)

fix_app_encoding()
