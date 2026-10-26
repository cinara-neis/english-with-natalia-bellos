export async function profilePhoto(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)
    throw Error("Choose a JPG, PNG or WebP image up to 5 MB.");
  const image = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 96;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw Error("Photo editing is unavailable in this browser.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 96, 96);
    const side = Math.min(image.width, image.height);
    ctx.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, 96, 96);
    for (const quality of [0.8, 0.65, 0.45, 0.25]) {
      const data = canvas.toDataURL("image/jpeg", quality);
      if (data.length <= 6000) return data;
    }
    throw Error("This photo is too detailed. Choose a simpler image.");
  } finally { image.close(); }
}
