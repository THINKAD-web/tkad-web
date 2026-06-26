"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CompositionEvent,
} from "react";

/**
 * Controlled input that defers `onCommit` until IME composition ends.
 * During composition, only the local display value updates.
 */
export function useCompositionControlledInput(
  committedValue: string,
  onCommit: (value: string) => void,
) {
  const isComposingRef = useRef(false);
  const [displayValue, setDisplayValue] = useState(committedValue);

  useEffect(() => {
    if (!isComposingRef.current) {
      setDisplayValue(committedValue);
    }
  }, [committedValue]);

  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const next = event.target.value;
      setDisplayValue(next);
      if (!isComposingRef.current) {
        onCommit(next);
      }
    },
    [onCommit],
  );

  const onCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  const onCompositionEnd = useCallback(
    (event: CompositionEvent<HTMLInputElement>) => {
      isComposingRef.current = false;
      const next = event.currentTarget.value;
      setDisplayValue(next);
      onCommit(next);
    },
    [onCommit],
  );

  return {
    value: displayValue,
    onChange,
    onCompositionStart,
    onCompositionEnd,
  };
}
