import * as vscode from 'vscode';

/**
 * Verifies if current focused file is ligo language.
 * @param e vscode.TextEditor : The active editor for vscode instance
 * @returns True if active editor is a ligo file, false otherwise
 */
export function isLigoDetected(e: vscode.TextEditor | undefined): boolean {
  if (!e) {
    console.log("No active editor!");
    return false;
  }
  return e.document.languageId.match(/^(m|js|re)?ligo$/g) ? true : false;
}

