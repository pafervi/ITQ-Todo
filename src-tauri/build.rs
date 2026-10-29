// Build script. Lets tauri-build generate the required Windows manifest
// and macOS Info.plist entries from tauri.conf.json at compile time.
fn main() {
    tauri_build::build()
}
