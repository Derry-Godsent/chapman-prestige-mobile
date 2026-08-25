#!/usr/bin/env node
import QRCode from "qrcode";

const url = process.argv.slice(2).find((argument) => argument !== "--");

if (!url) {
  console.error('Usage: node scripts/generate_qr.mjs "exps://..."');
  process.exit(1);
}

await QRCode.toFile("expo-qr-code.png", url, { width: 512 });
console.log(`✅ QR code saved to expo-qr-code.png`);
