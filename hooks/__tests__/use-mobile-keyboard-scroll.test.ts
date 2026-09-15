import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getVisibleViewportBounds,
  isFocusedInputObscured,
} from "../use-mobile-keyboard-scroll";

describe("use-mobile-keyboard-scroll helpers", () => {
  it("getVisibleViewportBounds accounts for nav chrome and bottom tab bar", () => {
    const bounds = getVisibleViewportBounds(
      { height: 400, offsetTop: 50, width: 390, scale: 1, pageLeft: 0, pageTop: 0 } as VisualViewport,
      60,
    );
    assert.equal(bounds.top, 50 + 60 + 16);
    assert.equal(bounds.bottom, 50 + 400 - 88);
  });

  it("isFocusedInputObscured returns false when input sits inside visible band", () => {
    const bounds = { top: 100, bottom: 500 };
    const target = {
      getBoundingClientRect: () => ({
        top: 200,
        bottom: 260,
        left: 0,
        right: 0,
        width: 0,
        height: 60,
        x: 0,
        y: 200,
        toJSON: () => ({}),
      }),
    } as HTMLElement;
    assert.equal(isFocusedInputObscured(target, bounds), false);
  });

  it("isFocusedInputObscured returns true when covered by keyboard (bottom)", () => {
    const bounds = { top: 100, bottom: 300 };
    const target = {
      getBoundingClientRect: () => ({
        top: 280,
        bottom: 340,
        left: 0,
        right: 0,
        width: 0,
        height: 60,
        x: 0,
        y: 280,
        toJSON: () => ({}),
      }),
    } as HTMLElement;
    assert.equal(isFocusedInputObscured(target, bounds), true);
  });

});
