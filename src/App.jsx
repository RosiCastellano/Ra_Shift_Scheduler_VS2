import React, { useState, useMemo, useCallback } from 'react';
import { Calendar, Users, Clock, BookOpen, GraduationCap, Shuffle, ChevronLeft, ChevronRight, Plus, X, Check, AlertCircle, Trash2, Upload, FileSpreadsheet, AlertTriangle } from 'lucide-react';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function App() {
  const [activeTab, setActiveTab] = useState('import');
  const [staff, setStaff] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState('Simons Don');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffBuilding, setNewStaffBuilding] = useState('Simons Don');
  
  const [classSchedules, setClassSchedules] = useState({});
  const [dayOffRequests, setDayOffRequests] = useState({});
  const [examSchedules, setExamSchedules] = useState({});
  
  const [simonsSchedule, setSimonsSchedule] = useState({});
  const [annexSchedule, setAnnexSchedule] = useState({});
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editingShift, setEditingShift] = useState(null);
  const [isExamSeason, setIsExamSeason] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#ef4444', '#22c55e', '#3b82f6', '#06b6d4', '#d946ef'];

  const schedule = selectedBuilding === 'Simons Don' ? simonsSchedule : annexSchedule;
  const setSchedule = selectedBuilding === 'Simons Don' ? setSimonsSchedule : setAnnexSchedule;

  const filteredStaff = useMemo(() => {
    return staff.filter(s => s.building === selectedBuilding);
  }, [staff, selectedBuilding]);

  const conflicts = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const conflictList = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();

      const availableStaff = [];
      const unavailableStaff = [];

      filteredStaff.forEach(member => {
        const reasons = [];
        let isAvailable = true;

        if (dayOffRequests[member.id]?.includes(dateStr)) {
          reasons.push('Requested day off');
          isAvailable = false;
        }

        const staffClasses = classSchedules[member.id] || [];
        for (const cls of staffClasses) {
          if (cls.day === dayOfWeek) {
            const classStart = parseInt(cls.start.split(':')[0]) * 60 + parseInt(cls.start.split(':')[1]);
            const classEnd = parseInt(cls.end.split(':')[0]) * 60 + parseInt(cls.end.split(':')[1]);
            const shiftStart = 20 * 60;
            const shiftEnd = 22 * 60;
            
            if (classStart < shiftEnd && classEnd > shiftStart) {
              reasons.push(`Class: ${cls.name} (${cls.start}-${cls.end})`);
              isAvailable = false;
            }
          }
        }

        if (isExamSeason) {
          const staffExams = examSchedules[member.id] || [];
          for (const exam of staffExams) {
            const examDate = new Date(exam.date + 'T12:00:00');
            const dayBefore = new Date(examDate);
            dayBefore.setDate(dayBefore.getDate() - 1);
            const dayAfter = new Date(examDate);
            dayAfter.setDate(dayAfter.getDate() + 1);
            
            if (dateStr === exam.date) {
              reasons.push(`Exam day: ${exam.name}`);
              isAvailable = false;
            } else if (dateStr === dayBefore.toISOString().split('T')[0]) {
              reasons.push(`Day before exam: ${exam.name}`);
              isAvailable = false;
            } else if (dateStr === dayAfter.toISOString().split('T')[0]) {
              reasons.push(`Day after exam: ${exam.name}`);
              isAvailable = false;
            }
          }
        }

        if (isAvailable) {
          availableStaff.push(member);
        } else {
          unavailableStaff.push({ member, reasons });
        }
      });

      if (availableStaff.length === 0 && filteredStaff.length > 0) {
        conflictList.push({
          date: dateStr,
          day: day,
          dayName: DAYS_OF_WEEK[dayOfWeek],
          unavailable: unavailableStaff,
          recommendation: getBestRecommendation(unavailableStaff)
        });
      }
    }

    return conflictList;
  }, [filteredStaff, dayOffRequests, classSchedules, examSchedules, isExamSeason, currentMonth]);

  const getBestRecommendation = (unavailableStaff) => {
    const sorted = [...unavailableStaff].sort((a, b) => {
      const aHasClass = a.reasons.some(r => r.startsWith('Class:'));
      const bHasClass = b.reasons.some(r => r.startsWith('Class:'));
      const aHasExam = a.reasons.some(r => r.includes('exam'));
      const bHasExam = b.reasons.some(r => r.includes('exam'));
      const aHasDayOff = a.reasons.some(r => r === 'Requested day off');
      const bHasDayOff = b.reasons.some(r => r === 'Requested day off');

      if (aHasExam && !bHasExam) return 1;
      if (!aHasExam && bHasExam) return -1;
      if (aHasClass && !bHasClass) return 1;
      if (!aHasClass && bHasClass) return -1;
      if (aHasDayOff && !bHasDayOff) return -1;
      if (!aHasDayOff && bHasDayOff) return 1;
      return 0;
    });

    if (sorted.length > 0) {
      const best = sorted[0];
      const reason = best.reasons.some(r => r === 'Requested day off') 
        ? 'Only has day-off request (can be negotiated)'
        : best.reasons.some(r => r.startsWith('Class:'))
        ? 'Has class conflict'
        : 'Has exam conflict';
      return { member: best.member, reason };
    }
    return null;
  };

  const parseCSV = (text) => {
    const lines = text.split('\n');
    const result = [];
    let inHeader = true;
    let headerLines = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      if (inHeader) {
        headerLines += line;
        if (headerLines.includes('Any notes')) {
          inHeader = false;
          continue;
        }
        continue;
      }
      
      const values = parseCSVLine(line);
      if (values.length >= 7) {
        result.push({
          name: values[5]?.trim() || '',
          building: values[6]?.trim() || '',
          daysOff: values[7]?.trim() || '',
          notes: values[8]?.trim() || ''
        });
      }
    }
    return result;
  };

  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const processFile = useCallback((file) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const data = parseCSV(text);
        
        if (data.length === 0) {
          setImportStatus({ type: 'error', message: 'No valid data found in file' });
          return;
        }

        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        
        const newStaff = [];
        const newDayOffRequests = {};
        const newClassSchedules = {};
        const newExamSchedules = {};
        
        data.forEach((row, index) => {
          if (!row.name) return;
          
          const staffId = Date.now() + index;
          const staffMember = {
            id: staffId,
            name: row.name.charAt(0).toUpperCase() + row.name.slice(1).toLowerCase(),
            building: row.building || 'Simons Don',
            color: COLORS[index % COLORS.length],
            notes: row.notes
          };
          newStaff.push(staffMember);
          
          const daysOff = [];
          if (row.daysOff) {
            const dayNumbers = row.daysOff.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d));
            dayNumbers.forEach(day => {
              if (day >= 1 && day <= 31) {
                const date = new Date(year, month, day);
                daysOff.push(date.toISOString().split('T')[0]);
              }
            });
          }
          newDayOffRequests[staffId] = daysOff;
          newClassSchedules[staffId] = [];
          newExamSchedules[staffId] = [];
        });

        setStaff(newStaff);
        setDayOffRequests(newDayOffRequests);
        setClassSchedules(newClassSchedules);
        setExamSchedules(newExamSchedules);
        setSimonsSchedule({});
        setAnnexSchedule({});
        
        setImportStatus({ type: 'success', message: `Imported ${newStaff.length} staff members successfully!` });
        setTimeout(() => setActiveTab('staff'), 1500);
        
      } catch (error) {
        console.error('Import error:', error);
        setImportStatus({ type: 'error', message: 'Error parsing file. Please check the format.' });
      }
    };
    reader.readAsText(file);
  }, [currentMonth]);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    processFile(file);
  };

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  const addStaff = () => {
    if (newStaffName.trim()) {
      const newId = Date.now();
      const newStaffMember = {
        id: newId,
        name: newStaffName.trim(),
        building: newStaffBuilding,
        color: COLORS[staff.length % COLORS.length],
      };
      setStaff([...staff, newStaffMember]);
      setClassSchedules({ ...classSchedules, [newId]: [] });
      setDayOffRequests({ ...dayOffRequests, [newId]: [] });
      setExamSchedules({ ...examSchedules, [newId]: [] });
      setNewStaffName('');
    }
  };
  
  const removeStaff = (id) => {
    setStaff(staff.filter(s => s.id !== id));
    const { [id]: _, ...restClasses } = classSchedules;
    const { [id]: __, ...restDayOff } = dayOffRequests;
    const { [id]: ___, ...restExams } = examSchedules;
    setClassSchedules(restClasses);
    setDayOffRequests(restDayOff);
    setExamSchedules(restExams);
  };

  const addClass = (staffId, classData) => {
    setClassSchedules({
      ...classSchedules,
      [staffId]: [...(classSchedules[staffId] || []), classData],
    });
  };
  
  const removeClass = (staffId, index) => {
    setClassSchedules({
      ...classSchedules,
      [staffId]: classSchedules[staffId].filter((_, i) => i !== index),
    });
  };

  const addDayOff = (staffId, date) => {
    const dateStr = date.toISOString().split('T')[0];
    if (!dayOffRequests[staffId]?.includes(dateStr)) {
      setDayOffRequests({
        ...dayOffRequests,
        [staffId]: [...(dayOffRequests[staffId] || []), dateStr],
      });
    }
  };
  
  const removeDayOff = (staffId, dateStr) => {
    setDayOffRequests({
      ...dayOffRequests,
      [staffId]: dayOffRequests[staffId].filter(d => d !== dateStr),
    });
  };

  const addExam = (staffId, examData) => {
    setExamSchedules({
      ...examSchedules,
      [staffId]: [...(examSchedules[staffId] || []), examData],
    });
  };
  
  const removeExam = (staffId, index) => {
    setExamSchedules({
      ...examSchedules,
      [staffId]: examSchedules[staffId].filter((_, i) => i !== index),
    });
  };

  const isAvailable = (staffId, date) => {
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();
    
    if (dayOffRequests[staffId]?.includes(dateStr)) return false;
    
    const staffClasses = classSchedules[staffId] || [];
    for (const cls of staffClasses) {
      if (cls.day === dayOfWeek) {
        const classStart = parseInt(cls.start.split(':')[0]) * 60 + parseInt(cls.start.split(':')[1]);
        const classEnd = parseInt(cls.end.split(':')[0]) * 60 + parseInt(cls.end.split(':')[1]);
        if (classStart < 22 * 60 && classEnd > 20 * 60) return false;
      }
    }
    
    if (isExamSeason) {
      const staffExams = examSchedules[staffId] || [];
      for (const exam of staffExams) {
        const examDate = new Date(exam.date + 'T12:00:00');
        const dayBefore = new Date(examDate);
        dayBefore.setDate(dayBefore.getDate() - 1);
        const dayAfter = new Date(examDate);
        dayAfter.setDate(dayAfter.getDate() + 1);
        
        if (dateStr === exam.date || 
            dateStr === dayBefore.toISOString().split('T')[0] ||
            dateStr === dayAfter.toISOString().split('T')[0]) {
          return false;
        }
      }
    }
    return true;
  };

  const generateSchedule = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const newSchedule = {};
    const shiftCounts = {};
    filteredStaff.forEach(s => shiftCounts[s.id] = 0);
    
    Object.entries(schedule).forEach(([, staffId]) => {
      if (shiftCounts[staffId] !== undefined) shiftCounts[staffId]++;
    });
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      if (schedule[dateStr]) continue;
      
      const availableStaff = filteredStaff.filter(s => isAvailable(s.id, date));
      if (availableStaff.length > 0) {
        availableStaff.sort((a, b) => shiftCounts[a.id] - shiftCounts[b.id]);
        const assigned = availableStaff[0];
        newSchedule[dateStr] = assigned.id;
        shiftCounts[assigned.id]++;
      } else {
        newSchedule[dateStr] = null;
      }
    }
    setSchedule({ ...schedule, ...newSchedule });
  };

  const clearSchedule = () => setSchedule({});
  const assignShift = (dateStr, staffId) => { setSchedule({ ...schedule, [dateStr]: staffId }); setEditingShift(null); };
  const unassignShift = (dateStr) => { const { [dateStr]: _, ...rest } = schedule; setSchedule(rest); };

  const shiftCounts = useMemo(() => {
    const counts = {};
    staff.forEach(s => counts[s.id] = 0);
    Object.values(schedule).forEach(staffId => { if (counts[staffId] !== undefined) counts[staffId]++; });
    return counts;
  }, [schedule, staff]);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startingDay = new Date(year, month, 1).getDay();
    const days = [];
    for (let i = 0; i < startingDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentMonth(newDate);
  };

  const tabs = [
    { id: 'import', label: 'Import', icon: Upload },
    { id: 'staff', label: 'Staff', icon: Users },
    { id: 'classes', label: 'Classes', icon: BookOpen },
    { id: 'dayoff', label: 'Days Off', icon: Clock },
    { id: 'exams', label: 'Exams', icon: GraduationCap },
    { id: 'conflicts', label: 'Conflicts', icon: AlertTriangle },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)', fontFamily: "'DM Sans', system-ui, sans-serif", color: '#e2e8f0', padding: '24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '700', margin: '0 0 8px 0', background: 'linear-gradient(135deg, #a5b4fc 0%, #f0abfc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>RA Shift Scheduler v2</h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '15px' }}>Import from Microsoft Forms • Shifts: 20:00 - 22:00 Daily</p>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {['Simons Don', 'Annex Don'].map(building => (
            <button key={building} onClick={() => setSelectedBuilding(building)} style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: '700', background: selectedBuilding === building ? (building === 'Simons Don' ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)') : 'rgba(255,255,255,0.1)', color: selectedBuilding === building ? '#fff' : '#94a3b8', boxShadow: selectedBuilding === building ? '0 4px 15px rgba(99, 102, 241, 0.3)' : 'none' }}>{building.replace(' Don', '')}</button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', padding: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', flexWrap: 'wrap' }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ flex: 1, minWidth: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 12px', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', background: activeTab === tab.id ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'transparent', color: activeTab === tab.id ? '#fff' : '#94a3b8', position: 'relative' }}>
              <tab.icon size={16} />{tab.label}
              {tab.id === 'conflicts' && conflicts.length > 0 && (<span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: '#fff', fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '10px' }}>{conflicts.length}</span>)}
            </button>
          ))}
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '20px', padding: '24px', border: '1px solid rgba(255,255,255,0.08)' }}>
          
          {activeTab === 'import' && (
            <div>
              <div style={{ marginBottom: '24px' }}><h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '600' }}>Import from Microsoft Forms</h2><p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>Drag & drop or click to upload your CSV/Excel file</p></div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                <span style={{ color: '#94a3b8', fontSize: '14px' }}>Schedule Month:</span>
                <button onClick={() => navigateMonth(-1)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#fff', cursor: 'pointer' }}><ChevronLeft size={18} /></button>
                <span style={{ fontWeight: '600', minWidth: '150px', textAlign: 'center' }}>{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                <button onClick={() => navigateMonth(1)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#fff', cursor: 'pointer' }}><ChevronRight size={18} /></button>
              </div>

              <label onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px', border: `2px dashed ${isDragging ? '#22c55e' : 'rgba(99, 102, 241, 0.5)'}`, borderRadius: '16px', cursor: 'pointer', background: isDragging ? 'rgba(34, 197, 94, 0.1)' : 'rgba(99, 102, 241, 0.05)', transform: isDragging ? 'scale(1.02)' : 'scale(1)', transition: 'all 0.2s ease' }}>
                <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} style={{ display: 'none' }} />
                <FileSpreadsheet size={48} style={{ color: isDragging ? '#22c55e' : '#6366f1', marginBottom: '16px' }} />
                <span style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>{isDragging ? 'Drop file here!' : 'Drag & drop or click to upload'}</span>
                <span style={{ fontSize: '14px', color: '#94a3b8' }}>CSV or Excel file from Microsoft Forms</span>
              </label>

              {importStatus && (<div style={{ marginTop: '24px', padding: '16px 20px', background: importStatus.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${importStatus.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`, borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>{importStatus.type === 'success' ? <Check size={20} style={{ color: '#22c55e' }} /> : <AlertCircle size={20} style={{ color: '#ef4444' }} />}<span style={{ color: importStatus.type === 'success' ? '#4ade80' : '#f87171' }}>{importStatus.message}</span></div>)}

              <div style={{ marginTop: '24px', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}><h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#94a3b8' }}>Expected Form Fields:</h3><ul style={{ margin: 0, paddingLeft: '20px', color: '#64748b', fontSize: '13px', lineHeight: '1.8' }}><li><strong style={{ color: '#94a3b8' }}>Name</strong> — RA's name</li><li><strong style={{ color: '#94a3b8' }}>Which Don group are you?</strong> — "Simons Don" or "Annex Don"</li><li><strong style={{ color: '#94a3b8' }}>Days off</strong> — Comma-separated day numbers (e.g., "12,13,17")</li></ul></div>
            </div>
          )}

          {activeTab === 'staff' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>{selectedBuilding.replace(' Don', '')} Staff ({filteredStaff.length})</h2>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <input type="text" value={newStaffName} onChange={(e) => setNewStaffName(e.target.value)} placeholder="New RA name..." onKeyPress={(e) => e.key === 'Enter' && addStaff()} style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '14px', width: '150px' }} />
                  <select value={newStaffBuilding} onChange={(e) => setNewStaffBuilding(e.target.value)} style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(30,27,75,1)', color: '#fff', fontSize: '14px' }}><option value="Simons Don">Simons</option><option value="Annex Don">Annex</option></select>
                  <button onClick={addStaff} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}><Plus size={18} />Add RA</button>
                </div>
              </div>
              
              {filteredStaff.length === 0 && (<div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}><Users size={48} style={{ marginBottom: '16px', opacity: 0.5 }} /><p style={{ margin: 0 }}>No {selectedBuilding.replace(' Don', '')} staff yet. Import or add manually.</p></div>)}
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {filteredStaff.map(member => (<div key={member.id} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '14px', padding: '20px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}><div style={{ width: '44px', height: '44px', borderRadius: '12px', background: member.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '16px' }}>{member.name.substring(0, 2).toUpperCase()}</div><div><div style={{ fontWeight: '600', fontSize: '15px' }}>{member.name}</div><div style={{ color: '#94a3b8', fontSize: '12px' }}>{shiftCounts[member.id] || 0} shifts</div></div></div><button onClick={() => removeStaff(member.id)} style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button></div>))}
              </div>
            </div>
          )}

          {activeTab === 'classes' && (
            <div>
              <div style={{ marginBottom: '24px' }}><h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '600' }}>Class Schedules - {selectedBuilding.replace(' Don', '')}</h2><p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>Set weekly recurring class times (24-hour format)</p></div>
              {filteredStaff.length === 0 && (<div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}><p>Import or add staff members first</p></div>)}
              {filteredStaff.map(member => (<StaffClassSection key={member.id} member={member} classes={classSchedules[member.id] || []} onAddClass={(cls) => addClass(member.id, cls)} onRemoveClass={(idx) => removeClass(member.id, idx)} />))}
            </div>
          )}

          {activeTab === 'dayoff' && (
            <div>
              <div style={{ marginBottom: '24px' }}><h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '600' }}>Day Off Requests - {selectedBuilding.replace(' Don', '')}</h2><p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>Days imported from Microsoft Forms or added manually</p></div>
              {filteredStaff.length === 0 && (<div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}><p>Import or add staff members first</p></div>)}
              {filteredStaff.map(member => (<StaffDayOffSection key={member.id} member={member} dayOffs={dayOffRequests[member.id] || []} onAddDayOff={(date) => addDayOff(member.id, date)} onRemoveDayOff={(dateStr) => removeDayOff(member.id, dateStr)} />))}
            </div>
          )}

          {activeTab === 'exams' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div><h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '600' }}>Exam Schedules - {selectedBuilding.replace(' Don', '')}</h2><p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>RAs get day before, day of, and day after exam off</p></div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', background: isExamSeason ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'rgba(255,255,255,0.05)', borderRadius: '12px', cursor: 'pointer' }}><input type="checkbox" checked={isExamSeason} onChange={(e) => setIsExamSeason(e.target.checked)} style={{ display: 'none' }} /><div style={{ width: '20px', height: '20px', borderRadius: '6px', border: `2px solid ${isExamSeason ? '#fff' : 'rgba(255,255,255,0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isExamSeason ? 'rgba(255,255,255,0.2)' : 'transparent' }}>{isExamSeason && <Check size={14} />}</div><span style={{ fontWeight: '600', fontSize: '14px' }}>Exam Season Mode</span></label>
              </div>
              {!isExamSeason && (<div style={{ padding: '16px 20px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}><AlertCircle size={20} style={{ color: '#f59e0b' }} /><span style={{ color: '#fbbf24', fontSize: '14px' }}>Enable Exam Season Mode to give RAs time off around exams</span></div>)}
              {filteredStaff.length === 0 && (<div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}><p>Import or add staff members first</p></div>)}
              {filteredStaff.map(member => (<StaffExamSection key={member.id} member={member} exams={examSchedules[member.id] || []} onAddExam={(exam) => addExam(member.id, exam)} onRemoveExam={(idx) => removeExam(member.id, idx)} />))}
            </div>
          )}

          {activeTab === 'conflicts' && (
            <div>
              <div style={{ marginBottom: '24px' }}><h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '600' }}>Scheduling Conflicts - {selectedBuilding.replace(' Don', '')}</h2><p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>Days where no one is available with priority recommendations</p></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}><button onClick={() => navigateMonth(-1)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#fff', cursor: 'pointer' }}><ChevronLeft size={18} /></button><span style={{ fontWeight: '600', minWidth: '150px', textAlign: 'center' }}>{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span><button onClick={() => navigateMonth(1)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#fff', cursor: 'pointer' }}><ChevronRight size={18} /></button></div>

              {conflicts.length === 0 ? (<div style={{ textAlign: 'center', padding: '48px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '16px', border: '1px solid rgba(34, 197, 94, 0.3)' }}><Check size={48} style={{ color: '#22c55e', marginBottom: '16px' }} /><h3 style={{ margin: '0 0 8px 0', color: '#4ade80' }}>No Conflicts!</h3><p style={{ margin: 0, color: '#94a3b8' }}>Every day has at least one available RA</p></div>) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {conflicts.map(conflict => (<div key={conflict.date} style={{ background: 'rgba(239, 68, 68, 0.1)', borderRadius: '14px', padding: '20px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}><AlertTriangle size={20} style={{ color: '#ef4444' }} /><h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#f87171' }}>{conflict.dayName}, {conflict.day}</h3></div>
                    <div style={{ marginBottom: '16px' }}><div style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase' }}>Why everyone is unavailable:</div>
                      {conflict.unavailable.map(({ member, reasons }) => (<div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '8px' }}><div style={{ width: '32px', height: '32px', borderRadius: '8px', background: member.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '12px' }}>{member.name.substring(0, 2).toUpperCase()}</div><div style={{ flex: 1 }}><div style={{ fontWeight: '600', fontSize: '14px' }}>{member.name}</div><div style={{ fontSize: '12px', color: '#94a3b8' }}>{reasons.join(' • ')}</div></div></div>))}
                    </div>
                    {conflict.recommendation && (<div style={{ padding: '12px 16px', background: 'rgba(34, 197, 94, 0.15)', borderRadius: '10px', border: '1px solid rgba(34, 197, 94, 0.3)' }}><div style={{ fontSize: '12px', fontWeight: '600', color: '#4ade80', marginBottom: '6px', textTransform: 'uppercase' }}>Recommended Assignment:</div><div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><div style={{ width: '28px', height: '28px', borderRadius: '6px', background: conflict.recommendation.member.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '11px' }}>{conflict.recommendation.member.name.substring(0, 2).toUpperCase()}</div><div><span style={{ fontWeight: '600' }}>{conflict.recommendation.member.name}</span><span style={{ color: '#94a3b8', fontSize: '13px' }}> — {conflict.recommendation.reason}</span></div></div></div>)}
                  </div>))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'schedule' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <button onClick={() => navigateMonth(-1)} style={{ padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#fff', cursor: 'pointer' }}><ChevronLeft size={20} /></button>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', minWidth: '250px', textAlign: 'center' }}>{selectedBuilding.replace(' Don', '')} - {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
                  <button onClick={() => navigateMonth(1)} style={{ padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#fff', cursor: 'pointer' }}><ChevronRight size={20} /></button>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={clearSchedule} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.5)', background: 'transparent', color: '#ef4444', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}><Trash2 size={18} />Clear</button>
                  <button onClick={generateSchedule} disabled={filteredStaff.length === 0} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', border: 'none', background: filteredStaff.length === 0 ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: filteredStaff.length === 0 ? '#64748b' : '#fff', fontSize: '14px', fontWeight: '600', cursor: filteredStaff.length === 0 ? 'not-allowed' : 'pointer' }}><Shuffle size={18} />Auto-Generate</button>
                </div>
              </div>

              {filteredStaff.length === 0 ? (<div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}><Calendar size={48} style={{ marginBottom: '16px', opacity: 0.5 }} /><p>Import or add {selectedBuilding.replace(' Don', '')} staff first</p></div>) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', overflow: 'hidden', padding: '2px' }}>
                    {DAYS_SHORT.map(day => (<div key={day} style={{ padding: '12px', textAlign: 'center', fontWeight: '600', fontSize: '13px', color: '#94a3b8', background: 'rgba(255,255,255,0.03)' }}>{day}</div>))}
                    {getDaysInMonth(currentMonth).map((date, idx) => {
                      if (!date) return <div key={`empty-${idx}`} style={{ background: 'rgba(0,0,0,0.2)', minHeight: '100px' }} />;
                      const dateStr = date.toISOString().split('T')[0];
                      const assignedId = schedule[dateStr];
                      const assignedStaff = staff.find(s => s.id === assignedId);
                      const isToday = new Date().toDateString() === date.toDateString();
                      const isEditing = editingShift === dateStr;
                      const hasConflict = conflicts.some(c => c.date === dateStr);
                      
                      return (<div key={dateStr} onClick={() => !isEditing && setEditingShift(dateStr)} style={{ background: hasConflict && !assignedStaff ? 'rgba(239, 68, 68, 0.15)' : isToday ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.02)', minHeight: '100px', padding: '8px', cursor: 'pointer', position: 'relative', border: hasConflict && !assignedStaff ? '1px solid rgba(239, 68, 68, 0.5)' : isToday ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid transparent', borderRadius: '4px' }}>
                        <div style={{ fontSize: '13px', fontWeight: isToday ? '700' : '500', color: isToday ? '#a5b4fc' : '#94a3b8', marginBottom: '8px' }}>{date.getDate()}</div>
                        {assignedStaff && !isEditing && (<div style={{ background: assignedStaff.color, borderRadius: '8px', padding: '6px 8px', fontSize: '12px', fontWeight: '600', color: '#fff' }}>{assignedStaff.name}<div style={{ fontSize: '10px', opacity: 0.8, marginTop: '2px' }}>20:00-22:00</div></div>)}
                        {!assignedStaff && !isEditing && (<div style={{ background: hasConflict ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '6px 8px', fontSize: '11px', color: hasConflict ? '#f87171' : '#64748b', border: `1px dashed ${hasConflict ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255,255,255,0.2)'}` }}>{hasConflict ? 'Conflict!' : 'Unassigned'}</div>)}
                        {isEditing && (<div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 100, background: '#1e1b4b', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', padding: '8px', minWidth: '150px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px', fontWeight: '600' }}>Assign shift:</div>
                          {filteredStaff.map(s => { const available = isAvailable(s.id, date); return (<button key={s.id} onClick={() => assignShift(dateStr, s.id)} style={{ display: 'block', width: '100%', padding: '8px 10px', marginBottom: '4px', borderRadius: '8px', border: 'none', background: available ? s.color : 'rgba(255,255,255,0.05)', color: available ? '#fff' : '#64748b', fontSize: '12px', fontWeight: '600', cursor: 'pointer', textAlign: 'left', opacity: available ? 1 : 0.5 }}>{s.name}{!available && ' (unavailable)'}</button>); })}
                          <button onClick={() => { unassignShift(dateStr); setEditingShift(null); }} style={{ display: 'block', width: '100%', padding: '8px 10px', marginTop: '8px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.5)', background: 'transparent', color: '#ef4444', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Clear</button>
                          <button onClick={() => setEditingShift(null)} style={{ display: 'block', width: '100%', padding: '8px 10px', marginTop: '4px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
                        </div>)}
                      </div>);
                    })}
                  </div>
                  <div style={{ marginTop: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>{filteredStaff.map(member => (<div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '12px', height: '12px', borderRadius: '4px', background: member.color }} /><span style={{ fontSize: '13px', color: '#94a3b8' }}>{member.name} ({shiftCounts[member.id] || 0})</span></div>))}</div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StaffClassSection({ member, classes, onAddClass, onRemoveClass }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newClass, setNewClass] = useState({ day: 1, start: '18:00', end: '21:00', name: '' });
  const handleAdd = () => { if (newClass.name.trim()) { onAddClass({ ...newClass, day: parseInt(newClass.day) }); setNewClass({ day: 1, start: '18:00', end: '21:00', name: '' }); setIsAdding(false); } };
  
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '14px', padding: '20px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><div style={{ width: '36px', height: '36px', borderRadius: '10px', background: member.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px' }}>{member.name.substring(0, 2).toUpperCase()}</div><span style={{ fontWeight: '600' }}>{member.name}</span></div>
        {!isAdding && (<button onClick={() => setIsAdding(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', cursor: 'pointer' }}><Plus size={16} />Add Class</button>)}
      </div>
      {isAdding && (<div style={{ display: 'flex', gap: '12px', marginBottom: '16px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="text" placeholder="Class name" value={newClass.name} onChange={(e) => setNewClass({ ...newClass, name: e.target.value })} style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '14px', flex: 1, minWidth: '120px' }} />
        <select value={newClass.day} onChange={(e) => setNewClass({ ...newClass, day: e.target.value })} style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(30,27,75,1)', color: '#fff', fontSize: '14px' }}>{DAYS_OF_WEEK.map((day, idx) => (<option key={day} value={idx}>{day}</option>))}</select>
        <input type="time" value={newClass.start} onChange={(e) => setNewClass({ ...newClass, start: e.target.value })} style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '14px' }} />
        <span style={{ color: '#64748b' }}>to</span>
        <input type="time" value={newClass.end} onChange={(e) => setNewClass({ ...newClass, end: e.target.value })} style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '14px' }} />
        <button onClick={handleAdd} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#22c55e', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Save</button>
        <button onClick={() => setIsAdding(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
      </div>)}
      {classes.length === 0 && !isAdding && <div style={{ color: '#64748b', fontSize: '14px', fontStyle: 'italic' }}>No classes added</div>}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>{classes.map((cls, idx) => (<div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '10px', border: '1px solid rgba(99, 102, 241, 0.3)' }}><BookOpen size={14} style={{ color: '#a5b4fc' }} /><div><div style={{ fontWeight: '600', fontSize: '13px' }}>{cls.name}</div><div style={{ fontSize: '11px', color: '#94a3b8' }}>{DAYS_OF_WEEK[cls.day]} {cls.start} - {cls.end}</div></div><button onClick={() => onRemoveClass(idx)} style={{ padding: '4px', borderRadius: '4px', border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}><X size={14} /></button></div>))}</div>
    </div>
  );
}

function StaffDayOffSection({ member, dayOffs, onAddDayOff, onRemoveDayOff }) {
  const [selectedDate, setSelectedDate] = useState('');
  const handleAdd = () => { if (selectedDate) { onAddDayOff(new Date(selectedDate + 'T12:00:00')); setSelectedDate(''); } };
  
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '14px', padding: '20px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><div style={{ width: '36px', height: '36px', borderRadius: '10px', background: member.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px' }}>{member.name.substring(0, 2).toUpperCase()}</div><span style={{ fontWeight: '600' }}>{member.name}</span></div>
        <div style={{ display: 'flex', gap: '8px' }}><input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '14px' }} /><button onClick={handleAdd} disabled={!selectedDate} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px', borderRadius: '8px', border: 'none', background: selectedDate ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)', color: selectedDate ? '#fff' : '#64748b', fontSize: '14px', cursor: selectedDate ? 'pointer' : 'not-allowed' }}><Plus size={16} />Add</button></div>
      </div>
      {dayOffs.length === 0 && <div style={{ color: '#64748b', fontSize: '14px', fontStyle: 'italic' }}>No day-off requests</div>}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>{dayOffs.sort().map((dateStr) => (<div key={dateStr} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'rgba(236, 72, 153, 0.15)', borderRadius: '8px', border: '1px solid rgba(236, 72, 153, 0.3)' }}><Clock size={14} style={{ color: '#f472b6' }} /><span style={{ fontSize: '13px', fontWeight: '500' }}>{new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span><button onClick={() => onRemoveDayOff(dateStr)} style={{ padding: '4px', borderRadius: '4px', border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}><X size={14} /></button></div>))}</div>
    </div>
  );
}

function StaffExamSection({ member, exams, onAddExam, onRemoveExam }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newExam, setNewExam] = useState({ date: '', name: '', time: '09:00' });
  const handleAdd = () => { if (newExam.date && newExam.name.trim()) { onAddExam({ ...newExam }); setNewExam({ date: '', name: '', time: '09:00' }); setIsAdding(false); } };
  
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '14px', padding: '20px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><div style={{ width: '36px', height: '36px', borderRadius: '10px', background: member.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px' }}>{member.name.substring(0, 2).toUpperCase()}</div><span style={{ fontWeight: '600' }}>{member.name}</span></div>
        {!isAdding && (<button onClick={() => setIsAdding(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', cursor: 'pointer' }}><Plus size={16} />Add Exam</button>)}
      </div>
      {isAdding && (<div style={{ display: 'flex', gap: '12px', marginBottom: '16px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="text" placeholder="Exam name" value={newExam.name} onChange={(e) => setNewExam({ ...newExam, name: e.target.value })} style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '14px', flex: 1, minWidth: '120px' }} />
        <input type="date" value={newExam.date} onChange={(e) => setNewExam({ ...newExam, date: e.target.value })} style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '14px' }} />
        <input type="time" value={newExam.time} onChange={(e) => setNewExam({ ...newExam, time: e.target.value })} style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '14px' }} />
        <button onClick={handleAdd} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#22c55e', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Save</button>
        <button onClick={() => setIsAdding(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
      </div>)}
      {exams.length === 0 && !isAdding && <div style={{ color: '#64748b', fontSize: '14px', fontStyle: 'italic' }}>No exams scheduled</div>}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>{exams.map((exam, idx) => (<div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'rgba(245, 158, 11, 0.15)', borderRadius: '10px', border: '1px solid rgba(245, 158, 11, 0.3)' }}><GraduationCap size={14} style={{ color: '#fbbf24' }} /><div><div style={{ fontWeight: '600', fontSize: '13px' }}>{exam.name}</div><div style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(exam.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {exam.time}</div></div><button onClick={() => onRemoveExam(idx)} style={{ padding: '4px', borderRadius: '4px', border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}><X size={14} /></button></div>))}</div>
    </div>
  );
}
