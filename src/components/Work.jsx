import Masonry from "./Masonry.jsx";
import projects from "../data/projects.js";

const MASONRY_HEIGHTS = [380, 520, 300, 460, 420];

const MASONRY_ITEMS = projects.map((project, i) => ({
  id: project.title,
  img: project.images ? project.images[0].src : project.imageSrc,
  url: project.linkHref,
  title: project.title,
  height: MASONRY_HEIGHTS[i % MASONRY_HEIGHTS.length],
}));

const Work = () => (
  <section className="work container section">
    <h2 className="work__title">Projects</h2>
    <p className="work__description">
      These projects showcase my journey in computer science through
      coursework, research, and professional development. Click a tile to
      open its repository. I'll continue updating this section and my{" "}
      <a href="https://github.com/mmasenheimer" target="_blank">
        GitHub{" "}
      </a>
      as projects progress.
    </p>
    <div className="work__masonry">
      <Masonry
        items={MASONRY_ITEMS}
        ease="power3.out"
        duration={1}
        stagger={0.06}
        animateFrom="random"
        scaleOnHover={true}
        hoverScale={0.95}
        blurToFocus={true}
        colorShiftOnHover={false}
      />
    </div>
  </section>
);

export default Work;
