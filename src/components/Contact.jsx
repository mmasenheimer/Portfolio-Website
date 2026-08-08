import PillButton from "./PillButton.jsx";

const Contact = () => (
  <section id="contact" className="contact container section">
    <h2 className="contact__title">Let's connect</h2>
    <p className="contact__description">
      <strong>Thank you for your time!</strong> Always open to chatting
      about CS, gardening, hiking, or just life. Drop me a message!
    </p>

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
    </div>
  </section>
);

export default Contact;
