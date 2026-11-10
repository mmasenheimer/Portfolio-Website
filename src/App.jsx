import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navigation from "./components/Navigation.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";
import Home from "./pages/Home.jsx";
import Experience from "./components/Experience.jsx";
import Work from "./components/Work.jsx";
import Leadership from "./components/Leadership.jsx";
import Footer from "./components/Footer.jsx";
import UnderConstruction from "./components/UnderConstruction.jsx";
// import Waves from "./components/Waves.jsx"; // swapped for the canyon scan below
import MoonTripBackground from "./components/MoonTripBackground.jsx";
import MoonTrip from "./pages/MoonTrip.jsx";

const App = () => (
  <BrowserRouter>
    {/* Waves background - replaced by the canyon scan (MoonTripBackground) below.
    <div className="site-background" aria-hidden="true">
      <Waves
        lineColor="#20604f"
        spacing={16}
        amplitude={25}
        twist={1.35}
        speed={0.35}
        mouseRadius={170}
        mouseStrength={1}
        backgroundColor="#000000"
        lineWidth={1.25}
        rotation={70}
        scale={0.7}
        variation={6}
        mouseInteraction={false}
        returnDuration={1.3}
        clickRipple={false}
        intro={false}
        opacity={0.7}
        scrollFactor={1}
      />
    </div>
    */}
    <MoonTripBackground />
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
        <Route path="/moon-trip" element={<MoonTrip />} />
      </Routes>
    </main>
    <Footer />
  </BrowserRouter>
);

export default App;
