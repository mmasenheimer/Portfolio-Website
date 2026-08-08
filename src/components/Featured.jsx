import LazyImage from "./LazyImage.jsx";

const FEATURED_IMAGES = [
  { src: "/images/lhc.jpg", alt: "LHC tunnel and detector" },
  {
    src: "/images/neuralnetwork.jpg",
    alt: "Neural network architecture diagram",
  },
  { src: "/images/resnetcpp.jpg", alt: "C++ neural network code" },
  {
    src: "/images/vekengine.jpg",
    alt: "AMD Versal VEK280 AI Engine board",
  },
];

const TECH_STACK = [
  "C++",
  "PyTorch",
  "Docker",
  "AMD Versal AI Engines",
  "Vitis IDE",
  "Git",
];

const Featured = () => (
  <section id="featured" className="featured container section">
    <h3 className="featured__subtitle">
      <strong>Featured Research Project</strong>
    </h3>
    <div className="featured__wrapper">
      <h2 className="featured__title">
        Trained Neural Networks for Particle Physics
      </h2>
      <a
        className="featured__link"
        href="/images/mmasenheimer_research.pdf"
        target="_blank"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"
          />
        </svg>
      </a>
    </div>

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
    <div className="featured__info-container">
      <div>
        <h3 className="featured__label">Tech stack</h3>
        <ul className="featured__tech-stack">
          {TECH_STACK.map((tech) => (
            <li className="featured__info" key={tech}>
              {tech}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="featured__label">Research Type</h3>
        <p className="featured__info">
          Applied ML and FPGA research for HEP instrumentation
        </p>
      </div>
      <div>
        <h3 className="featured__label">Timeline</h3>
        <p className="featured__info">April 2025 - Present</p>
      </div>
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
  </section>
);

export default Featured;
