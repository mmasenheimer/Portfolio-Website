import ExperienceHeader from "./ExperienceHeader.jsx";

const SkillGridEntry = ({ entry }) => (
  <article className="experience__entry experience__entry--skills">
    <ExperienceHeader entry={entry} />
    <p className="experience__summary">{entry.summary}</p>
    <ul className="skill-chips">
      {entry.skills.map((skill) => (
        <li className="skill-chips__chip" key={skill}>
          {skill}
        </li>
      ))}
    </ul>
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

export default SkillGridEntry;
