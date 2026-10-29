// Phase 2 runtime for ITQ Todo under Tauri. Mirrors a thin subset of what
// electron/main.js does today, enough to boot the same Vite renderer and
// restore the practical behaviors the user already relies on:
//
//   - single-instance lock, so a second launch focuses the window instead
//     of opening a duplicate (electron/main.js: requestSingleInstanceLock)
//   - autostart plugin, so Settings > "Open on startup" keeps working
//   - shell / dialog / fs plugins, so phase-3 ports of exportTool.js can
//     use the same APIs through the Tauri IPC bridge
//
// No custom #[tauri::command] handlers yet. They land in phase 3, when
// the renderer stops calling require("electron") directly.

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            // Second-launch handler: raise and focus the existing window.
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
