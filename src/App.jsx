import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navigation from "./components/Navigation.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";
import Home from "./pages/Home.jsx";
import Experience from "./components/Experience.jsx";
import Work from "./components/Work.jsx";
import Leadership from "./components/Leadership.jsx";
import Footer from "./components/Footer.jsx";
import UnderConstruction from "./components/UnderConstruction.jsx";

const App = () => (
  <BrowserRouter>
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
