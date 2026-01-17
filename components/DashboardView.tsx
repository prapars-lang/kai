
import React, { useMemo, useEffect, useRef } from 'react';
import { Chart, ChartConfiguration } from 'chart.js';
import { StudentSubmission } from '../types';

interface DashboardViewProps {
  submissions: StudentSubmission[];
}

const DashboardView: React.FC<DashboardViewProps> = ({ submissions }) => {
  const barChartRef = useRef<HTMLCanvasElement>(null);
  const gradeChartRef = useRef<HTMLCanvasElement>(null);
  const pieChartRef = useRef<HTMLCanvasElement>(null);
  const doughnutChartRef = useRef<HTMLCanvasElement>(null);

  const stats = useMemo(() => {
    const total = submissions.length;
    const graded = submissions.filter(s => s.review?.status === 'Graded');
    const gradedCount = graded.length;
    
    const totalScore = graded.reduce((acc, curr) => acc + (curr.review?.totalScore || 0), 0);
    const avgScore = gradedCount > 0 ? (totalScore / gradedCount).toFixed(1) : '0';

    // Room averages
    const rooms = ['Room 1', 'Room 2', 'Room 3', 'Room 4'];
    const roomPerformance = rooms.map(room => {
      const roomSubs = graded.filter(s => s.room === room);
      const avg = roomSubs.length > 0 
        ? roomSubs.reduce((acc, curr) => acc + (curr.review?.totalScore || 0), 0) / roomSubs.length 
        : 0;
      return { room, avg };
    });

    // Grade averages
    const grades = ['Prathom 5', 'Prathom 6'];
    const gradePerformance = grades.map(grade => {
      const gradeSubs = graded.filter(s => s.grade === grade);
      const avg = gradeSubs.length > 0
        ? gradeSubs.reduce((acc, curr) => acc + (curr.review?.totalScore || 0), 0) / gradeSubs.length
        : 0;
      return { grade, avg };
    });

    // Score distribution (Adjusted for 20-point scale)
    const dist = [
      { label: 'ยอดเยี่ยม (18-20)', count: graded.filter(s => (s.review?.totalScore || 0) >= 18).length, color: '#4ADE80' },
      { label: 'ดีมาก (14-17)', count: graded.filter(s => (s.review?.totalScore || 0) >= 14 && (s.review?.totalScore || 0) < 18).length, color: '#60A5FA' },
      { label: 'ผ่านเกณฑ์ (10-13)', count: graded.filter(s => (s.review?.totalScore || 0) >= 10 && (s.review?.totalScore || 0) < 14).length, color: '#FACC15' },
      { label: 'ควรปรับปรุง (0-9)', count: graded.filter(s => (s.review?.totalScore || 0) < 10).length, color: '#F87171' }
    ];

    return { total, gradedCount, avgScore, roomPerformance, gradePerformance, dist };
  }, [submissions]);

  useEffect(() => {
    let charts: Chart[] = [];

    // Chart 1: Room Avg
    if (barChartRef.current) {
      const config: ChartConfiguration = {
        type: 'bar',
        data: {
          labels: stats.roomPerformance.map(r => r.room),
          datasets: [{
            label: 'คะแนนเฉลี่ยแยกตามห้อง',
            data: stats.roomPerformance.map(r => r.avg),
            backgroundColor: ['#A5B4FC', '#F9A8D4', '#FDE68A', '#6EE7B7'],
            borderRadius: 12,
          }]
        },
        options: { 
          responsive: true,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, max: 20 } }
        }
      };
      charts.push(new Chart(barChartRef.current, config));
    }

    // Chart 2: Grade Avg
    if (gradeChartRef.current) {
      const config: ChartConfiguration = {
        type: 'bar',
        data: {
          labels: stats.gradePerformance.map(g => g.grade === 'Prathom 5' ? 'ป.5' : 'ป.6'),
          datasets: [{
            label: 'คะแนนเฉลี่ยแยกตามชั้น',
            data: stats.gradePerformance.map(g => g.avg),
            backgroundColor: ['#818CF8', '#F472B6'],
            borderRadius: 12,
          }]
        },
        options: { 
          responsive: true,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, max: 20 } }
        }
      };
      charts.push(new Chart(gradeChartRef.current, config));
    }

    // Chart 3: Completion Pie
    if (pieChartRef.current) {
      const config: ChartConfiguration = {
        type: 'pie',
        data: {
          labels: ['ตรวจแล้ว', 'รอตรวจ'],
          datasets: [{
            data: [stats.gradedCount, stats.total - stats.gradedCount],
            backgroundColor: ['#6EE7B7', '#E5E7EB'],
            borderWidth: 0,
          }]
        },
        options: { responsive: true }
      };
      charts.push(new Chart(pieChartRef.current, config));
    }

    // Chart 4: Distribution Doughnut
    if (doughnutChartRef.current) {
      const config: ChartConfiguration = {
        type: 'doughnut',
        data: {
          labels: stats.dist.map(d => d.label),
          datasets: [{
            data: stats.dist.map(d => d.count),
            backgroundColor: stats.dist.map(d => d.color),
            borderWidth: 0,
            hoverOffset: 10
          }]
        },
        options: { 
          responsive: true,
          plugins: { legend: { position: 'bottom' } }
        }
      };
      charts.push(new Chart(doughnutChartRef.current, config));
    }

    return () => {
      charts.forEach(c => c.destroy());
    };
  }, [stats]);

  return (
    <div className="space-y-8 pb-10">
      <div className="text-center">
        <h2 className="text-4xl font-kids text-indigo-600 mb-2">ภาพรวมผลการเรียน 📊</h2>
        <p className="text-gray-400 font-bold uppercase tracking-widest text-sm italic">"ข้อมูลสรุปเพื่อการพัฒนาการเรียนรู้"</p>
      </div>

      {/* Top Stats - Bento Style */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-indigo-50 p-8 rounded-[2.5rem] border-4 border-indigo-100 flex flex-col items-center justify-center text-center">
          <p className="text-5xl mb-2">📦</p>
          <p className="text-4xl font-kids text-indigo-600 leading-none">{stats.total}</p>
          <p className="text-indigo-300 font-bold text-xs mt-2 uppercase">งานทั้งหมด</p>
        </div>
        <div className="bg-green-50 p-8 rounded-[2.5rem] border-4 border-green-100 flex flex-col items-center justify-center text-center">
          <p className="text-5xl mb-2">✅</p>
          <p className="text-4xl font-kids text-green-600 leading-none">{stats.gradedCount}</p>
          <p className="text-green-300 font-bold text-xs mt-2 uppercase">ตรวจเสร็จแล้ว</p>
        </div>
        <div className="bg-yellow-50 p-8 rounded-[2.5rem] border-4 border-yellow-100 flex flex-col items-center justify-center text-center">
          <p className="text-5xl mb-2">🌟</p>
          <p className="text-4xl font-kids text-yellow-600 leading-none">{stats.avgScore}</p>
          <p className="text-yellow-400 font-bold text-xs mt-2 uppercase">คะแนนเฉลี่ย</p>
        </div>
        <div className="bg-pink-50 p-8 rounded-[2.5rem] border-4 border-pink-100 flex flex-col items-center justify-center text-center">
          <p className="text-5xl mb-2">⏰</p>
          <p className="text-4xl font-kids text-pink-600 leading-none">{stats.total - stats.gradedCount}</p>
          <p className="text-pink-300 font-bold text-xs mt-2 uppercase">ยังไม่ได้ตรวจ</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <div className="bg-white p-8 rounded-[3rem] border-4 border-gray-50 shadow-sm">
          <h3 className="text-xl font-bold text-gray-700 mb-6 flex items-center gap-2">
            <span className="text-2xl">🏢</span> คะแนนเฉลี่ยตามห้องเรียน (เต็ม 20)
          </h3>
          <div className="h-64">
            <canvas ref={barChartRef}></canvas>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[3rem] border-4 border-gray-50 shadow-sm">
          <h3 className="text-xl font-bold text-gray-700 mb-6 flex items-center gap-2">
            <span className="text-2xl">🎒</span> คะแนนเฉลี่ยตามระดับชั้น (เต็ม 20)
          </h3>
          <div className="h-64">
            <canvas ref={gradeChartRef}></canvas>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[3rem] border-4 border-gray-50 shadow-sm">
          <h3 className="text-xl font-bold text-gray-700 mb-6 flex items-center gap-2">
            <span className="text-2xl">📈</span> การกระจายของคะแนน
          </h3>
          <div className="h-64">
            <canvas ref={doughnutChartRef}></canvas>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[3rem] border-4 border-gray-50 shadow-sm">
          <h3 className="text-xl font-bold text-gray-700 mb-6 flex items-center gap-2">
            <span className="text-2xl">🍰</span> อัตราการตรวจงาน
          </h3>
          <div className="h-64 flex justify-center">
            <canvas ref={pieChartRef}></canvas>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
