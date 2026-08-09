import {
  SiCplusplus,
  SiDocker,
  SiGit,
  SiJavascript,
  SiJira,
  SiKeras,
  SiLanggraph,
  SiMongodb,
  SiNodedotjs,
  SiPostgresql,
  SiPython,
  SiReact,
  SiSpringboot,
} from "react-icons/si";
import { FaJava } from "react-icons/fa";

const techLogos = [
  { node: <SiDocker color="#2496ED" />, title: "Docker", href: "https://www.docker.com/" },
  { node: <FaJava color="#ED8B00" />, title: "Java", href: "https://www.java.com/" },
  { node: <SiPython color="#3776AB" />, title: "Python", href: "https://www.python.org/" },
  { node: <SiCplusplus color="#00599C" />, title: "C++", href: "https://isocpp.org/" },
  {
    node: <SiJavascript color="#F7DF1E" />,
    title: "JavaScript",
    href: "https://developer.mozilla.org/docs/Web/JavaScript",
  },
  { node: <SiReact color="#61DAFB" />, title: "React", href: "https://react.dev/" },
  { node: <SiSpringboot color="#6DB33F" />, title: "Spring Boot", href: "https://spring.io/projects/spring-boot" },
  { node: <SiNodedotjs color="#339933" />, title: "Node.js", href: "https://nodejs.org/" },
  { node: <SiPostgresql color="#4169E1" />, title: "PostgreSQL", href: "https://www.postgresql.org/" },
  { node: <SiMongodb color="#47A248" />, title: "MongoDB", href: "https://www.mongodb.com/" },
  { node: <SiKeras color="#D00000" />, title: "Keras", href: "https://keras.io/" },
  { node: <SiGit color="#F05032" />, title: "Git", href: "https://git-scm.com/" },
  { node: <SiJira color="#0052CC" />, title: "Jira", href: "https://www.atlassian.com/software/jira" },
  { node: <SiLanggraph color="#22C55E" />, title: "LangGraph", href: "https://www.langchain.com/langgraph" },
];

export default techLogos;
