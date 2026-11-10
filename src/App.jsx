import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navigation from "./components/Navigation.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";
import Home from "./pages/Home.jsx";
import Experience from "./components/Experience.jsx";
import Work from "./components/Work.jsx";
import Leadership from "./components/Leadership.jsx";
import Footer from "./components/Footer.jsx";
import UnderConstruction from "./components/UnderConstruction.jsx";
import Waves from "./components/Waves.jsx";

const App = () => (
  <BrowserRouter>
    <div className="site-background" aria-hidden="true">
      <Waves
        lineColor="#000000"
        spacing={16}
        amplitude={26}
        twist={1.35}
        speed={0.4}
        mouseRadius={170}
        mouseStrength={1}
        backgroundColor="#18240b"
        lineWidth={2.75}
        rotation={61}
        scale={0.55}
        variation={5}
        mouseInteraction={false}
        returnDuration={1.3}
        clickRipple={false}
        intro={false}
        opacity={0.7}
      />
    </div>
    <ScrollToTop />
    <Navigation />
    <main>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/experience"
          element={<UnderConstruction><Experience /></UnderConstruction>}
        />
        <Route
          path="/projects"
          element={<UnderConstruction><Work /></UnderConstruction>}
        />
        <Route
          path="/leadership"
          element={<UnderConstruction><Leadership /></UnderConstruction>}
        />
      </Routes>
    </main>
    <Footer />
  </BrowserRouter>
);

export default App;
