import { Routes, Route } from 'react-router-dom'
import DiagnosisForm from './components/DiagnosisForm'
import ReportView from './components/ReportView'
import Layout from './components/Layout'
import RegisterForm from './components/RegisterForm'


function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DiagnosisForm />} />
        <Route path="/register" element={<RegisterForm />} />
        <Route path="/report" element={<ReportView />} />
      </Routes>
    </Layout>
  )
}

export default App 