const PillButton = ({ href, className = "", children, ...props }) => (
  <a className={`btn ${className}`.trim()} href={href} {...props}>
    <span className="gradient"></span>
    <span className="transition"></span>
    <span className="label">{children}</span>
  </a>
);

export default PillButton;
