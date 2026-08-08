import Hero from "../components/Hero.jsx";
import About from "../components/About.jsx";
import Featured from "../components/Featured.jsx";
import Contact from "../components/Contact.jsx";

const Home = () => (
  <>
    <Hero />
    <hr className="container section-divider" />
    <About />
    <hr className="container section-divider" />
    <Featured />
    <hr className="container section-divider" />
    <Contact />
  </>
);

export default Home;
