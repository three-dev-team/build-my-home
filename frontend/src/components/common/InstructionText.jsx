import React from 'react';
import '../common/InstructionText.css';

const InstructionText = ({ children, twoLines = false }) => {
  return (
    <div className={`instruction-wrapper ${twoLines ? 'two-lines' : ''}`}>
      <div className="instruction-text" key={String(children)}>{children}</div>
    </div>
  );
};

export default InstructionText;
