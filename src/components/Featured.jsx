import LazyImage from "./LazyImage.jsx";
import PillButton from "./PillButton.jsx";

const FEATURED_IMAGES = [
  { src: "/images/lhc.jpg", alt: "LHC tunnel and detector" },
  {
    src: "/images/neuralnetwork.jpg",
    alt: "Neural network architecture diagram",
  },
];

const RESEARCH_TIMELINE = [
  { date: "Apr 2025", label: "Joined UArizona CERN research group" },
  { date: "Oct 2025", label: "Deployed first model onto hardware" },
  {
    date: "Dec 2025",
    label: "Optimized model via quantization and vectorization",
  },
  { date: "Mar 2026", label: "Aie4ml for network permutation testing" },
];

const Featured = () => (
  <section id="featured" className="featured container section">
    <h3 className="featured__subtitle">
      <strong>Featured Research Project</strong>
    </h3>
    <h2 className="featured__title">
      Trained Neural Networks for Particle Physics
    </h2>
    <PillButton
      className="featured__link"
      href="/images/mmasenheimer_research.pdf"
      target="_blank"
    >
      Check it out!
    </PillButton>

    <div className="featured__body">
      <div className="featured__content">
        <p className="featured__description">
          The Large Hadron Collider (LHC) is the world's largest particle
          accelerator, operated by a nuclear physics lab near Geneva called
          CERN. My research is through the{" "}
          <a href="https://atlas.cern/" target="_blank">
            ATLAS Experiment,
          </a>{" "}
          one of the primary particle collision detectors on the LHC. Dr. Rachel
          Hyneman and I research{" "}
          <strong>quantized feedforward neural networks</strong> for the ATLAS
          forward calorimeter, using hardware-based machine learning to
          determine which proton collisions are worth keeping in real time.
        </p>
        <p className="featured__description">
          I design and quantize custom feedforward neural networks in{" "}
          <strong>C++ and PyTorch,</strong> then develop and maintain kernel
          tile code and programmable logic on AMD Versal AI Engines to
          orchestrate data flow and minimize bit-level overhead. Benchmarking
          latency, throughput, and quantization tradeoffs across network
          designs, our current pipeline achieves roughly{" "}
          <strong>7 million packets per second at 97% accuracy,</strong> and
          we're simulating deployment on Vitis FPGAs to support real-time
          decision-making.
        </p>
        <ol className="research-timeline">
          {RESEARCH_TIMELINE.map((node) => (
            <li
              className="research-timeline__node"
              key={node.date + node.label}
            >
              <span className="research-timeline__dot"></span>
              <span className="research-timeline__date">{node.date}</span>
              <span className="research-timeline__label">{node.label}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="featured__img-container">
        {FEATURED_IMAGES.map(({ src, alt }) => (
          <div className="featured__img-wrapper" key={src}>
            <LazyImage
              placeholder="https://placehold.co/7680x4320"
              src={src}
              alt={alt}
            />
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default Featured;
