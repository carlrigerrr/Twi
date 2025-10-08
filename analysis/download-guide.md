# Download the Extension the Easy Way

Want the latest extension without wrestling with Git? Follow the short version below, then keep reading if you need the details.

## Super-quick summary
1. **Open the terminal pane.** It lives at the bottom of the workspace.
2. **Run one command:** `./package_extension.sh`
3. **Download the ZIP** (`extension-1.4_0.zip`) from the file tree and unzip it on your computer.

That’s it—you now have the extension folder (`1.4_0/`) ready for `chrome://extensions` → **Developer mode** → **Load unpacked**.

---

## Step 1 – Open the terminal pane (with pictures in mind)
If you don’t already see a terminal:

1. Look along the bottom edge of the workspace for a panel named **Terminal** or **Console**.
2. If the panel is collapsed, click the **Terminal** tab or the little `>` chevron to pop it open.
3. Press the **+** button inside that panel and choose **New Terminal**. When you see a line ending in `$` or `#`, you’re ready to type commands.

Leave this terminal window open for the rest of the steps.

## Step 2 – Let the script zip everything for you
1. In the terminal, make sure you are already inside the project folder (the prompt should show `/workspace/Twi`).
2. Type the command below and press **Enter**:
   ```bash
   ./package_extension.sh
   ```
3. Wait a moment—when the script finishes you’ll see the message `Created extension-1.4_0.zip`.

## Step 3 – Download the ZIP to your computer
1. In the file browser (usually on the left), find `extension-1.4_0.zip` sitting next to `package_extension.sh`.
2. Right-click the ZIP and choose **Download** (or click the download icon your IDE provides).
3. Once the ZIP is on your computer, unzip it. Inside you’ll see the familiar `1.4_0/` extension folder.
4. Load that folder in Chrome via `chrome://extensions` → enable **Developer mode** → **Load unpacked** → pick the `1.4_0/` folder.

---

## Alternative options (use these only if you want them)
- **Manual zip command:**
  ```bash
  zip -r extension-1.4_0.zip 1.4_0
  ```
  This does exactly what the script does, just without the shortcut.

- **Download from GitHub:** Push your commits, open the repo on GitHub, click **Code → Download ZIP**, and unzip it locally.

> **Need a refresh later?** Run `./package_extension.sh` again. It will overwrite the old ZIP with a brand-new package.
