import { useEffect, useState } from "react";
import useDarkMode from "../hooks/useDarkMode.js";
import ThemeIcon from "./ThemeIcon.jsx";
import PillButton from "./PillButton.jsx";

const NAV_LINKS = [
  { href: "#about", label: "About" },
  { href: "#featured", label: "Work" },
  { href: "#contact", label: "Contact" },
];

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const toggleTheme = useDarkMode();

  useEffect(() => {
    document.body.style.overflowY = isOpen ? "hidden" : "auto";
  }, [isOpen]);

  return (
    <>
      <header className="header container">
        <nav>
          <ul className="header__menu">
            {NAV_LINKS.map(({ href, label }) => (
              <li key={href}>
                <a className="header__link" href={href}>
                  {label}
                </a>
              </li>
            ))}
            <li className="header__line"></li>
            <li>
              <button className="header__sun" onClick={toggleTheme}>
                <ThemeIcon />
              </button>
            </li>
            <li>
              <PillButton
                className="header__resume"
                href="/images/Michael_Masenheimer_Resume.pdf"
                target="_blank"
              >
                Resume
              </PillButton>
            </li>
          </ul>
          <button
            className="header__bars"
            onClick={() => setIsOpen((prev) => !prev)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          </button>
        </nav>
      </header>

      <div
        className="mobile-nav"
        style={{ display: isOpen ? "flex" : "none" }}
      >
        <nav>
          <ul className="mobile-nav__menu">
            {NAV_LINKS.map(({ href, label }) => (
              <li key={href}>
                <a
                  className="mobile-nav__link"
                  href={href}
                  onClick={() => setIsOpen(false)}
                >
                  {label}
                </a>
              </li>
            ))}
            <li className="mobile-nav__link-line"></li>
            <li>
              <button className="mobile-nav__sun" onClick={toggleTheme}>
                <ThemeIcon />
              </button>
            </li>
            <li>
              <PillButton
                className="mobile-nav__btn"
                href="/images/Michael_Masenheimer_Resume.pdf"
                target="_blank"
              >
                Resume
              </PillButton>
            </li>
          </ul>
        </nav>
      </div>
    </>
  );
};

export default Navigation;
