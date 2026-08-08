import leadership from "../data/leadership.js";
import LeadershipSpotlight from "./LeadershipSpotlight.jsx";

const Leadership = () => (
  <section id="leadership" className="leadership container section">
    <h2 className="leadership__title">Leadership</h2>
    <p className="leadership__description">
      Outside of coursework and engineering roles, I invest time in
      mentoring and outreach across the CS department.
    </p>
    {leadership.map((entry) => (
      <LeadershipSpotlight key={entry.title} entry={entry} />
    ))}
  </section>
);

export default Leadership;
