import '../landing/landing.css'
import { Hero, Nav } from '../landing/Hero'
import { Faq, FeatureStack, Finale, Marquee, Notifications, StoryPhoto, Trust } from '../landing/Sections'
import { Simulator } from '../landing/Story'

export default function Landing() {
  return (
    <div className="lp">
      <Nav />
      <main>
        <Hero />
        <Marquee />
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
