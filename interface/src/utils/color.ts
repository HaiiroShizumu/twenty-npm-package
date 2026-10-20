export type RgbColor = [number, number, number];

export const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const isHexColor = (value: unknown): value is string =>
  typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

export const parseHexColor = (hex: string): RgbColor => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

export const formatHexColor = ([red, green, blue]: RgbColor) =>
  `#${[red, green, blue]
    .map((channel) =>
      Math.round(clampNumber(channel, 0, 255))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;

const channelToLinear = (channel: number) => {
  const normalized = channel / 255;

  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
};

const linearToChannel = (linear: number) => {
  const clamped = clampNumber(linear, 0, 1);
  const normalized =
    clamped <= 0.0031308
      ? clamped * 12.92
      : 1.055 * clamped ** (1 / 2.4) - 0.055;

  return normalized * 255;
};

export const getRelativeLuminance = ([red, green, blue]: RgbColor) =>
  0.2126 * channelToLinear(red) +
  0.7152 * channelToLinear(green) +
  0.0722 * channelToLinear(blue);

export const getHexLuminance = (hex: string) =>
  getRelativeLuminance(parseHexColor(hex));

export const getContrastRatio = (
  firstLuminance: number,
  secondLuminance: number,
) => {
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);

  return (lighter + 0.05) / (darker + 0.05);
};

// Browsers blend translucent layers in gamma-encoded sRGB, not in linear
// light, so luminances are blended through their gray channel value
export const blendLuminance = (
  topLuminance: number,
  bottomLuminance: number,
  topAlpha: number,
) => {
  const alpha = clampNumber(topAlpha, 0, 1);
  const channel =
    linearToChannel(topLuminance) * alpha +
    linearToChannel(bottomLuminance) * (1 - alpha);

  return channelToLinear(channel);
};

export const scaleLuminanceBrightness = (luminance: number, factor: number) =>
  channelToLinear(clampNumber(linearToChannel(luminance) * factor, 0, 255));

export const mixHexColors = (
  firstHex: string,
  secondHex: string,
  firstWeight: number,
) => {
  const first = parseHexColor(firstHex);
  const second = parseHexColor(secondHex);
  const weight = clampNumber(firstWeight, 0, 1);

  return formatHexColor([
    first[0] * weight + second[0] * (1 - weight),
    first[1] * weight + second[1] * (1 - weight),
    first[2] * weight + second[2] * (1 - weight),
  ]);
};

// Moves a color toward black or white by the smallest step that lands its
// luminance inside the range; hue is kept as far as the range allows
export const clampHexLuminance = (
  hex: string,
  minLuminance: number,
  maxLuminance: number,
) => {
  const luminance = getHexLuminance(hex);

  if (luminance >= minLuminance && luminance <= maxLuminance) {
    return hex.toLowerCase();
  }

  const target = luminance > maxLuminance ? '#000000' : '#ffffff';
  const isInRange = (candidate: string) => {
    const candidateLuminance = getHexLuminance(candidate);

    return (
      candidateLuminance >= minLuminance && candidateLuminance <= maxLuminance
    );
  };

  let low = 0;
  let high = 1;

  for (let step = 0; step < 24; step++) {
    const middle = (low + high) / 2;

    if (isInRange(mixHexColors(target, hex, middle))) {
      high = middle;
    } else {
      low = middle;
    }
  }

  return mixHexColors(target, hex, high);
};
