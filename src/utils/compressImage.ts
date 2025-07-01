
export async function compressImage(file: File): Promise<{ compressedFile: File; originalSize: number; compressedSize: number }> {
  const originalSize = file.size;

  if (file.type === 'image/gif' || file.type === 'image/webp') {
    return { compressedFile: file, originalSize, compressedSize: originalSize };
  }

  const canvas = document.createElement('canvas');
  const img = new Image();

  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });

  let width = img.width;
  let height = img.height;
  const maxDimension = 2048;

  if (width > maxDimension || height > maxDimension) {
    if (width > height) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    } else {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }
  }

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (!['image/png', 'image/x-icon'].includes(file.type)) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
  }

  ctx.drawImage(img, 0, 0, width, height);

  const isPNG = ['image/png', 'image/x-icon'].includes(file.type);
  let bestBlob: Blob | null = null;
  let bestSize = originalSize;
  let bestQuality = 1;

  const getQualityRange = (size: number) => {
    if (size > 5 * 1024 * 1024) return { start: 0.6, end: 0.3, step: 0.05 };
    if (size > 2 * 1024 * 1024) return { start: 0.7, end: 0.4, step: 0.05 };
    if (size > 1024 * 1024) return { start: 0.8, end: 0.5, step: 0.1 };
    return { start: 0.9, end: 0.6, step: 0.1 };
  };

  const { start, end, step } = getQualityRange(originalSize);

  for (let quality = start; quality >= end; quality -= step) {
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob(
        (b) => resolve(b!),
        isPNG ? 'image/png' : 'image/jpeg',
        quality
      );
    });

    if (blob.size < bestSize) {
      bestBlob = blob;
      bestSize = blob.size;
      bestQuality = quality;
    }

    if (bestSize < originalSize * 0.3) break;
  }

  if (isPNG && (!bestBlob || bestSize > originalSize * 0.8)) {
    bestBlob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), 'image/png', 0.7);
    });
    bestSize = bestBlob.size;
    bestQuality = 0.7;
  }

  if (!bestBlob || bestSize >= originalSize) {
    return { compressedFile: file, originalSize, compressedSize: originalSize };
  }

  const compressedFile = new File(
    [bestBlob],
    file.name,
    { type: isPNG ? 'image/png' : 'image/jpeg' }
  );

  console.log(
    `Image compression results:\n` +
    `Original size: ${(originalSize / 1024).toFixed(2)}KB\n` +
    `Compressed size: ${(bestSize / 1024).toFixed(2)}KB\n` +
    `Reduction: ${((1 - bestSize / originalSize) * 100).toFixed(1)}%\n` +
    `Quality: ${bestQuality.toFixed(2)}\n` +
    `Dimensions: ${width}x${height}`
  );

  return { compressedFile, originalSize, compressedSize: bestSize };
}