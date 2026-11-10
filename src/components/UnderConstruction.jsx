// Temporary overlay for pages that aren't finished yet.
const UnderConstruction = ({ children }) => (
  <>
    {children}
    <div className="under-construction" role="status">
      <h1 className="under-construction__title">Under construction!!!</h1>
      <p className="under-construction__text">I&apos;ll get to this... sometime...</p>
    </div>
  </>
);

export default UnderConstruction;
