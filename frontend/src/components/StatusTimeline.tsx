import React from 'react';

export interface StatusStep {
  key: string;
  label: string;
}

interface Props {
  steps: StatusStep[];
  currentKey: string;
}

export default function StatusTimeline({ steps, currentKey }: Props) {
  const currentIndex = steps.findIndex((s) => s.key === currentKey);
  return (
    <ol>
      {steps.map((s, i) => (
        <li key={s.key} data-active={i <= currentIndex}>
          {s.label}
        </li>
      ))}
    </ol>
  );
}
