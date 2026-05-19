import { Buffer } from "node:buffer";

// Image generation is not used in this app.
// These are stub functions to prevent startup errors.

export async function generateImageBuffer(
  _prompt: string,
  _size: "1024x1024" | "512x512" | "256x256" = "1024x1024"
): Promise<Buffer> {
  throw new Error("Image generation is not configured.");
}

export async function editImages(
  _imageFiles: string[],
  _prompt: string,
  _outputPath?: string
): Promise<Buffer> {
  throw new Error("Image editing is not configured.");
}
