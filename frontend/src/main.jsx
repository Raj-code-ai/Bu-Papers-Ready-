import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './store/AuthContext';
import { ThemeProvider } from './store/ThemeContext';
import { InstitutionProvider } from './store/InstitutionContext';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <InstitutionProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </InstitutionProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
