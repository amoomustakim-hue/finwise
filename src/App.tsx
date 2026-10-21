import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider, useAuth } from './auth'
import Home from './pages/Home'
import Import from './pages/Import'
import Landing from './pages/Landing'
import Onboarding from './pages/Onboarding'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'

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
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Guard need="guest"><Landing /></Guard>} />
          <Route path="/signup" element={<Guard need="guest"><SignUp /></Guard>} />
          <Route path="/signin" element={<Guard need="guest"><SignIn /></Guard>} />
          <Route path="/onboarding" element={<Guard need="onboarding"><Onboarding /></Guard>} />
          <Route path="/home" element={<Guard need="ready"><Home /></Guard>} />
          <Route path="/import" element={<Guard need="ready"><Import /></Guard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
