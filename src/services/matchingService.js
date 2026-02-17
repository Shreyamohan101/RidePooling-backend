const RideRequest = require('../models/RideRequest');
const PoolGroup = require('../models/PoolGroup');
const logger = require('../utils/logger');
const { calculateDistance, calculateRoute } = require('../utils/geo');
const config = require('../config');

class MatchingService {
  
  async findCompatibleRides(rideRequest) {
    try {
      const { pickup, dropoff, passengers, luggage, preferences } = rideRequest;
      const maxDetour = preferences.maxDetourTolerance || config.ride.maxDetourToleranceKm;

      const nearbyRides = await RideRequest.find({
        _id: { $ne: rideRequest._id },
        status: 'pending',
        'preferences.allowSharing': true,
        'pickup.coordinates': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: pickup.coordinates
            },
            $maxDistance: config.ride.matchingRadiusKm * 1000
          }
        }
      }).limit(20);

      const compatibleRides = [];

      for (const ride of nearbyRides) {
        if (this.areRidesCompatible(rideRequest, ride, maxDetour)) {
          const score = this.calculateCompatibilityScore(rideRequest, ride);
          compatibleRides.push({ ride, score });
        }
      }

      compatibleRides.sort((a, b) => b.score - a.score);

      return compatibleRides.map(item => item.ride);
    } catch (error) {
      logger.error('Error finding compatible rides:', error);
      throw error;
    }
  }

  /**
   * Check if two rides are compatible for pooling
   */
  areRidesCompatible(ride1, ride2, maxDetour) {
    // Check pickup proximity (within 2km)
    const pickupDistance = calculateDistance(
      ride1.pickup.coordinates,
      ride2.pickup.coordinates
    );
    
    if (pickupDistance > 2) return false;

    // Check dropoff proximity (within 3km)
    const dropoffDistance = calculateDistance(
      ride1.dropoff.coordinates,
      ride2.dropoff.coordinates
    );
    
    if (dropoffDistance > 3) return false;

    // Check if detour is acceptable
    const directDistance1 = calculateDistance(
      ride1.pickup.coordinates,
      ride1.dropoff.coordinates
    );
    
    const directDistance2 = calculateDistance(
      ride2.pickup.coordinates,
      ride2.dropoff.coordinates
    );

    // Calculate potential shared route distance
    const sharedDistance = this.calculateSharedRouteDistance(ride1, ride2);
    
    const detour1 = sharedDistance - directDistance1;
    const detour2 = sharedDistance - directDistance2;

    return detour1 <= maxDetour && detour2 <= maxDetour;
  }

 
  calculateCompatibilityScore(ride1, ride2) {
    let score = 100;

    const pickupDistance = calculateDistance(
      ride1.pickup.coordinates,
      ride2.pickup.coordinates
    );
    score -= pickupDistance * 5;

    const dropoffDistance = calculateDistance(
      ride1.dropoff.coordinates,
      ride2.dropoff.coordinates
    );
    score -= dropoffDistance * 3;

    const timeDiff = Math.abs(
      new Date(ride1.requestedAt) - new Date(ride2.requestedAt)
    );
    const minutesDiff = timeDiff / 1000 / 60;
    score += Math.max(0, 20 - minutesDiff);

    const directionSimilarity = this.calculateDirectionSimilarity(ride1, ride2);
    score += directionSimilarity * 30;

    return Math.max(0, score);
  }

 
  calculateSharedRouteDistance(ride1, ride2) {
    const d1 = calculateDistance(ride1.pickup.coordinates, ride2.pickup.coordinates);
    const d2 = calculateDistance(ride1.pickup.coordinates, ride1.dropoff.coordinates);
    const d3 = calculateDistance(ride1.dropoff.coordinates, ride2.dropoff.coordinates);
    
    return d1 + d2 + d3;
  }

  calculateDirectionSimilarity(ride1, ride2) {
    const bearing1 = this.calculateBearing(
      ride1.pickup.coordinates,
      ride1.dropoff.coordinates
    );
    
    const bearing2 = this.calculateBearing(
      ride2.pickup.coordinates,
      ride2.dropoff.coordinates
    );

    const diff = Math.abs(bearing1 - bearing2);
    const normalizedDiff = Math.min(diff, 360 - diff);
    
    return 1 - (normalizedDiff / 180);
  }

  calculateBearing(coord1, coord2) {
    const [lon1, lat1] = coord1;
    const [lon2, lat2] = coord2;
    
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    
    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    bearing = (bearing + 360) % 360;
    
    return bearing;
  }

    async createOrFindPoolGroup(rides) {
    try {
      for (const ride of rides) {
        if (ride.poolGroup) {
          const pool = await PoolGroup.findById(ride.poolGroup);
          
          if (pool && pool.status === 'forming') {
            const totalPassengers = rides.reduce((sum, r) => sum + r.passengers, 0);
            const totalLuggage = rides.reduce((sum, r) => sum + r.luggage, 0);
            
            if (pool.canAccommodate(totalPassengers - ride.passengers, totalLuggage - ride.luggage)) {
              return pool;
            }
          }
        }
      }

      const totalPassengers = rides.reduce((sum, r) => sum + r.passengers, 0);
      const totalLuggage = rides.reduce((sum, r) => sum + r.luggage, 0);

      const pool = new PoolGroup({
        rides: rides.map(r => r._id),
        status: 'forming',
        capacity: {
          passengers: {
            current: totalPassengers,
            max: 4
          },
          luggage: {
            current: totalLuggage,
            max: 8
          }
        }
      });

      await pool.save();
      
      await RideRequest.updateMany(
        { _id: { $in: rides.map(r => r._id) } },
        { 
          $set: { 
            poolGroup: pool._id,
            status: 'matched'
          }
        }
      );

      logger.info(`Created pool group ${pool._id} with ${rides.length} rides`);
      
      return pool;
    } catch (error) {
      logger.error('Error creating pool group:', error);
      throw error;
    }
  }

  async optimizeRoute(poolGroup) {
    try {
      const rides = await RideRequest.find({ _id: { $in: poolGroup.rides } });
      
      const waypoints = [];
      
      rides.forEach(ride => {
        waypoints.push({
          rideId: ride._id,
          type: 'pickup',
          location: ride.pickup,
          coordinates: ride.pickup.coordinates,
          priority: 1
        });
        
        waypoints.push({
          rideId: ride._id,
          type: 'dropoff',
          location: ride.dropoff,
          coordinates: ride.dropoff.coordinates,
          priority: 2
        });
      });

      const optimizedWaypoints = this.optimizeWaypoints(waypoints);
      
      let totalDistance = 0;
      let totalDuration = 0;
      
      for (let i = 0; i < optimizedWaypoints.length - 1; i++) {
        const distance = calculateDistance(
          optimizedWaypoints[i].coordinates,
          optimizedWaypoints[i + 1].coordinates
        );
        totalDistance += distance;
        totalDuration += distance / 40 * 60; // Assuming 40 km/h average speed
      }

      poolGroup.route = {
        optimizedWaypoints: optimizedWaypoints.map((wp, index) => ({
          rideId: wp.rideId,
          type: wp.type,
          location: {
            type: 'Point',
            coordinates: wp.coordinates
          },
          sequence: index + 1,
          estimatedTime: new Date(Date.now() + totalDuration * 60000)
        })),
        totalDistance,
        totalDuration
      };

      await poolGroup.save();
      
      logger.info(`Optimized route for pool group ${poolGroup._id}`);
      
      return poolGroup;
    } catch (error) {
      logger.error('Error optimizing route:', error);
      throw error;
    }
  }


  optimizeWaypoints(waypoints) {
    if (waypoints.length <= 2) return waypoints;

    const optimized = [];
    const remaining = [...waypoints];
    
    const firstPickup = remaining.find(wp => wp.type === 'pickup');
    optimized.push(firstPickup);
    remaining.splice(remaining.indexOf(firstPickup), 1);

    while (remaining.length > 0) {
      const current = optimized[optimized.length - 1];
      let nearest = null;
      let minDistance = Infinity;

    
      for (const wp of remaining) {
      
        const ridePickedUp = optimized.some(
          o => o.rideId.toString() === wp.rideId.toString() && o.type === 'pickup'
        );
        
        if (wp.type === 'dropoff' && !ridePickedUp) continue;

        const distance = calculateDistance(current.coordinates, wp.coordinates);
        
        if (distance < minDistance) {
          minDistance = distance;
          nearest = wp;
        }
      }

      if (nearest) {
        optimized.push(nearest);
        remaining.splice(remaining.indexOf(nearest), 1);
      } else {
      
        optimized.push(remaining[0]);
        remaining.shift();
      }
    }

    return optimized;
  }
}

module.exports = new MatchingService();