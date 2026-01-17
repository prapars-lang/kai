
import React, { useState, useMemo } from 'react';
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
  
  // Rubric State
  const [rubric, setRubric] = useState<RubricReview>({
    contentAccuracy: 0,
    participation: 0,
    presentation: 0,
    discipline: 0,
    totalScore: 0,
    percentage: 0,
    comment: '',
    status: 'Pending'
  });

  const [saving, setSaving] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter(s => {
      const matchesText = s.name.toLowerCase().includes(filterText.toLowerCase()) || 
                         s.studentNumber.includes(filterText);
      const matchesGrade = filterGrade === 'All' || s.grade === filterGrade;
      const matchesRoom = filterRoom === 'All' || s.room === filterRoom;
      return matchesText && matchesGrade && matchesRoom;
    });
  }, [submissions, filterText, filterGrade, filterRoom]);

  const currentStudentName = useMemo(() => {
    return submissions.find(s => s.rowId === editingId)?.name || '';
  }, [submissions, editingId]);

  const startGrading = (sub: StudentSubmission) => {
    setEditingId(sub.rowId);
    if (sub.review) {
      setRubric(sub.review);
    } else {
      setRubric({
        contentAccuracy: 0,
        participation: 0,
        presentation: 0,
        discipline: 0,
        totalScore: 0,
        percentage: 0,
        comment: '',
        status: 'Pending'
      });
    }
  };

  const updateRubricItem = (key: keyof RubricReview, val: any) => {
    setRubric(prev => {
      const next = { ...prev, [key]: val };
      if (typeof val === 'number' && ['contentAccuracy', 'participation', 'presentation', 'discipline'].includes(key)) {
        const total = (next.contentAccuracy || 0) + 
                     (next.participation || 0) + 
                     (next.presentation || 0) + 
                     (next.discipline || 0);
        next.totalScore = total;
        next.percentage = Math.round((total / 20) * 100);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!editingId) return;
    setSaving(true);
    const success = await handleUpdateGrade(editingId, { ...rubric, status: 'Graded' });
    setSaving(false);
    if (success) setEditingId(null);
  };

  const handleAIFeedback = async () => {
    setIsGeneratingAI(true);
    const feedback = await onGenerateAIFeedback(currentStudentName, rubric);
    updateRubricItem('comment', feedback);
    setIsGeneratingAI(false);
  };

  const handlePrintIndividual = (sub: StudentSubmission) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>เกียรติบัตร - ${sub.name}</title>
          <link href="https://fonts.googleapis.com/css2?family=Fredoka+One&family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Sarabun', sans-serif; padding: 40px; text-align: center; color: #333; }
            .certificate { border: 15px solid #4F46E5; padding: 50px; border-radius: 30px; position: relative; }
            .trophy { font-size: 80px; margin-bottom: 20px; }
            h1 { font-family: 'Fredoka One', cursive; color: #4F46E5; font-size: 40px; margin-bottom: 10px; }
            .student-name { font-size: 32px; font-weight: bold; margin: 20px 0; border-bottom: 2px solid #EEE; display: inline-block; padding-bottom: 5px; }
            .details { font-size: 18px; color: #666; margin-bottom: 30px; }
            .score-box { background: #F3F4F6; padding: 20px; border-radius: 20px; display: inline-block; min-width: 200px; margin-bottom: 30px; }
            .score-val { font-size: 48px; font-weight: bold; color: #4F46E5; }
            .comment { font-style: italic; color: #444; background: #EEF2FF; padding: 20px; border-radius: 15px; margin-top: 20px; }
            .footer { margin-top: 50px; font-weight: bold; color: #999; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="certificate">
            <div class="trophy">🏆</div>
            <h1>Sports Day Super Star!</h1>
            <p>ขอมอบเกียรติบัตรฉบับนี้ให้เพื่อแสดงว่า</p>
            <div class="student-name">${sub.name}</div>
            <div class="details">เลขที่ ${sub.studentNumber} | ${sub.grade} | ${sub.room}</div>
            
            <div class="score-box">
              <div class="score-val">${sub.review?.totalScore}/20</div>
              <div>คะแนนความสำเร็จ</div>
            </div>

            <div class="comment">
              " ${sub.review?.comment || 'ทำผลงานออกมาได้ยอดเยี่ยมมากจ๊ะ!'} "
            </div>

            <div class="footer">
              ครูผู้สอน: ${teacherName}<br>
              วันที่ออกรายงาน: ${new Date().toLocaleDateString('th-TH')}
            </div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handlePrintRoomSummary = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>สรุปคะแนน - ${filterGrade} ${filterRoom}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            h1 { text-align: center; color: #4F46E5; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #4F46E5; color: white; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .total { font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>สรุปผลการส่งงานกิจกรรมกีฬาสี 2568</h1>
          <p><strong>ระดับชั้น:</strong> ${filterGrade === 'All' ? 'ทุกระดับชั้น' : filterGrade}</p>
          <p><strong>ห้องเรียน:</strong> ${filterRoom === 'All' ? 'ทุกห้องเรียน' : filterRoom}</p>
          
          <table>
            <thead>
              <tr>
                <th>ลำดับ</th>
                <th>เลขที่</th>
                <th>ชื่อ-นามสกุล</th>
                <th>ระดับชั้น</th>
                <th>ห้อง</th>
                <th>คะแนน (/20)</th>
                <th>ร้อยละ</th>
              </tr>
            </thead>
            <tbody>
              ${filteredSubmissions.map((sub, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${sub.studentNumber}</td>
                  <td>${sub.name}</td>
                  <td>${sub.grade}</td>
                  <td>${sub.room}</td>
                  <td class="total">${sub.review?.totalScore ?? '-'}</td>
                  <td>${sub.review?.percentage ?? '-'}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <p style="margin-top: 30px; text-align: right;">ผู้ออกรายงาน: ${teacherName} | วันที่: ${new Date().toLocaleDateString('th-TH')}</p>
          <script>window.print();</script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const PointSelector = ({ label, icon, current, onSelect }: { label: string, icon: string, current: number, onSelect: (v: number) => void }) => (
    <div className="bg-white p-4 rounded-2xl border-2 border-indigo-50 mb-4 shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <span className="font-bold text-indigo-700 flex items-center gap-2">
          <span className="text-xl">{icon}</span> {label}
        </span>
        <span className="bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full text-xs font-bold">{current}/5 คะแนน</span>
      </div>
      <div className="flex gap-2">
        {[0, 1, 2, 3, 4, 5].map(pt => (
          <button
            key={pt}
            onClick={() => onSelect(pt)}
            className={`flex-1 py-3 rounded-xl font-bold transition-all ${
              current === pt 
                ? 'bg-indigo-500 text-white scale-110 shadow-lg' 
                : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
            }`}
          >
            {pt}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Teacher Greeting */}
      <div className="bg-indigo-600 text-white p-8 rounded-[3rem] shadow-xl flex items-center gap-6 animate-in slide-in-from-left duration-500">
        <div className="text-6xl">👩‍🏫</div>
        <div>
          <h2 className="text-3xl font-kids">สวัสดีครับ/ค่ะ {teacherName}</h2>
          <p className="text-indigo-100 font-bold">วันนี้มีงานวิดีโอกีฬาสีจากเด็กๆ รอให้คุณครูตรวจอยู่เพียบเลย!</p>
        </div>
      </div>

      {/* Filtering Header */}
      <div className="bg-indigo-50 p-6 rounded-[2rem] border-4 border-indigo-100 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2 ml-2">ค้นหานักเรียน</label>
            <input 
              type="text" 
              placeholder="พิมพ์ชื่อหรือเลขที่..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full p-3 rounded-2xl bg-white border-2 border-indigo-100 focus:border-indigo-400 outline-none font-bold text-indigo-600"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2 ml-2">ระดับชั้น</label>
            <select 
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
              className="w-full p-3 rounded-2xl bg-white border-2 border-indigo-100 outline-none"
            >
              <option value="All">ทุกระดับชั้น</option>
              <option value="Prathom 5">ป.5</option>
              <option value="Prathom 6">ป.6</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2 ml-2">ห้องเรียน</label>
            <select 
              value={filterRoom}
              onChange={(e) => setFilterRoom(e.target.value)}
              className="w-full p-3 rounded-2xl bg-white border-2 border-indigo-100 outline-none"
            >
              <option value="All">ทุกห้องเรียน</option>
              <option value="Room 1">ห้อง 1</option>
              <option value="Room 2">ห้อง 2</option>
              <option value="Room 3">ห้อง 3</option>
              <option value="Room 4">ห้อง 4</option>
            </select>
          </div>
        </div>
        
        <div className="flex justify-end pt-2">
          <button 
            onClick={handlePrintRoomSummary}
            className="flex items-center gap-2 bg-white text-indigo-600 px-6 py-2.5 rounded-2xl font-bold border-2 border-indigo-100 hover:bg-indigo-50 transition-all shadow-sm"
          >
            📋 พิมพ์สรุปคะแนนรายห้อง
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center px-4">
        <h2 className="text-3xl font-kids text-indigo-600">กระดานตรวจงานกีฬาสี 📝</h2>
        <span className="bg-indigo-100 text-indigo-600 px-4 py-1 rounded-full font-bold text-sm">
          พบการส่งงาน {filteredSubmissions.length} รายการ
        </span>
      </div>
      
      {filteredSubmissions.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-[3rem] border-4 border-dashed border-gray-200">
          <p className="text-6xl mb-4">🔦</p>
          <p className="text-2xl text-gray-400 font-bold">ไม่พบข้อมูลการส่งงาน ลองเปลี่ยนตัวกรองดูสิ!</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredSubmissions.map((sub) => (
            <div key={sub.rowId} className={`p-8 rounded-[3rem] border-4 transition-all overflow-hidden ${sub.review?.status === 'Graded' ? 'border-green-100 bg-green-50 shadow-sm' : 'border-indigo-100 bg-white shadow-xl'}`}>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-inner ${sub.review?.status === 'Graded' ? 'bg-green-200' : 'bg-indigo-100'}`}>
                    {sub.review?.status === 'Graded' ? '🏆' : '🎬'}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">{sub.name}</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="text-xs bg-indigo-500 text-white px-2 py-0.5 rounded-lg font-bold">เลขที่ {sub.studentNumber}</span>
                      <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-lg font-bold">{sub.grade}</span>
                      <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-lg font-bold">{sub.room}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                  <a 
                    href={sub.fileUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 md:flex-none text-center bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-blue-100"
                  >
                    ดูวิดีโอ 📺
                  </a>
                  {sub.review?.status === 'Graded' && (
                    <button 
                      onClick={() => handlePrintIndividual(sub)}
                      className="flex-1 md:flex-none bg-indigo-100 text-indigo-600 hover:bg-indigo-200 px-6 py-3 rounded-2xl font-bold transition-all"
                    >
                      พิมพ์เกียรติบัตร 🏆
                    </button>
                  )}
                  <button 
                    onClick={() => startGrading(sub)}
                    className="flex-1 md:flex-none bg-orange-400 hover:bg-orange-500 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-orange-100"
                  >
                    {sub.review?.status === 'Graded' ? 'แก้ไขคะแนน' : 'เริ่มตรวจงาน ✨'}
                  </button>
                </div>
              </div>

              {sub.review?.status === 'Graded' && editingId !== sub.rowId && (
                <div className="mt-6 pt-6 border-t-2 border-green-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-white p-4 rounded-2xl flex-1 text-center shadow-sm border border-green-200">
                      <p className="text-xs font-bold text-green-400 uppercase">คะแนนรวม</p>
                      <p className="text-3xl font-kids text-green-600">{sub.review.totalScore}/20</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl flex-1 text-center shadow-sm border border-green-200">
                      <p className="text-xs font-bold text-green-400 uppercase">คิดเป็นร้อยละ</p>
                      <p className="text-3xl font-kids text-green-600">{sub.review.percentage}%</p>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-2xl shadow-sm border border-green-200 italic text-gray-600 flex items-center">
                    "{sub.review.comment || 'ไม่มีข้อเสนอแนะ'}"
                  </div>
                </div>
              )}

              {editingId === sub.rowId && (
                <div className="mt-8 p-8 bg-indigo-50 rounded-[2.5rem] border-4 border-indigo-200 animate-in zoom-in duration-300">
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="text-2xl font-kids text-indigo-700">เกณฑ์การประเมิน (Rubric) 🎨</h4>
                    <div className="text-right">
                      <div className="text-3xl font-kids text-indigo-600">{rubric.totalScore}/20</div>
                      <div className="text-sm font-bold text-indigo-400 uppercase">{rubric.percentage}% คะแนน</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                    <PointSelector 
                      label={rubricCriteria[0]?.name || "ความถูกต้อง"} 
                      icon={rubricCriteria[0]?.icon || "✅"} 
                      current={rubric.contentAccuracy} 
                      onSelect={(v) => updateRubricItem('contentAccuracy', v)}
                    />
                    <PointSelector 
                      label={rubricCriteria[1]?.name || "การมีส่วนร่วม"} 
                      icon={rubricCriteria[1]?.icon || "🤝"} 
                      current={rubric.participation} 
                      onSelect={(v) => updateRubricItem('participation', v)}
                    />
                    <PointSelector 
                      label={rubricCriteria[2]?.name || "การนำเสนอ"} 
                      icon={rubricCriteria[2]?.icon || "🎤"} 
                      current={rubric.presentation} 
                      onSelect={(v) => updateRubricItem('presentation', v)}
                    />
                    <PointSelector 
                      label={rubricCriteria[3]?.name || "ความมีวินัย"} 
                      icon={rubricCriteria[3]?.icon || "📏"} 
                      current={rubric.discipline} 
                      onSelect={(v) => updateRubricItem('discipline', v)}
                    />
                  </div>

                  <div className="mt-6">
                    <div className="flex justify-between items-end mb-2 px-2">
                      <label className="block text-sm font-bold text-indigo-600">คำชื่นชมและข้อเสนอแนะ 💬</label>
                      <button 
                        onClick={handleAIFeedback}
                        disabled={isGeneratingAI}
                        className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-4 py-1.5 rounded-xl text-xs font-bold shadow-md hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100"
                      >
                        {isGeneratingAI ? '⌛ AI กำลังคิด...' : '✨ ขอคำแนะนำจาก AI'}
                      </button>
                    </div>
                    <textarea 
                      value={rubric.comment}
                      onChange={(e) => updateRubricItem('comment', e.target.value)}
                      className={`w-full p-4 rounded-2xl border-2 border-indigo-100 focus:border-indigo-400 outline-none h-32 text-gray-700 transition-all ${isGeneratingAI ? 'opacity-50 animate-pulse' : ''}`}
                      placeholder="เก่งมากเลยครับ! ลองเพิ่มท่าทางการเคลื่อนไหวอีกนิดจะยอดเยี่ยมเลย"
                    />
                  </div>

                  <div className="flex gap-4 mt-8">
                    <button 
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white font-kids text-2xl py-5 rounded-3xl transition-all disabled:opacity-50 shadow-xl shadow-green-100 border-b-8 border-green-700"
                    >
                      {saving ? 'กำลังบันทึก...' : 'บันทึกคะแนน! ✅'}
                    </button>
                    <button 
                      onClick={() => setEditingId(null)}
                      className="bg-white hover:bg-gray-50 text-gray-400 font-bold px-8 rounded-3xl transition-all border-4 border-gray-100"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherView;