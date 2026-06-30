
with open('src/pages/admin/AdminOverview.css', 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find('/* --- Mobile Grid Fixes for Admin Overview --- */')
if idx != -1:
    content = content[:idx]

css_phone = '''
  .overview-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 8px !important; }
  .hr-requests-grid { grid-template-columns: repeat(4, 1fr) !important; gap: 8px !important; }
  
  .stat-card {
    padding: 8px 4px !important;
    border-radius: 12px !important;
    position: relative;
    overflow: hidden;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    aspect-ratio: 1 / 1.1 !important;
  }
  
  .icon-wrapper { 
    width: 32px !important; 
    height: 32px !important; 
    margin-bottom: 6px !important; 
    border-radius: 10px !important; 
  }
  .icon-wrapper svg { width: 16px !important; height: 16px !important; }
  
  .stat-title { 
    font-size: 9px !important; 
    margin-bottom: 4px !important; 
    text-align: center; 
    line-height: 1.2 !important; 
    padding: 0; 
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    height: 22px;
  }
  
  .stat-number { 
    font-size: 14px !important; 
    margin-bottom: 0 !important; 
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 4px !important;
    width: 100% !important;
    line-height: 1 !important;
  }
  
  .stat-number span { font-size: 10px !important; }
  .stat-pill { display: none !important; }
  .card-button { 
    position: absolute !important; inset: 0 !important; opacity: 0 !important; 
    z-index: 10 !important; padding: 0 !important; margin: 0 !important; 
    width: 100% !important; height: 100% !important; 
  }
'''

css_tablet = '''
  .overview-grid { grid-template-columns: repeat(3, 140px) !important; justify-content: center !important; gap: 16px !important; }
  .hr-requests-grid { grid-template-columns: repeat(4, 140px) !important; justify-content: center !important; gap: 16px !important; }
  
  .stat-card {
    padding: 12px 6px !important;
    border-radius: 14px !important;
    position: relative;
    overflow: hidden;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    aspect-ratio: 1 / 1.05 !important;
  }
  
  .icon-wrapper { 
    width: 44px !important; 
    height: 44px !important; 
    margin-bottom: 12px !important; 
    border-radius: 12px !important; 
  }
  .icon-wrapper svg { width: 22px !important; height: 22px !important; }
  
  .stat-title { 
    font-size: 12px !important; 
    margin-bottom: 8px !important; 
    text-align: center; 
    line-height: 1.3 !important; 
    padding: 0; 
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    height: 31px;
  }
  
  .stat-number { 
    font-size: 20px !important; 
    margin-bottom: 0 !important; 
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 4px !important;
    width: 100% !important;
    line-height: 1 !important;
  }
  
  .stat-number span { font-size: 14px !important; }
  .stat-pill { display: none !important; }
  .card-button { 
    position: absolute !important; inset: 0 !important; opacity: 0 !important; 
    z-index: 10 !important; padding: 0 !important; margin: 0 !important; 
    width: 100% !important; height: 100% !important; 
  }
'''

css_valid = f'''
/* --- Mobile Grid Fixes for Admin Overview --- */

/* For Preview Mode (Phone) */
.preview-active.preview-phone {{
{css_phone}
}}

/* For Preview Mode (Tablet) */
.preview-active.preview-tablet {{
{css_tablet}
}}

/* For Real Mobile Devices */
@media (max-width: 768px) {{
{css_phone}
}}

/* For Real Tablet Devices */
@media (min-width: 769px) and (max-width: 1024px) {{
{css_tablet}
}}
'''

with open('src/pages/admin/AdminOverview.css', 'w', encoding='utf-8') as f:
    f.write(content + css_valid)

print('Done!')

