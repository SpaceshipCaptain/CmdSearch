import {App, FuzzySuggestModal, MarkdownView, Notice, Plugin, PluginSettingTab, Setting, WorkspaceLeaf } from "obsidian";

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
            links: DEFAULT_OPTIONS,
            openSplitView: false,
            searchSelectedText: false,
            historyOption: false
        };
    
        this.settings = Object.assign({}, defaultSettings, await this.loadData());

        if (!this.settings.links) {
            this.settings.links = defaultSettings.links;
        }
    }

    private registeredIds: string[] = []; 

    registerCommands() {
        // Unregister existing commands
        this.registeredIds.forEach(Id => {
            this.removeCommand(Id);
        });
        this.registeredIds = []; // Clear the list
    
        // Register new commands:
        this.settings.links.forEach((option, index) => {
            if (!this.validateUrl(option.url)) {
                if (option.name.trim()) { // Only show error if name is not empty
                    this.showError(`"${option.name}" has an invalid URL format and did not register.`);
                }
                return;
            }
            const Id = `${index}`;
            this.addCommand({
                id: Id,
                name: `${option.name}`,
                callback: () => {this.handleCommandCallback(option)},
            });
            // Add the new ID to the list for unregistering
            this.registeredIds.push(Id); 
        });

        this.addCommand({
            id: "palette",
            name: "Open CmdSearch palette",
            callback: () => {
                new CmdSearchPalette(this.app, this).open();
            }
        });
    }

    handleCommandCallback(link: SearchOption) {
        let selectedText = this.getSelectedText();
        if (link.url.includes("%s") || link.url.includes("${Q}")) {
            if(this.settings.searchSelectedText && selectedText){
                this.openLink(link.url, selectedText);
                this.recordHistory(link, selectedText);
            } else {
            new QueryPrompt(this.app, this, link).open();
            }
        } else {
            this.openLink(link.url, "");
        }
    }

	async saveSettings() {
		await this.saveData(this.settings);
	}

    private validateUrl(url: string): boolean {
        try {
            const testUrl = url.replace("%s", "test");
            new URL(testUrl);
            return true;
        } catch {
            return false;
        }
    }

    private splitLeaf: WorkspaceLeaf | null = null;

    openLink(url: string, query: string) {
        try {
            const finalUrl = url.includes("%s")
                ? url.replace("%s", encodeURIComponent(query))
                : url.includes("${Q}")
                    ? url.replace("${Q}", encodeURIComponent(query))
                    : url;
            if (this.settings.openSplitView) {
                if(!this.splitLeaf || this.splitLeaf?.getViewState().type === "empty") {
                    this.splitLeaf = this.app.workspace.getLeaf('split', 'vertical')
                } else {
                    this.app.workspace.setActiveLeaf(this.splitLeaf)
                }
            }
            window.open(finalUrl, "_blank");

        } catch (error) {
            this.showError("Failed to open URL: " + error);
        }
    }

    getSelectedText():string {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView && activeView.editor) {
            return activeView.editor.getSelection();
        }else {
            return "";
        }
    }

    recordHistory(option: SearchOption, query: string) {
        if(!this.settings.historyOption) return;

        let currentHistory = option.history || [];
        const queryIndex = currentHistory.indexOf(query);
        if (queryIndex !== -1) {
            currentHistory.splice(queryIndex, 1);
        }
        const newHistory = [query, ...currentHistory];
        option.history = newHistory.slice(0, 7);
        this.saveSettings();
    }
}

// used fuzzy to keep the command palette feel while searching
class QueryPrompt extends FuzzySuggestModal<string> {
    plugin: CmdSearch;
    selected: SearchOption;

    constructor(app: App, plugin: CmdSearch, selectedOption: SearchOption) {
        super(app);
        this.plugin = plugin;
        this.selected = selectedOption;
        this.setPlaceholder("Enter search query...");
    }
// Doens't matter what returns here, just needs to be one item for looks
    getItems(): any[] {
        const  history: string[] = this.selected.history ? this.selected.history : [];
        return [...[""], ...history]; 
    }
// this is the feedback text displayed on the item returned above
    getItemText(item: string): string {
        const currentQuery = this.inputEl.value;
        if(!item){
            return `Searching ${this.selected.name} for ${currentQuery}`;
        } else if(this.inputEl.value === "") {
            return item;
        } else {
            return "";
        }
    }

    onChooseItem(item: string): void {
        if(!item){ //if it's a query it will be an empty string
            const currentQuery = this.inputEl.value.trim();
            this.plugin.openLink(this.selected.url, currentQuery);
            if(currentQuery) {
                this.plugin.recordHistory(this.selected, currentQuery);
            }
        } else { //else it's a history selection
            this.plugin.openLink(this.selected.url, item)
            this.plugin.recordHistory(this.selected, item)
        }
    }
}

class CmdSearchPalette extends FuzzySuggestModal<any> {
    plugin: CmdSearch;
    cmdSearchCommands: SearchOption[];

    constructor(app: App, plugin: CmdSearch) {
        super(app);
        this.plugin = plugin;
        this.setPlaceholder("Search CmdSearch Links...");
        this.cmdSearchCommands = this.plugin.settings.links
    }

    getItems(): any[] {
        return [...this.cmdSearchCommands, {name:"CmdSearch: Clear History", type: "cmd"}];
    }

    getItemText(item: SearchOption): string {
        return item.name;
    }

    onChooseItem(item: any): void {
        if(item.url){
            this.plugin.handleCommandCallback(item);
        }
        if(item.type === "cmd"){ //clears history. probably will move this out later
            this.plugin.settings.links.forEach(link => {
                link.history = [];
            });
            this.plugin.saveSettings();
            new Notice("CmdSearch: History Cleared", 4000)
        }
        
    }
}

interface SearchOption {
    name: string;
    url: string;
    history?: string[];
}

interface CmdSearchSettings {
    links: SearchOption[];
    openSplitView: boolean;
    searchSelectedText: boolean;
    historyOption: boolean;
}

const DEFAULT_OPTIONS: SearchOption[] = [
    { name: "Google", url: "https://www.google.com/search?q=%s" },
    { name: "YouTube", url: "https://www.youtube.com/results?search_query=%s" },
    { name: "GoogleImages", url: "https://www.google.com/search?tbm=isch&q=%s" },
    { name: "Wikipedia", url: "https://en.wikipedia.org/wiki/%s" },
    { name: "OpenStreetMap", url: "https://www.openstreetmap.org/search?query=%s" },
    { name: "DuckDuckGo", url: "https://duckduckgo.com/?q=%s" }
];

class CmdSearchSettingTab extends PluginSettingTab {
    plugin: CmdSearch;

    constructor(app: App, plugin: CmdSearch) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
    
        containerEl.addClass('cmd-search-settings-container');
        // get scroll pos to stop view jumps on re-render
        const scrollPosition = containerEl.scrollTop;
    
        containerEl.empty();
    
        this.plugin.settings.links.forEach((link, index) => {
            this.createLinkSetting(containerEl, link, index);
        });
    
        this.createAddNewCommandSetting(containerEl);
        this.createCommandInformationSetting(containerEl);
        this.openSplitViewSetting(containerEl);
        this.searchSelectedText(containerEl);
        this.historySetting(containerEl);
        this.createSettingsFooter(containerEl);
    
        containerEl.scrollTop = scrollPosition;
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
            .setName("Add new command")
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
            "The name you set is what appears in the command palette. ",
            desc.createEl("br"),
            "For URLs:",
            desc.createEl("br"),
            "- Use %s as a placeholder for your search query.",
            desc.createEl("br"),
            "- Don't include %s if you want the URL to open without a prompt. (some sites don't support search urls)",
            desc.createEl("br"),
            "- To better align with web standards, the default option has been changed to %s. ${Q} is still a valid alternative.",
            desc.createEl("br"),
            desc.createEl("br"),
            "Bind 'Open CmdSearch Palette' to a hotkey for instant access to your CmdSearch links"
        );

        new Setting(containerEl)
            .setName("Command information")
            .setDesc(desc)
            .addButton(btn => {
                const originalButtonText = "Copy %s";
                btn.setButtonText(originalButtonText)
                    .onClick(async () => {
                        await navigator.clipboard.writeText("%s");
                        btn.setButtonText("Copied!");
                        setTimeout(() => {
                            btn.setButtonText(originalButtonText);
                        }, 1500);
                    });
                return btn;
            });
    }

    private openSplitViewSetting(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName("Open links to the right")
            .setDesc("Links open in a split view beside the current window. Subsequent links will group.")
            .addToggle(toggle => {
                toggle.setValue(this.plugin.settings.openSplitView);
                toggle.onChange(async (value) => {
                    this.plugin.settings.openSplitView = value;
                    await this.plugin.saveSettings();
                });
                return toggle;
            });
    }

    private searchSelectedText(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName("Search selected text")
            .setDesc("If you have text selected when executing a search command, it will use that selection as the search query.")
            .addToggle(toggle => {
                toggle.setValue(this.plugin.settings.searchSelectedText);
                toggle.onChange(async (value) => {
                    this.plugin.settings.searchSelectedText = value;
                    await this.plugin.saveSettings();
                });
                return toggle;
            });
    }

    private historySetting(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName("History")
            .setDesc("Shows up to seven of your most recent queries for that command. Clear History is in the CmdSearch palette.")
            .addToggle(toggle => {
                toggle.setValue(this.plugin.settings.historyOption);
                toggle.onChange(async (value) => {
                    this.plugin.settings.historyOption = value;
                    await this.plugin.saveSettings();
                });
                return toggle;
            });
    }

    private createSettingsFooter(containerEl: HTMLElement): void {
        new Setting(containerEl);
        const footerContainer = containerEl.createDiv();
        footerContainer.addClass("settings-footer");
        
        footerContainer.createEl("a",{href: "https://github.com/SpaceshipCaptain/CmdSearch"}, (a)=> {
            a.innerHTML = `<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="m 10,0 c 5.523,0 10,4.59 10,10.253 0,4.529 -2.862,8.371 -6.833,9.728 -0.507,0.101 -0.687,-0.219 -0.687,-0.492 0,-0.338 0.012,-1.442 0.012,-2.814 0,-0.956 -0.32,-1.58 -0.679,-1.898 2.227,-0.254 4.567,-1.121 4.567,-5.059 0,-1.12 -0.388,-2.034 -1.03,-2.752 0.104,-0.259 0.447,-1.302 -0.098,-2.714 0,0 -0.838,-0.275 -2.747,1.051 C 11.706,5.076 10.85,4.962 10,4.958 9.15,4.958 8.295,5.076 7.497,5.303 5.586,3.977 4.746,4.252 4.746,4.252 4.203,5.664 4.546,6.707 4.649,6.966 4.01,7.684 3.619,8.598 3.619,9.718 c 0,3.928 2.335,4.808 4.556,5.067 -0.286,0.256 -0.545,0.708 -0.635,1.371 -0.57,0.262 -2.018,0.715 -2.91,-0.852 0,0 -0.529,-0.985 -1.533,-1.057 0,0 -0.975,-0.013 -0.068,0.623 0,0 0.655,0.315 1.11,1.5 0,0 0.587,1.83 3.369,1.21 0.005,0.857 0.014,1.665 0.014,1.909 0,0.271 -0.184,0.588 -0.683,0.493 C 2.865,18.627 0,14.783 0,10.253 0,4.59 4.478,0 10,0"/></svg>`+
            "Issues";})

            footerContainer.createEl("a",{href: "https://www.paypal.com/donate?hosted_button_id=44CMB9VHXFG68"}, (a)=> {
            a.innerHTML = `<svg viewBox="-1.5 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M 16.47546,5.9 C 15.2608,11.117 11.55564,12 6.57866,12 L 5.07814,20 H 7.82541 C 8.32592,20 8.53555,19.659 8.62783,19.179 9.31289,14.848 9.2166,15.557 9.27879,14.879 9.33799,14.501 9.66495,14 10.04911,14 13.6981,14 16.11839,12.945 16.85761,9.158 17.1204,7.811 17.03414,6.772 16.47546,5.9 M 5.13431,11.86 4.01193,18 H 0.53546 c -0.329,0 -0.58075,-0.402 -0.5286,-0.726 L 2.60268,0.751 C 2.67088,0.319 3.04501,0 3.48434,0 h 6.23377 c 3.69112,0 6.1766,1.401 5.60187,5.054 C 14.31395,11.56 8.73716,11 6.19951,11 c -0.43932,0 -0.996,0.428 -1.0652,0.86"/></svg>`+
            "Donations";})
    }

    async hide() {
        await this.plugin.saveSettings();
        this.plugin.registerCommands();
        super.hide();
    }
}