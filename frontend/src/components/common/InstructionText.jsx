import React from 'react';
import '../common/InstructionText.css';

const InstructionText = ({ children, twoLines }) => {
  return (
    <div className="instruction-wrapper ${isTwoLines ? 'two-lines' : ''}">
      <div className="instruction-text">
        {children}
      </div>
    </div>
  );
};

export default InstructionText;
