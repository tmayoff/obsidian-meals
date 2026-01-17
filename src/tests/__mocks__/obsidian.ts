import { vi } from 'vitest';

// Track all Notice calls globally
export const noticeCalls: string[] = [];

export class Notice {
    constructor(message: string) {
        noticeCalls.push(message);
    }
}

export class TFile {
    path = '';
    basename = '';
    extension = '';
    name = '';
    parent: any = null;

    constructor() {
        // Mock implementation
    }
}

export class TFolder {
    path = '';
    name = '';
    parent: any = null;
    children: any[] = [];

    constructor() {
        // Mock implementation
    }
}

export const getFrontMatterInfo = vi.fn();

export class Plugin {
    app: any;
    manifest: any;

    constructor() {
        // Mock implementation
    }
}

export class Modal {
    app: any;
    containerEl: any = {
        children: [null, { children: [null, null, {}] }],
    };

    constructor(app: any) {
        this.app = app;
    }

    open() {}
    close() {}
    onOpen() {}
    onClose() {}
}

export class PluginSettingTab {
    app: any;
    plugin: any;
    containerEl: any = {};

    constructor(app: any, plugin: any) {
        this.app = app;
        this.plugin = plugin;
    }

    display() {}
}
