import Hero from "../components/Hero.jsx";
import Dither from "../components/Dither.jsx";
import About from "../components/About.jsx";
import Featured from "../components/Featured.jsx";
import Contact from "../components/Contact.jsx";

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
          waveSpeed={0.02}
        />
      </div>
      <Hero />
    </div>
    <hr className="container section-divider" />
    <About />
    <hr className="container section-divider" />
    <Featured />
    <hr className="container section-divider" />
    <Contact />
  </>
);

export default Home;
