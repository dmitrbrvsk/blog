import React from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './components/app';

const targetElement = document.getElementById('react-app');

const root = createRoot(targetElement!);

if (process.env.NODE_ENV !== 'production' && module.hot) {
    root.render(<App />);

    module.hot.accept('./components/app', () => {
        const { App: NextApp } = require('./components/app') as { App: typeof App };

        root.render(<NextApp />);
    });
} else {
    root.render(<App />);
}

if ('serviceWorker' in navigator) {
    void navigator.serviceWorker.register('/assets/worker.js');
}
