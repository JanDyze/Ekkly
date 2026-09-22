import { ref, onUnmounted } from "vue";

/**
 * Long-press handler so touch devices can reach context menus, which
 * otherwise only open on `contextmenu` (right-click) and are unreachable
 * on a phone.
 *
 * Bind the returned handlers to touchstart/touchmove/touchend/touchcancel,
 * and check `triggered` in your click handler to swallow the tap that the
 * browser synthesises after the press.
 *
 * `pressing` is true while a finger is resting on the element and the press
 * is still on its way to becoming a long one, so the element can show it is
 * being held - a slow shrink that runs for `delay`, the way a native list row
 * gives under your thumb. It waits `settle` before turning on: a finger that
 * lands to start a scroll moves within a few frames, and the row should not
 * flash every time the list is flicked.
 */
export function useLongPress(
  callback,
  { delay = 650, moveTolerance = 10, settle = 90 } = {}
) {
  const triggered = ref(false);
  const pressing = ref(false);
  let timer = null;
  let settleTimer = null;
  let startX = 0;
  let startY = 0;

  const cancel = () => {
    clearTimeout(timer);
    clearTimeout(settleTimer);
    timer = null;
    settleTimer = null;
    pressing.value = false;
  };

  const onTouchStart = (event) => {
    const touch = event.touches?.[0];
    if (!touch) return;
    startX = touch.clientX;
    startY = touch.clientY;
    triggered.value = false;
    cancel();
    settleTimer = setTimeout(() => {
      pressing.value = true;
    }, settle);
    timer = setTimeout(() => {
      triggered.value = true;
      // Let go of the squeeze as the menu arrives, so the row springs back
      // under it rather than staying small behind it.
      pressing.value = false;
      // Short buzz so the press registers as deliberate
      navigator.vibrate?.(15);
      callback({ x: startX, y: startY });
    }, delay);
  };

  // A press that turns into a scroll is not a long press
  const onTouchMove = (event) => {
    const touch = event.touches?.[0];
    if (!touch) return;
    if (
      Math.abs(touch.clientX - startX) > moveTolerance ||
      Math.abs(touch.clientY - startY) > moveTolerance
    ) {
      cancel();
    }
  };

  const onTouchEnd = (event) => {
    cancel();
    // Stop the synthetic click, which would otherwise immediately close the
    // menu we just opened (and open the details drawer behind it).
    if (triggered.value && event?.cancelable) {
      event.preventDefault();
    }
  };

  // Returns true if this click came from a long press and should be ignored
  const consumeClick = () => {
    if (!triggered.value) return false;
    triggered.value = false;
    return true;
  };

  onUnmounted(cancel);

  return { triggered, pressing, delay, consumeClick, onTouchStart, onTouchMove, onTouchEnd };
}
