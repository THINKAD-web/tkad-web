"use client";

import { useEffect, useRef } from "react";
import { hapticSuccess } from "@/lib/haptic";

type Props = {
  active: boolean;
};

/** Triggers success haptic once when payment/booking is confirmed on mobile. */
export function PaymentHapticTrigger({ active }: Props) {
  const fired = useRef(false);

  useEffect(() => {
    if (!active || fired.current) return;
    fired.current = true;
    hapticSuccess();
  }, [active]);

  return null;
}
