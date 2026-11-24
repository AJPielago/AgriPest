/**
 * Client-side image compression and lightweight exposure/sharpness pre-check.
 * Downscales large phone camera photos (e.g., 4000x3000) to <=1280px JPEG before upload,
 * cutting mobile bandwidth by ~80% while keeping full YOLO inference resolution.
 */

const analyzeImageQuality = (canvas) => {
  try {
    const sampleSize = 96;
    const probe = document.createElement('canvas');
    probe.width = sampleSize;
    probe.height = sampleSize;
    const pctx = probe.getContext('2d', { willReadFrequently: true });
    pctx.drawImage(canvas, 0, 0, sampleSize, sampleSize);
    const { data } = pctx.getImageData(0, 0, sampleSize, sampleSize);

    const gray = new Float32Array(sampleSize * sampleSize);
    let sumLum = 0;
    for (let i = 0, px = 0; i < data.length; i += 4, px += 1) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      gray[px] = lum;
      sumLum += lum;
    }
    const avgBrightness = sumLum / gray.length;

    // Discrete Laplacian variance for blur estimation
    let lapSum = 0;
    let lapSqSum = 0;
    let count = 0;
    for (let y = 1; y < sampleSize - 1; y += 1) {
      for (let x = 1; x < sampleSize - 1; x += 1) {
        const idx = y * sampleSize + x;
        const lap =
          gray[idx - sampleSize] +
          gray[idx + sampleSize] +
          gray[idx - 1] +
          gray[idx + 1] -
          4 * gray[idx];
        lapSum += lap;
        lapSqSum += lap * lap;
        count += 1;
      }
    }
    const meanLap = lapSum / count;
    const sharpnessVar = lapSqSum / count - meanLap * meanLap;

    if (avgBrightness < 38) {
      return { isDark: true, isBlurry: false, avgBrightness, sharpnessVar };
    }
    if (sharpnessVar < 35) {
      return { isDark: false, isBlurry: true, avgBrightness, sharpnessVar };
    }
    return { isDark: false, isBlurry: false, avgBrightness, sharpnessVar };
  } catch {
    return { isDark: false, isBlurry: false };
  }
};

export const compressAndInspectImage = (file, maxDimension = 1280, quality = 0.85) =>
  new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        let { naturalWidth: w, naturalHeight: h } = img;
        const scale = Math.min(1, maxDimension / Math.max(w, h));
        const targetW = Math.max(1, Math.round(w * scale));
        const targetH = Math.max(1, Math.round(h * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, targetW, targetH);

        const qualityReport = analyzeImageQuality(canvas);

        // Only re-encode if we actually downscaled or the file is > 800KB
        if (scale === 1 && file.size <= 800 * 1024) {
          URL.revokeObjectURL(objectUrl);
          resolve({ file, qualityReport });
          return;
        }

        const outType = file.type === 'image/png' ? 'image/jpeg' : (file.type || 'image/jpeg');
        const outName = file.name.replace(/\.[^.]+$/, '') + '.jpg';

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (blob && blob.size < file.size) {
              resolve({
                file: new File([blob], outName, { type: outType }),
                qualityReport,
              });
            } else {
              resolve({ file, qualityReport });
            }
          },
          outType,
          quality
        );
      } catch {
        URL.revokeObjectURL(objectUrl);
        resolve({ file, qualityReport: { isDark: false, isBlurry: false } });
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ file, qualityReport: { isDark: false, isBlurry: false } });
    };

    img.src = objectUrl;
  });
