import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface LayoutProps {
  children: ReactNode
}

const Layout = ({ children }: LayoutProps) => {
  const { user, isAuthenticated, logout } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-sky-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-2xl font-bold">
              daijyoDo
            </Link>
            <nav className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <span className="text-blue-200">こんにちは、{user?.name}さん</span>
                  <Link to="/" className="hover:text-blue-200 transition-colors">
                    中間チェックフォーム
                  </Link>
                  <Link to="/report" className="hover:text-blue-200 transition-colors">
                    レポート
                  </Link>
                  <button
                    onClick={logout}
                    className="hover:text-blue-200 transition-colors bg-transparent border border-blue-200 px-3 py-1 rounded"
                  >
                    ログアウト
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="hover:text-blue-200 transition-colors">
                    ログイン
                  </Link>
                  <Link to="/register" className="hover:text-blue-200 transition-colors">
                    新規登録
                  </Link>
                  <Link to="/" className="hover:text-blue-200 transition-colors">
                    中間チェックフォーム
                  </Link>
                  <Link to="/report" className="hover:text-blue-200 transition-colors">
                    レポート
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}

export default Layout 