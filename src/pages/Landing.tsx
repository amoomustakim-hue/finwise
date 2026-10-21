import { useEffect } from 'react'
import Lenis from 'lenis'
import '../landing/landing.css'
import { Hero, Nav } from '../landing/Hero'
import { Faq, FeatureStack, Finale, Marquee, Notifications, StoryPhoto, Trust } from '../landing/Sections'
import { Calendar, Simulator } from '../landing/Story'

export default function Landing() {
  // Smooth, weighted scrolling for the landing page only.
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const lenis = new Lenis({ lerp: 0.09 })
    let f = 0
    const raf = (t: number) => {
      lenis.raf(t)
      f = requestAnimationFrame(raf)
    }
    f = requestAnimationFrame(raf)
    return () => {
      cancelAnimationFrame(f)
      lenis.destroy()
    }
  }, [])

  return (
    <div className="lp">
      <Nav />
      <main>
        <Hero />
        <Marquee />
        <Calendar />
        <Simulator />
        <FeatureStack />
        <Notifications />
        <Trust />
        <StoryPhoto />
        <Faq />
        <Finale />
      </main>
    </div>
  )
}
