import * as vscode from 'vscode';

/**
 * Verifies if current focused file is ligo language.
 * @param e vscode.TextEditor : The active editor for vscode instance
 * @returns True if active editor is a ligo file, false otherwise
 */
export function isLigoFileDetected(e: vscode.TextEditor | undefined): boolean {
  if (!e) {
    console.log("No active editor!");
    return false;
  }
  return !!e.document.languageId.match(/^(m|js|re)?ligo$/g);
}

/**
 * Verifies if ligo-vscode is installed and active
 */
export function isLigoExtensionActive(): boolean {
  const a = vscode.extensions.getExtension("ligolang-publish.ligo-vscode");
  return (!!a && a.isActive);
}

/**
 * Compiles the active ligo document
 */
export function compileActiveLigo() {
  return vscode.commands.executeCommand("ligo.compileContract", "main");
}
