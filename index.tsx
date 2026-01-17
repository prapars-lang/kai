
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx'; // ระบุนามสกุลไฟล์ให้ชัดเจนเพื่อช่วย Babel

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
} else {
    console.error("Fatal Error: Could not find root container.");
}
