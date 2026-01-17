
import React, { useState, useMemo, useEffect } from 'react';
import { StudentSubmission } from '../types';

interface ResultCheckerProps {
  submissions: StudentSubmission[];
  refreshData?: () => void;
}

const ResultChecker: React.FC<ResultCheckerProps> = ({ submissions, refreshData }) => {
  const [searchNo, setSearchNo] = useState('');
  const [searchGrade, setSearchGrade] = useState('Prathom 5');
  const [searchRoom, setSearchRoom] = useState('Room 1');
  const [hasSearched, setHasSearched] = useState(false);

  const result = useMemo(() => {
    if (!hasSearched) return null;
    return submissions.find(s => 
      s.studentNumber === searchNo && 
      s.grade === searchGrade && 
      s.room === searchRoom
    );
  }, [submissions, searchNo, searchGrade, searchRoom, hasSearched]);

  // If student is waiting for result, refresh data every 20 seconds
  useEffect(() => {
    let interval: number;
    if (hasSearched && result && !result.review && refreshData) {
      interval = window.setInterval(() => {
        refreshData();
      }, 20000);
    }
    return () => clearInterval(interval);
  }, [hasSearched, result, refreshData]);

  // Notify student if review just arrived
  const prevReviewRef = React.useRef(result?.review);
  useEffect(() => {
    if (result?.review && !prevReviewRef.current && hasSearched) {
      if ("Notification" in window && Notification.permission === 'granted') {
        new Notification("คุณครูตรวจงานให้แล้วจ้า!", {
          body: `หนูได้คะแนน ${result.review.totalScore}/20 จ๊ะ! เก่งมาก`,
          icon: 'https://img2.pic.in.th/-23.png'
        });
      }
    }
    prevReviewRef.current = result?.review;
  }, [result?.review, hasSearched]);

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-4">
      <div className="text-center">
        <div className="text-7xl mb-4">🔍</div>
        <h2 className="text-4xl font-kids text-yellow-600">ค้นหาคะแนนของหนู</h2>
        <p className="text-gray-500 font-bold italic">"กรอกข้อมูลเพื่อดูผลงานและคำชมจากคุณครูนะจ๊ะ"</p>
      </div>

      <div className="bg-yellow-50 p-8 rounded-[3rem] border-4 border-yellow-200 shadow-xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-yellow-700 mb-2 ml-2">เลขที่ของหนู</label>
            <input 
              type="number" 
              value={searchNo}
              onChange={(e) => { setSearchNo(e.target.value); setHasSearched(false); }}
              className="w-full p-4 rounded-2xl bg-white border-2 border-yellow-200 outline-none text-xl font-bold text-yellow-700 focus:border-yellow-400"
              placeholder="เลขที่..."
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-bold text-yellow-700 mb-2 ml-2">ชั้น</label>
              <select 
                value={searchGrade}
                onChange={(e) => { setSearchGrade(e.target.value); setHasSearched(false); }}
                className="w-full p-4 rounded-2xl bg-white border-2 border-yellow-200 outline-none font-bold"
              >
                <option value="Prathom 5">ป.5</option>
                <option value="Prathom 6">ป.6</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-bold text-yellow-700 mb-2 ml-2">ห้อง</label>
              <select 
                value={searchRoom}
                onChange={(e) => { setSearchRoom(e.target.value); setHasSearched(false); }}
                className="w-full p-4 rounded-2xl bg-white border-2 border-yellow-200 outline-none font-bold"
              >
                <option value="Room 1">1</option>
                <option value="Room 2">2</option>
                <option value="Room 3">3</option>
                <option value="Room 4">4</option>
              </select>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setHasSearched(true)}
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-kids text-2xl py-5 rounded-2xl shadow-lg transition-all border-b-8 border-yellow-700 active:border-b-0 active:translate-y-1"
        >
          ดูคะแนนของฉัน! ✨
        </button>
      </div>

      {hasSearched && (
        <div className="animate-in fade-in zoom-in duration-500">
          {!result ? (
            <div className="text-center p-12 bg-white rounded-[3rem] border-4 border-dashed border-gray-200">
              <p className="text-6xl mb-4">🏜️</p>
              <p className="text-xl text-gray-400 font-bold">ไม่พบข้อมูล... หนูส่งวิดีโอหรือยังจ๊ะ?</p>
            </div>
          ) : !result.review ? (
            <div className="text-center p-12 bg-blue-50 rounded-[3rem] border-4 border-blue-200">
              <p className="text-6xl mb-4">🎬</p>
              <p className="text-2xl text-blue-600 font-bold">คุณครูได้รับวิดีโอแล้ว!</p>
              <p className="text-blue-400 font-bold mt-2">กำลังรอคุณครูตรวจอยู่นะจ๊ะ อดใจรออีกนิดเดียว ✨</p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.1s]"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.2s]"></div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-10 rounded-[4rem] border-8 border-green-200 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 text-7xl opacity-20">🏆</div>
              <h3 className="text-3xl font-kids text-green-600 mb-6">เก่งมากเลย {result.name}!</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-green-50 p-6 rounded-3xl text-center shadow-inner">
                  <p className="text-xs font-bold text-green-400 uppercase">คะแนนที่ได้</p>
                  <p className="text-5xl font-kids text-green-600">{result.review.totalScore}/20</p>
                </div>
                <div className="bg-green-50 p-6 rounded-3xl text-center shadow-inner">
                  <p className="text-xs font-bold text-green-400 uppercase">คิดเป็นร้อยละ</p>
                  <p className="text-5xl font-kids text-green-600">{result.review.percentage}%</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-bold text-green-500 uppercase tracking-widest ml-2">คำแนะนำจากคุณครู 💬</p>
                <div className="bg-yellow-50 p-8 rounded-[2rem] border-l-8 border-yellow-400 italic text-xl text-gray-700 leading-relaxed shadow-inner">
                  "{result.review.comment}"
                </div>
              </div>

              <div className="mt-8 pt-8 border-t-2 border-dashed border-green-100 text-center">
                <p className="text-green-400 font-bold">ภูมิใจในตัวหนูที่สุดเลย! 🌈✨</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResultChecker;
