import { useEffect, useState } from "react";

/**
 * Detects keyboard height on iOS/Android using the VisualViewport API.
 * Returns the keyboard height in px (0 when hidden).
 */
export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const onResize = () => {
      // window.innerHeight is the layout viewport (doesn't shrink with keyboard)
      // vv.height is the visual viewport (shrinks when keyboard appears)
      const kbHeight = Math.max(0, Math.round(window.innerHeight - vv.height));
      setKeyboardHeight(kbHeight);
    };

    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", onResize);
    return () => {
      vv.removeEventListener("resize", onResize);
      vv.removeEventListener("scroll", onResize);
    };
  }, []);

  return keyboardHeight;
}
