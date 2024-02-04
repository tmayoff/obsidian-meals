import { TFile, type App } from 'obsidian';

export async function open_note_file(app: App, file: TFile) {
    open_note_path(app, file.path);
}

export async function open_note_path(app: App, file_path: string) {
    let found = false;

    const file_name = file_path.substring(file_path.lastIndexOf('.'));

    app.workspace.iterateAllLeaves((leaf) => {
        if (leaf.getDisplayText() === file_name) {
            app.workspace.setActiveLeaf(leaf);
            found = true;
        }
    });

    if (!found) {
        await app.workspace.openLinkText(file_path, '', true);
    }
}

export function note_exists(app: App, file_path: string) {
    const file = app.vault.getAbstractFileByPath(file_path);
    return file != null && file instanceof TFile;
}

export function append_markdown_ext(file_path: string) {
    if (!file_path.endsWith('.md')) {
        file_path += '.md';
    }

    return file_path;
}
