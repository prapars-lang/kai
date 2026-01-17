
import React, { useState } from 'react';

interface TeacherLoginProps {
  onLogin: (username: string, pin: string) => void;
}

const TeacherLogin: React.FC<TeacherLoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(username, pin);
  };

  return (
    <div className="max-w-md mx-auto py-12 text-center">
      <div className="text-7xl mb-6">🗝️</div>
      <h2 className="text-4xl font-kids text-indigo-600 mb-4">โต๊ะทำงานคุณครู</h2>
      <p className="text-gray-500 mb-10 text-lg font-semibold italic">"กรุณาระบุชื่อผู้ใช้และรหัสลับ!"</p>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <input 
          type="text" 
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="ชื่อผู้ใช้ (เช่น teacher1)"
          className="w-full p-4 rounded-3xl border-4 border-indigo-100 bg-indigo-50 focus:border-indigo-400 outline-none transition-all text-xl"
        />
        <input 
          type="password" 
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="รหัส PIN (4 หลัก)"
          className="w-full p-4 text-center text-3xl tracking-[0.5rem] rounded-3xl border-4 border-indigo-100 bg-indigo-50 focus:border-indigo-400 outline-none transition-all"
          maxLength={4}
        />
        
        <button 
          type="submit"
          className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-kids text-3xl py-6 rounded-full shadow-xl transition-all transform hover:scale-105 active:scale-95 border-b-8 border-indigo-800"
        >
          เข้าสู่ระบบ! 🚪
        </button>
      </form>
      
      <p className="mt-8 text-indigo-300 text-sm font-bold uppercase tracking-widest">
        สำหรับบุคลากรเท่านั้น
      </p>
    </div>
  );
};

export default TeacherLogin;
