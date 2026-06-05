import { readFile } from "node:fs/promises";
import path from "node:path";

export async function loadLegalText(filename: string): Promise<string> {
  const filePath = path.join(process.cwd(), "lib/legal", filename);
  return readFile(filePath, "utf-8");
}
