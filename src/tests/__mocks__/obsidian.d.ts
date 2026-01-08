// Type definitions for the mocked obsidian module
export const noticeCalls: string[];

export class Notice {
    constructor(message: string);
}

export class TFile {
    path: string;
    basename: string;
    extension: string;
    name: string;
    parent: any;
}

export class TFolder {
    path: string;
    name: string;
    parent: any;
    children: any[];
}

export function getFrontMatterInfo(content: string): any;

export class Plugin {
    app: any;
    manifest: any;
}

export class Modal {
    app: any;
    containerEl: any;
    constructor(app: any);
    open(): void;
    close(): void;
    onOpen(): void;
    onClose(): void;
}

export class PluginSettingTab {
    app: any;
    plugin: any;
    containerEl: any;
    constructor(app: any, plugin: any);
    display(): void;
}
