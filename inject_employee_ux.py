import os

base_dir = r"c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src"
emp_path = os.path.join(base_dir, "pages", "EmployeeDashboard.jsx")

def replace_in_file(filepath, replacements):
    if not os.path.exists(filepath): return
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

old_submit = """  const handleSubmit = (e) => {
    e.preventDefault();

    if (!tasks.some(t => t.name && t.count)) {
      MySwal.fire('تنبيه', 'يجب إدخال صنف ومهمة واحدة على الأقل قبل الحفظ', 'warning');
      return;
    }

    const processSubmission = async () => {"""

new_submit = """  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (!tasks.some(t => t.name && t.count)) {
      MySwal.fire('تنبيه', 'يجب إدخال صنف ومهمة واحدة على الأقل قبل الحفظ', 'warning');
      return;
    }

    // Check if report already exists for today
    const reportExists = allReports.some(
      (report) => String(report.userId) === String(user.id) && report.date === date
    );

    if (reportExists) {
      const confirm = await MySwal.fire({
        title: 'تنبيه',
        text: 'لقد قمت بتسليم تقرير لهذا اليوم مسبقاً. هل تريد الكتابة فوق التقرير السابق؟',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'نعم، قم بالتحديث',
        cancelButtonText: 'إلغاء'
      });
      if (!confirm.isConfirmed) return;
    }

    setIsSubmitting(true);

    const processSubmission = async () => {"""

old_save_button = """            <button type="submit" className="btn btn-primary w-full flex items-center justify-center gap-2 h-14 text-lg mt-6 shadow-md shadow-primary/20 hover:-translate-y-1 transition-all">
              <CheckCircle size={24} /> حفظ التقرير اليومي
            </button>"""

new_save_button = """            <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full flex items-center justify-center gap-2 h-14 text-lg mt-6 shadow-md shadow-primary/20 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              <CheckCircle size={24} /> {isSubmitting ? 'جاري الحفظ...' : 'حفظ التقرير اليومي'}
            </button>"""

old_finally = """        setIsLoading(false);
      }
    };

    processSubmission();
  };"""

new_finally = """        setIsLoading(false);
        setIsSubmitting(false);
      }
    };

    await processSubmission();
  };"""

replace_in_file(emp_path, [
    (old_submit, new_submit),
    (old_save_button, new_save_button),
    (old_finally, new_finally)
])
print("EmployeeDashboard duplicate prevention injected.")
