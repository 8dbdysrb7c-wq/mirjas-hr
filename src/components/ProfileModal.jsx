import React, { useEffect, useState } from 'react';
import { Lock, Save, User, X } from 'lucide-react';
import Swal from 'sweetalert2';
import { addLog, saveEmployee } from '../store';

const ProfileModal = ({ open, user, onClose, onSaved }) => {
  const [formData, setFormData] = useState({ name: '', password: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setFormData({
      name: user.name || '',
      password: user.password || ''
    });
  }, [open, user]);

  if (!open || !user) return null;

  const handleChange = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedName = formData.name.trim();
    const trimmedPassword = formData.password.trim();

    if (!trimmedName || !trimmedPassword) {
      Swal.fire('خطأ', 'يرجى إدخال الاسم وكلمة المرور', 'error');
      return;
    }

    setIsSaving(true);
    const updatedUser = {
      ...user,
      name: trimmedName,
      password: trimmedPassword
    };

    const error = await saveEmployee(updatedUser);
    setIsSaving(false);

    if (error) {
      Swal.fire('خطأ', 'فشل تحديث بيانات الحساب', 'error');
      return;
    }

    await addLog({
      userName: user.name,
      userId: user.id,
      module: 'الحساب الشخصي',
      action: 'تعديل',
      details: `تحديث بيانات الحساب للمستخدم: ${trimmedName}`
    });

    onSaved(updatedUser);
    Swal.fire({
      title: 'تم التحديث',
      text: 'تم حفظ الاسم وكلمة المرور بنجاح',
      icon: 'success',
      timer: 1500,
      showConfirmButton: false
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-fade-in profile-modal-card">
        <div className="profile-modal-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative' }}>
          <div style={{ width: '100%', padding: '0 20px' }}>
            <h3 className="profile-modal-title" style={{ margin: '0 auto 0.5rem' }}>إعدادات الحساب</h3>
            <p className="profile-modal-subtitle">يمكنك تعديل الاسم وكلمة المرور من هنا.</p>
          </div>
          <button
            type="button"
            className="profile-modal-close"
            onClick={onClose}
            aria-label="إغلاق"
            style={{ position: 'absolute', top: '0', left: '0' }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ textAlign: 'right' }}>
          <div className="input-group">
            <label className="flex items-center gap-2" style={{ justifyContent: 'flex-start', flexDirection: 'row-reverse' }}>
               الاسم
              <User size={16} className="text-muted" />
            </label>
            <input
              type="text"
              className="input-field"
              value={formData.name}
              onChange={(event) => handleChange('name', event.target.value)}
              placeholder="الاسم الكامل"
              style={{ textAlign: 'right' }}
            />
          </div>

          <div className="input-group">
            <label className="flex items-center gap-2" style={{ justifyContent: 'flex-start', flexDirection: 'row-reverse' }}>
               كلمة المرور
              <Lock size={16} className="text-muted" />
            </label>
            <input
              type="password"
              className="input-field"
              value={formData.password}
              onChange={(event) => handleChange('password', event.target.value)}
              placeholder="كلمة المرور الجديدة"
              style={{ textAlign: 'right' }}
            />
          </div>

          <div className="profile-modal-actions" style={{ justifyContent: 'center', gap: '1rem' }}>
            <button type="button" className="btn btn-outline" onClick={onClose} style={{ minWidth: '120px' }}>
              إلغاء
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving} style={{ minWidth: '160px' }}>
              <Save size={16} />
              {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileModal;
