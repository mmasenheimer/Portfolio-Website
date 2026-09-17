import LazyImage from "./LazyImage.jsx";

const ExperienceGallery = ({ photos }) => {
  if (!photos || photos.length === 0) return null;

  return (
    <div className="experience__gallery">
      {photos.map((photo, i) => (
        <div className="experience__gallery-img-wrapper" key={photo.src + i}>
          <LazyImage
            placeholder={photo.placeholder}
            src={photo.src}
            alt={photo.alt}
          />
        </div>
      ))}
    </div>
  );
};

export default ExperienceGallery;
