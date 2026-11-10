import LazyImage from "./LazyImage.jsx";
import PillButton from "./PillButton.jsx";

const Contact = () => (
  <section id="contact" className="contact container section">
    <div className="contact__content">
      <h2 className="contact__title">Let's connect!</h2>
      <div className="contact__btn-group">
        <PillButton
          className="contact__btn"
          href="mailto:mmasenheimer21@gmail.com"
          target="_blank"
        >
          Email
        </PillButton>
        <PillButton
          className="contact__btn"
          href="https://www.linkedin.com/in/mmasenheimer/"
          target="_blank"
        >
          Linkedin
        </PillButton>
        <PillButton
          className="contact__btn"
          href="https://github.com/mmasenheimer"
          target="_blank"
        >
          GitHub
        </PillButton>
      </div>
    </div>
    <div className="contact__img-wrapper">
      <LazyImage
        className="contact__img"
        placeholder="https://placehold.co/600x600"
        src="/images/connect.jpg"
        alt="Michael Masenheimer"
      />
    </div>
  </section>
);

export default Contact;
