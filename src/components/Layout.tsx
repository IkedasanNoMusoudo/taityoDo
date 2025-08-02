import { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface LayoutProps {
  children: ReactNode
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-2xl font-bold">
              daijyoDo
            </Link>
            <nav className="space-x-4">
              <Link to="/" className="hover:text-blue-200 transition-colors">
                診断フォーム
              </Link>
              <Link to="/report" className="hover:text-blue-200 transition-colors">
                レポート
              </Link>
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