import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { ProfilePage } from './pages/ProfilePage'
import { CreateProgramPage } from './pages/CreateProgramPage'
import { ProgramPage } from './pages/ProgramPage'
import { LibraryPage } from './pages/LibraryPage'
import { SettingsPage } from './pages/SettingsPage'
import { PainPage } from './pages/PainPage'
import { SessionTodayPage } from './pages/SessionTodayPage'
import { ProgressionPage } from './pages/ProgressionPage'
import { MeasuresPage } from './pages/MeasuresPage'
import { HistoryPage } from './pages/HistoryPage'
import { PdfExportPage } from './pages/PdfExportPage'
import { CalendarPage } from './pages/CalendarPage'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/profil" element={<ProfilePage />} />
        <Route path="/creer" element={<CreateProgramPage />} />
        <Route path="/programme" element={<ProgramPage />} />
        <Route path="/bibliotheque" element={<LibraryPage />} />
        <Route path="/douleurs" element={<PainPage />} />
        <Route path="/parametres" element={<SettingsPage />} />
        <Route path="/calendrier" element={<CalendarPage />} />
        <Route path="/seance" element={<SessionTodayPage />} />
        <Route path="/historique" element={<HistoryPage />} />
        <Route path="/progression" element={<ProgressionPage />} />
        <Route path="/mesures" element={<MeasuresPage />} />
        <Route path="/exports" element={<PdfExportPage />} />
      </Routes>
    </Layout>
  )
}
