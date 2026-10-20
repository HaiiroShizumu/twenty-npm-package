// Relative luminances of a wallpaper: weighted mean, its dark and light
// extremes (10th and 90th percentiles) and the mean of the top third,
// where page titles sit
export type SkinBackdropSample = {
  luminance: number;
  darkLuminance: number;
  lightLuminance: number;
  topLuminance: number;
  averageColor: string;
};
