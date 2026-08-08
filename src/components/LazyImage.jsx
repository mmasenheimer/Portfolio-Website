import { useEffect, useRef, useState } from "react";

const LazyImage = ({ src, alt, placeholder, className = "" }) => {
  const imgRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const node = imgRef.current;
    if (!node) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setLoaded(true);
          observer.unobserve(node);
        }
      });
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <img
      ref={imgRef}
      className={`${className} ${loaded ? "loaded" : "loading"}`.trim()}
      src={loaded ? src : placeholder}
      alt={alt}
    />
  );
};

export default LazyImage;
