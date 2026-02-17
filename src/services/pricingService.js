const config = require('../config');
const { calculateDistance } = require('../utils/geo');
const logger = require('../utils/logger');

class PricingService {
  calculateRidePrice(distance, passengers = 1, isShared = false, surgeFactor = 1.0) {
    const { basePrice, pricePerKm, sharedRideDiscount } = config.pricing;
    
    let price = basePrice + (distance * pricePerKm);
    
    price *= surgeFactor;
    
    if (isShared) {
      price *= (1 - sharedRideDiscount);
    }
    
    return Math.round(price * 100) / 100;
  }

  async calculateRideRequestPrice(rideRequest) {
    try {
      const distance = calculateDistance(
        rideRequest.pickup.coordinates,
        rideRequest.dropoff.coordinates
      );
      
      const surgeFactor = await this.getSurgeFactor(rideRequest.pickup.coordinates);
      const isShared = rideRequest.preferences.allowSharing;
      
      return this.calculateRidePrice(
        distance,
        rideRequest.passengers,
        isShared,
        surgeFactor
      );
    } catch (error) {
      logger.error('Error calculating ride request price:', error);
      throw error;
    }
  }

  async calculatePoolGroupPricing(poolGroup, rides) {
    try {
      const totalDistance = poolGroup.route.totalDistance || 0;
      const basePrice = config.pricing.basePrice * rides.length;
      const distancePrice = totalDistance * config.pricing.pricePerKm;
      const totalPrice = basePrice + distancePrice;

      const pricePerRide = [];
      let allocatedPrice = 0;

      for (const ride of rides) {
        const directDistance = calculateDistance(
          ride.pickup.coordinates,
          ride.dropoff.coordinates
        );

        const distanceRatio = directDistance / totalDistance || 1 / rides.length;
        let ridePrice = totalPrice * distanceRatio;

        const discount = ridePrice * config.pricing.sharedRideDiscount;
        ridePrice -= discount;

        ridePrice = Math.max(ridePrice, config.pricing.basePrice);

        pricePerRide.push({
          rideId: ride._id,
          price: Math.round(ridePrice * 100) / 100,
          discount: Math.round(discount * 100) / 100
        });

        allocatedPrice += ridePrice;
      }

      if (pricePerRide.length > 0) {
        const adjustment = totalPrice - allocatedPrice;
        pricePerRide[0].price += Math.round(adjustment * 100) / 100;
      }

      return {
        basePrice: Math.round(basePrice * 100) / 100,
        totalPrice: Math.round(totalPrice * 100) / 100,
        pricePerRide
      };
    } catch (error) {
      logger.error('Error calculating pool group pricing:', error);
      throw error;
    }
  }

  async getSurgeFactor(coordinates) {
    try {
      const hour = new Date().getHours();
      
      if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20)) {
        return 1.5;
      }
      
      return 1.0;
    } catch (error) {
      logger.error('Error getting surge factor:', error);
      return 1.0;
    }
  }

  calculateSavings(originalPrice, pooledPrice) {
    const savings = originalPrice - pooledPrice;
    const savingsPercentage = (savings / originalPrice) * 100;
    
    return {
      amount: Math.round(savings * 100) / 100,
      percentage: Math.round(savingsPercentage * 100) / 100
    };
  }

  validatePrice(price) {
    if (typeof price !== 'number' || isNaN(price)) {
      throw new Error('Invalid price: must be a number');
    }
    
    if (price < config.pricing.basePrice) {
      throw new Error(`Price cannot be less than base price: ${config.pricing.basePrice}`);
    }
    
    if (price > 10000) {
      throw new Error('Price exceeds maximum allowed: 10000');
    }
    
    return true;
  }

    applyDiscount(price, discountCode) {
    const discounts = {
      'FIRST10': 0.10,
      'POOL20': 0.20,
      'AIRPORT15': 0.15
    };
    
    const discountRate = discounts[discountCode] || 0;
    const discountAmount = price * discountRate;
    const finalPrice = price - discountAmount;
    
    return {
      originalPrice: Math.round(price * 100) / 100,
      discountAmount: Math.round(discountAmount * 100) / 100,
      finalPrice: Math.round(finalPrice * 100) / 100,
      discountCode
    };
  }
}

module.exports = new PricingService();