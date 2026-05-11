import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import AdminApp from './admin/AdminApp'

const isAdmin2Route = window.location.pathname.startsWith('/admin2') || new URLSearchParams(window.location.search).has('admin2')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isAdmin2Route ? <AdminApp /> : <App />}
  </React.StrictMode>,
)
