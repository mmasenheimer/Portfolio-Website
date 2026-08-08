import Navigation from "./components/Navigation.jsx";
import Hero from "./components/Hero.jsx";
import About from "./components/About.jsx";
import Featured from "./components/Featured.jsx";
import Work from "./components/Work.jsx";
import Contact from "./components/Contact.jsx";
import Footer from "./components/Footer.jsx";

const App = () => (
  <>
    <Navigation />
    <main>
      <Hero />
      <About />
      <Featured />
      <Work />
      <Contact />
    </main>
    <Footer />
  </>
);

export default App;
