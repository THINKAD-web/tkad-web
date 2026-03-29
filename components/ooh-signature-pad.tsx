"use client";

import { forwardRef } from "react";
import SignatureCanvas from "react-signature-canvas";

const OohSignaturePad = forwardRef<SignatureCanvas, { className?: string }>(
  ({ className }, ref) => (
    <SignatureCanvas
      ref={ref}
      canvasProps={{
        width: 440,
        height: 180,
        className: className ?? "touch-none w-full max-w-full",
      }}
    />
  ),
);
OohSignaturePad.displayName = "OohSignaturePad";

export default OohSignaturePad;
