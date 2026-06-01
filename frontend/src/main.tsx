import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Store the entry container element target reference
const rootContainer = document.getElementById('root');

if (!rootContainer) {
  console.error(
    "Critical Error: Failed to find the app mount entry point node ('#root'). " +
    "Ensure that index.html contains an element with this id and that script execution order is correct."
  );
} else {
  // Safe instantiation with a guaranteed DOM container reference element
  ReactDOM.createRoot(rootContainer).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}