import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login, loading } = useAuth()
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const success = await login(email, password)
      if (!success) {
        setError('認証に失敗しました')
        return
      }

      // ログイン成功 → ダッシュボードへ遷移
      navigate('/')
    } catch (err: any) {
      setError(err.message || 'ログイン中にエラーが発生しました')
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded shadow-md w-full max-w-md space-y-6">
        <h1 className="text-2xl font-bold text-center text-gray-800">ログイン</h1>

        {error && <div className="text-red-600 text-sm text-center">{error}</div>}

        <div>
          <label className="block mb-1 text-gray-600">メールアドレス</label>
          <input
            type="email"
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block mb-1 text-gray-600">パスワード</label>
          <input
            type="password"
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
            className="block mb-1 text-blue-600 hover:underline mx-auto"
            onClick={() => navigate('/register')}
        >
            新規作成の方はこちらから
        </button>
        
        <div className="bg-blue-50 p-3 rounded text-sm text-blue-700">
          <p>デモ用ログイン情報:</p>
          <p>Email: test@example.com</p>
          <p>Password: password</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-sky-600 text-white py-2 rounded hover:bg-sky-700 transition disabled:bg-gray-400"
        >
          {loading ? 'ログイン中...' : 'ログイン'}
        </button>
      </form>
    </div>
  )
}

export default LoginPage
