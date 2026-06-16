import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { MonthProvider } from './hooks/useMonth'
import { ToastProvider } from './hooks/useToast'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import History from './pages/History'
import ItemSummary from './pages/ItemSummary'
import GroupSummary from './pages/GroupSummary'
import AIAnalysis from './pages/AIAnalysis'

export default function App() {
  return (
    <BrowserRouter>
      <MonthProvider>
        <ToastProvider>
          <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            <Sidebar />
            <main style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', display: 'flex', flexDirection: 'column' }}>
              <Routes>
                <Route path="/"            element={<Dashboard />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/history"     element={<History />} />
                <Route path="/items"       element={<ItemSummary />} />
                <Route path="/groups"      element={<GroupSummary />} />
                <Route path="/ai"          element={<AIAnalysis />} />
              </Routes>
            </main>
          </div>
        </ToastProvider>
      </MonthProvider>
    </BrowserRouter>
  )
}
