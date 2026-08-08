import LazyImage from "./LazyImage.jsx";

const ExperienceHeader = ({ entry }) => (
  <div className="experience__header">
    <div className="experience__img-wrapper">
      <LazyImage
        placeholder={entry.imagePlaceholder}
        src={entry.imageSrc}
        alt={entry.imageAlt}
      />
    </div>
    <div>
      <h3 className="experience__entry-title">{entry.title}</h3>
      <p className="experience__entry-meta">
        {entry.role} · {entry.location} · {entry.dates}
      </p>
    </div>
  </div>
);

export default ExperienceHeader;
