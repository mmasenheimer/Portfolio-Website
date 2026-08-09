import FoldText from "./FoldText.jsx";
import PillButton from "./PillButton.jsx";

const Contact = () => (
  <section id="contact" className="contact container section">
    <h2 className="contact__title">
      <FoldText
        text="Let's Connect!"
        splitBy="char"
        hinge="top"
        trigger="scroll"
        duration={0.65}
        stagger={0.045}
        ease="power3.out"
        perspective={700}
        creaseShading={0.55}
        fontSize="inherit"
        fontWeight="inherit"
        color="inherit"
      />
    </h2>
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
