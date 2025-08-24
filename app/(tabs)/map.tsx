import { Platform } from 'react-native';

// Platform-specific map implementations
if (Platform.OS === 'web') {
  // Use web implementation
  const MapWeb = require('./map.web').default;
  export default MapWeb;
} else {
  // Use native implementation
  const MapNative = require('./map.native').default;
  export default MapNative;
}