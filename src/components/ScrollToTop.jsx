import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      return;
    }

    const scrollToHash = () => {
      const el = document.querySelector(hash);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    };

    scrollToHash();
    // Lazy-loaded images and the WebGL backdrops (Dither, Hyperspeed) can
    // still be resizing/loading assets after the scroll starts, leaving the
    // target undershot - correct again as things settle.
    const retryA = setTimeout(scrollToHash, 500);
    const retryB = setTimeout(scrollToHash, 1200);
    return () => {
      clearTimeout(retryA);
      clearTimeout(retryB);
    };
  }, [pathname, hash]);

  return null;
};

export default ScrollToTop;
