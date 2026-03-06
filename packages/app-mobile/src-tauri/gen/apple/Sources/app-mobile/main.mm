#include "bindings/bindings.h"
#import <objc/message.h>
#import <objc/runtime.h>

int main(int argc, char *argv[]) {
  // Swizzle WKContentView.canPerformAction before the web view is created
  // to suppress the iOS native text-selection edit menu.
  // We call the Swift class method via ObjC runtime to avoid bridging header
  // issues.
  Class swizzlerClass = objc_getClass("DisableEditMenuSwizzler");
  if (swizzlerClass) {
    SEL sel = sel_registerName("ensureSwizzled");
    if (class_respondsToSelector(swizzlerClass, sel)) {
      ((void (*)(id, SEL))objc_msgSend)((id)swizzlerClass, sel);
    }
  }

  ffi::start_app();
  return 0;
}
