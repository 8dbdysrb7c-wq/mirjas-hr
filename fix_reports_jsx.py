import re

with open('src/pages/admin/AdminReports.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the main wrapper of the search and filter bar
old_wrapper = '''        <div className="glass-panel no-print" style={{ padding: '1rem' }}>
          <div className="flex gap-4 items-center justify-between w-full flex-wrap">
            <div className="flex items-center gap-3 w-full md:max-w-md">'''

new_wrapper = '''        <div className="glass-panel no-print" style={{ padding: '1rem' }}>
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between w-full">
            <div className="flex items-center gap-3 w-full md:max-w-md">'''

content = content.replace(old_wrapper, new_wrapper)

# Fix the second wrapper that holds the select and buttons
old_buttons_wrapper = '''            <div className="flex items-center" style={{ gap: '2rem' }}>'''
new_buttons_wrapper = '''            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">'''

content = content.replace(old_buttons_wrapper, new_buttons_wrapper)

# Fix the width of the select element to fit its container
old_select = '''                <select
                  className="input-field text-sm"
                  style={{ width: 'auto', marginBottom: 0, height: '40px', padding: '0 2rem 0 1rem', borderRadius: '100px' }}'''
new_select = '''                <select
                  className="input-field text-sm w-full sm:w-auto"
                  style={{ marginBottom: 0, height: '40px', padding: '0 2rem 0 1rem', borderRadius: '100px' }}'''

content = content.replace(old_select, new_select)

# Fix the print/export buttons container
old_export_buttons = '''              <div className="flex gap-2">'''
new_export_buttons = '''              <div className="flex flex-wrap items-center justify-center gap-2 mt-2 sm:mt-0">'''

content = content.replace(old_export_buttons, new_export_buttons)


with open('src/pages/admin/AdminReports.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("AdminReports layout fixed")
