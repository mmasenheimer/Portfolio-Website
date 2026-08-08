import ExperienceHeader from "./ExperienceHeader.jsx";

const PipelineEntry = ({ entry }) => (
  <article className="experience__entry experience__entry--pipeline">
    <ExperienceHeader entry={entry} />
    <p className="experience__summary">{entry.summary}</p>
    <ol className="pipeline">
      {entry.pipeline.map((step, i) => (
        <li className="pipeline__step" key={step}>
          <span className="pipeline__index">{i + 1}</span>
          <span className="pipeline__label">{step}</span>
        </li>
      ))}
    </ol>
    <div className="experience__stats">
      {entry.stats.map((stat) => (
        <div className="experience__stat" key={stat.label}>
          <span className="experience__stat-value">{stat.value}</span>
          <span className="experience__stat-label">{stat.label}</span>
        </div>
      ))}
    </div>
  </article>
);

export default PipelineEntry;
