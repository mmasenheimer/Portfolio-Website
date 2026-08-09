import hobbies from "../data/hobbies.js";
import HobbyCard from "./HobbyCard.jsx";

const Hobbies = () => (
  <section id="hobbies" className="hobbies container section">
    <h2 className="hobbies__title">Hobbies</h2>
    <p className="hobbies__description">
      Outside of school and work, here's what keeps me busy.
    </p>
    <div className="hobbies__grid">
      {hobbies.map((hobby) => (
        <HobbyCard key={hobby.title} hobby={hobby} />
      ))}
    </div>
  </section>
);

export default Hobbies;
