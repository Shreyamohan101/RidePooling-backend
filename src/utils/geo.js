
function calculateDistance(coord1, coord2) {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  
  const R = 6371; 
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function toDegrees(radians) {
  return radians * (180 / Math.PI);
}

function calculateBearing(coord1, coord2) {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  
  const dLon = toRadians(lon2 - lon1);
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);
  
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  
  let bearing = toDegrees(Math.atan2(y, x));
  bearing = (bearing + 360) % 360;
  
  return bearing;
}

function getDestinationPoint(coord, distance, bearing) {
  const [lon, lat] = coord;
  const R = 6371; 
  
  const bearingRad = toRadians(bearing);
  const latRad = toRadians(lat);
  
  const lat2Rad = Math.asin(
    Math.sin(latRad) * Math.cos(distance / R) +
    Math.cos(latRad) * Math.sin(distance / R) * Math.cos(bearingRad)
  );
  
  const lon2Rad = toRadians(lon) + Math.atan2(
    Math.sin(bearingRad) * Math.sin(distance / R) * Math.cos(latRad),
    Math.cos(distance / R) - Math.sin(latRad) * Math.sin(lat2Rad)
  );
  
  return [toDegrees(lon2Rad), toDegrees(lat2Rad)];
}

function isPointInBounds(point, bounds) {
  const [lon, lat] = point;
  return lon >= bounds.minLon &&
         lon <= bounds.maxLon &&
         lat >= bounds.minLat &&
         lat <= bounds.maxLat;
}

function getBoundingBox(center, radiusKm) {
  const [lon, lat] = center;
  
  const latDelta = radiusKm / 111.32;
  const lonDelta = radiusKm / (111.32 * Math.cos(toRadians(lat)));
  
  return {
    minLon: lon - lonDelta,
    maxLon: lon + lonDelta,
    minLat: lat - latDelta,
    maxLat: lat + latDelta
  };
}

function isValidCoordinates(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    return false;
  }
  
  const [lon, lat] = coordinates;
  
  return typeof lon === 'number' &&
         typeof lat === 'number' &&
         lon >= -180 && lon <= 180 &&
         lat >= -90 && lat <= 90;
}

function calculateRouteDistance(waypoints) {
  if (!waypoints || waypoints.length < 2) {
    return 0;
  }
  
  let totalDistance = 0;
  
  for (let i = 0; i < waypoints.length - 1; i++) {
    totalDistance += calculateDistance(waypoints[i], waypoints[i + 1]);
  }
  
  return Math.round(totalDistance * 100) / 100;
}

function findCenterPoint(coordinates) {
  if (!coordinates || coordinates.length === 0) {
    return [0, 0];
  }
  
  if (coordinates.length === 1) {
    return coordinates[0];
  }
  
  let sumLon = 0;
  let sumLat = 0;
  
  coordinates.forEach(([lon, lat]) => {
    sumLon += lon;
    sumLat += lat;
  });
  
  return [
    sumLon / coordinates.length,
    sumLat / coordinates.length
  ];
}

module.exports = {
  calculateDistance,
  calculateBearing,
  getDestinationPoint,
  isPointInBounds,
  getBoundingBox,
  isValidCoordinates,
  calculateRouteDistance,
  findCenterPoint,
  toRadians,
  toDegrees
};