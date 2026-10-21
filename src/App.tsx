import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider, useAuth } from './auth'
import { ModeProvider } from './mode'
import Budgets from './pages/Budgets'
import Category from './pages/Category'
import Home from './pages/Home'
import Import from './pages/Import'
import Landing from './pages/Landing'
import MonoReturn from './pages/MonoReturn'
import Onboarding from './pages/Onboarding'
import Review from './pages/Review'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import Transactions from './pages/Transactions'

/** Sends people to the right place based on sign-in and onboarding state. */
function Guard({ need, children }: { need: 'guest' | 'onboarding' | 'ready'; children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <p className="p-8 text-center text-slate-500">Loading…</p>
  if (need === 'guest') return user ? <Navigate to={user.onboarded ? '/home' : '/onboarding'} replace /> : children
  if (!user) return <Navigate to="/signin" replace />
  if (need === 'onboarding' && user.onboarded) return <Navigate to="/home" replace />
  if (need === 'ready' && !user.onboarded) return <Navigate to="/onboarding" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <ModeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Guard need="guest"><Landing /></Guard>} />
          <Route path="/signup" element={<Guard need="guest"><SignUp /></Guard>} />
          <Route path="/signin" element={<Guard need="guest"><SignIn /></Guard>} />
          <Route path="/onboarding" element={<Guard need="onboarding"><Onboarding /></Guard>} />
          <Route path="/home" element={<Guard need="ready"><Home /></Guard>} />
          <Route path="/import" element={<Guard need="ready"><Import /></Guard>} />
          <Route path="/review" element={<Guard need="ready"><Review /></Guard>} />
          <Route path="/budgets" element={<Guard need="ready"><Budgets /></Guard>} />
          <Route path="/category" element={<Guard need="ready"><Category /></Guard>} />
          <Route path="/transactions" element={<Guard need="ready"><Transactions /></Guard>} />
          <Route path="/mono/return" element={<Guard need="ready"><MonoReturn /></Guard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </ModeProvider>
    </AuthProvider>
  )
}
