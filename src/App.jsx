import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navigation from "./components/Navigation.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";
import Home from "./pages/Home.jsx";
import Experience from "./components/Experience.jsx";
import Work from "./components/Work.jsx";
import Leadership from "./components/Leadership.jsx";
import Hobbies from "./components/Hobbies.jsx";
import Footer from "./components/Footer.jsx";

const App = () => (
  <BrowserRouter>
    <ScrollToTop />
    <Navigation />
    <main>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/experience" element={<Experience />} />
        <Route path="/projects" element={<Work />} />
        <Route path="/leadership" element={<Leadership />} />
        <Route path="/hobbies" element={<Hobbies />} />
      </Routes>
    </main>
    <Footer />
  </BrowserRouter>
);

export default App;
