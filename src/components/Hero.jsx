import PillButton from "./PillButton.jsx";

const Hero = () => (
  <section className="michael container">
    <img
      className="michael__img"
      src="/images/resume-image-2.jpg"
      alt="Michael Profile Picture"
    />
    <h2 className="michael__subtitle">Michael Masenheimer</h2>
    <h1 className="michael__title">
      COMP SCI '27 @ U OF ARIZONA
      <br />
    </h1>
    <p className="michael__description">
      I'm a Computer Science and Information Science student at the
      University of Arizona, interested in{" "}
      <strong>backend development and machine learning.</strong> I bring
      experience across both: I work on an enterprise Storage Defender
      product at <strong>IBM,</strong> and conduct ML research for{" "}
      <strong>CERN's Large Hadron Collider,</strong> investigating
      hardware-deployed neural networks to identify relevant proton
      collisions. I'm also interested in{" "}
      <strong>full-stack engineering and security,</strong> and bring a
      strong understanding of the software development lifecycle.
    </p>
    <PillButton
      className="michael__btn"
      href="https://github.com/mmasenheimer"
      target="_blank"
    >
      GitHub
    </PillButton>
  </section>
);

export default Hero;
