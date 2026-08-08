import { ibm, cern, makerStudio } from "../data/experience.js";
import PipelineEntry from "./PipelineEntry.jsx";
import ResearchSpotlightEntry from "./ResearchSpotlightEntry.jsx";
import SkillGridEntry from "./SkillGridEntry.jsx";

const Experience = () => (
  <section id="experience" className="experience container section">
    <h2 className="experience__title">Work Experience</h2>
    <p className="experience__description">
      Where I've taken what I'm learning in the classroom and put it to work
      on real engineering and research teams. Every role's a little
      different, so here's what each one actually looked like.
    </p>
    <PipelineEntry entry={ibm} />
    <ResearchSpotlightEntry entry={cern} />
    <SkillGridEntry entry={makerStudio} />
  </section>
);

export default Experience;
