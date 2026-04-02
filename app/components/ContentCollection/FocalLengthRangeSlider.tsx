'use client';

import { type CSSProperties } from 'react';

import cbStyles from '../Content/ContentComponent.module.scss';

interface FocalLengthRangeSliderProps {
  /** Sorted array of distinct focal length values available in the collection */
  stops: number[];
  /** Active range as [min, max] focal length values, or null when inactive */
  value: readonly [number, number] | null;
  onChange: (range: readonly [number, number] | null) => void;
}

const rangeInputStyle: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  background: 'transparent',
  pointerEvents: 'none',
  margin: 0,
  WebkitAppearance: 'none',
  appearance: 'none',
};

export default function FocalLengthRangeSlider({
  stops,
  value,
  onChange,
}: FocalLengthRangeSliderProps) {
  const lastIdx = stops.length - 1;

  // Map focal length values to stop indices
  const currentMinIdx = value ? stops.indexOf(value[0]) : 0;
  const currentMaxIdx = value ? stops.indexOf(value[1]) : lastIdx;
  const isActive = value !== null;

  const stopAt = (idx: number): number => stops[idx] as number;

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIdx = Math.min(Number(e.target.value), currentMaxIdx);
    onChange([stopAt(newIdx), stopAt(currentMaxIdx)]);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIdx = Math.max(Number(e.target.value), currentMinIdx);
    onChange([stopAt(currentMinIdx), stopAt(newIdx)]);
  };

  return (
    <div className={cbStyles.focalLengthSlider}>
      <div className={cbStyles.focalLengthHeader}>
        <span className={cbStyles.focalLengthLabel}>
          {stopAt(currentMinIdx)}mm – {stopAt(currentMaxIdx)}mm
        </span>
        {isActive && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className={cbStyles.focalLengthReset}
            aria-label="Clear focal length filter"
          >
            ×
          </button>
        )}
      </div>
      <div className={cbStyles.rangeSliderTrack}>
        <input
          type="range"
          min={0}
          max={lastIdx}
          step={1}
          value={currentMinIdx}
          onChange={handleMinChange}
          style={rangeInputStyle}
          aria-label="Minimum focal length"
        />
        <input
          type="range"
          min={0}
          max={lastIdx}
          step={1}
          value={currentMaxIdx}
          onChange={handleMaxChange}
          style={rangeInputStyle}
          aria-label="Maximum focal length"
        />
      </div>
    </div>
  );
}
