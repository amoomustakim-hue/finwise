import { Link } from 'react-router'
import { Screen } from '../components/ui'

export default function Landing() {
  return (
    <Screen>
      <div className="flex flex-1 flex-col justify-center gap-4">
        <h1 className="text-4xl font-bold text-brand">FinWise</h1>
        <p className="text-xl text-slate-700">Turn your financial data into smarter decisions.</p>
        <p className="text-slate-500">Understand your money, predict what's coming, and act before it's a problem.</p>
      </div>
      <div className="flex flex-col gap-3">
        <Link to="/signup" className="rounded-xl bg-brand px-4 py-3 text-center font-semibold text-white">
          Get started
        </Link>
        <Link to="/try" className="rounded-xl bg-white px-4 py-3 text-center font-semibold text-brand ring-1 ring-brand/40">
          Try the demo (no sign-up)
        </Link>
        <Link to="/signin" className="py-2 text-center text-sm font-semibold text-slate-600">
          I already have an account
        </Link>
      </div>
    </Screen>
  )
}
