import React, { useState, useMemo } from 'react';
import { Calendar, Users, Clock, BookOpen, GraduationCap, Shuffle, ChevronLeft, ChevronRight, Plus, X, Check, AlertCircle, Trash2, Upload, FileSpreadsheet, Building } from 'lucide-react';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function App() {
  const [activeTab, setActiveTab] = useState('import');
  const [staff, setStaff] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState('all'); // 'all', 'Simons Don', 'Annex Don'
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffBuilding, setNewStaffBuilding] = useState('Simons Don');
  
  const [classSchedules, setClassSchedules] = useState({});
  const [dayOffRequests, setDayOffRequests] = useState({});
  const [examSchedules, setExamSchedules] = useState({});
  
  const [schedule, setSchedule] = useState({});
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editingShift, setEditingShift] = useState(null);
  const [isExamSeason, setIsExamSeason] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  
  const COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#ef4444', '#22c55e', '#3b82f6', '#06b6d4', '#d946ef'];

  // Filter staff by selected building
  const filteredStaff = useMemo(() => {
    if (selectedBuilding === 'all') return staff;
    return staff.filter(s => s.building === selectedBuilding);
  }, [staff, selectedBuilding]);

  // Parse CSV data
  const parseCSV = (text) => {
    const lines = text.split('\n');
    const result = [];
    let headers = [];
    let inHeader = true;
    let headerLines = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      if (inHeader) {
        headerLines += line;
        // Check if we have all the headers (look for the last expected header pattern)
        if (headerLines.includes('Any notes')) {
          // Parse the complete header
          headers = parseCSVLine(headerLines);
          inHeader = false;
          continue;
        }
        continue;
      }
      
      const values = parseCSVLine(line);
      if (values.length >= 7) {
        result.push({
          name: values[5]?.trim() || '', // Name1 column
          building: values[6]?.trim() || '', // Don group column
          daysOff: values[7]?.trim() || '', // Days off column
          notes: values[8]?.trim() || ''
        });
      }
    }
    return result;
  };

  // Parse a single CSV line handling quoted fields
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

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
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
        
        // Process each row
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
          
          // Parse days off (comma-separated day numbers)
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
        setSchedule({});
        
        setImportStatus({ 
          type: 'success', 
          message: `Imported ${newStaff.length} staff members successfully!` 
        });
        
        // Auto-switch to staff tab after import
        setTimeout(() => setActiveTab('staff'), 1500);
        
      } catch (error) {
        console.error('Import error:', error);
        setImportStatus({ type: 'error', message: 'Error parsing file. Please check the format.' });
      }
    };
    reader.readAsText(file);
  };

  // Add staff manually
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
    
    if (dayOffRequests[staffId]?.includes(dateStr)) {
      return false;
    }
    
    const staffClasses = classSchedules[staffId] || [];
    for (const cls of staffClasses) {
      if (cls.day === dayOfWeek) {
        const classStart = parseInt(cls.start.split(':')[0]) * 60 + parseInt(cls.start.split(':')[1]);
        const classEnd = parseInt(cls.end.split(':')[0]) * 60 + parseInt(cls.end.split(':')[1]);
        const shiftStart = 20 * 60;
        const shiftEnd = 22 * 60;
        
        if (classStart < shiftEnd && classEnd > shiftStart) {
          return false;
        }
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
    
    Object.entries(schedule).forEach(([dateStr, staffId]) => {
      if (shiftCounts[staffId] !== undefined) {
        shiftCounts[staffId]++;
      }
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

  const clearSchedule = () => {
    setSchedule({});
  };

  const assignShift = (dateStr, staffId) => {
    setSchedule({ ...schedule, [dateStr]: staffId });
    setEditingShift(null);
  };
  
  const unassignShift = (dateStr) => {
    const { [dateStr]: _, ...rest } = schedule;
    setSchedule(rest);
  };

  const shiftCounts = useMemo(() => {
    const counts = {};
    staff.forEach(s => counts[s.id] = 0);
    Object.values(schedule).forEach(staffId => {
      if (counts[staffId] !== undefined) {
        counts[staffId]++;
      }
    });
    return counts;
  }, [schedule, staff]);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const firstDay = new Date(year, month, 1);
    const startingDay = firstDay.getDay();
    
    const days = [];
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
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
    { id: 'schedule', label: 'Schedule', icon: Calendar },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
      fontFamily: "'DM Sans', system-ui, sans-serif",
      color: '#e2e8f0',
      padding: '24px',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '700',
            margin: '0 0 8px 0',
            background: 'linear-gradient(135deg, #a5b4fc 0%, #f0abfc 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            RA Shift Scheduler v2
          </h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '15px' }}>
            Import from Microsoft Forms • Shifts: 8PM - 10PM Daily
          </p>
        </div>

        {/* Building Filter */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '16px',
        }}>
          <span style={{ color: '#94a3b8', fontSize: '14px', alignSelf: 'center', marginRight: '8px' }}>
            <Building size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
            Building:
          </span>
          {['all', 'Simons Don', 'Annex Don'].map(building => (
            <button
              key={building}
              onClick={() => setSelectedBuilding(building)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                background: selectedBuilding === building 
                  ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                  : 'rgba(255,255,255,0.1)',
                color: selectedBuilding === building ? '#fff' : '#94a3b8',
              }}
            >
              {building === 'all' ? 'All' : building.replace(' Don', '')}
            </button>
          ))}
        </div>

        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          padding: '6px',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '16px',
          flexWrap: 'wrap',
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                minWidth: '100px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 16px',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                background: activeTab === tab.id 
                  ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                  : 'transparent',
                color: activeTab === tab.id ? '#fff' : '#94a3b8',
              }}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '20px',
          padding: '24px',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          
          {/* Import Tab */}
          {activeTab === 'import' && (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '600' }}>
                  Import from Microsoft Forms
                </h2>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>
                  Export your Microsoft Form responses as CSV/Excel and upload here
                </p>
              </div>
              
              {/* Month Selector */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '24px',
                padding: '16px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '12px',
              }}>
                <span style={{ color: '#94a3b8', fontSize: '14px' }}>Schedule Month:</span>
                <button
                  onClick={() => navigateMonth(-1)}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'transparent',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <ChevronLeft size={18} />
                </button>
                <span style={{ fontWeight: '600', minWidth: '150px', textAlign: 'center' }}>
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  onClick={() => navigateMonth(1)}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'transparent',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Upload Area */}
              <label style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px',
                border: '2px dashed rgba(99, 102, 241, 0.5)',
                borderRadius: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: 'rgba(99, 102, 241, 0.05)',
              }}>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <FileSpreadsheet size={48} style={{ color: '#6366f1', marginBottom: '16px' }} />
                <span style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                  Click to upload or drag and drop
                </span>
                <span style={{ fontSize: '14px', color: '#94a3b8' }}>
                  CSV or Excel file from Microsoft Forms
                </span>
              </label>

              {/* Import Status */}
              {importStatus && (
                <div style={{
                  marginTop: '24px',
                  padding: '16px 20px',
                  background: importStatus.type === 'success' 
                    ? 'rgba(34, 197, 94, 0.1)' 
                    : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${importStatus.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}>
                  {importStatus.type === 'success' ? (
                    <Check size={20} style={{ color: '#22c55e' }} />
                  ) : (
                    <AlertCircle size={20} style={{ color: '#ef4444' }} />
                  )}
                  <span style={{ color: importStatus.type === 'success' ? '#4ade80' : '#f87171' }}>
                    {importStatus.message}
                  </span>
                </div>
              )}

              {/* Expected Format Info */}
              <div style={{
                marginTop: '24px',
                padding: '20px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#94a3b8' }}>
                  Expected Form Fields:
                </h3>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#64748b', fontSize: '13px', lineHeight: '1.8' }}>
                  <li><strong style={{ color: '#94a3b8' }}>Name</strong> — RA's name</li>
                  <li><strong style={{ color: '#94a3b8' }}>Which Don group are you?</strong> — "Simons Don" or "Annex Don"</li>
                  <li><strong style={{ color: '#94a3b8' }}>Days off</strong> — Comma-separated day numbers (e.g., "12,13,17")</li>
                  <li><strong style={{ color: '#94a3b8' }}>Notes</strong> — Optional notes</li>
                </ul>
              </div>
            </div>
          )}

          {/* Staff Tab */}
          {activeTab === 'staff' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
                  Staff Members ({filteredStaff.length}{selectedBuilding !== 'all' ? ` - ${selectedBuilding.replace(' Don', '')}` : ''})
                </h2>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    placeholder="New RA name..."
                    onKeyPress={(e) => e.key === 'Enter' && addStaff()}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.15)',
                      background: 'rgba(255,255,255,0.05)',
                      color: '#fff',
                      fontSize: '14px',
                      width: '150px',
                    }}
                  />
                  <select
                    value={newStaffBuilding}
                    onChange={(e) => setNewStaffBuilding(e.target.value)}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.15)',
                      background: 'rgba(30,27,75,1)',
                      color: '#fff',
                      fontSize: '14px',
                    }}
                  >
                    <option value="Simons Don">Simons</option>
                    <option value="Annex Don">Annex</option>
                  </select>
                  <button
                    onClick={addStaff}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 20px',
                      borderRadius: '10px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={18} />
                    Add RA
                  </button>
                </div>
              </div>
              
              {filteredStaff.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: '48px',
                  color: '#64748b',
                }}>
                  <Users size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                  <p style={{ margin: 0 }}>No staff members yet. Import from Microsoft Forms or add manually.</p>
                </div>
              )}
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {filteredStaff.map(member => (
                  <div
                    key={member.id}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '14px',
                      padding: '20px',
                      border: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        background: member.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '16px',
                      }}>
                        {member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '15px' }}>{member.name}</div>
                        <div style={{ color: '#94a3b8', fontSize: '12px' }}>
                          {member.building?.replace(' Don', '')} • {shiftCounts[member.id] || 0} shifts
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeStaff(member.id)}
                      style={{
                        padding: '8px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'rgba(239, 68, 68, 0.2)',
                        color: '#ef4444',
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              
              {filteredStaff.length > 0 && Object.values(shiftCounts).some(c => c > 0) && (
                <div style={{ marginTop: '32px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#94a3b8' }}>
                    Shift Distribution
                  </h3>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {filteredStaff.map(member => {
                      const count = shiftCounts[member.id] || 0;
                      const maxCount = Math.max(...filteredStaff.map(s => shiftCounts[s.id] || 0), 1);
                      return (
                        <div key={member.id} style={{ flex: 1, minWidth: '100px' }}>
                          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                            {member.name}
                          </div>
                          <div style={{
                            height: '8px',
                            background: 'rgba(255,255,255,0.1)',
                            borderRadius: '4px',
                            overflow: 'hidden',
                          }}>
                            <div style={{
                              width: `${(count / maxCount) * 100}%`,
                              height: '100%',
                              background: member.color,
                              borderRadius: '4px',
                            }} />
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: '600', marginTop: '4px' }}>
                            {count} shifts
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Classes Tab */}
          {activeTab === 'classes' && (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '600' }}>
                  Class Schedules
                </h2>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>
                  Set weekly recurring class times when RAs are unavailable for shifts
                </p>
              </div>
              
              {filteredStaff.length === 0 && (
                <div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
                  <p>Import or add staff members first</p>
                </div>
              )}
              
              {filteredStaff.map(member => (
                <StaffClassSection
                  key={member.id}
                  member={member}
                  classes={classSchedules[member.id] || []}
                  onAddClass={(cls) => addClass(member.id, cls)}
                  onRemoveClass={(idx) => removeClass(member.id, idx)}
                />
              ))}
            </div>
          )}

          {/* Day Off Tab */}
          {activeTab === 'dayoff' && (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '600' }}>
                  Day Off Requests
                </h2>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>
                  Days imported from Microsoft Forms or added manually
                </p>
              </div>
              
              {filteredStaff.length === 0 && (
                <div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
                  <p>Import or add staff members first</p>
                </div>
              )}
              
              {filteredStaff.map(member => (
                <StaffDayOffSection
                  key={member.id}
                  member={member}
                  dayOffs={dayOffRequests[member.id] || []}
                  onAddDayOff={(date) => addDayOff(member.id, date)}
                  onRemoveDayOff={(dateStr) => removeDayOff(member.id, dateStr)}
                />
              ))}
            </div>
          )}

          {/* Exams Tab */}
          {activeTab === 'exams' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '600' }}>
                    Exam Schedules
                  </h2>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>
                    During exam season, RAs get the day before, day of, and day after their exam off
                  </p>
                </div>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 20px',
                  background: isExamSeason 
                    ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                    : 'rgba(255,255,255,0.05)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                }}>
                  <input
                    type="checkbox"
                    checked={isExamSeason}
                    onChange={(e) => setIsExamSeason(e.target.checked)}
                    style={{ display: 'none' }}
                  />
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '6px',
                    border: `2px solid ${isExamSeason ? '#fff' : 'rgba(255,255,255,0.3)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isExamSeason ? 'rgba(255,255,255,0.2)' : 'transparent',
                  }}>
                    {isExamSeason && <Check size={14} />}
                  </div>
                  <span style={{ fontWeight: '600', fontSize: '14px' }}>
                    Exam Season Mode
                  </span>
                </label>
              </div>
              
              {!isExamSeason && (
                <div style={{
                  padding: '16px 20px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '12px',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}>
                  <AlertCircle size={20} style={{ color: '#f59e0b' }} />
                  <span style={{ color: '#fbbf24', fontSize: '14px' }}>
                    Enable Exam Season Mode to automatically give RAs time off around their exams
                  </span>
                </div>
              )}
              
              {filteredStaff.length === 0 && (
                <div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
                  <p>Import or add staff members first</p>
                </div>
              )}
              
              {filteredStaff.map(member => (
                <StaffExamSection
                  key={member.id}
                  member={member}
                  exams={examSchedules[member.id] || []}
                  onAddExam={(exam) => addExam(member.id, exam)}
                  onRemoveExam={(idx) => removeExam(member.id, idx)}
                />
              ))}
            </div>
          )}

          {/* Schedule Tab */}
          {activeTab === 'schedule' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <button
                    onClick={() => navigateMonth(-1)}
                    style={{
                      padding: '10px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.15)',
                      background: 'transparent',
                      color: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', minWidth: '200px', textAlign: 'center' }}>
                    {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h2>
                  <button
                    onClick={() => navigateMonth(1)}
                    style={{
                      padding: '10px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.15)',
                      background: 'transparent',
                      color: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={clearSchedule}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px 20px',
                      borderRadius: '12px',
                      border: '1px solid rgba(239, 68, 68, 0.5)',
                      background: 'transparent',
                      color: '#ef4444',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={18} />
                    Clear
                  </button>
                  <button
                    onClick={generateSchedule}
                    disabled={filteredStaff.length === 0}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px 24px',
                      borderRadius: '12px',
                      border: 'none',
                      background: filteredStaff.length === 0 
                        ? 'rgba(255,255,255,0.1)' 
                        : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      color: filteredStaff.length === 0 ? '#64748b' : '#fff',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: filteredStaff.length === 0 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <Shuffle size={18} />
                    Auto-Generate
                  </button>
                </div>
              </div>

              {filteredStaff.length === 0 && (
                <div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
                  <Calendar size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                  <p>Import or add staff members first, then generate the schedule</p>
                </div>
              )}

              {filteredStaff.length > 0 && (
                <>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: '2px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    padding: '2px',
                  }}>
                    {DAYS_SHORT.map(day => (
                      <div key={day} style={{
                        padding: '12px',
                        textAlign: 'center',
                        fontWeight: '600',
                        fontSize: '13px',
                        color: '#94a3b8',
                        background: 'rgba(255,255,255,0.03)',
                      }}>
                        {day}
                      </div>
                    ))}
                    
                    {getDaysInMonth(currentMonth).map((date, idx) => {
                      if (!date) {
                        return <div key={`empty-${idx}`} style={{ background: 'rgba(0,0,0,0.2)', minHeight: '100px' }} />;
                      }
                      
                      const dateStr = date.toISOString().split('T')[0];
                      const assignedId = schedule[dateStr];
                      const assignedStaff = staff.find(s => s.id === assignedId);
                      const isToday = new Date().toDateString() === date.toDateString();
                      const isEditing = editingShift === dateStr;
                      
                      return (
                        <div
                          key={dateStr}
                          onClick={() => !isEditing && setEditingShift(dateStr)}
                          style={{
                            background: isToday 
                              ? 'rgba(99, 102, 241, 0.2)' 
                              : 'rgba(255,255,255,0.02)',
                            minHeight: '100px',
                            padding: '8px',
                            cursor: 'pointer',
                            position: 'relative',
                            border: isToday ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid transparent',
                            borderRadius: '4px',
                          }}
                        >
                          <div style={{
                            fontSize: '13px',
                            fontWeight: isToday ? '700' : '500',
                            color: isToday ? '#a5b4fc' : '#94a3b8',
                            marginBottom: '8px',
                          }}>
                            {date.getDate()}
                          </div>
                          
                          {assignedStaff && !isEditing && (
                            <div style={{
                              background: assignedStaff.color,
                              borderRadius: '8px',
                              padding: '6px 8px',
                              fontSize: '12px',
                              fontWeight: '600',
                              color: '#fff',
                            }}>
                              {assignedStaff.name}
                              <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '2px' }}>
                                8-10pm
                              </div>
                            </div>
                          )}
                          
                          {!assignedStaff && !isEditing && (
                            <div style={{
                              background: 'rgba(255,255,255,0.05)',
                              borderRadius: '8px',
                              padding: '6px 8px',
                              fontSize: '11px',
                              color: '#64748b',
                              border: '1px dashed rgba(255,255,255,0.2)',
                            }}>
                              Unassigned
                            </div>
                          )}
                          
                          {isEditing && (
                            <div style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              zIndex: 100,
                              background: '#1e1b4b',
                              border: '1px solid rgba(255,255,255,0.2)',
                              borderRadius: '12px',
                              padding: '8px',
                              minWidth: '150px',
                              boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                            }}
                            onClick={(e) => e.stopPropagation()}
                            >
                              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px', fontWeight: '600' }}>
                                Assign shift:
                              </div>
                              {filteredStaff.map(s => {
                                const available = isAvailable(s.id, date);
                                return (
                                  <button
                                    key={s.id}
                                    onClick={() => assignShift(dateStr, s.id)}
                                    disabled={!available}
                                    style={{
                                      display: 'block',
                                      width: '100%',
                                      padding: '8px 10px',
                                      marginBottom: '4px',
                                      borderRadius: '8px',
                                      border: 'none',
                                      background: available ? s.color : 'rgba(255,255,255,0.05)',
                                      color: available ? '#fff' : '#64748b',
                                      fontSize: '12px',
                                      fontWeight: '600',
                                      cursor: available ? 'pointer' : 'not-allowed',
                                      textAlign: 'left',
                                      opacity: available ? 1 : 0.5,
                                    }}
                                  >
                                    {s.name}
                                    {!available && ' (unavailable)'}
                                  </button>
                                );
                              })}
                              <button
                                onClick={() => {
                                  unassignShift(dateStr);
                                  setEditingShift(null);
                                }}
                                style={{
                                  display: 'block',
                                  width: '100%',
                                  padding: '8px 10px',
                                  marginTop: '8px',
                                  borderRadius: '8px',
                                  border: '1px solid rgba(239, 68, 68, 0.5)',
                                  background: 'transparent',
                                  color: '#ef4444',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                }}
                              >
                                Clear
                              </button>
                              <button
                                onClick={() => setEditingShift(null)}
                                style={{
                                  display: 'block',
                                  width: '100%',
                                  padding: '8px 10px',
                                  marginTop: '4px',
                                  borderRadius: '8px',
                                  border: 'none',
                                  background: 'rgba(255,255,255,0.1)',
                                  color: '#94a3b8',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  <div style={{ marginTop: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    {filteredStaff.map(member => (
                      <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '4px',
                          background: member.color,
                        }} />
                        <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                          {member.name} ({shiftCounts[member.id] || 0})
                        </span>
                      </div>
                    ))}
                  </div>
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
  
  const handleAdd = () => {
    if (newClass.name.trim()) {
      onAddClass({ ...newClass, day: parseInt(newClass.day) });
      setNewClass({ day: 1, start: '18:00', end: '21:00', name: '' });
      setIsAdding(false);
    }
  };
  
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '14px', padding: '20px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: member.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px' }}>
            {member.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <span style={{ fontWeight: '600' }}>{member.name}</span>
            <div style={{ fontSize: '12px', color: '#64748b' }}>{member.building?.replace(' Don', '')}</div>
          </div>
        </div>
        <button onClick={() => setIsAdding(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', cursor: 'pointer' }}><Plus size={16} />Add Class</button>
      </div>
      
      {isAdding && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', flexWrap: 'wrap' }}>
          <input type="text" placeholder="Class name" value={newClass.name} onChange={(e) => setNewClass({ ...newClass, name: e.target.value })} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '13px', flex: 1, minWidth: '120px' }} />
          <select value={newClass.day} onChange={(e) => setNewClass({ ...newClass, day: e.target.value })} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(30,27,75,1)', color: '#fff', fontSize: '13px' }}>
            {DAYS_OF_WEEK.map((day, idx) => (<option key={day} value={idx}>{day}</option>))}
          </select>
          <input type="time" value={newClass.start} onChange={(e) => setNewClass({ ...newClass, start: e.target.value })} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '13px' }} />
          <span style={{ alignSelf: 'center', color: '#64748b' }}>to</span>
          <input type="time" value={newClass.end} onChange={(e) => setNewClass({ ...newClass, end: e.target.value })} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '13px' }} />
          <button onClick={handleAdd} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#22c55e', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Save</button>
          <button onClick={() => setIsAdding(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
        </div>
      )}
      
      {classes.length === 0 && !isAdding && <div style={{ color: '#64748b', fontSize: '14px', fontStyle: 'italic' }}>No classes added</div>}
      
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {classes.map((cls, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '10px', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
            <BookOpen size={14} style={{ color: '#a5b4fc' }} />
            <div>
              <div style={{ fontWeight: '600', fontSize: '13px' }}>{cls.name}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>{DAYS_OF_WEEK[cls.day]} {cls.start} - {cls.end}</div>
            </div>
            <button onClick={() => onRemoveClass(idx)} style={{ padding: '4px', borderRadius: '4px', border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}><X size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function StaffDayOffSection({ member, dayOffs, onAddDayOff, onRemoveDayOff }) {
  const [selectedDate, setSelectedDate] = useState('');
  
  const handleAdd = () => {
    if (selectedDate) {
      onAddDayOff(new Date(selectedDate + 'T12:00:00'));
      setSelectedDate('');
    }
  };
  
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '14px', padding: '20px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: member.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px' }}>
            {member.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <span style={{ fontWeight: '600' }}>{member.name}</span>
            <div style={{ fontSize: '12px', color: '#64748b' }}>{member.building?.replace(' Don', '')}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '13px' }} />
          <button onClick={handleAdd} disabled={!selectedDate} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: 'none', background: selectedDate ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)', color: selectedDate ? '#fff' : '#64748b', fontSize: '13px', cursor: selectedDate ? 'pointer' : 'not-allowed' }}><Plus size={16} />Add</button>
        </div>
      </div>
      
      {dayOffs.length === 0 && <div style={{ color: '#64748b', fontSize: '14px', fontStyle: 'italic' }}>No day-off requests</div>}
      
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {dayOffs.sort().map((dateStr) => (
          <div key={dateStr} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'rgba(236, 72, 153, 0.15)', borderRadius: '8px', border: '1px solid rgba(236, 72, 153, 0.3)' }}>
            <Clock size={14} style={{ color: '#f472b6' }} />
            <span style={{ fontSize: '13px', fontWeight: '500' }}>{new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <button onClick={() => onRemoveDayOff(dateStr)} style={{ padding: '4px', borderRadius: '4px', border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}><X size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function StaffExamSection({ member, exams, onAddExam, onRemoveExam }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newExam, setNewExam] = useState({ date: '', name: '', time: '09:00' });
  
  const handleAdd = () => {
    if (newExam.date && newExam.name.trim()) {
      onAddExam({ ...newExam });
      setNewExam({ date: '', name: '', time: '09:00' });
      setIsAdding(false);
    }
  };
  
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '14px', padding: '20px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: member.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px' }}>
            {member.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <span style={{ fontWeight: '600' }}>{member.name}</span>
            <div style={{ fontSize: '12px', color: '#64748b' }}>{member.building?.replace(' Don', '')}</div>
          </div>
        </div>
        <button onClick={() => setIsAdding(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', cursor: 'pointer' }}><Plus size={16} />Add Exam</button>
      </div>
      
      {isAdding && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', flexWrap: 'wrap' }}>
          <input type="text" placeholder="Exam/Course name" value={newExam.name} onChange={(e) => setNewExam({ ...newExam, name: e.target.value })} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '13px', flex: 1, minWidth: '120px' }} />
          <input type="date" value={newExam.date} onChange={(e) => setNewExam({ ...newExam, date: e.target.value })} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '13px' }} />
          <input type="time" value={newExam.time} onChange={(e) => setNewExam({ ...newExam, time: e.target.value })} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '13px' }} />
          <button onClick={handleAdd} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#22c55e', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Save</button>
          <button onClick={() => setIsAdding(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
        </div>
      )}
      
      {exams.length === 0 && !isAdding && <div style={{ color: '#64748b', fontSize: '14px', fontStyle: 'italic' }}>No exams scheduled</div>}
      
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {exams.map((exam, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'rgba(245, 158, 11, 0.15)', borderRadius: '10px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <GraduationCap size={14} style={{ color: '#fbbf24' }} />
            <div>
              <div style={{ fontWeight: '600', fontSize: '13px' }}>{exam.name}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(exam.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {exam.time}</div>
            </div>
            <button onClick={() => onRemoveExam(idx)} style={{ padding: '4px', borderRadius: '4px', border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}><X size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
