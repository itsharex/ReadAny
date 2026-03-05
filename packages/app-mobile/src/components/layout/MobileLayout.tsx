import { Outlet } from "react-router";
import { BottomTabBar } from "./BottomTabBar";
import { useKeyboardHeight } from "@/lib/use-keyboard-height";

export function MobileLayout() {
  const keyboardHeight = useKeyboardHeight();
  const isKeyboardOpen = keyboardHeight > 0;

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Main content area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
        <Outlet />
      </main>

      {/* Hide tab bar when keyboard is open so it doesn't sit above the keyboard */}
      {!isKeyboardOpen && <BottomTabBar />}
    </div>
  );
}
