import { useState } from 'react'
import { useNavigate } from 'react-router-dom'


const RegisterPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      // 例：SupabaseなどのログインAPI呼び出し（仮想処理）
      const isAuthenticated = email === 'test@example.com' && password === 'password123'
      if (!isAuthenticated) throw new Error('認証に失敗しました')

      // ログイン成功 → ダッシュボードへ遷移
      navigate('/login')
    } catch (err: any) {
      setError(err.message)
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
            onClick={() => navigate('/login')}
        >
            もうアカウントは持っています
        </button>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          ログイン
        </button>
      </form>
    </div>
  )
}

export default RegisterPage