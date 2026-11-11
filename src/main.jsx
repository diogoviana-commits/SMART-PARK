import React from 'react'
import ReactDOM from 'react-dom/client'
// Fontes do design system, servidas pelo próprio site: funcionam no app instalado, sem internet
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/instrument-sans'
import '@fontsource-variable/jetbrains-mono'
import 'leaflet/dist/leaflet.css'
import './index.css'
import './telas.css'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
