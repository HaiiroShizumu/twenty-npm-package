import { type SkinBackdropSample } from '../types/SkinBackdropSample';
import { formatHexColor, getRelativeLuminance } from './color';

const SAMPLE_WIDTH = 48;
const SAMPLE_HEIGHT = 36;

const sampleCache = new Map<string, Promise<SkinBackdropSample>>();

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Wallpaper sample failed'));

    // Same-origin and data URLs never taint the canvas; remote URLs need CORS
    if (
      !url.startsWith('data:') &&
      !url.startsWith('blob:') &&
      !url.startsWith('/')
    ) {
      image.crossOrigin = 'anonymous';
    }

    image.src = url;
  });

const percentile = (sortedValues: number[], ratio: number) =>
  sortedValues[
    Math.min(sortedValues.length - 1, Math.floor(sortedValues.length * ratio))
  ];

const measure = (image: HTMLImageElement): SkinBackdropSample => {
  const canvas = document.createElement('canvas');

  canvas.width = SAMPLE_WIDTH;
  canvas.height = SAMPLE_HEIGHT;

  const context = canvas.getContext('2d', { willReadFrequently: true });

  if (context === null) {
    throw new Error('Canvas unavailable');
  }

  context.drawImage(image, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);

  const { data } = context.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
  const luminances: number[] = [];
  let weightedSum = 0;
  let weightSum = 0;
  let topSum = 0;
  let topCount = 0;
  let redSum = 0;
  let greenSum = 0;
  let blueSum = 0;

  for (let row = 0; row < SAMPLE_HEIGHT; row++) {
    const isTopThird = row < SAMPLE_HEIGHT / 3;
    const rowWeight = isTopThird
      ? 2.2
      : row < (2 * SAMPLE_HEIGHT) / 3
        ? 1.2
        : 0.7;

    for (let column = 0; column < SAMPLE_WIDTH; column++) {
      const index = (row * SAMPLE_WIDTH + column) * 4;
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      const luminance = getRelativeLuminance([red, green, blue]);

      luminances.push(luminance);
      weightedSum += luminance * rowWeight;
      weightSum += rowWeight;
      redSum += red;
      greenSum += green;
      blueSum += blue;

      if (isTopThird) {
        topSum += luminance;
        topCount++;
      }
    }
  }

  const sortedLuminances = [...luminances].sort(
    (first, second) => first - second,
  );
  const pixelCount = SAMPLE_WIDTH * SAMPLE_HEIGHT;

  return {
    luminance: weightedSum / weightSum,
    darkLuminance: percentile(sortedLuminances, 0.1),
    lightLuminance: percentile(sortedLuminances, 0.9),
    topLuminance: topSum / topCount,
    averageColor: formatHexColor([
      redSum / pixelCount,
      greenSum / pixelCount,
      blueSum / pixelCount,
    ]),
  };
};

export const sampleSkinBackdrop = (url: string) => {
  const cachedSample = sampleCache.get(url);

  if (cachedSample !== undefined) {
    return cachedSample;
  }

  const sample = loadImage(url).then(measure);

  sampleCache.set(url, sample);
  sample.catch(() => sampleCache.delete(url));

  return sample;
};
