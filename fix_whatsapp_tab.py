import re

def fix():
    with open('src/pages/admin/AdminSettings.jsx', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Reverse the damage
    bad_str = """        )}

        {activeTab === 'whatsapp' && (
          <div className="admin-content-layout space-y-8 animate-fade-in">
            <WhatsAppSettingsTab />
          </div>
        )}"""
    content = content.replace(bad_str, "        )}")
    
    # 2. Add import if missing
    if "import WhatsAppSettingsTab" not in content:
        content = re.sub(
            r"(import hrSettingsIllustration.*?\n)",
            r"\1import WhatsAppSettingsTab from './WhatsAppSettingsTab';\n",
            content
        )
    
    # 3. Add Tab in the navbar
    tab_html = """        <div className={`premium-tab ${activeTab === 'whatsapp' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('whatsapp')}>
          <MessageSquare size={18} /> <span>إعدادات الواتساب</span>
        </div>
      </div>"""
    
    if "setActiveTab('whatsapp')" not in content:
        content = re.sub(
            r"(<div className={`premium-tab \${activeTab === 'hr'.*?</div>\s*)</div>",
            r"\1" + tab_html,
            content,
            count=1,
            flags=re.DOTALL
        )
        
    # 4. Add the component at the end of the tabs container
    good_block = """                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'whatsapp' && (
          <div className="admin-content-layout space-y-8 animate-fade-in">
            <WhatsAppSettingsTab />
          </div>
        )}
      </div>
    </div>"""
    
    if "WhatsAppSettingsTab />" not in content:
        content = re.sub(
            r"(\s+</div>\s+</div>\s+</div>\s+</div>\s+)}\s+)</div>\s+</div>\s*$",
            r"\1" + good_block,
            content
        )

    with open('src/pages/admin/AdminSettings.jsx', 'w', encoding='utf-8') as f:
        f.write(content)

fix()

