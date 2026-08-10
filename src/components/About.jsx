import LazyImage from "./LazyImage.jsx";

const About = () => (
  <section id="about" className="about container section">
    <div className="about__content">
      <h2 className="about__title">A Little About Me</h2>
      <p className="about__description">
        I have academic experience in{" "}
        <strong>data structures & algorithms, discrete math,</strong>{" "}
        calculus, and linear algebra along with project and research
        experience in{" "}
        <strong>
          Java/Spring Boot, Python, C++, Node.js, and PostgreSQL/MongoDB.
        </strong>{" "}
        This summer I am working at{" "}
        <a href="https://www.ibm.com/us-en" target="_blank">
          IBM
        </a>{" "}
        as a Backend Software Engineering Intern, building an agentic BIA
        ingestion pipeline for IBM's Storage Defender product and a LangGraph
        ReAct agent for autonomous governance gap analysis.
      </p>
      <p className="about__description">
        I also work at the University of Arizona{" "}
        <a href="https://lib.arizona.edu/catalyst" target="_blank">
          Libraries' student makerspace
        </a>{" "}
        as the <strong>Maker Studio Fabrication Lead,</strong> leading a team
        of 8 studio assistants across 3D printing, laser cutting, CNC
        milling, and woodshop operations for 25 machines, and supporting 50+
        students weekly with certifications and technical help. I also
        co-lead a team of 15 as a{" "}
        <a
          href="https://cs.arizona.edu/cs-ambassador-program-csa"
          target="_blank"
        >
          Computer Science Lead Ambassador,
        </a>{" "}
        developing OpenCV-based outreach activities for 2,000+ students
        across 10 local K-12 schools. My goal is to make every student feel
        supported and encouraged in their CS journey.
      </p>
    </div>
    <div className="about__img-wrapper">
      <LazyImage
        className="about__img"
        placeholder="https://placehold.co/2556x2556"
        src="/images/selfieimage.jpg"
        alt="Another picture of Michael"
      />
    </div>
  </section>
);

export default About;
