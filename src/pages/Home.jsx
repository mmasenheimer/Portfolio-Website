import Hero from "../components/Hero.jsx";
import MagnetLines from "../components/MagnetLines.jsx";
import About from "../components/About.jsx";
import Featured from "../components/Featured.jsx";
import Contact from "../components/Contact.jsx";

const Home = () => (
  <>
    <div className="hero-backdrop">
      <MagnetLines
        rows={20}
        columns={40}
        lineColor="var(--clr-slate800)"
        lineWidth="2px"
        lineHeight="24px"
        baseAngle={-55}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          margin: 0,
          zIndex: 0,
        }}
      />
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
