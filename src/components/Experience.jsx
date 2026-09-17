import { ibm, cern, makerStudio } from "../data/experience.js";
import PipelineEntry from "./PipelineEntry.jsx";
import ResearchSpotlightEntry from "./ResearchSpotlightEntry.jsx";
import SkillGridEntry from "./SkillGridEntry.jsx";

const Experience = () => (
  <section id="experience" className="experience container section">
    <h2 className="experience__title">Work Experience</h2>
    <PipelineEntry entry={ibm} />
    <ResearchSpotlightEntry entry={cern} />
    <SkillGridEntry entry={makerStudio} />
  </section>
);

export default Experience;
