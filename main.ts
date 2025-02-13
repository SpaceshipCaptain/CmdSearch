import {App, FuzzySuggestModal, Notice, Plugin, PluginSettingTab, Setting } from "obsidian";

export default class CmdSearch extends Plugin {
    settings: CmdSearchSettings;

    private showError(message: string) {
        new Notice(`CmdSearch: ${message}`, 4000);
    }

    async onload() {
        await this.loadSettings();
		this.registerCommands();
		this.addSettingTab(new CmdSearchSettingTab(this.app, this));
    }

    async loadSettings() {
        const defaultSettings: CmdSearchSettings = {
            links: DEFAULT_OPTIONS
        };
    
        this.settings = Object.assign({}, defaultSettings, await this.loadData());
    
        if (!this.settings.links) {
            this.settings.links = defaultSettings.links;
        }
    }
    // Keep track of registered command IDs
    private registeredCommandIds: string[] = []; 

    registerCommands() {
        // Unregister existing commands
        this.registeredCommandIds.forEach(commandId => {
            this.removeCommand(commandId);
        });
        this.registeredCommandIds = []; // Clear the list
    
        // Register new commands:
        this.settings.links.forEach((link, index) => {
            if (!this.validateUrl(link.url)) {
                if (link.name.trim()) { // Only show error if name is not empty
                    this.showError(`"${link.name}" has an invalid URL format and did not register.`);
                }
                return;
            }
            const commandId = `open-url-${index}-${link.url}`;
            this.addCommand({
                id: commandId,
                name: `${link.name}`,
                callback: () => {
                    if (link.url.includes("${Q}")) {
                        new QueryPrompt(this.app, this, link.url, link.name).open();
                    } else {
                        this.openLink(link.url, "");
                    }
                },
            });
            // Add the new ID to the list for unregistering
            this.registeredCommandIds.push(commandId); 
        });
    }

	async saveSettings() {
		await this.saveData(this.settings);
	}

    private validateUrl(url: string): boolean {
        try {
            const testUrl = url.replace("${Q}", "test");
            new URL(testUrl);
            return true;
        } catch {
            return false;
        }
    }

    openLink(url: string, query: string) {
        try {
            const finalUrl = url.includes("${Q}") 
                ? url.replace("${Q}", encodeURIComponent(query))
                : url;
                
            window.open(finalUrl, "_blank");
        } catch (error) {
            this.showError("Failed to open URL: " + error);
        }
    }
}

// used fuzzy to keep the command palette feel while searching
class QueryPrompt extends FuzzySuggestModal<string> {
    baseUrl: string;
    plugin: CmdSearch;
    name: string;

    constructor(app: App, plugin: CmdSearch, baseUrl: string, name: string) {
        super(app);
        this.plugin = plugin;
        this.baseUrl = baseUrl;
        this.name = name
        this.setPlaceholder("Enter search query...");
    }
// Doens't matter what returns here, just needs to be one item for looks
    getItems(): string[] {
        return [""]; 
    }
// this is the feedback text displayed on the item returned above
    getItemText(): string {
        const currentQuery = this.inputEl.value;
        return `Searching ${this.name} for ${currentQuery}`;
    }

    onChooseItem(): void {
        const currentQuery = this.inputEl.value.trim();
        this.plugin.openLink(this.baseUrl, currentQuery);
    }
}

interface SearchOption {
    name: string;
    url: string;
}

interface CmdSearchSettings {
    links: SearchOption[];
}

const DEFAULT_OPTIONS: SearchOption[] = [
    { name: "Google", url: "https://www.google.com/search?q=${Q}" },
    { name: "YouTube", url: "https://www.youtube.com/results?search_query=${Q}" },
    { name: "GoogleImages", url: "https://www.google.com/search?tbm=isch&q=${Q}" },
    { name: "Wikipedia", url: "https://en.wikipedia.org/wiki/${Q}" },
    { name: "OpenStreetMap", url: "https://www.openstreetmap.org/search?query=${Q}" },
    { name: "DuckDuckGo", url: "https://duckduckgo.com/?q=${Q}" }
];


class CmdSearchSettingTab extends PluginSettingTab {
    plugin: CmdSearch;

    constructor(app: App, plugin: CmdSearch) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
    
        // get scroll pos to stop view jumps on re-render
        const scrollPosition = containerEl.scrollTop;
    
        containerEl.empty();
    
        this.createSettingsHeader(containerEl);
    
        this.plugin.settings.links.forEach((link, index) => {
            this.createLinkSetting(containerEl, link, index);
        });
    
        this.createAddNewCommandSetting(containerEl);
        this.createCommandInformationSetting(containerEl);
    
        containerEl.scrollTop = scrollPosition;
    }

    private createSettingsHeader(containerEl: HTMLElement): void {
        const headerContainer = containerEl.createDiv();
        headerContainer.addClass("settings-header");

        headerContainer.createEl("h1", { text: "CmdSearch" });
        
        headerContainer.createEl("a",{href: "https://github.com/SpaceshipCaptain/CmdSearch"}, (a)=> {
            a.innerHTML = `<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="m 10,0 c 5.523,0 10,4.59 10,10.253 0,4.529 -2.862,8.371 -6.833,9.728 -0.507,0.101 -0.687,-0.219 -0.687,-0.492 0,-0.338 0.012,-1.442 0.012,-2.814 0,-0.956 -0.32,-1.58 -0.679,-1.898 2.227,-0.254 4.567,-1.121 4.567,-5.059 0,-1.12 -0.388,-2.034 -1.03,-2.752 0.104,-0.259 0.447,-1.302 -0.098,-2.714 0,0 -0.838,-0.275 -2.747,1.051 C 11.706,5.076 10.85,4.962 10,4.958 9.15,4.958 8.295,5.076 7.497,5.303 5.586,3.977 4.746,4.252 4.746,4.252 4.203,5.664 4.546,6.707 4.649,6.966 4.01,7.684 3.619,8.598 3.619,9.718 c 0,3.928 2.335,4.808 4.556,5.067 -0.286,0.256 -0.545,0.708 -0.635,1.371 -0.57,0.262 -2.018,0.715 -2.91,-0.852 0,0 -0.529,-0.985 -1.533,-1.057 0,0 -0.975,-0.013 -0.068,0.623 0,0 0.655,0.315 1.11,1.5 0,0 0.587,1.83 3.369,1.21 0.005,0.857 0.014,1.665 0.014,1.909 0,0.271 -0.184,0.588 -0.683,0.493 C 2.865,18.627 0,14.783 0,10.253 0,4.59 4.478,0 10,0"/></svg>`+
            "Issues";})

        headerContainer.createEl("a",{href: "https://www.paypal.com/donate?hosted_button_id=44CMB9VHXFG68"}, (a)=> {
            a.innerHTML = `<svg viewBox="-1.5 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M 16.47546,5.9 C 15.2608,11.117 11.55564,12 6.57866,12 L 5.07814,20 H 7.82541 C 8.32592,20 8.53555,19.659 8.62783,19.179 9.31289,14.848 9.2166,15.557 9.27879,14.879 9.33799,14.501 9.66495,14 10.04911,14 13.6981,14 16.11839,12.945 16.85761,9.158 17.1204,7.811 17.03414,6.772 16.47546,5.9 M 5.13431,11.86 4.01193,18 H 0.53546 c -0.329,0 -0.58075,-0.402 -0.5286,-0.726 L 2.60268,0.751 C 2.67088,0.319 3.04501,0 3.48434,0 h 6.23377 c 3.69112,0 6.1766,1.401 5.60187,5.054 C 14.31395,11.56 8.73716,11 6.19951,11 c -0.43932,0 -0.996,0.428 -1.0652,0.86"/></svg>`+
            "Donations";})
        }

    private createLinkSetting(containerEl: HTMLElement, link: SearchOption, index: number): void {
        const settingContainer = new Setting(containerEl);
        settingContainer.settingEl.addClass("setting-container");

        settingContainer.addText(text => {
            text.inputEl.addClass("name-input");
            return text
                .setPlaceholder("Enter name")
                .setValue(link.name)
                .onChange(async (value) => {
                    this.plugin.settings.links[index].name = value;
                    await this.plugin.saveSettings();
                });
        });

        settingContainer.addText(text => {
            text.inputEl.addClass("url-input");
            return text
                .setPlaceholder("Enter URL")
                .setValue(link.url)
                .onChange(async (value) => {
                    this.plugin.settings.links[index].url = value;
                    await this.plugin.saveSettings();
                });
        });

        settingContainer.addButton(btn => btn
            .setButtonText("Remove")
            .onClick(async () => {
                this.plugin.settings.links.splice(index, 1);
                await this.plugin.saveSettings();
                this.display(); // re-render to see change
            }));
    }


    private createAddNewCommandSetting(containerEl: HTMLElement): void {
        let selectedOption = "Custom"; // Select blank by default

        new Setting(containerEl)
            .setName("Add New Command")
            .addDropdown(dropdown => {
                dropdown.addOption("Custom", "Custom");
                DEFAULT_OPTIONS.forEach(obj => {
                    dropdown.addOption(obj.name, obj.name);
                });
                dropdown.onChange(value => {
                    selectedOption = value;
                });
            })
            .addButton(btn => btn
                .setButtonText("Add")
                .onClick(async () => {
                    const newCommand = selectedOption === "Custom"
                        ? { name: "", url: "" }
                        : DEFAULT_OPTIONS.find(opt => opt.name === selectedOption);
                    if (newCommand) {
                        this.plugin.settings.links.push({ ...newCommand });
                        await this.plugin.saveSettings();
                        this.display(); // Refresh UI
                    }
                }));
    }

    private createCommandInformationSetting(containerEl: HTMLElement): void {
        const desc = document.createDocumentFragment();
        desc.append(
            "The Name you set is what appears in the command palette. ",
            desc.createEl("br"),
            "For URLs:",
            desc.createEl("br"),
            "- Use ${Q} as a placeholder for your search query.",
            desc.createEl("br"),
            "- Don't include ${Q} if you want the URL to open without a prompt. (some sites don't support search urls)"
        );

        new Setting(containerEl)
            .setName("Command Information")
            .setDesc(desc) // Set DOM DocumentFragment as description
            .addButton(btn => {
                // Button feedback logic (Copied! and revert) - as before
                const originalButtonText = "Copy ${Q}";
                btn.setButtonText(originalButtonText)
                    .onClick(async () => {
                        await navigator.clipboard.writeText("${Q}");
                        btn.setButtonText("Copied!");
                        setTimeout(() => {
                            btn.setButtonText(originalButtonText);
                        }, 1500);
                    });
                return btn;
            });
    }

    async hide() {
        await this.plugin.saveSettings();
        this.plugin.registerCommands();
        super.hide();
    }
}
