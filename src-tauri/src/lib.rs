#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            open_browser_site,
            set_browser_site_bounds,
            close_browser_site,
            control_browser_site
        ])
        .run(tauri::generate_context!())
        .expect("AWEWEBOS failed to start");
}

#[cfg(desktop)]
#[tauri::command]
async fn open_browser_site(
    app: tauri::AppHandle,
    url: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<(), String> {
    use tauri::{Manager, LogicalPosition, LogicalSize, WebviewUrl};
    use tauri::webview::WebviewBuilder;

    let parsed = url::Url::parse(&url).map_err(|_| "Invalid website URL".to_string())?;
    if parsed.scheme() != "http" && parsed.scheme() != "https" {
        return Err("Only HTTP and HTTPS websites are allowed".into());
    }
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "AWEWEBOS main window was not found".to_string())?;

    if let Some(existing) = app.get_webview("awewebos-browser-site") {
        existing.close().map_err(|e| e.to_string())?;
    }

    let builder = WebviewBuilder::new(
        "awewebos-browser-site",
        WebviewUrl::External(parsed),
    )
    .on_new_window(|new_url, _features| {
        // Keep target=_blank links inside the native browser surface by
        // navigating the existing view when the next explicit navigation occurs.
        let _ = new_url;
        tauri::webview::NewWindowResponse::Deny
    });

    window
        .add_child(
            builder,
            LogicalPosition::new(x.max(0.0), y.max(0.0)),
            LogicalSize::new(width.max(1.0), height.max(1.0)),
        )
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(not(desktop))]
#[tauri::command]
async fn open_browser_site(
    _app: tauri::AppHandle,
    _url: String,
    _x: f64,
    _y: f64,
    _width: f64,
    _height: f64,
) -> Result<(), String> {
    Err("Native embedded browser is available in the desktop build only".into())
}

#[cfg(desktop)]
#[tauri::command]
async fn set_browser_site_bounds(
    app: tauri::AppHandle,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<(), String> {
    use tauri::{Manager, LogicalPosition, LogicalSize};
    let view = app
        .get_webview("awewebos-browser-site")
        .ok_or_else(|| "Native browser view is not open".to_string())?;
    view.set_position(LogicalPosition::new(x.max(0.0), y.max(0.0)))
        .map_err(|e| e.to_string())?;
    view.set_size(LogicalSize::new(width.max(1.0), height.max(1.0)))
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(not(desktop))]
#[tauri::command]
async fn set_browser_site_bounds(
    _app: tauri::AppHandle,
    _x: f64,
    _y: f64,
    _width: f64,
    _height: f64,
) -> Result<(), String> {
    Err("Native embedded browser is available in the desktop build only".into())
}

#[cfg(desktop)]
#[tauri::command]
async fn close_browser_site(app: tauri::AppHandle) -> Result<(), String> {
    use tauri::Manager;
    if let Some(view) = app.get_webview("awewebos-browser-site") {
        view.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg(not(desktop))]
#[tauri::command]
async fn close_browser_site(_app: tauri::AppHandle) -> Result<(), String> {
    Ok(())
}

#[cfg(desktop)]
#[tauri::command]
async fn control_browser_site(app: tauri::AppHandle, action: String) -> Result<(), String> {
    use tauri::Manager;
    let view = app
        .get_webview("awewebos-browser-site")
        .ok_or_else(|| "Native browser view is not open".to_string())?;
    let script = match action.as_str() {
        "back" => "history.back()",
        "forward" => "history.forward()",
        "reload" => "location.reload()",
        _ => return Err("Unsupported browser action".into()),
    };
    view.eval(script).map_err(|e| e.to_string())
}

#[cfg(not(desktop))]
#[tauri::command]
async fn control_browser_site(_app: tauri::AppHandle, _action: String) -> Result<(), String> {
    Err("Native embedded browser is available in the desktop build only".into())
}
