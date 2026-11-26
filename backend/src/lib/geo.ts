export type Coordinates = { latitude: number; longitude: number };

const EARTH_MEAN_RADIUS_METERS = 6_371_008.8;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

export const distanceInMeters = (from: Coordinates, to: Coordinates): number => {
  const deltaLatitude = toRadians(to.latitude - from.latitude);
  const deltaLongitude = toRadians(to.longitude - from.longitude);
  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(deltaLongitude / 2) ** 2;
  return 2 * EARTH_MEAN_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(haversine)));
};
