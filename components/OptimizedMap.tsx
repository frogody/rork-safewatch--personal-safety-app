import React, { memo, useCallback, useRef } from 'react';
import MapView, { Marker, Circle, Polyline } from 'react-native-maps';
import { Dimensions } from 'react-native';
import type { LocationObject } from 'expo-location';

const { width, height } = Dimensions.get('window');

interface OptimizedMapProps {
  currentLocation: LocationObject['coords'] | null;
  alerts: Array<{
    id: string;
    location: { latitude: number; longitude: number };
    status: string;
  }>;
  routeCoords: Array<{ latitude: number; longitude: number }>;
  onMapReady?: () => void;
  onRegionChangeComplete?: (region: any) => void;
  style?: any;
}

const OptimizedMap = memo(({
  currentLocation,
  alerts,
  routeCoords,
  onMapReady,
  onRegionChangeComplete,
  style
}: OptimizedMapProps) => {
  const mapRef = useRef<MapView>(null);

  const handleMapReady = useCallback(() => {
    onMapReady?.();
  }, [onMapReady]);

  const handleRegionChangeComplete = useCallback((region: any) => {
    onRegionChangeComplete?.(region);
  }, [onRegionChangeComplete]);

  const initialRegion = currentLocation ? {
    latitude: currentLocation.latitude,
    longitude: currentLocation.longitude,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  } : undefined;

  return (
    <MapView
      ref={mapRef}
      style={style || { width, height }}
      initialRegion={initialRegion}
      onMapReady={handleMapReady}
      onRegionChangeComplete={handleRegionChangeComplete}
      showsUserLocation={true}
      showsMyLocationButton={true}
      showsCompass={true}
      showsScale={true}
      loadingEnabled={true}
      loadingIndicatorColor="#666666"
      loadingBackgroundColor="#ffffff"
    >
      {/* Current location marker */}
      {currentLocation && (
        <Marker
          coordinate={{
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
          }}
          title="Your Location"
          description="You are here"
          pinColor="blue"
        />
      )}

      {/* Alert markers */}
      {alerts.map((alert) => (
        <Marker
          key={alert.id}
          coordinate={alert.location}
          title="Alert"
          description="Safety alert in this area"
          pinColor={alert.status === 'active' ? 'red' : 'orange'}
        />
      ))}

      {/* Route polyline */}
      {routeCoords.length > 1 && (
        <Polyline
          coordinates={routeCoords}
          strokeColor="#007AFF"
          strokeWidth={3}
          lineDashPattern={[1]}
        />
      )}
    </MapView>
  );
});

OptimizedMap.displayName = 'OptimizedMap';

export default OptimizedMap;
