
with open('src/pages/admin/AdminOverview.css', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the start of the section I added and replace everything after it
idx = content.find('/* --- Mobile Grid Fixes for Admin Overview --- */')
if idx != -1:
    content = content[:idx]

css_final = '''
/* --- Mobile Grid Fixes for Admin Overview --- */
.preview-active.preview-phone .overview-grid,
@media (max-width: 768px) {
  .overview-grid {
    grid-template-columns: repeat(3, 1fr) !important;
    gap: 8px !important;
  }
  
  .hr-requests-grid {
    grid-template-columns: repeat(4, 1fr) !important;
    gap: 8px !important;
  }

  .stat-card {
    padding-top: 16px !important;
    padding-bottom: 12px !important;
    border-radius: 12px !important;
    position: relative;
    overflow: hidden;
  }

  .icon-wrapper {
    width: 36px !important;
    height: 36px !important;
    margin-bottom: 8px !important;
    border-radius: 10px !important;
  }

  .icon-wrapper svg {
    width: 20px !important;
    height: 20px !important;
  }

  .stat-title {
    font-size: 10px !important;
    margin-bottom: 6px !important;
    text-align: center;
    line-height: 1.3;
    padding: 0 2px;
  }

  .stat-number {
    font-size: 16px !important;
    margin-bottom: 0 !important;
  }

  .stat-pill {
    display: none !important;
  }

  .card-button {
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: 100% !important;
    height: 100% !important;
    opacity: 0 !important;
    z-index: 10 !important;
    padding: 0 !important;
    margin: 0 !important;
  }
}
'''

# Wait, I cannot use comma between class selector and media query.
# I need to duplicate the rules or use a wrapper class.
# Let's write valid CSS:

css_valid = '''
/* --- Mobile Grid Fixes for Admin Overview --- */

/* For Preview Mode */
.preview-active.preview-phone .overview-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 8px !important; }
.preview-active.preview-phone .hr-requests-grid { grid-template-columns: repeat(4, 1fr) !important; gap: 8px !important; }
.preview-active.preview-phone .stat-card { padding-top: 16px !important; padding-bottom: 12px !important; border-radius: 12px !important; position: relative; overflow: hidden; }
.preview-active.preview-phone .icon-wrapper { width: 36px !important; height: 36px !important; margin-bottom: 8px !important; border-radius: 10px !important; }
.preview-active.preview-phone .icon-wrapper svg { width: 20px !important; height: 20px !important; }
.preview-active.preview-phone .stat-title { font-size: 10px !important; margin-bottom: 6px !important; text-align: center; line-height: 1.3; padding: 0 2px; }
.preview-active.preview-phone .stat-number { font-size: 16px !important; margin-bottom: 0 !important; }
.preview-active.preview-phone .stat-pill { display: none !important; }
.preview-active.preview-phone .card-button { position: absolute !important; inset: 0 !important; opacity: 0 !important; z-index: 10 !important; padding: 0 !important; margin: 0 !important; width: 100% !important; height: 100% !important; }

/* For Real Mobile Devices */
@media (max-width: 768px) {
  .overview-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 8px !important; }
  .hr-requests-grid { grid-template-columns: repeat(4, 1fr) !important; gap: 8px !important; }
  .stat-card { padding-top: 16px !important; padding-bottom: 12px !important; border-radius: 12px !important; position: relative; overflow: hidden; }
  .icon-wrapper { width: 36px !important; height: 36px !important; margin-bottom: 8px !important; border-radius: 10px !important; }
  .icon-wrapper svg { width: 20px !important; height: 20px !important; }
  .stat-title { font-size: 10px !important; margin-bottom: 6px !important; text-align: center; line-height: 1.3; padding: 0 2px; }
  .stat-number { font-size: 16px !important; margin-bottom: 0 !important; }
  .stat-pill { display: none !important; }
  .card-button { position: absolute !important; inset: 0 !important; opacity: 0 !important; z-index: 10 !important; padding: 0 !important; margin: 0 !important; width: 100% !important; height: 100% !important; }
}
'''

with open('src/pages/admin/AdminOverview.css', 'w', encoding='utf-8') as f:
    f.write(content + css_valid)

print('Done!')

