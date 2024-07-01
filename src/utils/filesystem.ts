import { type App, TFile } from 'obsidian';

export async function OpenNoteFile(app: App, file: TFile) {
    await OpenNotePath(app, file.path);
}

export async function OpenNotePath(app: App, filePath: string) {
    let found = false;

    const fileName = filePath.substring(filePath.lastIndexOf('/') + 1, filePath.lastIndexOf('.'));
    app.workspace.iterateAllLeaves((leaf) => {
        if (leaf.getDisplayText() === fileName) {
            app.workspace.setActiveLeaf(leaf);
            found = true;
        }
    });

    if (!found) {
        await app.workspace.openLinkText(filePath, '', true);
    }
}

export function NoteExists(app: App, filePath: string) {
    const file = app.vault.getAbstractFileByPath(filePath);
    return file != null && file instanceof TFile;
}

export function AppendMarkdownExt(filePath: string) {
    if (!filePath.endsWith('.md')) {
        filePath += '.md';
    }

    return filePath;
}
