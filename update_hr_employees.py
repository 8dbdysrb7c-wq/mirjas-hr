import re

file_path = "c:/Users/a.awwad/.gemini/antigravity/mirjas-hr/src/pages/hr/HREmployees.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. We need to add the select for allowedWorkLocations in the employee modal
# Let's find where fields like 'allowAdvances' or 'phone' are rendered.
# Usually something like: `<input type="text" ... value={formData.phone}` or similar.

# Let's search for the form inside `showModal`
# I will use regex or find to locate a good insertion point.
insertion_target = '<div className="input-group col-span-1 md:col-span-2 flex items-center gap-3">'

if insertion_target in content:
    # We will inject the workLocations select just before or after this.
    # But wait, we need to get `settings` from `useStore`.
    # Let's check if `settings` is extracted from `useStore`.
    store_extract = "const { employees, addEmployee, updateEmployee, deleteEmployee, user } = useStore();"
    if store_extract in content:
        content = content.replace(store_extract, "const { employees, addEmployee, updateEmployee, deleteEmployee, user, settings } = useStore();")
    
    # Also need `Select` from `react-select` for multiple options if not imported, but maybe we can just use a simple HTML multiple select or checkboxes.
    # Actually, a simple text input or standard multiple select is fine, but checkboxes are easier.
    
    checkboxes_ui = """
            <div className="input-group col-span-1 md:col-span-2 border p-4 rounded-xl bg-slate-50">
              <label className="font-bold flex items-center gap-2 mb-3 text-blue-700">مواقع العمل المسموح الدخول منها (GPS)</label>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" 
                    checked={!formData.allowedWorkLocations || formData.allowedWorkLocations.includes('all')} 
                    onChange={() => setFormData({...formData, allowedWorkLocations: ['all']})} 
                    className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium">السماح بجميع المواقع المضافة في الإعدادات</span>
                </label>
                
                {settings?.workLocations?.length > 0 && (
                  <div className="mt-2 pl-6 space-y-2 border-r-2 border-slate-200">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                      <input type="radio" 
                        checked={formData.allowedWorkLocations && !formData.allowedWorkLocations.includes('all')} 
                        onChange={() => setFormData({...formData, allowedWorkLocations: []})} 
                        className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium">تخصيص مواقع محددة فقط:</span>
                    </label>
                    
                    {formData.allowedWorkLocations && !formData.allowedWorkLocations.includes('all') && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 p-3 bg-white rounded-lg border border-slate-200">
                        {settings.workLocations.map(loc => (
                          <label key={loc.id} className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" 
                              checked={formData.allowedWorkLocations.includes(loc.id)}
                              onChange={(e) => {
                                const current = [...formData.allowedWorkLocations];
                                if (e.target.checked) current.push(loc.id);
                                else current.splice(current.indexOf(loc.id), 1);
                                setFormData({...formData, allowedWorkLocations: current});
                              }}
                              className="w-4 h-4 text-blue-600 rounded" />
                            <span className="text-sm">{loc.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
"""
    content = content.replace(insertion_target, checkboxes_ui + "\n" + insertion_target)
    
with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("HREmployees.jsx updated with allowedWorkLocations")
