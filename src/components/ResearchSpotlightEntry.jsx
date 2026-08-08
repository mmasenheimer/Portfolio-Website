import ExperienceHeader from "./ExperienceHeader.jsx";
import PillButton from "./PillButton.jsx";

const ResearchSpotlightEntry = ({ entry }) => (
  <article className="experience__entry experience__entry--research">
    <ExperienceHeader entry={entry} />
    <p className="experience__summary">{entry.summary}</p>
    <div className="research-stats">
      {entry.headlineStats.map((stat) => (
        <div className="research-stats__item" key={stat.label}>
          <span className="research-stats__value">{stat.value}</span>
          <span className="research-stats__label">{stat.label}</span>
        </div>
      ))}
    </div>
    <PillButton className="experience__cta" href={entry.ctaHref}>
      {entry.ctaText}
    </PillButton>
  </article>
);

export default ResearchSpotlightEntry;
