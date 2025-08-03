import { Routes, Route } from 'react-router-dom'
import DiagnosisForm from './components/DiagnosisForm'
import ReportView from './components/ReportView'
import Layout from './components/Layout'
import LoginPage from './components/Loginpage'
import RegisterPage from './components/Registerpage'
import { AuthProvider } from './contexts/AuthContext'



function App() {
  return (
<<<<<<< HEAD
    <AuthProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<DiagnosisForm />} />
          <Route path="/report" element={<ReportView />} />
          <Route path='login' element={<LoginPage/>} />
          <Route path='register' element={<RegisterPage />} />
        </Routes>
      </Layout>
    </AuthProvider>
=======
    <Layout>
      <Routes>
        <Route path="/" element={<DiagnosisForm />} />
        <Route path="/report" element={<ReportView />} />
        <Route path='/login' element={<LoginPage/>} />
        <Route path='/register' element={<RegisterPage />} />
      </Routes>
    </Layout>
>>>>>>> origin/main
  )
}

export default App 