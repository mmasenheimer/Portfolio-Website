const projects = [
  {
    title: "CATalyst Studios Scheduling",
    images: [
      {
        alt: "CATalyst Studios Scheduling dashboard",
        placeholder: "https://placehold.co/531x526",
        src: "https://placehold.co/531x526?text=Dashboard",
      },
      {
        alt: "CATalyst Studios Scheduling calendar view",
        placeholder: "https://placehold.co/531x526",
        src: "https://placehold.co/531x526?text=Schedule",
      },
      {
        alt: "CATalyst Studios Scheduling shift requests",
        placeholder: "https://placehold.co/531x526",
        src: "https://placehold.co/531x526?text=Shift+Requests",
      },
    ],
    description1:
      "A scheduling platform built to replace a legacy paid service for the U of A Libraries makerspace, saving roughly $350/year while adding maker-studio-specific scheduling logic and full workplace Slack integration.",
    description2:
      "Built with Node, Express, React, and MongoDB, it features drag-and-drop scheduling management and shift request workflows used daily by 24 employees, secured with JWT auth, role-based access control, and server-side rate limiting across the stack.",
    linkHref: "https://github.com/mmasenheimer/catalyst-scheduling-app",
    linkText: "CATalyst Scheduling Repository",
  },
  {
    title: "ECOMAP",
    images: [
      {
        alt: "ECOMAP map and trip planner",
        placeholder: "https://placehold.co/531x526",
        src: "https://placehold.co/531x526?text=Trip+Planner",
      },
      {
        alt: "ECOMAP eco-score leaderboard",
        placeholder: "https://placehold.co/531x526",
        src: "https://placehold.co/531x526?text=Leaderboard",
      },
      {
        alt: "ECOMAP social feed",
        placeholder: "https://placehold.co/531x526",
        src: "https://placehold.co/531x526?text=Feed",
      },
    ],
    description1:
      "Built at HackArizona 2026, ECOMAP is a full-stack, cloud-based app connected to the Google Maps API that optimizes trips across up to 5 combined modes of transportation, with eco-score leaderboards and a social-media style UI.",
    description2:
      "The backend, built with Node.js, Express, Python, and MongoDB, implements 20 REST API endpoints for automated eco-point distribution, real-time leaderboards over WebSockets, and session-based authentication.",
    linkHref: "https://github.com/mmasenheimer/ecomap",
    linkText: "ECOMAP Repository",
  },
  {
    title: "Chess Engine with AI Bot",
    imageAlt: "Chess engine board preview",
    imagePlaceholder: "https://placehold.co/531x526",
    imageSrc: "/images/chess.jpg",
    description1:
      "Classic chess engine supporting all move types and rules, with a variable difficulty opponent, implemented in Python. Features a move log and highlights, with board reset and move undo.",
    description2:
      "The AI opponent uses a NegaMax algorithm with alpha-beta pruning and adjustable search depth, enabling multi-move planning while reducing node evaluations by roughly 70%. Evaluation functions combine material and positional scoring, allowing the engine to assess around 1,000 moves per turn.",
    linkHref: "https://github.com/mmasenheimer/chess-engine",
    linkText: "Chess Repository",
  },
  {
    title: "Automatic Hydroponic Garden",
    imageAlt: "Hydroponic garden build",
    imagePlaceholder: "https://placehold.co/531x526",
    imageSrc: "images/hydro.jpg",
    description1:
      "During Spring 2025, I interned for the U of A makerspace, CATalyst Studios. Our intern cohort decided to make a hydroponic garden. I used a RaspberryPi and Python to automate the watering process.",
    description2:
      "I used a Pi5 along with relays, breakout boards, clock modules, lcd screens, and water level sensors to create a UI, displaying messages about the current status of the pump and to control the flow of water.",
    linkHref: "https://github.com/mmasenheimer/library-hydro-garden",
    linkText: "Read More!",
  },
  {
    title: "MakerThread",
    imageAlt: "MakerThread app preview",
    imagePlaceholder: "https://placehold.co/531x526",
    imageSrc: "/images/spotifyjava.jpg",
    description1:
      "MakerThread is a blog-style social media app built in SpringBoot for college students to share and explore makerspace projects. By connecting ideas with technology, it allows users to create posts with tags and topics and browse a home page to discover others' projects and inspiration.",
    description2:
      "Features a login system with Spring Security and JWT, PostgreSQL and Spring JPA for data management, and React/Tailwind for the frontend. Implements Maven and docker to assist with dependency management and containerization. Currently working on cloud deployment.",
    linkHref: "https://github.com/mmasenheimer/Maker-Thread",
    linkText: "MakerThread Repository",
  },
];

export default projects;
