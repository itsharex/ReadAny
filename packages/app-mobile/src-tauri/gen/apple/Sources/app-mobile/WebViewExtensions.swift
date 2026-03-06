import UIKit
import WebKit
import ObjectiveC

// MARK: - Disable iOS native edit menu (Copy/Look Up/Translate/Share)
//
// Tauri creates its own WKWebView, so we cannot substitute a subclass.
// We use Objective-C runtime method swizzling on the private WKContentView class.
//
// iOS 16+ replaced UIMenuController with UIEditMenuInteraction, so we need
// a multi-layered approach:
//   1. Swizzle canPerformAction → always return false (legacy path)
//   2. Swizzle buildMenu(with:) → remove all system menu identifiers (iOS 16+)
//   3. Intercept addInteraction to block UIEditMenuInteraction from being added
//
// Additionally, the JS layer performs a removeAllRanges/addRange "jiggle" to
// dismiss any system menu that still slips through (see MobileFoliateViewer.tsx).

private let _swizzleToken: Void = {
    DisableEditMenuSwizzler.performSwizzle()
}()

@objc(DisableEditMenuSwizzler) final class DisableEditMenuSwizzler: NSObject {

    @objc static func ensureSwizzled() {
        _ = _swizzleToken
    }

    fileprivate static func performSwizzle() {
        guard let wkContentViewClass: AnyClass = objc_getClass("WKContentView") as? AnyClass else {
            NSLog("[ReadAny] ⚠️ Could not find WKContentView class – skipping edit-menu swizzle")
            return
        }

        // --- Layer 1: canPerformAction (legacy, still partially called on iOS 16+) ---
        swizzleMethod(
            on: wkContentViewClass,
            original: #selector(UIResponder.canPerformAction(_:withSender:)),
            replacement: #selector(DisableEditMenuSwizzler.ra_canPerformAction(_:withSender:))
        )

        // --- Layer 2: buildMenu(with:) for iOS 16+ UIEditMenuInteraction ---
        if #available(iOS 16.0, *) {
            let buildMenuSel = #selector(UIResponder.buildMenu(with:))
            let swizzledBuildMenuSel = #selector(DisableEditMenuSwizzler.ra_buildMenu(with:))
            swizzleMethod(on: wkContentViewClass, original: buildMenuSel, replacement: swizzledBuildMenuSel)
        }

        // --- Layer 3: Intercept addInteraction to catch UIEditMenuInteraction ---
        let addInteractionSel = #selector(UIView.addInteraction(_:))
        let swizzledAddInteractionSel = #selector(DisableEditMenuSwizzler.ra_addInteraction(_:))
        swizzleMethod(on: wkContentViewClass, original: addInteractionSel, replacement: swizzledAddInteractionSel)

        NSLog("[ReadAny] ✅ Swizzled WKContentView – native edit menu disabled")
    }

    // MARK: - Swizzle Helper

    private static func swizzleMethod(on cls: AnyClass, original: Selector, replacement: Selector) {
        guard let originalMethod = class_getInstanceMethod(cls, original),
              let swizzledMethod = class_getInstanceMethod(DisableEditMenuSwizzler.self, replacement) else {
            NSLog("[ReadAny] ⚠️ Could not get method for \(original) – skipping")
            return
        }

        let didAdd = class_addMethod(
            cls,
            replacement,
            method_getImplementation(swizzledMethod),
            method_getTypeEncoding(swizzledMethod)
        )

        if didAdd {
            if let newMethod = class_getInstanceMethod(cls, replacement) {
                method_exchangeImplementations(originalMethod, newMethod)
            }
        } else {
            method_exchangeImplementations(originalMethod, swizzledMethod)
        }
    }

    // MARK: - Swizzled: canPerformAction (Layer 1)

    @objc dynamic func ra_canPerformAction(_ action: Selector, withSender sender: Any?) -> Bool {
        return false
    }

    // MARK: - Swizzled: buildMenu (Layer 2, iOS 16+)

    @available(iOS 16.0, *)
    @objc dynamic func ra_buildMenu(with builder: UIMenuBuilder) {
        // Remove all known system menu categories so nothing appears
        builder.remove(menu: .lookup)
        builder.remove(menu: .standardEdit)
        builder.remove(menu: .replace)
        builder.remove(menu: .share)
        builder.remove(menu: .textStyle)
        builder.remove(menu: .spelling)
        builder.remove(menu: .spellingPanel)
        builder.remove(menu: .spellingOptions)
        builder.remove(menu: .substitutions)
        builder.remove(menu: .substitutionsPanel)
        builder.remove(menu: .transformations)
        builder.remove(menu: .speech)
        builder.remove(menu: .learn)
        builder.remove(menu: .writing)
        builder.remove(menu: .autoFill)

        // Do NOT call the original (ra_buildMenu after swizzle points to original)
        // because we want an empty menu. If the builder has no items, iOS won't show the menu.
    }

    // MARK: - Swizzled: addInteraction (Layer 3)

    @objc dynamic func ra_addInteraction(_ interaction: UIInteraction) {
        // Block UIEditMenuInteraction from being added to WKContentView
        if #available(iOS 16.0, *) {
            if interaction is UIEditMenuInteraction {
                NSLog("[ReadAny] 🚫 Blocked UIEditMenuInteraction from being added to WKContentView")
                return
            }
        }
        // Call original for all other interactions (text selection, etc.)
        // After swizzle, ra_addInteraction IS the original implementation
        ra_addInteraction(interaction)
    }
}
