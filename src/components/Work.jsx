import projects from "../data/projects.js";
import ProjectCard from "./ProjectCard.jsx";

const Work = () => (
  <section className="work container section">
    <h2 className="work__title">Projects</h2>
    <p className="work__description">
      These projects showcase my journey in computer science through
      coursework, research, and professional development. Each one includes
      a visual preview, and code repositories are accessible through the
      buttons. I'll continue updating this section and my{" "}
      <a href="https://github.com/mmasenheimer" target="_blank">
        GitHub{" "}
      </a>
      as projects progress.
    </p>
    <div className="work__container">
      {projects.map((project, i) => (
        <ProjectCard key={project.title} index={i + 1} project={project} />
      ))}
    </div>
  </section>
);

export default Work;
