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
        <Link to="/signin" className="rounded-xl bg-white px-4 py-3 text-center font-semibold ring-1 ring-slate-300">
          I already have an account
        </Link>
      </div>
    </Screen>
  )
}
