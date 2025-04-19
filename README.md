# CmdSearch
Quickly search the web from within [ObsidianMD](https://obsidian.md/) using custom commands from your command palette!
**For the best experience**, enable the core plugin **Web Viewer**; otherwise the links open outside of Obsidian in your browser.
- Add your own custom search commands for any website that supports URL-based searching.
- Remove or modify the default commands to your liking.
- Assign hotkeys to your CmdSearch commands for even faster access

[CLICK HERE TO SEE DEMO](https://github.com/user-attachments/assets/5ac72f83-9f02-4b87-b022-b04b90f7c839)

## Usage
[Here is a list of common/useful search URLs to reference](https://github.com/SpaceshipCaptain/CmdSearch/blob/main/List%20of%20URLS.md)
1.  **Open the command palette:** Press `Ctrl+P` to open Obsidian's command palette.
2.  **Find your CmdSearch commands:** Type "CmdSearch" to see a list of all your configured commands, or start typing the specific name (e.g., "Google," "YouTube") to quickly find its command.
3.  **Enter a query:** Once you select a CmdSearch command from the list, you will be prompted to enter your search query (if the command uses the `%s` placeholder).
4.  **Opens URL** CmdSearch will then open your URL, with your search query automatically inserted

## Adding New Commands (Custom Searches)
When adding a new command, you'll configure two things:
1. **Name:** This is the name that appears in the command palette.
2. **URL:** This is the URL that CmdSearch will open when you execute the command. 

- Add `%s` as a placeholder for your search query.
    - So `https://www.google.com/search?q=%s` will prompt you for a query and replace `%s` with that query.
- If you add a URL that doesn't have a `%s`, the link will open instantly from the command palette.
	- This is useful for sites that don’t use search URLs but that you still want quick access to.
- You can always refer to the dropdown list for usage examples.
- Orginal ${Q} replacement string will continue to work but to better align with web standards, the default option has been changed to %s.

## Links & Support
- [CmdSearch on GitHub](https://github.com/SpaceshipCaptain/CmdSearch)
    - Issues and feature requests
- [Donate via PayPal](https://www.paypal.com/donate?hosted_button_id=44CMB9VHXFG68)
    - Any support is appreciated!