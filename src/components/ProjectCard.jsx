import LazyImage from "./LazyImage.jsx";
import PillButton from "./PillButton.jsx";

const ProjectCard = ({ index, project }) => (
  <>
    <h3 className="work__project-title">{project.title}</h3>
    <div className={`work__img-wrapper work__image${index}`}>
      {project.images ? (
        <div className="work__collage">
          {project.images.map((image) => (
            <LazyImage
              key={image.src}
              className="work__collage-img"
              placeholder={image.placeholder}
              src={image.src}
              alt={image.alt}
            />
          ))}
        </div>
      ) : (
        <LazyImage
          placeholder={project.imagePlaceholder}
          src={project.imageSrc}
          alt={project.imageAlt}
        />
      )}
    </div>
    <div className={`work__project work__content${index}`}>
      <h3 className="work__project-subtitle">{project.title}</h3>
      <p className="work__project-description1">{project.description1}</p>
      <p className="work__project-description2">{project.description2}</p>
      <PillButton
        className="work__project-btn"
        href={project.linkHref}
        target="_blank"
      >
        {project.linkText}
      </PillButton>
    </div>
  </>
);

export default ProjectCard;
