import MoonTripBackground from "../components/MoonTripBackground.jsx";

// Empty preview page for trying out the point-cloud background.
// It renders after the site-wide Waves backdrop, so it paints over it.
const MoonTrip = () => (
  <>
    <MoonTripBackground />
    <div style={{ minHeight: "100vh" }} />
  </>
);

export default MoonTrip;
