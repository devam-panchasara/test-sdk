# Ruttl Mobile SDK — Changes Reference

> Last updated: 2026-06-19
> Branch: master (commits `730c359` → `6d8d916`)

---

## What was added

A full in-app bug-reporting SDK was built and embedded into this Expo project under `src/ruttl-sdk/`. It lets testers tap a floating button, screenshot the screen, annotate it with drawing tools, fill a form, and submit a bug ticket to the Ruttl backend — all without leaving the app.

---

## New files

### Entry point

| File | Purpose |
|---|---|
| `src/ruttl-sdk/index.ts` | Public exports: `BugTrackingInstrumentation`, `Widget`, `wrapWithBugTracking` |

### UI Components (`src/ruttl-sdk/components/`)

| File | Purpose |
|---|---|
| `fab.tsx` | Floating action button — draggable, triggers screenshot |
| `preview-modal.tsx` | Full-screen modal: annotation canvas + toolbar + submit footer + feedback sheet |
| `annotation-canvas.tsx` | SVG path overlay on top of the captured screenshot |
| `feedback-sheet.tsx` | Bottom sheet: description, priority, due date, assignee picker |
| `upload-fallback.tsx` | Shown when `captureScreen` fails — lets user pick an image manually |

### Hooks (`src/ruttl-sdk/hooks/`)

| File | Purpose |
|---|---|
| `use-bug-widget.ts` | Master state hook — owns all widget state (comment, paths, assignees, etc.) and fetches project details on mount |
| `use-capture.ts` | Hides FAB, waits 500 ms, calls `react-native-view-shot`'s `captureScreen`, falls back to upload picker |
| `use-drawing.ts` | Pan gesture → SVG path data; respects `imageBounds` to clamp strokes |
| `use-fab-gesture.ts` | Drag gesture for the FAB; keeps button within safe-area insets |
| `use-submit.ts` | Captures the hidden export view as base64, builds the ticket payload, calls the API, toasts result, queues on failure |
| `use-instrumentation-guard.ts` | Warns in dev if the babel plugin has not instrumented the file |

### Core logic (`src/ruttl-sdk/`)

| File | Purpose |
|---|---|
| `widget.tsx` | `<Widget projectID token />` — composes all hooks and renders FAB + PreviewModal + ToastManager |
| `wrap-with-bug-tracking.tsx` | `wrapWithBugTracking(App, config)` — HOC that wraps the root component in `GestureHandlerRootView` + `SafeAreaProvider` and mounts `<Widget>` |
| `instrumentation.ts` | `BugTrackingInstrumentation` class — tracks active screen name via navigation listener; `setScreen` / `getScreen` |
| `instrumentation-boot.ts` | Runtime helpers injected by the babel plugin: `__ruttlMarkInstrumented`, `__ruttlIsInstrumented`, `__ruttlRegisterFromLayout` |
| `api.ts` | All network logic: `fetchProjectDetails`, `submitBugTicket`, retry-with-backoff (`fetchWithRetry`), offline queue via `AsyncStorage`, `computeHighlightedCoords` |

### Library utilities (`src/ruttl-sdk/lib/`)

| File | Purpose |
|---|---|
| `constants.ts` | `COLORS`, `FAB`, `SW`/`SH`/`CH`, `PRIORITY_MAP`, `ImageBounds`, `computeImageBounds` |
| `ruttl-constants.ts` | API base URL, endpoint paths, HTTP header names |
| `target-types.ts` | TypeScript interfaces: `MobileTarget`, `TargetEntry`, `TargetRegistrationMeta`, `TargetSnapshot` |
| `target-registry.ts` | In-memory map of instrumented UI targets keyed by `testID`; `registerTarget`, `getTargetsForScreen`, `freezeSnapshot`, `clearTargets` |
| `widget-styles.ts` | All `StyleSheet` styles for the widget UI |
| `device.ts` | `sleep(ms)`, `getBuildNumber()` (reads `expo-constants` then falls back to `react-native-device-info`) |

---

## Babel plugin (`babel-plugin-ruttl-targets/`)

| File | Purpose |
|---|---|
| `babel-plugin-ruttl-targets/index.js` | AST transform that runs at build time on every non-SDK file |

### What the plugin does

1. Visits every JSX element whose name is in `INSTRUMENTED_ELEMENTS` (`View`, `Text`, `Pressable`, `TouchableOpacity`, etc.).
2. Injects a stable `testID` prop (`__ruttl_<file>_<element>_<index>`).
3. Composes an `onLayout` handler that calls `__ruttlRegisterFromLayout(event, meta)` — which measures the element's position in the window and stores it in the target registry.
4. Inserts a top-of-file `__ruttlMarkInstrumented()` call so `use-instrumentation-guard` knows the plugin ran.
5. Skips `node_modules` and files inside the SDK itself.

---

## Modified files

| File | Change |
|---|---|
| `babel.config.js` | Added `plugins: ["./babel-plugin-ruttl-targets"]` |
| `app.json` | No structural change — verified `expo-router` and `expo-splash-screen` plugins, `typedRoutes`, `reactCompiler` experiments |
| `package.json` | Added dependencies for the SDK (see below) |
| `yarn.lock` | Updated for new packages |

### New npm dependencies added

- `react-native-view-shot` — `captureScreen` / `captureRef`
- `react-native-gesture-handler` — pan/drag gestures for FAB and drawing
- `react-native-safe-area-context` — `useSafeAreaInsets`, `SafeAreaProvider`
- `react-native-device-info` — bundle ID, build number, model, version
- `toastify-react-native` — success/error toast notifications
- `@react-native-async-storage/async-storage` — offline retry queue persistence
- `@react-native-community/netinfo` — connectivity check before flushing retry queue
- `expo-constants` — read `expoConfig` for build number

---

## How the pieces connect

```
App root
 └─ wrapWithBugTracking(App, { projectID, token })
     ├─ GestureHandlerRootView
     ├─ SafeAreaProvider
     ├─ <App /> (your screens)
     └─ <Widget projectID token />
         ├─ useBugWidget        → state + project details fetch
         ├─ useCapture          → screenshot / image pick
         ├─ useDrawing          → SVG stroke gesture
         ├─ useFabGesture       → draggable FAB position
         ├─ useSubmit           → export view → base64 → API
         ├─ <Fab />             → visible while widgetVisible=true
         ├─ <PreviewModal />    → modal with canvas + form
         └─ <ToastManager />    → success/error toasts

Babel plugin (build time)
 └─ injects testID + onLayout on every instrumented JSX element
     └─ onLayout calls __ruttlRegisterFromLayout → target-registry

BugTrackingInstrumentation (optional, navigation integration)
 └─ registerNavigationContainer(navRef)
     └─ listens to "state" events → setScreen(routeName)
         └─ target-registry.setActiveScreen(name)
```

---

## API flow

1. On mount, `useBugWidget` calls `fetchProjectDetails(projectID, token)` to get project users for the assignee list.
2. On submit, `useSubmit` calls `captureRef` on a hidden `<AnnotationCanvas>` to get a base64 JPEG, builds `SubmitTicketPayload`, and calls `submitBugTicket`.
3. On network/server failure, payload is queued in `AsyncStorage` under key `@ruttl/mobile-sdk/retry-queue`. The queue is flushed on next successful submit or app restart (via `flushRetryQueue`).
4. API retries: 3 attempts with delays of 1 s → 2 s → 4 s. 5xx errors and network timeouts are retryable; 4xx are not.

---

## Environment variables

| Variable | Used in |
|---|---|
| (none stored in `.env` for the SDK itself) | `.env` file exists but contains app-level config |

The `projectID` and `token` are passed as props to `<Widget>` at runtime — not baked into the bundle.
