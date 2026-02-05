import React, { useEffect, useMemo, useRef, useState } from 'react';
import './DialogBox.css';
import { COLORS, withAlpha } from '../../constants/colors.js';

const splitLines = (text) => {
  if (text == null) return [];
  return String(text).split('\n');
};

const applyHighlightsToLine = (line, highlights = []) => {
  if (!highlights?.length) return line;

  const sorted = [...highlights].sort((a, b) => (b.text?.length || 0) - (a.text?.length || 0));
  let parts = [line];

  sorted.forEach((h, idx) => {
    const t = h?.text;
    if (!t) return;

    const nextParts = [];
    parts.forEach((p) => {
      if (typeof p !== 'string') {
        nextParts.push(p);
        return;
      }
      const chunks = p.split(t);
      if (chunks.length === 1) {
        nextParts.push(p);
        return;
      }
      chunks.forEach((c, i) => {
        if (c) nextParts.push(c);
        if (i < chunks.length - 1) {
          nextParts.push(
            <span key={`${idx}-${i}-${t}`} style={{ color: h.color }}>
              {t}
            </span>,
          );
        }
      });
    });

    parts = nextParts;
  });

  return parts;
};

export default function DialogBox({
                                    open = true,
                                    text = '',
                                    textColor = null,
                                    highlights = [],
                                    typingSpeed = 50,
                                    onTypingComplete = null,
                                    options = [],
                                    optionDisabled = false,
                                    className = '',
                                  }) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const timerRef = useRef(null);

  const hasOptions = Array.isArray(options) && options.length > 0;

  const optionBoxClass = useMemo(() => {
    if (!hasOptions) return '';
    return options.length >= 3 ? 'db-option-box-large' : 'db-option-box-small';
  }, [hasOptions, options.length]);

  useEffect(() => {
    if (!open) return;

    const contentText = String(text ?? '');

    if (!contentText) {
      setDisplayedText('');
      setIsTyping(false);
      return;
    }

    setDisplayedText('');
    setIsTyping(true);

    let idx = 0;
    timerRef.current = setInterval(() => {
      if (idx < contentText.length) {
        setDisplayedText(contentText.slice(0, idx + 1));
        idx += 1;
      } else {
        clearInterval(timerRef.current);
        setIsTyping(false);
        onTypingComplete?.();
      }
    }, typingSpeed);

    return () => clearInterval(timerRef.current);
  }, [open, text, typingSpeed, onTypingComplete]);

  const handleSkipTyping = () => {
    if (!open) return;

    if (isTyping) {
      clearInterval(timerRef.current);
      setDisplayedText(String(text ?? ''));
      setIsTyping(false);
      onTypingComplete?.();
    }
  };

  const lines = useMemo(() => splitLines(displayedText), [displayedText]);
  const resolvedTextColor = textColor ?? COLORS.ac.creamWhite;

  if (!open) return null;

  return (
    <div
      className={`db-root ${className}`}
      style={{
        '--db-content-bg': withAlpha(COLORS.dialogbox.contentBox, 0.8),
        '--db-option-bg': COLORS.dialogbox.optionBox,
        '--db-option-text': COLORS.dialogbox.optionText,
        '--db-highlight': COLORS.ac.yellow,
      }}
    >
      <div className="db-wrap">
        <div className="db-contentbox" onClick={handleSkipTyping} role="presentation">
          <div className="db-textbox" style={{ color: resolvedTextColor }}>
            {lines.map((ln, i) => (
              <div key={i} className="db-line">
                {applyHighlightsToLine(ln, highlights)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {hasOptions && (
        <div className={`db-option-box ${optionBoxClass}`}>
          <div className="db-option-text">
            {options.map((opt, idx) => (
              <span
                key={idx}
                className="db-option-row"
                style={{
                  cursor: optionDisabled ? 'default' : 'pointer',
                  opacity: optionDisabled ? 0.55 : 1,
                  pointerEvents: optionDisabled ? 'none' : 'auto',
                }}
                onClick={() => {
                  if (optionDisabled) return;
                  opt?.onClick?.();
                }}
              >
                {opt?.text ?? ''}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
