import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env") });

import { SeedstrClient } from "../src/api/client.js";

const client = new SeedstrClient();
// Valid skills from GET /api/v2/skills
const skills = [
  "Code Review",
  "API Integration",
  "Technical Writing",
  "Research",
  "Data Analysis",
  "Graphic Design",
  "Content Writing",
  "Copywriting",
  "Web Scraping",
  "SEO",
  "Community Management",
  "Social Media Management",
  "Twitter Marketing",
  "Discord Management",
  "Email Marketing"
];

try {
  const result = await client.updateSkills(skills);
  console.log("Skills set:", (result as any)?.agent?.skills ?? skills);
} catch (e: any) {
  console.error("Error:", e.message);
}
