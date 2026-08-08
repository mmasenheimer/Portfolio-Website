export const ibm = {
  title: "IBM",
  role: "Backend Software Engineering Intern",
  location: "Tucson, AZ",
  dates: "May 2026 - Present",
  imageAlt: "IBM",
  imagePlaceholder: "https://placehold.co/700x700",
  imageSrc: "https://placehold.co/700x700?text=IBM",
  summary:
    "Built an agentic BIA ingestion pipeline for IBM's Storage Defender product, combining LLM-based sanitization, multi-modal OCR, and governance-mapped extraction, with a LangGraph ReAct agent handling autonomous gap analysis.",
  pipeline: ["Sanitize", "Extract & OCR", "Map to Governance", "Score Gaps"],
  stats: [
    { value: "18", label: "LLM Configs Tuned" },
    { value: "61+", label: "Doc Test Corpus" },
    { value: "15+", label: "Metric Fields" },
    { value: "3-Tier", label: "Async Test Suite" },
  ],
};

export const cern = {
  title: "CERN (University of Arizona)",
  role: "Embedded Software Researcher",
  location: "Tucson, AZ",
  dates: "Apr 2025 - Present",
  imageAlt: "CERN ATLAS Experiment",
  imagePlaceholder: "https://placehold.co/700x700",
  imageSrc: "https://placehold.co/700x700?text=CERN+%2F+ATLAS",
  summary:
    "Researching quantized feedforward neural networks for the ATLAS forward calorimeter, and developing the kernel tile code and programmable logic that runs them on AMD Versal AI Engines.",
  headlineStats: [
    { value: "7M", label: "packets / second" },
    { value: "97%", label: "accuracy" },
  ],
  ctaHref: "#featured",
  ctaText: "Read the full research",
};

export const makerStudio = {
  title: "University of Arizona Libraries",
  role: "Maker Studio Fabrication Lead",
  location: "Tucson, AZ",
  dates: "Jan 2025 - Present",
  imageAlt: "University of Arizona Libraries Maker Studio",
  imagePlaceholder: "https://placehold.co/700x700",
  imageSrc: "https://placehold.co/700x700?text=Maker+Studio",
  summary:
    "Lead a team of studio assistants running all fabrication operations in the library makerspace, keeping equipment running and students certified across the shop.",
  skills: ["3D Printing", "Laser Cutting", "CNC Milling", "Woodshop"],
  stats: [
    { value: "8", label: "Studio Assistants" },
    { value: "25", label: "Machines Maintained" },
    { value: "50+", label: "Students / Week" },
  ],
};

const experience = [ibm, cern, makerStudio];

export default experience;
