import { Routes, Route } from 'react-router-dom'
import DiagnosisForm from './components/DiagnosisForm'
import ReportView from './components/ReportView'
import Layout from './components/Layout'



function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DiagnosisForm />} />
        <Route path="/report" element={<ReportView />} />
      </Routes>
    </Layout>
  )
}

export default App 