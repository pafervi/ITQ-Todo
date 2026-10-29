// Prevents additional console window on Windows in release, DO NOT REMOVE.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Phase 2 of the migration: Tauri boots the same Vite-built renderer the
// Electron shell already serves. No custom commands yet; those arrive in
// phase 3 when we port exportTool.js and the IPC endpoints that today
// live in electron/main.js.
//
// Keeping the entry point small on purpose so phase 3 only has to add
// `.invoke_handler(tauri::generate_handler![...])` and the single-instance
// / autostart wiring the current Electron main does.
fn main() {
    itq_todo_lib::run()
}
