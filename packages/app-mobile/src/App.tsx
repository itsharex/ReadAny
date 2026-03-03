/**
 * App — Mobile entry layout
 * TODO: Replace with mobile-specific layout (tab bar, safe area, etc.)
 */
import { Toaster } from "sonner";

export default function App() {
  return (
    <>
      <div className="flex h-screen w-screen flex-col bg-background text-foreground">
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">ReadAny Mobile</h1>
            <p className="text-muted-foreground">
              Mobile app is under construction. Platform service is registered and ready.
            </p>
          </div>
        </div>
      </div>
      <Toaster position="top-center" richColors duration={2000} />
    </>
  );
}
