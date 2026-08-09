import LazyImage from "./LazyImage.jsx";

const HobbyCard = ({ hobby }) => (
  <article className="hobby-card">
    <div className="hobby-card__img-wrapper">
      <LazyImage
        placeholder={hobby.imagePlaceholder}
        src={hobby.imageSrc}
        alt={hobby.imageAlt}
      />
      <div className="hobby-card__caption">
        <p className="hobby-card__caption-title">{hobby.title}</p>
      </div>
    </div>
    <p className="hobby-card__description">{hobby.description}</p>
  </article>
);

export default HobbyCard;
