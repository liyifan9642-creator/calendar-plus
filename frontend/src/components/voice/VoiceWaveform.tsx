import React, { useMemo } from 'react';
import { useVoice } from '@/hooks';

interface VoiceWaveformProps {
  barCount?: number;
  height?: number;
  barWidth?: number;
  gap?: number;
}

const VoiceWaveform: React.FC<VoiceWaveformProps> = ({
  barCount = 24,
  height = 48,
  barWidth = 3,
  gap = 2,
}) => {
  const { volume } = useVoice();

  // Generate bar heights based on volume with some randomization for visual effect
  const bars = useMemo(() => {
    return Array.from({ length: barCount }, (_, i) => {
      // Create a wave pattern with volume influence
      const center = barCount / 2;
      const distFromCenter = Math.abs(i - center) / center;
      const baseScale = 1 - distFromCenter * 0.6; // Bars near center are taller
      const noise = 0.3 + Math.random() * 0.7; // Random variation
      const volumeScale = Math.max(0.15, volume); // Minimum height so bars are always visible
      return baseScale * noise * volumeScale;
    });
  }, [barCount, volume]);

  // Color gradient based on volume
  const getColor = (index: number): string => {
    const ratio = index / barCount;
    if (volume > 0.7) {
      // Red to orange when loud
      return `hsl(${10 + ratio * 20}, 90%, ${50 + ratio * 10}%)`;
    } else if (volume > 0.3) {
      // Orange to blue at medium
      return `hsl(${200 + ratio * 40}, 70%, ${45 + ratio * 15}%)`;
    }
    // Blue tones when quiet
    return `hsl(${210 + ratio * 30}, 60%, ${50 + ratio * 10}%)`;
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: `${gap}px`,
        height: `${height}px`,
        padding: '0 8px',
      }}
    >
      {bars.map((scale, index) => {
        const barHeight = Math.max(4, Math.round(height * scale));
        return (
          <div
            key={index}
            style={{
              width: `${barWidth}px`,
              height: `${barHeight}px`,
              backgroundColor: getColor(index),
              borderRadius: `${barWidth / 2}px`,
              transition: 'height 0.1s ease-out, background-color 0.3s ease',
              opacity: 0.7 + scale * 0.3,
            }}
          />
        );
      })}
    </div>
  );
};

export default VoiceWaveform;
