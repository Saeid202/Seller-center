import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config(); // fallback to .env if present
import { runNormalizedAlibabaScrape } from "./run-alibaba-scrape";
import {
  startImportJob,
  insertImportedProducts,
  completeImportJob,
} from "@/lib/scraper/jobs";

async function main() {
  const query = process.argv[2] ?? "power bank";
  const max = Number.parseInt(process.argv[3] ?? "5", 10);

  const jobId = await startImportJob({ marketplace: "alibaba", query, maxResults: max });
  const result = await runNormalizedAlibabaScrape(query, max);

  const insertedIds = await insertImportedProducts(
    jobId,
    result.normalized.map((normalized, index) => ({
      normalized,
      raw: result.products[index],
    })),
  );

  await completeImportJob(jobId);
  console.log(`Imported ${insertedIds.length} products for ${query}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

