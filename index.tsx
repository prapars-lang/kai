
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";
import confetti from "canvas-confetti";
import { Chart } from 'chart.js';

// --- 1. Types & Interfaces ---
interface StudentSubmission {
  rowId?: number;
  timestamp?: string;
  name: string;
  studentNumber: string;
  grade: string;
  room: string;
  activityType: 'Sports Day' | 'Children Day';
  videoFile?: File | null;
  fileUrl?: string;
  review?: RubricReview;
}

interface RubricReview {
  contentAccuracy: number;
  participation: number;
  presentation: number;
  discipline: number;
  totalScore: number;
  percentage: number;
  comment: string;
  gradedAt?: string;
  status: 'Graded' | 'Pending';
}

enum AppView {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  GALLERY = 'GALLERY',
  RESULT = 'RESULT',
  DASHBOARD = 'DASHBOARD',
  TEACHER_LOGIN = 'TEACHER_LOGIN'
}

enum AppStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  LOADING_DATA = 'LOADING_DATA'
}

// --- 2. Sub-Components ---

const Navigation = ({ currentView, setView }: { currentView: AppView, setView: (v: AppView) => void }) => {
  const menus = [
    { id: AppView.STUDENT, label: 'ส่งงาน', icon: '🚀', color: 'bg-indigo-500' },
    { id: AppView.RESULT, label: 'ตรวจคะแนน', icon: '🏆', color: 'bg-yellow-500' },
    { id: AppView.GALLERY, label: 'โรงหนังเพื่อน', icon: '🎬', color: 'bg-pink-500' },
    { id: AppView.TEACHER_LOGIN, label: 'คุณครู', icon: '👩‍🏫', color: 'bg-slate-700' },
    { id: AppView.DASHBOARD, label: 'สถิติ', icon: '📊', color: 'bg-emerald-500' },
  ];

  return (
    <nav className="flex flex-wrap justify-center gap-3 md:gap-4 mb-10">
      {menus.map(menu => {
        const isActive = currentView === menu.id || (menu.id === AppView.TEACHER_LOGIN && currentView === AppView.TEACHER);
        return (
          <button
            key={menu.id}
            onClick={() => setView(menu.id)}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold transition-all btn-bounce border-2 ${
              isActive 
                ? `${menu.color} text-white scale-105 shadow-lg border-transparent` 
                : 'bg-white/60 text-slate-500 hover:bg-white border-white/50 backdrop-blur-sm shadow-sm'
            }`}
          >
            <span className="text-xl">{menu.icon}</span>
            <span className="hidden sm:inline text-base font-kids">{menu.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

const SubmissionForm = ({ onSubmit }: { onSubmit: (data: StudentSubmission) => void }) => {
  const [formData, setFormData] = useState<StudentSubmission>({
    name: '', studentNumber: '', grade: 'Prathom 5', room: 'Room 1', activityType: 'Sports Day', videoFile: null
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.studentNumber || !formData.videoFile) {
      setErrorMessage("กรุณากรอกข้อมูลให้ครบถ้วนนะจ๊ะเด็กๆ ✨");
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-in zoom-in duration-500">
      {errorMessage && <div className="bg-red-50 border-2 border-red-200 text-red-600 p-4 rounded-2xl font-bold">⚠️ {errorMessage}</div>}
      <div className="space-y-4">
        <label className="block text-xl font-bold text-slate-700 text-center mb-4 font-kids">หนูต้องการส่งงานกิจกรรมอะไรจ๊ะ? ✨</label>
        <div className="grid grid-cols-2 gap-4">
          <button type="button" onClick={() => setFormData({...formData, activityType: 'Sports Day'})} className={`p-6 rounded-[2rem] border-4 transition-all flex flex-col items-center gap-3 ${formData.activityType === 'Sports Day' ? 'bg-orange-50 border-orange-400 scale-105 shadow-xl' : 'bg-white border-slate-100 opacity-60'}`}><span className="text-5xl">🏃</span><span className="font-bold font-kids">งานกีฬาสี</span></button>
          <button type="button" onClick={() => setFormData({...formData, activityType: 'Children Day'})} className={`p-6 rounded-[2rem] border-4 transition-all flex flex-col items-center gap-3 ${formData.activityType === 'Children Day' ? 'bg-cyan-50 border-cyan-400 scale-105 shadow-xl' : 'bg-white border-slate-100 opacity-60'}`}><span className="text-5xl">🎈</span><span className="font-bold font-kids">งานวันเด็ก</span></button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-kids">
        <input type="text" placeholder="ชื่อ-นามสกุล 🧒" className="w-full px-6 py-4 rounded-3xl bg-white border-4 border-indigo-50 outline-none text-lg shadow-inner" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
        <input type="number" placeholder="เลขที่ 🔢" className="w-full px-6 py-4 rounded-3xl bg-white border-4 border-indigo-50 outline-none text-lg shadow-inner" value={formData.studentNumber} onChange={e => setFormData({...formData, studentNumber: e.target.value})} required />
        <select className="w-full px-6 py-4 rounded-3xl bg-white border-4 border-pink-50 outline-none text-lg shadow-inner" value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value})}>
            <option value="Prathom 5">ประถมศึกษาปีที่ 5</option>
            <option value="Prathom 6">ประถมศึกษาปีที่ 6</option>
        </select>
        <select className="w-full px-6 py-4 rounded-3xl bg-white border-4 border-green-50 outline-none text-lg shadow-inner" value={formData.room} onChange={e => setFormData({...formData, room: e.target.value})}>
            {[1,2,3,4].map(r => <option key={r} value={`Room ${r}`}>ห้อง {r}</option>)}
        </select>
      </div>
      <div className="relative border-8 border-dashed rounded-[3rem] p-12 text-center cursor-pointer bg-slate-50 border-slate-200" onClick={() => document.getElementById('file-upload')?.click()}>
          <input id="file-upload" type="file" accept="video/*" className="hidden" onChange={e => e.target.files && setFormData({...formData, videoFile: e.target.files[0]})} />
          <div className="text-6xl mb-4">🎬</div>
          <p className="text-xl font-bold font-kids">{formData.videoFile ? formData.videoFile.name : 'กดที่นี่เพื่อเลือกวิดีโอ'}</p>
      </div>
      <button type="submit" className={`w-full py-6 rounded-full text-white font-kids text-3xl shadow-xl transition-all border-b-8 ${formData.activityType === 'Sports Day' ? 'bg-gradient-to-r from-orange-400 to-red-500 border-orange-700' : 'bg-gradient-to-r from-cyan-400 to-blue-500 border-cyan-700'}`}>ส่งงานเลย! 🚀</button>
    </form>
  );
};

const TeacherView = ({ submissions, onUpdate, handleUpdateGrade, teacherName }: { submissions: StudentSubmission[], onUpdate: () => void, handleUpdateGrade: (id: number, data: any) => Promise<boolean>, teacherName: string }) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isBulkGrading, setIsBulkGrading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, currentName: '' });
  const [filterActivity, setFilterActivity] = useState('All');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Graded'>('All');
  const [rubric, setRubric] = useState<RubricReview>({ contentAccuracy: 0, participation: 0, presentation: 0, discipline: 0, totalScore: 0, percentage: 0, comment: '', status: 'Pending' });

  const filteredSubmissions = useMemo(() => {
    return submissions.filter(s => {
      const isGraded = s.review?.status === 'Graded';
      const matchesActivity = filterActivity === 'All' || s.activityType === filterActivity;
      const matchesStatus = filterStatus === 'All' || (filterStatus === 'Graded' && isGraded) || (filterStatus === 'Pending' && !isGraded);
      return matchesActivity && matchesStatus;
    });
  }, [submissions, filterActivity, filterStatus]);

  const runAIScore = async (student: StudentSubmission) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `คุณเป็นคุณครูผู้เชี่ยวชาญด้านสุขศึกษาและพลศึกษา ประเมินวิดีโอส่งงานของนักเรียนชื่อ "${student.name}" กิจกรรม: ${student.activityType} ให้คะแนน JSON (0-5) สำหรับ: contentAccuracy, participation, presentation, discipline พร้อม comment ไทยสั้นๆ`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            contentAccuracy: { type: Type.INTEGER }, participation: { type: Type.INTEGER },
            presentation: { type: Type.INTEGER }, discipline: { type: Type.INTEGER },
            comment: { type: Type.STRING }
          },
          required: ["contentAccuracy", "participation", "presentation", "discipline", "comment"]
        }
      }
    });
    return JSON.parse(response.text);
  };

  const handleBulk = async () => {
    const pending = filteredSubmissions.filter(s => s.review?.status !== 'Graded');
    if (pending.length === 0) return;
    setIsBulkGrading(true);
    setBulkProgress({ current: 0, total: pending.length, currentName: '' });
    for (let i = 0; i < pending.length; i++) {
      const sub = pending[i];
      setBulkProgress({ current: i + 1, total: pending.length, currentName: sub.name });
      try {
        const aiResult = await runAIScore(sub);
        const total = aiResult.contentAccuracy + aiResult.participation + aiResult.presentation + aiResult.discipline;
        await handleUpdateGrade(sub.rowId!, { ...aiResult, totalScore: total, percentage: Math.round((total / 20) * 100), status: 'Graded', activityType: sub.activityType });
      } catch (err) { console.error(err); }
    }
    setIsBulkGrading(false);
    onUpdate();
    confetti({ particleCount: 200 });
  };

  const exportCSV = () => {
    const sorted = [...submissions].sort((a,b) => parseInt(a.studentNumber) - parseInt(b.studentNumber));
    const headers = ["เลขที่", "ชื่อ", "ชั้น", "ห้อง", "กิจกรรม", "รวม(20)", "ความเห็น"];
    const rows = sorted.map(s => [s.studentNumber, s.name, s.grade, s.room, s.activityType, s.review?.totalScore || 0, `"${(s.review?.comment || '').replace(/"/g, '""')}"`]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `คะแนน_${new Date().toLocaleDateString()}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {isBulkGrading && <div className="fixed inset-0 z-[200] bg-indigo-900/60 backdrop-blur-sm flex items-center justify-center p-6"><div className="bg-white rounded-[3rem] p-10 text-center shadow-2xl animate-in zoom-in"><div className="text-7xl mb-4">🤖</div><h3 className="text-3xl font-kids text-indigo-600">AI กำลังตรวจงาน...</h3><p className="mb-4 font-kids">ของนักเรียน: {bulkProgress.currentName}</p><div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden"><div className="bg-indigo-500 h-full transition-all" style={{width:`${(bulkProgress.current/bulkProgress.total)*100}%`}}></div></div></div></div>}
      <div className="bg-white p-6 rounded-[2rem] shadow-xl flex flex-col md:flex-row justify-between items-center gap-4">
        <div><h2 className="text-2xl font-kids text-indigo-600">คุณครู: {teacherName}</h2></div>
        <div className="flex flex-wrap justify-center gap-2">
            <button onClick={exportCSV} className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold font-kids">ส่งออกคะแนน</button>
            <button onClick={handleBulk} className="bg-yellow-400 text-indigo-900 px-6 py-3 rounded-xl font-bold font-kids">AI ตรวจทั้งหมด ({filteredSubmissions.filter(s=>s.review?.status!=='Graded').length})</button>
        </div>
      </div>
      <div className="grid gap-4">
        {filteredSubmissions.map(sub => (
          <div key={sub.rowId} className="bg-white p-6 rounded-[2rem] border-4 border-indigo-50 flex flex-col md:flex-row justify-between items-center gap-4">
            <div><p className="font-bold text-lg font-kids">{sub.name} (เลขที่ {sub.studentNumber})</p><p className="text-sm text-gray-400 font-kids">{sub.grade} {sub.room}</p></div>
            <div className="flex gap-2">
                <a href={sub.fileUrl} target="_blank" className="bg-blue-100 text-blue-600 px-4 py-2 rounded-xl font-bold font-kids">ดูวิดีโอ</a>
                <button onClick={() => setEditingId(sub.rowId!)} className="bg-orange-400 text-white px-4 py-2 rounded-xl font-bold font-kids">ตรวจงาน</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const DashboardView = ({ submissions }: { submissions: StudentSubmission[] }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    const graded = submissions.filter(s => s.review?.status === 'Graded');
    const rooms = ['Room 1', 'Room 2', 'Room 3', 'Room 4'];
    const roomAverages = rooms.map(room => {
      const roomSubs = graded.filter(s => s.room === room);
      return roomSubs.length > 0 ? roomSubs.reduce((acc, curr) => acc + (curr.review?.totalScore || 0), 0) / roomSubs.length : 0;
    });

    const chart = new Chart(chartRef.current, {
      type: 'bar',
      data: {
        labels: rooms.map(r => r.replace('Room ', 'ห้อง ')),
        datasets: [{ label: 'คะแนนเฉลี่ย', data: roomAverages, backgroundColor: '#A5B4FC', borderRadius: 10 }]
      },
      options: { responsive: true, scales: { y: { beginAtZero: true, max: 20 } } }
    });
    return () => chart.destroy();
  }, [submissions]);

  return (
    <div className="space-y-8">
        <h2 className="text-3xl font-kids text-indigo-600 text-center">ภาพรวมสถิติ 📊</h2>
        <div className="bg-white p-8 rounded-[3rem] shadow-sm"><canvas ref={chartRef}></canvas></div>
    </div>
  );
};

// --- 3. Main App Component ---

const App = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.STUDENT);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [isTeacher, setIsTeacher] = useState(false);
  const [teacherName, setTeacherName] = useState('');
  
  const gasUrl = 'https://script.google.com/macros/s/AKfycbwt_PZNAxiM5j21McfSrUts-4y_vqoF1vb0fwRHQ3PEwG9jJPH1gM7eUw1PRaxhnDdB_Q/exec';

  const fetchAPI = async (action: string, data: any = {}) => {
    try {
      const response = await fetch(gasUrl, { method: 'POST', mode: 'cors', body: JSON.stringify({ action, data }) });
      return await response.json();
    } catch (e) { return null; }
  };

  const fetchSubmissions = useCallback(async (silent = false) => {
    if (!silent) setStatus(AppStatus.LOADING_DATA);
    const res = await fetchAPI('list');
    if (res?.success) setSubmissions(res.data || []);
    setStatus(AppStatus.IDLE);
  }, []);

  useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

  const handleSubmit = async (data: StudentSubmission) => {
    setStatus(AppStatus.UPLOADING);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = e.target?.result?.toString().split(',')[1];
      const res = await fetchAPI('upload', { ...data, fileData: base64Data, fileName: data.videoFile?.name, mimeType: data.videoFile?.type });
      if (res?.success) {
        setStatus(AppStatus.SUCCESS);
        confetti({ particleCount: 150 });
        fetchSubmissions(true);
      } else {
        alert("เกิดข้อผิดพลาดในการอัปโหลด");
        setStatus(AppStatus.IDLE);
      }
    };
    reader.readAsDataURL(data.videoFile!);
  };

  const handleUpdateGrade = async (rowId: number, rubricData: any) => {
    const res = await fetchAPI('grade', { rowId, ...rubricData });
    if (res?.success) { fetchSubmissions(true); return true; }
    return false;
  };

  const handleLogin = async (user: string, pin: string) => {
    const res = await fetchAPI('login', { username: user, pin: pin });
    if(res?.success) { setIsTeacher(true); setTeacherName(res.teacherName); setCurrentView(AppView.TEACHER); }
    else alert(res?.message || "PIN ไม่ถูกต้อง");
  };

  return (
    <div className="min-h-screen pb-12">
      <header className="w-full h-[70px] bg-white/40 backdrop-blur-md border-b-2 border-white sticky top-0 z-[100] flex items-center justify-center px-8">
        <h1 className="text-xl md:text-2xl font-kids font-bold text-slate-700">วิชา <span className="rainbow-text">สุขศึกษาและพลศึกษา</span></h1>
      </header>
      <div className="max-w-6xl mx-auto px-4 mt-8">
        <Navigation currentView={currentView} setView={setCurrentView} />
        <main className="glass-morphism rounded-[2.5rem] md:rounded-[3.5rem] p-6 md:p-12 min-h-[600px]">
          {status === AppStatus.LOADING_DATA && <div className="text-center py-20 font-kids animate-pulse">กำลังโหลดข้อมูล...</div>}
          {status === AppStatus.UPLOADING && <div className="text-center py-20"><div className="animate-spin text-6xl mb-4">📦</div><p className="text-xl font-kids text-indigo-500">กำลังอัปโหลดงานจ้า...</p></div>}
          {status === AppStatus.SUCCESS && <div className="text-center py-20"><div className="text-9xl mb-4">🥳</div><p className="text-4xl font-kids text-green-500">ส่งงานสำเร็จแล้วจ้า!</p><button onClick={() => setStatus(AppStatus.IDLE)} className="mt-10 bg-green-500 text-white px-10 py-4 rounded-full font-kids text-xl shadow-lg">ส่งเพิ่มอีกไหมจ๊ะ?</button></div>}
          
          {status === AppStatus.IDLE && (
            <>
              {currentView === AppView.STUDENT && <SubmissionForm onSubmit={handleSubmit} />}
              {currentView === AppView.TEACHER && isTeacher && <TeacherView submissions={submissions} teacherName={teacherName} onUpdate={() => fetchSubmissions(true)} handleUpdateGrade={handleUpdateGrade} />}
              {currentView === AppView.TEACHER_LOGIN && !isTeacher && <div className="max-w-md mx-auto py-12 text-center"><h2 className="text-3xl font-kids mb-10">โต๊ะทำงานคุณครู</h2><input type="text" id="t-user" placeholder="ชื่อผู้ใช้" className="w-full p-4 mb-4 rounded-2xl border-2 font-kids" /><input type="password" id="t-pin" placeholder="รหัส PIN" className="w-full p-4 mb-8 rounded-2xl border-2 font-kids" /><button onClick={() => handleLogin((document.getElementById('t-user') as HTMLInputElement).value, (document.getElementById('t-pin') as HTMLInputElement).value)} className="w-full bg-indigo-500 text-white py-5 rounded-2xl font-kids text-xl shadow-xl">เข้าสู่ระบบ</button></div>}
              {currentView === AppView.DASHBOARD && <DashboardView submissions={submissions} />}
              {currentView === AppView.GALLERY && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{submissions.map(s => <div key={s.rowId} className="bg-white p-6 rounded-3xl border-2 border-pink-50 shadow-sm"><div className="text-5xl mb-4 text-center">🎬</div><h3 className="font-bold font-kids text-center">{s.name}</h3><p className="text-xs text-center text-gray-400 font-kids mb-4">{s.grade} {s.room}</p><a href={s.fileUrl} target="_blank" className="block text-center bg-pink-500 text-white py-2 rounded-xl font-kids">ดูวิดีโอ</a></div>)}</div>}
              {currentView === AppView.RESULT && <div className="max-w-md mx-auto text-center"><h2 className="text-3xl font-kids mb-10">ค้นหาคะแนน</h2><input type="number" id="s-no" placeholder="เลขที่ของหนู" className="w-full p-4 mb-4 rounded-2xl border-2 font-kids" /><button onClick={() => {const no = (document.getElementById('s-no') as HTMLInputElement).value; const found = submissions.find(s => s.studentNumber === no); if(found && found.review) alert(`คะแนนของหนูคือ: ${found.review.totalScore}/20\nคุณครูบอกว่า: ${found.review.comment}`); else alert("ไม่พบข้อมูล หรือคุณครูยังไม่ได้ตรวจจ้า");}} className="w-full bg-yellow-500 text-white py-5 rounded-2xl font-kids text-xl shadow-xl">ค้นหาเลย!</button></div>}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}
