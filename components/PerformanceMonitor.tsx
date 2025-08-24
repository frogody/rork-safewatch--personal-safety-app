import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

interface PerformanceMonitorProps {
  name: string;
  enabled?: boolean;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ 
  name, 
  enabled = __DEV__ 
}) => {
  const startTime = useRef<number>(Date.now());
  const renderCount = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;
    
    renderCount.current += 1;
    const renderTime = Date.now() - startTime.current;
    
    if (renderTime > 100) {
      console.warn(`🚨 Slow render detected in ${name}: ${renderTime}ms (render #${renderCount.current})`);
    } else if (__DEV__) {
      console.log(`⚡ ${name} rendered in ${renderTime}ms (render #${renderCount.current})`);
    }
    
    startTime.current = Date.now();
  });

  if (!enabled) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{name}</Text>
      <Text style={styles.text}>Renders: {renderCount.current}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
    borderRadius: 4,
    zIndex: 9999,
  },
  text: {
    color: Colors.text,
    fontSize: 10,
    fontFamily: 'monospace',
  },
});

export default PerformanceMonitor;
