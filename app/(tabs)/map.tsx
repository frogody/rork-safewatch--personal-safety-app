import { Platform } from 'react-native';

// Platform-specific map implementations
const MapComponent = Platform.OS === 'web' 
  ? require('./map.web').default
  : require('./map.native').default;

export default MapComponent;