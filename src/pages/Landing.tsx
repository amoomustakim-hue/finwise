import '../landing/landing.css'
import { Hero, Nav } from '../landing/Hero'
import { Closing, Faq, Features, Proof } from '../landing/Sections'

export default function Landing() {
  return (
    <div className="lp bg-white">
      <Nav />
      <main>
        <Hero />
        <Proof />
        <Features />
        <Faq />
        <Closing />
      </main>
    </div>
  )
}
