
with open('src/index.css', 'r', encoding='utf-8') as f:
    lines = f.read()

lines = lines.replace('''
.preview-active.preview-phone .overview-grid,
.preview-active.preview-phone .hr-requests-grid {
  grid-template-columns: 1fr !important;
}
''', '')

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(lines)
print('Done!')

