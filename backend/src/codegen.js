import { customAlphabet } from "nanoid";

const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const nano = customAlphabet(alphabet, 6);

export function generateTicketCode() {
  return `CLV-${nano()}`;
}

