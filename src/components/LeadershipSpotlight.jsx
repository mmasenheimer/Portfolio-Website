import LazyImage from "./LazyImage.jsx";

const LeadershipSpotlight = ({ entry }) => (
  <article className="leadership__spotlight">
    <div className="leadership__img-wrapper">
      <LazyImage
        placeholder={entry.imagePlaceholder}
        src={entry.imageSrc}
        alt={entry.imageAlt}
      />
      <div className="leadership__caption">
        <p className="leadership__caption-title">{entry.title}</p>
        <p className="leadership__caption-meta">
          {entry.role} · {entry.location} · {entry.dates}
        </p>
      </div>
    </div>
    <div className="leadership__stats">
      {entry.stats.map((stat) => (
        <div className="leadership__stat" key={stat.label}>
          <span className="leadership__stat-value">{stat.value}</span>
          <span className="leadership__stat-label">{stat.label}</span>
        </div>
      ))}
    </div>
    <p className="leadership__body">{entry.description}</p>
  </article>
);

export default LeadershipSpotlight;
