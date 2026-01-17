
import React, { useState, useMemo } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import confetti from "canvas-confetti";
import { StudentSubmission, RubricReview } from '../types';

interface TeacherViewProps {
  submissions: StudentSubmission[];
  onUpdate: () => void;
  handleUpdateGrade: (rowId: number, rubricData: any) => Promise<boolean>;
  rubricCriteria: any[];
  teacherName: string;
  onGenerateAIFeedback: (studentName: string, rubric: RubricReview) => Promise<string>;
}

const TeacherView: React.FC<TeacherViewProps> = ({ submissions, onUpdate, handleUpdateGrade, rubricCriteria, teacherName, onGenerateAIFeedback }) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filterText, setFilterText] = useState('');
  const [filterGrade, setFilterGrade] = useState('All');
  const [filterRoom, setFilterRoom] = useState('All');
  const [filterActivity, setFilterActivity] = useState('Sports Day');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Graded'>('All');
  
  const [isBulkGrading, setIsBulkGrading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, currentName: '' });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [rubric, setRubric] = useState<RubricReview>({
    contentAccuracy: 0, participation: 0, presentation: 0, discipline: 0,
    totalScore: 0, percentage: 0, comment: '', status: 'Pending'
  });

  const [saving, setSaving] = useState(false);
  const [isAutoGrading, setIsAutoGrading] = useState(false);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter(s => {
      const matchesText = s.name.toLowerCase().includes(filterText.toLowerCase()) || 
                         s.studentNumber.includes(filterText);
      const matchesGrade = filterGrade === 'All' || s.grade === filterGrade;
      const matchesRoom = filterRoom === 'All' || s.room === filterRoom;
      const matchesActivity = filterActivity === 'All' || s.activityType === filterActivity;
      
      const isGraded = s.review?.status === 'Graded';
      const matchesStatus = filterStatus === 'All' || 
                           (filterStatus === 'Graded' && isGraded) || 
                           (filterStatus === 'Pending' && !isGraded);

      return matchesText && matchesGrade && matchesRoom && matchesActivity && matchesStatus;
    });
  }, [submissions, filterText, filterGrade, filterRoom, filterActivity, filterStatus]);

  const pendingSubmissions = useMemo(() => 
    filteredSubmissions.filter(s => !s.review || s.review.status !== 'Graded'),
    [filteredSubmissions]
  );

  const startGrading = (sub: StudentSubmission) => {
    setEditingId(sub.rowId);
    setErrorMessage(null);
    setRubric(sub.review || {
      contentAccuracy: 0, participation: 0, presentation: 0, discipline: 0,
      totalScore: 0, percentage: 0, comment: '', status: 'Pending'
    });
    // Auto scroll to editor
    setTimeout(() => {
        document.getElementById(`editor-${sub.rowId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const updateRubricItem = (key: keyof RubricReview, val: any) => {
    setRubric(prev => {
      const next = { ...prev, [key]: val };
      if (typeof val === 'number' && ['contentAccuracy', 'participation', 'presentation', 'discipline'].includes(key)) {
        const total = (next.contentAccuracy || 0) + (next.participation || 0) + (next.presentation || 0) + (next.discipline || 0);
        next.totalScore = total;
        next.percentage = Math.round((total / 20) * 100);
      }
      return next;
    });
  };

  const runAIScore = async (student: StudentSubmission) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `คุณเป็นคุณครูผู้เชี่ยวชาญด้านสุขศึกษาและพลศึกษา ประเมินวิดีโอส่งงานของมนักเรียนชื่อ "${student.name}" 
      กิจกรรม: ${student.activityType === 'Sports Day' ? 'กีฬาสี (ทักษะเคลื่อนไหว)' : 'วันเด็ก (ทักษะสร้างสรรค์)'}
      ระดับชั้น: ${student.grade}
      
      กรุณาให้คะแนน JSON (ค่า 0-5) สำหรับเกณฑ์ดังนี้: 
      1. contentAccuracy (ความถูกต้องของท่าทาง/เนื้อหา)
      2. participation (ความตั้งใจและพยายาม)
      3. presentation (ความน่าสนใจในการนำเสนอ)
      4. discipline (การแต่งกายและกิริยามารยาท)
      พร้อมเขียน comment ภาษาไทยสั้นๆ ที่ให้กำลังใจและแนะนำสิ่งที่ควรพัฒนา`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            contentAccuracy: { type: Type.INTEGER },
            participation: { type: Type.INTEGER },
            presentation: { type: Type.INTEGER },
            discipline: { type: Type.INTEGER },
            comment: { type: Type.STRING }
          },
          required: ["contentAccuracy", "participation", "presentation", "discipline", "comment"]
        }
      }
    });
    return JSON.parse(response.text);
  };

  const handleAutoGrade = async () => {
    const currentStudent = filteredSubmissions.find(s => s.rowId === editingId);
    if (!currentStudent) return;
    setIsAutoGrading(true);
    try {
      const aiResult = await runAIScore(currentStudent);
      const total = aiResult.contentAccuracy + aiResult.participation + aiResult.presentation + aiResult.discipline;
      setRubric(prev => ({ 
        ...prev, 
        ...aiResult, 
        totalScore: total, 
        percentage: Math.round((total / 20) * 100),
        comment: `🤖 [AI ประเมินเบื้องต้น]: ${aiResult.comment}`
      }));
    } catch (error) { setErrorMessage("AI ตรวจไม่สำเร็จจ้า"); } finally { setIsAutoGrading(false); }
  };

  const handleBulkAutoGrade = async () => {
    if (pendingSubmissions.length === 0) return;
    setIsBulkGrading(true);
    setBulkProgress({ current: 0, total: pendingSubmissions.length, currentName: '' });

    for (let i = 0; i < pendingSubmissions.length; i++) {
      const sub = pendingSubmissions[i];
      setBulkProgress(prev => ({ ...prev, current: i + 1, currentName: sub.name }));
      
      try {
        const aiResult = await runAIScore(sub);
        const total = aiResult.contentAccuracy + aiResult.participation + aiResult.presentation + aiResult.discipline;
        await handleUpdateGrade(sub.rowId!, {
          ...aiResult,
          totalScore: total,
          percentage: Math.round((total / 20) * 100),
          status: 'Graded',
          comment: `🤖 [AI Auto-Grade]: ${aiResult.comment}`,
          activityType: sub.activityType
        });
      } catch (err) {
        console.error(`Failed to bulk grade ${sub.name}`, err);
      }
    }

    setIsBulkGrading(false);
    onUpdate();
    confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } });
  };

  const handleSave = async () => {
    const currentStudent = filteredSubmissions.find(s => s.rowId === editingId);
    if (!editingId || !currentStudent) return;
    setSaving(true);
    const success = await handleUpdateGrade(editingId, { 
      ...rubric, 
      status: 'Graded',
      activityType: currentStudent.activityType
    });
    if (success) { setEditingId(null); onUpdate(); }
    setSaving(false);
  };

  const exportToCSV = () => {
    // 1. Sort data by Grade -> Room -> StudentNumber (Numeric)
    const sorted = [...submissions].sort((a, b) => {
      if (a.grade !== b.grade) return a.grade.localeCompare(b.grade);
      if (a.room !== b.room) return a.room.localeCompare(b.room);
      return parseInt(a.studentNumber) - parseInt(b.studentNumber);
    });

    // 2. Prepare headers
    const headers = [
      "เลขที่", "ชื่อ-นามสกุล", "ชั้น", "ห้อง", "กิจกรรม", 
      "คะแนนเนื้อหา (5)", "คะแนนการมีส่วนร่วม (5)", "คะแนนการนำเสนอ (5)", "คะแนนวินัย (5)",
      "รวม (20)", "ร้อยละ", "ความเห็นคุณครู"
    ];

    // 3. Prepare rows
    const rows = sorted.map(s => [
      s.studentNumber,
      s.name,
      s.grade === 'Prathom 5' ? 'ป.5' : 'ป.6',
      s.room.replace('Room ', ''),
      s.activityType === 'Sports Day' ? 'กีฬาสี' : 'วันเด็ก',
      s.review?.contentAccuracy || 0,
      s.review?.participation || 0,
      s.review?.presentation || 0,
      s.review?.discipline || 0,
      s.review?.totalScore || 0,
      s.review?.percentage || 0,
      `"${(s.review?.comment || '').replace(/"/g, '""')}"`
    ]);

    // 4. Combine with BOM for Excel Thai support
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    
    // 5. Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `คะแนนวิชาสุขศึกษา_สรุปรายห้อง_${new Date().toLocaleDateString('th-TH')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const PointSelector = ({ label, icon, current, onSelect }: { label: string, icon: string, current: number, onSelect: (v: number) => void }) => (
    <div className="bg-white p-4 rounded-2xl border-2 border-indigo-50 mb-4 shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <span className="font-bold text-indigo-700 flex items-center gap-2"><span className="text-xl">{icon}</span> {label}</span>
        <span className="bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full text-xs font-bold">{current}/5</span>
      </div>
      <div className="flex gap-2">
        {[0, 1, 2, 3, 4, 5].map(pt => (
          <button key={pt} onClick={() => onSelect(pt)} className={`flex-1 py-3 rounded-xl font-bold transition-all ${current === pt ? 'bg-indigo-500 text-white shadow-lg' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>{pt}</button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Bulk Grading Progress Overlay */}
      {isBulkGrading && (
        <div className="fixed inset-0 z-[200] bg-indigo-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] p-10 max-w-lg w-full text-center shadow-2xl animate-in zoom-in duration-300">
            <div className="text-7xl mb-6 animate-bounce">🤖</div>
            <h3 className="text-3xl font-kids text-indigo-600 mb-2">กำลังให้ AI ช่วยตรวจจ้า...</h3>
            <p className="text-slate-500 font-bold mb-8">กำลังตรวจของ: <span className="text-indigo-500">{bulkProgress.currentName}</span></p>
            
            <div className="w-full bg-slate-100 h-6 rounded-full overflow-hidden mb-4 border-2 border-indigo-50">
              <div 
                className="bg-gradient-to-r from-indigo-400 to-indigo-600 h-full transition-all duration-500"
                style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
              ></div>
            </div>
            <p className="text-sm font-black text-indigo-400">{bulkProgress.current} / {bulkProgress.total} คน</p>
          </div>
        </div>
      )}

      {/* Header & Stats Dashboard */}
      <div className="bg-white rounded-[3rem] p-8 shadow-xl border-4 border-indigo-50">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-6 mb-8">
            <div className="flex items-center gap-6">
            <div className="text-6xl bg-indigo-100 p-4 rounded-3xl shadow-inner">👩‍🏫</div>
            <div>
                <h2 className="text-3xl font-kids text-indigo-600">สวัสดีคุณครู {teacherName}</h2>
                <p className="text-slate-400 font-bold italic">ผู้จัดการเรียนรู้ วิชาสุขศึกษาและพลศึกษา</p>
            </div>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
                <button 
                    onClick={exportToCSV}
                    className="bg-emerald-500 text-white px-8 py-4 rounded-2xl font-bold shadow-lg hover:bg-emerald-600 transition-all flex items-center gap-2 group"
                >
                    <span className="text-2xl group-hover:scale-110 transition-transform">📊</span>
                    ส่งออกคะแนน (CSV)
                </button>
                {pendingSubmissions.length > 0 && (
                    <button 
                        onClick={handleBulkAutoGrade}
                        className="bg-yellow-400 text-indigo-900 px-8 py-4 rounded-2xl font-bold shadow-lg hover:bg-yellow-300 transition-all flex items-center gap-2 group"
                    >
                        <span className="text-2xl group-hover:rotate-12 transition-transform">🤖</span>
                        ตรวจงานที่เหลือด้วย AI ({pendingSubmissions.length})
                    </button>
                )}
            </div>
        </div>

        {/* Filters and Status Tabs */}
        <div className="bg-indigo-50/50 p-6 rounded-[2rem] border-2 border-indigo-100 space-y-6">
            <div className="flex flex-wrap justify-center gap-3 bg-white/60 p-2 rounded-3xl border border-indigo-50 max-w-fit mx-auto">
                {[
                    {id: 'All', label: 'งานทั้งหมด', icon: '📁'},
                    {id: 'Pending', label: 'รอตรวจ', icon: '⏳'},
                    {id: 'Graded', label: 'ตรวจแล้ว', icon: '✅'}
                ].map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setFilterStatus(tab.id as any)}
                        className={`px-6 py-2.5 rounded-2xl font-bold transition-all flex items-center gap-2 ${filterStatus === tab.id ? 'bg-indigo-500 text-white shadow-md' : 'text-indigo-400 hover:bg-white'}`}
                    >
                        <span>{tab.icon}</span> {tab.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                    <label className="block text-[10px] font-black text-indigo-300 mb-2 ml-2 uppercase tracking-widest">ค้นหากิจกรรม</label>
                    <select value={filterActivity} onChange={(e) => setFilterActivity(e.target.value)} className="w-full p-3 rounded-2xl bg-white border-2 border-indigo-100 font-bold outline-none cursor-pointer">
                        <option value="Sports Day">งานกีฬาสี 🏃</option>
                        <option value="Children Day">งานวันเด็ก 🎈</option>
                        <option value="All">ทุกกิจกรรม</option>
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-black text-indigo-300 mb-2 ml-2 uppercase tracking-widest">ชื่อ/เลขที่</label>
                    <input type="text" placeholder="พิมพ์เพื่อค้นหา..." value={filterText} onChange={(e) => setFilterText(e.target.value)} className="w-full p-3 rounded-2xl bg-white border-2 border-indigo-100 outline-none font-bold"/>
                </div>
                <div>
                    <label className="block text-[10px] font-black text-indigo-300 mb-2 ml-2 uppercase tracking-widest">ระดับชั้น</label>
                    <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)} className="w-full p-3 rounded-2xl bg-white border-2 border-indigo-100 outline-none font-bold cursor-pointer">
                        <option value="All">ทุกชั้น</option>
                        <option value="Prathom 5">ป.5</option>
                        <option value="Prathom 6">ป.6</option>
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-black text-indigo-300 mb-2 ml-2 uppercase tracking-widest">ห้องเรียน</label>
                    <select value={filterRoom} onChange={(e) => setFilterRoom(e.target.value)} className="w-full p-3 rounded-2xl bg-white border-2 border-indigo-100 outline-none font-bold cursor-pointer">
                        <option value="All">ทุกห้อง</option>
                        {[1,2,3,4].map(r => <option key={r} value={`Room ${r}`}>ห้อง {r}</option>)}
                    </select>
                </div>
            </div>
        </div>
      </div>

      <div className="grid gap-6">
        {filteredSubmissions.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[3rem] border-4 border-dashed border-indigo-50 shadow-inner">
             <p className="text-7xl mb-6">🏜️</p>
             <p className="text-indigo-300 font-bold text-xl italic">ไม่พบรายการที่คุณครูค้นหาจ้า</p>
          </div>
        ) : filteredSubmissions.map((sub) => (
          <div key={sub.rowId} id={`editor-${sub.rowId}`} className={`p-8 rounded-[3.5rem] border-4 transition-all relative overflow-hidden ${sub.review?.status === 'Graded' ? 'border-green-100 bg-white' : 'bg-white border-indigo-100 shadow-xl'}`}>
            
            {/* Status Decoration */}
            {sub.review?.status === 'Graded' ? (
                <div className="absolute -top-1 -right-1 bg-green-500 text-white px-8 py-2 rounded-bl-[2rem] font-bold text-xs shadow-md">ตรวจแล้ว ✅</div>
            ) : (
                <div className="absolute -top-1 -right-1 bg-orange-400 text-white px-8 py-2 rounded-bl-[2rem] font-bold text-xs shadow-md animate-pulse">รอตรวจ ⏳</div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-5">
                <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center text-4xl shadow-lg border-2 ${sub.activityType === 'Sports Day' ? 'bg-orange-100 border-orange-200' : 'bg-cyan-100 border-cyan-200'}`}>
                   {sub.activityType === 'Sports Day' ? '🏃' : '🎈'}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-700 flex items-center gap-3">
                    {sub.name}
                    {sub.review?.comment?.includes('🤖') && <span className="text-xl" title="AI ช่วยตรวจ">🤖</span>}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    <span className="bg-indigo-50 text-indigo-500 px-4 py-1 rounded-full text-xs font-black">เลขที่ {sub.studentNumber}</span>
                    <span className="bg-slate-50 text-slate-400 px-4 py-1 rounded-full text-xs font-bold">{sub.grade === 'Prathom 5' ? 'ป.5' : 'ป.6'} | {sub.room.replace('Room ','ห้อง ')}</span>
                    <span className={`px-4 py-1 rounded-full text-xs font-bold ${sub.activityType === 'Sports Day' ? 'bg-orange-50 text-orange-400' : 'bg-cyan-50 text-cyan-400'}`}>
                        {sub.activityType === 'Sports Day' ? 'กิจกรรมกีฬาสี' : 'กิจกรรมวันเด็ก'}
                    </span>
                  </div>
                </div>
              </div>

              {sub.review?.status === 'Graded' && (
                  <div className="flex items-center gap-4 bg-green-50 px-6 py-3 rounded-3xl border-2 border-green-100">
                    <div className="text-center">
                        <p className="text-[10px] font-black text-green-400 uppercase">คะแนน</p>
                        <p className="text-2xl font-kids text-green-600">{sub.review.totalScore}/20</p>
                    </div>
                  </div>
              )}

              <div className="flex gap-3">
                <a href={sub.fileUrl} target="_blank" className="bg-indigo-500 text-white px-8 py-3 rounded-2xl font-bold shadow-lg hover:bg-indigo-600 transition-all flex items-center gap-2 group">
                  <span className="group-hover:scale-110 transition-transform">📺</span> <span>ดูวิดีโอ</span>
                </a>
                <button onClick={() => startGrading(sub)} className="bg-orange-400 text-white px-8 py-3 rounded-2xl font-bold shadow-lg hover:bg-orange-500 transition-all flex items-center gap-2 group">
                  <span className="group-hover:rotate-12 transition-transform">✍️</span> <span>{sub.review?.status === 'Graded' ? 'แก้ไขคะแนน' : 'เริ่มตรวจงาน'}</span>
                </button>
              </div>
            </div>

            {editingId === sub.rowId && (
              <div className="mt-8 p-8 bg-indigo-50 rounded-[2.5rem] border-4 border-indigo-100 animate-in slide-in-from-top duration-500 shadow-inner">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                   <h4 className="text-xl font-kids text-indigo-700 flex items-center gap-2">
                     <span className="text-2xl">🎨</span> แบบประเมินผลงาน
                   </h4>
                   <button 
                    onClick={handleAutoGrade} 
                    disabled={isAutoGrading} 
                    className="bg-yellow-400 text-indigo-900 px-6 py-3 rounded-2xl font-black text-sm shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <span>{isAutoGrading ? '🪄 AI กำลังวิเคราะห์...' : '🪄 ให้ AI ช่วยประเมินเบื้องต้น'}</span>
                  </button>
                </div>
                
                {errorMessage && <div className="mb-4 text-red-500 font-bold bg-red-50 p-3 rounded-xl border border-red-100">⚠️ {errorMessage}</div>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <PointSelector label="เนื้อหา/ความถูกต้อง" icon="✅" current={rubric.contentAccuracy} onSelect={(v) => updateRubricItem('contentAccuracy', v)}/>
                  <PointSelector label="ความตั้งใจ/พยายาม" icon="🤝" current={rubric.participation} onSelect={(v) => updateRubricItem('participation', v)}/>
                  <PointSelector label="เทคนิคการนำเสนอ" icon="🎤" current={rubric.presentation} onSelect={(v) => updateRubricItem('presentation', v)}/>
                  <PointSelector label="วินัย/กิริยามารยาท" icon="📏" current={rubric.discipline} onSelect={(v) => updateRubricItem('discipline', v)}/>
                </div>
                
                <div className="mt-6 space-y-2">
                  <label className="block text-xs font-black text-indigo-300 ml-4 uppercase tracking-tighter">คำชมและคำแนะนำจากคุณครู</label>
                  <textarea 
                    value={rubric.comment} 
                    onChange={(e) => updateRubricItem('comment', e.target.value)} 
                    className="w-full p-6 rounded-[2rem] h-32 border-4 border-indigo-100 outline-none focus:border-indigo-300 shadow-inner bg-white text-gray-700 font-medium text-sm" 
                    placeholder="เขียนสิ่งที่คุณครูอยากบอกกับนักเรียนคนนี้..."
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mt-8">
                  <button 
                    onClick={handleSave} 
                    disabled={saving} 
                    className="flex-1 bg-indigo-500 text-white font-kids text-2xl py-5 rounded-[2rem] shadow-xl border-b-8 border-indigo-700 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50"
                  >
                    {saving ? 'กำลังส่งข้อมูล...' : 'บันทึกคะแนนเลย! 💾'}
                  </button>
                  <button 
                    onClick={() => setEditingId(null)} 
                    className="bg-white text-gray-400 px-10 py-5 rounded-[2rem] border-4 border-gray-100 font-bold hover:bg-gray-50 transition-all"
                  >
                    ย่อเก็บ
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeacherView;
