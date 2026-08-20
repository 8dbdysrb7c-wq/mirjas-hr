import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Trash2, Edit2, Copy, Tag, RefreshCw, Eye, Save, X, Box, Scale, Ruler, CheckCircle2, ArrowUp, ArrowDown, ChevronsUpDown, Folder, FolderPlus, Scissors, Download, FileText, Printer, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';
import { getFabrics, saveFabric, deleteFabric } from '../../store';
import { matchesSearch, useDebounce } from '../../utils/searchEngine';
import Swal from 'sweetalert2';

const getLocalDateStr = (d = new Date()) => {
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

const FabricRollIcon = ({ size = 24, color = "currentColor", className = "" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color} 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M9 19V5a3 3 0 0 0-6 0v14" />
    <circle cx="6" cy="19" r="3" />
    <circle cx="6" cy="19" r="1" />
    <path d="M9 5 C 13 5, 13 3, 16 3 C 18 3, 19.5 4, 21 5 V 19 C 19.5 18, 18 17, 16 17 C 13 17, 13 19, 9 19" />
  </svg>
);

const ExcelIcon = ({ size = 26 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size}>
    <path fill="#185C37" d="M11 20H4a1 1 0 01-1-1V5a1 1 0 011-1h7v16z"/>
    <path fill="#21A366" d="M20 18h-9V6h9a1 1 0 011 1v10a1 1 0 01-1 1z"/>
    <path fill="#107C41" d="M4 18h7v2H4zM4 4h7v2H4z"/>
    <path fill="#fff" d="M12.5 15h1.8l1.7-2.6 1.7 2.6h1.8l-2.6-3.8 2.5-3.6h-1.8l-1.6 2.4-1.6-2.4h-1.8l2.5 3.6z"/>
  </svg>
);

const WordIcon = ({ size = 26 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size}>
    <path fill="#103F91" d="M11 20H4a1 1 0 01-1-1V5a1 1 0 011-1h7v16z"/>
    <path fill="#185ABD" d="M20 18h-9V6h9a1 1 0 011 1v10a1 1 0 01-1 1z"/>
    <path fill="#103F91" d="M4 18h7v2H4zM4 4h7v2H4z"/>
    <path fill="#fff" d="M13 8.5h1.5l.8 3.3.8-3.3h1.5l.8 3.3.8-3.3h1.5l-1.5 6.5h-1.6l-.9-3.5-.9 3.5h-1.6z"/>
  </svg>
);

const AdminFabricLibrary = ({ user }) => {
  const [fabrics, setFabrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [showModal, setShowModal] = useState(false);
  const [activeContainer, setActiveContainer] = useState('الكل');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(sortedFabrics.map((f, i) => ({
      '#': i + 1,
      'اسم القماش': f.name || '',
      'الوزن (GSM)': f.weight || '',
      'العرض (سم)': f.width || '',
      'اللون': f.color || '',
      'شكل الرول': f.rollShape || '',
      'المزايا': f.features || '',
      'الكمية (متر)': f.quantity || '',
      'السعر/متر': f.pricePerMeter || '',
      'الملاحظات': f.notes || ''
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "مكتبة_الأقمشة");
    XLSX.writeFile(wb, `مكتبة_الأقمشة_${getLocalDateStr()}.xlsx`);
  };

  const exportToWord = () => {
    let tableHtml = `
      <html dir="rtl">
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Arial', sans-serif; }
            table { border-collapse: collapse; width: 100%; margin-top: 20px; }
            th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: center; font-size: 14px; }
            th { background-color: #f1f5f9; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>مكتبة الأقمشة - ${activeContainer}</h2>
          <table>
            <thead>
              <tr>
                <th>#</th><th>اسم القماش</th><th>الوزن</th><th>العرض</th><th>اللون</th><th>شكل الرول</th><th>المزايا</th><th>الكمية</th><th>السعر</th><th>الملاحظات</th>
              </tr>
            </thead>
            <tbody>
              ${sortedFabrics.map((f, i) => `
                <tr>
                  <td>${i + 1}</td><td>${f.name || '-'}</td><td>${f.weight || '-'}</td><td>${f.width || '-'}</td><td>${f.color || '-'}</td><td>${f.rollShape || '-'}</td><td>${f.features || '-'}</td><td>${f.quantity || '-'}</td><td>${f.pricePerMeter || '-'}</td><td>${f.notes || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    const blob = new Blob(['\ufeff', tableHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `مكتبة_الأقمشة_${getLocalDateStr()}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    const element = document.getElementById('pdf-export-wrapper');
    const opt = {
      margin: [0.5, 0.5, 0.5, 0.5],
      filename: `مكتبة_الأقمشة_${getLocalDateStr()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, windowWidth: 1200 },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
    };
    html2pdf().set(opt).from(element).save();
  };

  const handlePrint = () => {
    window.print();
  };
  
  const initialFormState = {
    id: null,
    name: '',
    weight: '',
    width: '',
    color: '',
    rollShape: '',
    features: '',
    quantity: '',
    pricePerMeter: '',
    notes: '',
    containerName: activeContainer === 'الكل' ? '' : activeContainer
  };
  
  const [formData, setFormData] = useState(initialFormState);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getFabrics();
      setFabrics(data || []);
    } catch (err) {
      console.error('Error fetching fabrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreateModal = () => {
    setFormData(initialFormState);
    setShowModal(true);
  };

  const handleOpenEditModal = (fabric) => {
    setFormData({ ...fabric });
    setShowModal(true);
  };

  const handleCloneFabric = async (fabric) => {
    try {
      Swal.fire({ title: 'جاري الاستنساخ...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      const clonedData = {
        ...fabric,
        id: null,
        name: `${fabric.name} (نسخة)`
      };
      await saveFabric(clonedData);
      await fetchData();
      Swal.fire('تم الاستنساخ!', 'تم إنشاء نسخة جديدة من القماش.', 'success');
    } catch (err) {
      Swal.fire('خطأ', 'فشل استنساخ البيانات', 'error');
    }
  };

  const handleDelete = async (id) => {
    const res = await Swal.fire({
      title: 'هل أنت متأكد من الحذف؟',
      text: 'لن تتمكن من استرجاع هذا السجل بعد الحذف',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#ef4444'
    });

    if (res.isConfirmed) {
      try {
        await deleteFabric(id);
        await fetchData();
        Swal.fire('تم الحذف!', 'تم حذف السجل بنجاح.', 'success');
      } catch (err) {
        Swal.fire('خطأ', 'حدث خطأ أثناء الحذف', 'error');
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      Swal.fire('خطأ', 'يرجى إدخال اسم القماش', 'error');
      return;
    }

    try {
      Swal.fire({ title: 'جاري الحفظ...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      await saveFabric(formData);
      await fetchData();
      setShowModal(false);
      Swal.fire('تم الحفظ!', 'تم حفظ بيانات القماش بنجاح.', 'success');
    } catch (error) {
      console.error(error);
      Swal.fire('خطأ', 'حدث خطأ أثناء الحفظ', 'error');
    }
  };

  const handleInlineChange = (id, field, value) => {
    setFabrics(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const handleInlineBlur = async (fabric) => {
    try {
      await saveFabric(fabric);
    } catch (err) {
      console.error('Failed to save inline edit', err);
      Swal.fire('خطأ', 'لم يتم حفظ التعديل', 'error');
    }
  };

  const handleAddContainer = () => {
    Swal.fire({
      title: 'إضافة حاوية جديدة',
      input: 'text',
      inputPlaceholder: 'مثال: حاوية رقم 2',
      showCancelButton: true,
      confirmButtonText: 'إضافة',
      cancelButtonText: 'إلغاء',
      inputValidator: (value) => {
        if (!value) {
          return 'يرجى إدخال اسم الحاوية!';
        }
      }
    }).then((result) => {
      if (result.isConfirmed) {
        setActiveContainer(result.value);
      }
    });
  };

  const handleRenameContainer = () => {
    if (activeContainer === 'الكل') {
      Swal.fire('تنبيه', 'لا يمكن تعديل اسم "جميع الحاويات"', 'warning');
      return;
    }

    Swal.fire({
      title: 'تعديل اسم الحاوية',
      input: 'text',
      inputValue: activeContainer,
      showCancelButton: true,
      confirmButtonText: 'تعديل',
      cancelButtonText: 'إلغاء',
      inputValidator: (value) => {
        if (!value) {
          return 'يرجى إدخال اسم الحاوية!';
        }
      }
    }).then(async (result) => {
      if (result.isConfirmed && result.value !== activeContainer) {
        const newName = result.value;
        try {
          Swal.fire({ title: 'جاري التعديل...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
          
          const itemsToUpdate = fabrics.filter(f => (f.containerName || 'بدون حاوية') === activeContainer);
          
          for (const item of itemsToUpdate) {
            await saveFabric({ ...item, containerName: newName });
          }

          await fetchData();
          setActiveContainer(newName);
          Swal.fire('تم التعديل!', 'تم تغيير اسم الحاوية بنجاح.', 'success');
        } catch (error) {
          console.error(error);
          Swal.fire('خطأ', 'حدث خطأ أثناء التعديل', 'error');
        }
      }
    });
  };

  const handleDeleteContainer = () => {
    if (activeContainer === 'الكل') {
      Swal.fire('تنبيه', 'لا يمكن حذف "جميع الحاويات"', 'warning');
      return;
    }

    Swal.fire({
      title: 'هل أنت متأكد من حذف الحاوية؟',
      text: `سيتم حذف الحاوية "${activeContainer}" وجميع الأقمشة بداخلها نهائياً!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'نعم، احذف الحاوية وما بداخلها',
      cancelButtonText: 'إلغاء'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          Swal.fire({ title: 'جاري الحذف...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
          
          const itemsToDelete = fabrics.filter(f => (f.containerName || 'بدون حاوية') === activeContainer);
          
          for (const item of itemsToDelete) {
            await deleteFabric(item.id);
          }

          await fetchData();
          setActiveContainer('الكل');
          Swal.fire('تم الحذف!', 'تم حذف الحاوية وجميع محتوياتها بنجاح.', 'success');
        } catch (error) {
          console.error(error);
          Swal.fire('خطأ', 'حدث خطأ أثناء الحذف', 'error');
        }
      }
    });
  };

  const filteredFabrics = fabrics.filter(f => {
    const searchMatches = matchesSearch(
      [f.id, f.code, f.name, f.color, f.features, f.containerName],
      debouncedSearchTerm
    );
    return searchMatches && (activeContainer === 'الكل' || (f.containerName || 'بدون حاوية') === activeContainer);
  });

  const containerNames = useMemo(() => {
    const names = new Set(fabrics.map(f => f.containerName || 'بدون حاوية'));
    if (activeContainer !== 'الكل') names.add(activeContainer);
    return Array.from(names);
  }, [fabrics, activeContainer]);

  const sortedFabrics = useMemo(() => {
    let sortableItems = [...filteredFabrics];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        
        if (valA == null) valA = '';
        if (valB == null) valB = '';

        const numA = parseFloat(valA);
        const numB = parseFloat(valB);
        if (!isNaN(numA) && !isNaN(numB)) {
           return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
        }

        valA = valA.toString().toLowerCase();
        valB = valB.toString().toLowerCase();

        if (valA < valB) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredFabrics, sortConfig]);

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <ChevronsUpDown size={14} style={{ opacity: 0.3 }} />;
    if (sortConfig.direction === 'asc') return <ArrowUp size={14} />;
    return <ArrowDown size={14} />;
  };

  const renderSortableHeader = (label, columnKey, align = 'center') => (
    <th 
      onClick={() => handleSort(columnKey)}
      style={{ 
        padding: '16px', color: '#334155', fontWeight: '800', fontSize: '14px', whiteSpace: 'nowrap', 
        textAlign: align, cursor: 'pointer', userSelect: 'none' 
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: align === 'right' ? 'flex-end' : 'center', gap: '4px' }}>
        {label}
        <SortIcon columnKey={columnKey} />
      </div>
    </th>
  );

  return (
    <div style={{ padding: '24px', maxWidth: '100%', margin: '0 auto', fontFamily: 'inherit' }}>
      
      {/* Header Banner */}
      <div className="no-print" style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '22px 28px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            backgroundColor: '#eff6ff',
            border: '1px solid #dbeafe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#1d4ed8'
          }}>
            <FabricRollIcon size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '800', color: '#0f172a' }}>
                مكتبة الأقمشة
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="no-print" style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '16px 22px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', flex: 1 }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '100%' }}>
            <input
              type="text"
              placeholder="بحث باسم القماش أو اللون أو الميزة..."
              style={{
                width: '100%',
                height: '40px',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '0 38px 0 14px',
                fontSize: '13px',
                color: '#0f172a',
                backgroundColor: '#f8fafc',
                outline: 'none',
                fontWeight: 'bold'
              }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          </div>

          {/* Container Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Folder size={18} color="#64748b" />
            <select
              value={activeContainer}
              onChange={(e) => setActiveContainer(e.target.value)}
              style={{
                height: '40px',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '0 14px',
                fontSize: '13px',
                color: '#0f172a',
                backgroundColor: '#f8fafc',
                outline: 'none',
                fontWeight: 'bold',
                minWidth: '150px'
              }}
            >
              <option value="الكل">جميع الحاويات</option>
              {containerNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <button
              onClick={handleAddContainer}
              style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1d4ed8',
                cursor: 'pointer'
              }}
              title="إضافة حاوية جديدة"
            >
              <FolderPlus size={18} />
            </button>
            {activeContainer !== 'الكل' && (
              <>
                <button
                  onClick={handleRenameContainer}
                  style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
                    cursor: 'pointer'
                  }}
                  title="تعديل اسم الحاوية الحالية"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={handleDeleteContainer}
                  style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#dc2626',
                    cursor: 'pointer'
                  }}
                  title="حذف الحاوية وما بداخلها"
                >
                  <Trash2 size={18} />
                </button>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>
            إجمالي الأصناف: <span style={{ color: '#1d4ed8', fontSize: '15px', fontWeight: '900' }}>{sortedFabrics.length}</span>
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }} className="no-print">
            <button onClick={exportToPDF} title="تصدير إلى PDF" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '46px', height: '46px', border: '1px solid #e2e8f0', borderRadius: '12px', backgroundColor: '#ffffff', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <img src="https://upload.wikimedia.org/wikipedia/commons/8/87/PDF_file_icon.svg" alt="PDF" width="26" height="26" />
            </button>
            <button onClick={exportToWord} title="تصدير إلى Word" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '46px', height: '46px', border: '1px solid #e2e8f0', borderRadius: '12px', backgroundColor: '#ffffff', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <WordIcon size={26} />
            </button>
            <button onClick={exportToExcel} title="تصدير إلى Excel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '46px', height: '46px', border: '1px solid #e2e8f0', borderRadius: '12px', backgroundColor: '#ffffff', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <ExcelIcon size={26} />
            </button>
            <button onClick={handlePrint} title="طباعة" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '46px', height: '46px', border: '1px solid #e2e8f0', borderRadius: '12px', backgroundColor: '#ffffff', color: '#2563eb', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <Printer size={26} strokeWidth={2.5} />
            </button>
          </div>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0 20px',
              height: '40px',
              backgroundColor: '#1d4ed8',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(29, 78, 216, 0.25)',
              transition: 'all 0.2s'
            }}
          >
            <Plus size={18} />
            إضافة قماش جديد
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="print-table-container" style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        direction: 'rtl'
      }}>
        <div className="print-table-wrapper" style={{ overflowX: 'auto', direction: 'rtl' }} id="fabric-print-area" dir="rtl">
          <div id="pdf-export-wrapper" style={{ direction: 'rtl', width: '100%', backgroundColor: 'white' }} dir="rtl">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', direction: 'rtl' }} dir="rtl">
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '16px', color: '#334155', fontWeight: '800', fontSize: '14px', whiteSpace: 'nowrap', width: '50px', textAlign: 'center' }}>#</th>
                {renderSortableHeader('اسم القماش', 'name', 'center')}
                {renderSortableHeader('الوزن (GSM)', 'weight', 'center')}
                {renderSortableHeader('العرض (سم)', 'width', 'center')}
                {renderSortableHeader('اللون', 'color', 'center')}
                {renderSortableHeader('شكل الرول', 'rollShape', 'center')}
                {renderSortableHeader('المزايا', 'features', 'center')}
                {renderSortableHeader('الكمية (متر)', 'quantity', 'center')}
                {renderSortableHeader('السعر/متر', 'pricePerMeter', 'center')}
                {renderSortableHeader('الملاحظات', 'notes', 'center')}
                <th data-html2canvas-ignore="true" className="no-print" style={{ padding: '16px', color: '#334155', fontWeight: '800', fontSize: '14px', whiteSpace: 'nowrap', textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="11" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <RefreshCw className="animate-spin" size={24} style={{ margin: '0 auto 10px' }} />
                    جاري تحميل الأقمشة...
                  </td>
                </tr>
              ) : sortedFabrics.length === 0 ? (
                <tr>
                  <td colSpan="11" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    لا توجد أقمشة مسجلة حالياً
                  </td>
                </tr>
              ) : (
                sortedFabrics.map((fabric, index) => (
                  <tr key={fabric.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }}>
                    <td style={{ padding: '16px', color: '#64748b', fontSize: '14px', fontWeight: '500', textAlign: 'center' }}>{index + 1}</td>
                    <td style={{ padding: '16px', color: '#0f172a', fontSize: '14px', fontWeight: '700', textAlign: 'center' }}>{fabric.name || '-'}</td>
                    <td style={{ padding: '16px', color: '#0f172a', fontSize: '14px', fontWeight: '600', textAlign: 'center' }}>{fabric.weight || '-'}</td>
                    <td style={{ padding: '16px', color: '#0f172a', fontSize: '14px', fontWeight: '600', textAlign: 'center' }}>{fabric.width || '-'}</td>
                    <td style={{ padding: '16px', color: '#64748b', fontSize: '14px', textAlign: 'center' }}>{fabric.color || '-'}</td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <span style={{ 
                        backgroundColor: '#f1f5f9', 
                        color: '#475569', 
                        padding: '4px 10px', 
                        borderRadius: '20px', 
                        fontSize: '12px',
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap'
                      }}>
                        {fabric.rollShape || 'غير محدد'}
                      </span>
                    </td>
                    <td style={{ padding: '16px', color: '#64748b', fontSize: '13px', maxWidth: '150px', whiteSpace: 'normal', textAlign: 'center' }}>{fabric.features || '-'}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                      <input
                        type="number"
                        value={fabric.quantity}
                        onChange={(e) => handleInlineChange(fabric.id, 'quantity', e.target.value)}
                        onBlur={(e) => { e.target.style.border = '1px solid transparent'; handleInlineBlur(fabric); }}
                        style={{ width: '80px', height: '36px', border: '1px solid transparent', borderRadius: '6px', textAlign: 'center', fontWeight: 'bold', color: '#0f172a', backgroundColor: 'transparent', outline: 'none', transition: 'border 0.2s' }}
                        onFocus={(e) => e.target.style.border = '1px solid #cbd5e1'}
                        placeholder="-"
                      />
                    </td>
                    <td style={{ padding: '16px', color: '#0f172a', fontSize: '14px', fontWeight: '700', textAlign: 'center' }}>{fabric.pricePerMeter || '-'}</td>
                    <td style={{ padding: '16px', color: '#64748b', fontSize: '13px', maxWidth: '150px', whiteSpace: 'normal', textAlign: 'center' }}>{fabric.notes || '-'}</td>
                    <td data-html2canvas-ignore="true" className="no-print" style={{ padding: '16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <button
                          onClick={() => handleOpenEditModal(fabric)}
                          style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', color: '#1d4ed8', borderRadius: '6px' }}
                          title="تعديل"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleCloneFabric(fabric)}
                          style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', color: '#0f766e', borderRadius: '6px' }}
                          title="نسخ"
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(fabric.id)}
                          style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', color: '#ef4444', borderRadius: '6px' }}
                          title="حذف"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '800px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8fafc'
            }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FabricRollIcon size={22} className="text-blue-600" />
                {formData.id ? 'تعديل بيانات القماش' : 'إضافة قماش جديد'}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  width: '36px', height: '36px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                  cursor: 'pointer'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              <form id="fabricForm" onSubmit={handleSave}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>اسم الحاوية / المجموعة <span style={{ color: '#ef4444' }}>*</span></label>
                    <input 
                      type="text" 
                      required
                      value={formData.containerName || ''}
                      onChange={e => setFormData({...formData, containerName: e.target.value})}
                      placeholder="مثال: حاوية رقم 1"
                      style={{
                        padding: '12px 14px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        fontSize: '14px',
                        outline: 'none',
                        backgroundColor: '#f8fafc',
                        color: '#0f172a',
                        fontWeight: '600'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>اسم القماش <span style={{ color: '#ef4444' }}>*</span></label>
                    <input 
                      type="text" 
                      required
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="مثال: قماش Waterproof أبيض"
                      style={{
                        padding: '12px 14px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        fontSize: '14px',
                        outline: 'none',
                        backgroundColor: '#f8fafc',
                        color: '#0f172a',
                        fontWeight: '600'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>الوزن (GSM)</label>
                    <input 
                      type="text" 
                      value={formData.weight}
                      onChange={e => setFormData({...formData, weight: e.target.value})}
                      placeholder="مثال: 120"
                      style={{
                        padding: '10px 14px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>العرض (سم)</label>
                    <input 
                      type="text" 
                      value={formData.width}
                      onChange={e => setFormData({...formData, width: e.target.value})}
                      placeholder="مثال: 258"
                      style={{
                        padding: '10px 14px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>اللون</label>
                    <input 
                      type="text" 
                      value={formData.color}
                      onChange={e => setFormData({...formData, color: e.target.value})}
                      placeholder="مثال: أبيض سادة"
                      style={{
                        padding: '10px 14px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>شكل الرول</label>
                    <input 
                      type="text" 
                      value={formData.rollShape}
                      onChange={e => setFormData({...formData, rollShape: e.target.value})}
                      placeholder="مثال: غير مطوي"
                      style={{
                        padding: '10px 14px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>المزايا</label>
                    <input 
                      type="text" 
                      value={formData.features}
                      onChange={e => setFormData({...formData, features: e.target.value})}
                      placeholder="مثال: مقاوم للماء Waterproof"
                      style={{
                        padding: '10px 14px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>الكمية (متر)</label>
                    <input 
                      type="text" 
                      value={formData.quantity}
                      onChange={e => setFormData({...formData, quantity: e.target.value})}
                      placeholder="الكمية الإجمالية..."
                      style={{
                        padding: '10px 14px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>السعر/متر</label>
                    <input 
                      type="text" 
                      value={formData.pricePerMeter}
                      onChange={e => setFormData({...formData, pricePerMeter: e.target.value})}
                      placeholder="مثال: 82 قرش"
                      style={{
                        padding: '10px 14px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        fontSize: '14px',
                        outline: 'none',
                        color: '#16a34a',
                        fontWeight: '700'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>الملاحظات</label>
                    <textarea 
                      value={formData.notes}
                      onChange={e => setFormData({...formData, notes: e.target.value})}
                      placeholder="ملاحظات إضافية..."
                      style={{
                        padding: '12px 14px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        fontSize: '14px',
                        outline: 'none',
                        resize: 'vertical',
                        minHeight: '80px'
                      }}
                    />
                  </div>

                </div>
              </form>
            </div>

            <div style={{
              padding: '20px 24px',
              borderTop: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <button 
                type="button" 
                onClick={() => setShowModal(false)}
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  color: '#475569',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                إلغاء
              </button>
              <button 
                type="submit" 
                form="fabricForm"
                style={{
                  padding: '10px 32px',
                  backgroundColor: '#1d4ed8',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(29, 78, 216, 0.25)'
                }}
              >
                <Save size={18} />
                حفظ التغييرات
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminFabricLibrary;
