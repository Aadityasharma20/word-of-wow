import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// Import App with error boundary
const root = document.getElementById('app');

if (root) {
    try {
        // Dynamic import to catch any module-level errors
        import('./App').then(({ default: App }) => {
            ReactDOM.createRoot(root).render(
                <React.StrictMode>
                    <App />
                </React.StrictMode>
            );
            console.log('React app mounted successfully');
        }).catch((err) => {
            console.error('Failed to load App:', err);
            root.innerHTML = `<div style="padding:40px;font-family:Arial;color:#dc2626;"><h1>⚠️ App Load Error</h1><pre>${err.message}\n${err.stack}</pre></div>`;
        });
    } catch (err: any) {
        console.error('Fatal error:', err);
        root.innerHTML = `<div style="padding:40px;font-family:Arial;color:#dc2626;"><h1>⚠️ Fatal Error</h1><pre>${err.message}</pre></div>`;
    }
} else {
    document.body.innerHTML = '<h1 style="padding:40px;color:red;">ERROR: #app element not found</h1>';
}
