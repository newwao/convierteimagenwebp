self.onmessage = async (e) => {
  const { id, buffer, type, quality, width, height, rotation, background } = e.data;
  try {
    const inputBlob = new Blob([buffer]);
    const bitmap = await createImageBitmap(inputBlob);

    const rotated = ((rotation % 360) + 360) % 360;
    const swap = rotated === 90 || rotated === 270;
    const outW = swap ? height : width;
    const outH = swap ? width : height;

    const canvas = new OffscreenCanvas(outW, outH);
    const ctx = canvas.getContext("2d", { alpha: true });

    if (background === "white") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, outW, outH);
    } else if (background === "black") {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, outW, outH);
    }

    ctx.translate(outW / 2, outH / 2);
    ctx.rotate(rotated * Math.PI / 180);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, -width / 2, -height / 2, width, height);
    bitmap.close();

    const blob = await canvas.convertToBlob({ type, quality });
    const arrayBuffer = await blob.arrayBuffer();
    self.postMessage({ id, ok: true, buffer: arrayBuffer, type: blob.type, size: blob.size, outW, outH }, [arrayBuffer]);
  } catch (err) {
    self.postMessage({ id, ok: false, error: err?.message || String(err) });
  }
};
