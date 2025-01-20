import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const VIDEO_BASE_DIR = path.join(__dirname, "..", "demo", "uploads")

console.log("Listing files in:", VIDEO_BASE_DIR)

fs.readdir(VIDEO_BASE_DIR, (err, files) => {
  if (err) {
    console.error("Error reading directory:", err)
    return
  }

  console.log("Files found:")
  files.forEach((file) => {
    console.log(file)
  })
})

