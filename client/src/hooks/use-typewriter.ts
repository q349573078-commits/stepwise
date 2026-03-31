import { useState, useEffect, useRef } from 'react';

export function useTypewriter(text: string, speed: number = 30) {
  const [displayedText, setDisplayedText] = useState('');
  const frameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const textRef = useRef(text);
  const displayedRef = useRef('');

  useEffect(() => {
    textRef.current = text;
  }, [text]);

  useEffect(() => {
    setDisplayedText('');
    displayedRef.current = '';
    lastTimeRef.current = 0;

    if (frameIdRef.current) {
      cancelAnimationFrame(frameIdRef.current);
    }

    if (textRef.current) {
      const type = (currentTime: number) => {
        if (!lastTimeRef.current) {
          lastTimeRef.current = currentTime;
        }

        const deltaTime = currentTime - lastTimeRef.current;
        const fullText = textRef.current;
        const currentDisplayed = displayedRef.current;

        if (currentDisplayed.length >= fullText.length) {
          return;
        }

        if (deltaTime >= speed) {
          const nextChar = fullText.charAt(currentDisplayed.length);
          const nextText = currentDisplayed + nextChar;
          displayedRef.current = nextText;
          setDisplayedText(nextText);
          lastTimeRef.current = currentTime;
        }

        frameIdRef.current = requestAnimationFrame(type);
      };

      frameIdRef.current = requestAnimationFrame(type);
    }

    return () => {
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
    };
  }, [text, speed]);

  return displayedText;
}
