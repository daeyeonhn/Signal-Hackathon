import { randomBytes, createHash } from "node:crypto";
const code = randomBytes(32).toString("base64url");
console.log("One-time setup code (keep private): " + code);
console.log("ORGANIZER_SETUP_HASH=" + createHash("sha256").update(code).digest("hex"));
console.log("Store only the hash in the server environment. Enter the code on the Organizer access page.");
