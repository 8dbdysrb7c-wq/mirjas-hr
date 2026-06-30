def unbreak_it():
    try:
        # Step 1: Read the current mangled text
        with open('src/App.jsx', 'r', encoding='utf-8') as f:
            text_v2 = f.read()
        
        # Step 2 & 3: Reverse my script's mangling
        # my script did: text = content.decode('utf-16le')
        content = text_v2.encode('utf-16le')
        text_v1 = content.decode('utf-8')
        
        # Step 4 & 5: Reverse the original mangling
        # original mangling was: original_bytes interpreted as utf-16le -> text_v1
        original_bytes = text_v1.encode('utf-16le')
        correct_text = original_bytes.decode('utf-8')
        
        with open('src/App.jsx', 'w', encoding='utf-8') as f:
            f.write(correct_text)
        print("Success! App.jsx restored.")
    except Exception as e:
        print("Error:", e)

unbreak_it()
