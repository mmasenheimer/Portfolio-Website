import { useCallback, useEffect } from "react";

const THEME_CLASS = "light-mode";

const useDarkMode = () => {
  useEffect(() => {
    const theme = localStorage.getItem("theme");
    if (theme) document.body.classList.add(theme);
  }, []);

  const toggleTheme = useCallback(() => {
    document.body.classList.toggle(THEME_CLASS);

    if (document.body.classList.contains(THEME_CLASS)) {
      localStorage.setItem("theme", THEME_CLASS);
    } else {
      localStorage.removeItem("theme");
    }
  }, []);

  return toggleTheme;
};

export default useDarkMode;
