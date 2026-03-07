/// iOS keyboard handling for WKWebView in Tauri 2.
///
/// Adapted from HuLa (https://github.com/HuLaSpark/HuLa) — Lock mode.
///
/// When an input/textarea gets focus on iOS, WKWebView automatically scrolls its
/// internal UIScrollView to reveal the focused element, pushing the entire page up.
///
/// This module prevents that by using the "Lock" approach:
///   - On UIKeyboardWillShow: save contentOffset, install a delegate that blocks all scrolling,
///     disable bouncing and scroll indicators
///   - On UIKeyboardWillHide: restore original delegate, re-enable bouncing and scroll indicators
///
/// The webview frame is NOT resized. The JS frontend (useKeyboardHeight) handles layout
/// adjustment via visualViewport API.
use std::{
    cell::RefCell,
    ptr::NonNull,
    sync::{Arc, Mutex},
};

use objc2::{
    DefinedClass, MainThreadMarker, MainThreadOnly, define_class, msg_send,
    rc::Retained,
    runtime::ProtocolObject,
};
use objc2_core_foundation::CGPoint;
use objc2_foundation::{
    NSNotification, NSNotificationCenter, NSNotificationName, NSObject,
    NSObjectProtocol,
};
use objc2_ui_kit::{
    UIKeyboardWillHideNotification, UIKeyboardWillShowNotification,
    UIScrollView, UIScrollViewContentInsetAdjustmentBehavior,
    UIScrollViewDelegate, UIWebView,
};
use tauri::WebviewWindow;

thread_local! {
    static KEYBOARD_DELEGATE: RefCell<Option<Retained<KeyboardLockDelegate>>> = RefCell::new(None);
}

pub fn initialize_keyboard_adjustment(webview_window: &WebviewWindow) {
    let _ = webview_window.with_webview(|webview| unsafe {
        #[allow(deprecated)]
        let webview: &UIWebView = &*webview.inner().cast();
        let notification_center = NSNotificationCenter::defaultCenter();
        let main_thread = MainThreadMarker::from(webview);

        let scroll_view_arc = Arc::new(webview.scrollView());
        let old_delegate_arc: Arc<Mutex<Option<Retained<ProtocolObject<dyn UIScrollViewDelegate>>>>> =
            Arc::new(Mutex::new(None));

        scroll_view_arc
            .setContentInsetAdjustmentBehavior(UIScrollViewContentInsetAdjustmentBehavior::Never);

        // Retain webview reference for endEditing calls
        let webview_arc = Arc::new(
            Retained::retain(webview as *const _ as *mut UIWebView)
                .expect("Failed to retain UIWebView reference"),
        );

        // --- UIKeyboardWillShow ---
        let scroll_view_will = scroll_view_arc.clone();
        let old_delegate_will = old_delegate_arc.clone();
        let webview_will = webview_arc.clone();
        create_observer(
            &notification_center,
            &UIKeyboardWillShowNotification,
            move |_notification| {
                // Save current delegate
                let mut old_delegate = old_delegate_will.lock().unwrap();
                *old_delegate = scroll_view_will.delegate();

                // Install lock delegate that blocks all scroll changes
                let new_delegate = KeyboardLockDelegate::new(
                    main_thread,
                    scroll_view_will.clone(),
                    webview_will.clone(),
                    scroll_view_will.contentOffset(),
                );

                KEYBOARD_DELEGATE.with(|cell| {
                    *cell.borrow_mut() = Some(new_delegate);
                });

                KEYBOARD_DELEGATE.with(|cell| {
                    if let Some(delegate) = cell.borrow().as_ref() {
                        let delegate_obj = ProtocolObject::from_ref(&**delegate);
                        scroll_view_will.setDelegate(Some(delegate_obj));
                    }
                });

                // Disable bouncing and scroll indicators during keyboard
                unsafe {
                    let scroll_view_ptr = (&**scroll_view_will)
                        as *const UIScrollView
                        as *mut UIScrollView;
                    let _: () = msg_send![scroll_view_ptr, setShowsVerticalScrollIndicator: false];
                    let _: () = msg_send![scroll_view_ptr, setShowsHorizontalScrollIndicator: false];
                    let _: () = msg_send![scroll_view_ptr, setBounces: false];
                }
            },
        );

        // --- UIKeyboardWillHide ---
        let scroll_view_hide = scroll_view_arc.clone();
        let old_delegate_hide = old_delegate_arc.clone();
        let webview_hide = webview_arc.clone();
        create_observer(
            &notification_center,
            &UIKeyboardWillHideNotification,
            move |_notification| {
                // End editing to dismiss keyboard cleanly
                let webview_ptr =
                    (&**webview_hide) as *const UIWebView as *mut UIWebView;
                let _: () = msg_send![webview_ptr, endEditing: true];

                // Re-enable bouncing and scroll indicators
                unsafe {
                    let scroll_view_ptr = (&**scroll_view_hide)
                        as *const UIScrollView
                        as *mut UIScrollView;
                    let _: () = msg_send![scroll_view_ptr, setShowsVerticalScrollIndicator: true];
                    let _: () = msg_send![scroll_view_ptr, setShowsHorizontalScrollIndicator: true];
                    let _: () = msg_send![scroll_view_ptr, setBounces: true];
                }

                // Clear lock delegate
                KEYBOARD_DELEGATE.with(|cell| {
                    *cell.borrow_mut() = None;
                });

                // Restore original delegate
                let mut old_delegate = old_delegate_hide.lock().unwrap();
                if let Some(delegate) = old_delegate.take() {
                    scroll_view_hide.setDelegate(Some(delegate.as_ref()));
                } else {
                    scroll_view_hide.setDelegate(None);
                }
            },
        );
    });
}

// --- Lock delegate: blocks all scrolling and ends editing on drag ---

pub struct KeyboardLockDelegateState {
    pub scroll_view: Arc<Retained<UIScrollView>>,
    pub webview: Arc<Retained<UIWebView>>,
    pub locked_offset: CGPoint,
}

define_class! {
    #[unsafe(super(NSObject))]
    #[thread_kind = MainThreadOnly]
    #[name = "KeyboardLockDelegate"]
    #[ivars = KeyboardLockDelegateState]
    pub(crate) struct KeyboardLockDelegate;

    unsafe impl NSObjectProtocol for KeyboardLockDelegate {}

    unsafe impl UIScrollViewDelegate for KeyboardLockDelegate {
        #[unsafe(method(scrollViewWillBeginDragging:))]
        unsafe fn scroll_view_will_begin_dragging(&self, _scroll_view: &UIScrollView) {
            let ivars = self.ivars();
            // End editing when user tries to drag — this dismisses the keyboard
            let webview_ptr =
                (&**ivars.webview) as *const UIWebView as *mut UIWebView;
            let _: () = msg_send![webview_ptr, endEditing: true];
            ivars
                .scroll_view
                .setContentOffset(ivars.locked_offset);
        }

        #[unsafe(method(scrollViewDidScroll:))]
        unsafe fn scroll_view_did_scroll(&self, _scroll_view: &UIScrollView) {
            // Force contentOffset back to the locked position on every scroll event
            let ivars = self.ivars();
            ivars
                .scroll_view
                .setContentOffset(ivars.locked_offset);
        }
    }
}

impl KeyboardLockDelegate {
    fn new(
        mtm: MainThreadMarker,
        scroll_view: Arc<Retained<UIScrollView>>,
        webview: Arc<Retained<UIWebView>>,
        offset: CGPoint,
    ) -> Retained<Self> {
        let delegate = Self::alloc(mtm).set_ivars(KeyboardLockDelegateState {
            scroll_view,
            webview,
            locked_offset: offset,
        });

        unsafe { msg_send![super(delegate), init] }
    }
}

fn create_observer(
    center: &NSNotificationCenter,
    name: &NSNotificationName,
    handler: impl Fn(&NSNotification) + 'static,
) -> Retained<ProtocolObject<dyn NSObjectProtocol>> {
    let block = block2::RcBlock::new(move |notification: NonNull<NSNotification>| {
        handler(unsafe { notification.as_ref() });
    });

    unsafe { center.addObserverForName_object_queue_usingBlock(Some(name), None, None, &block) }
}
