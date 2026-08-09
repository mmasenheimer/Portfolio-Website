import Hero from "../components/Hero.jsx";
import Dither from "../components/Dither.jsx";
import About from "../components/About.jsx";
import LogoLoop from "../components/LogoLoop.jsx";
import Featured from "../components/Featured.jsx";
import Hyperspeed from "../components/Hyperspeed.jsx";
import Contact from "../components/Contact.jsx";
import techLogos from "../data/techLogos.jsx";

// Slowed down from the component's own defaults (movingAwaySpeed/movingCloserSpeed)
// per request - everything else matches the stock look.
const FEATURED_HYPERSPEED_OPTIONS = {
  distortion: "turbulentDistortion",
  length: 400,
  roadWidth: 10,
  islandWidth: 2,
  lanesPerRoad: 4,
  fov: 90,
  fovSpeedUp: 150,
  speedUp: 2,
  carLightsFade: 0.4,
  totalSideLightSticks: 20,
  lightPairsPerRoadWay: 40,
  shoulderLinesWidthPercentage: 0.05,
  brokenLinesWidthPercentage: 0.1,
  brokenLinesLengthPercentage: 0.5,
  lightStickWidth: [0.12, 0.5],
  lightStickHeight: [1.3, 1.7],
  movingAwaySpeed: [40, 55],
  movingCloserSpeed: [-80, -110],
  carLightsLength: [400 * 0.03, 400 * 0.2],
  carLightsRadius: [0.05, 0.14],
  carWidthPercentage: [0.3, 0.5],
  carShiftX: [-0.8, 0.8],
  carFloorSeparation: [0, 5],
  colors: {
    roadColor: 0x080808,
    islandColor: 0x0a0a0a,
    background: 0x000000,
    shoulderLines: 0xffffff,
    brokenLines: 0xffffff,
    leftCars: [0xd856bf, 0x6750a2, 0xc247ac],
    rightCars: [0x03b3c3, 0x0e5ea5, 0x324555],
    sticks: 0x03b3c3,
  },
};

const Home = () => (
  <>
    <div className="hero-backdrop">
      <div className="hero-backdrop__dither">
        <Dither
          waveColor={[0.2627450980392157, 0.5686274509803921, 0.5647058823529412]}
          disableAnimation={false}
          enableMouseInteraction={false}
          mouseRadius={0.3}
          colorNum={27.2}
          waveAmplitude={0.44}
          waveFrequency={7}
          waveSpeed={0.025}
        />
      </div>
      <Hero />
    </div>
    <hr className="container section-divider" />
    <About />
    <div className="tech-marquee">
      <LogoLoop
        logos={techLogos}
        speed={60}
        direction="left"
        logoHeight={40}
        gap={48}
        pauseOnHover
        scaleOnHover
        fadeOut
        fadeOutColor="var(--clr-dark)"
        ariaLabel="Technologies I work with"
      />
    </div>
    <Featured />
    <div className="featured-road">
      <Hyperspeed effectOptions={FEATURED_HYPERSPEED_OPTIONS} />
    </div>
    <hr className="container section-divider" />
    <Contact />
  </>
);

export default Home;
