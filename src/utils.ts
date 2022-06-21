import { execSync } from 'child_process';
import * as vscode from 'vscode';
import { info } from './logger';

/**
 * Verifies if ligo executable is found within the sytem
 * @returns `true` if ligo executable is found, `false` otherwise
 */
export async function verifyLigoBinaries() {

  try {
    execSync("which ligo", { encoding: "utf-8" });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Evaluate `vscode.Uri` to an existing resource.
 * @param uri `vscode.Uri`.
 * @returns `true` if argument represents an existing resource, `false` otherwise.
 */
export async function isExistsFile(uri: vscode.Uri) {
  try {
    return !!await vscode.workspace.fs.stat(uri);
  } catch {
    info(`File ${uri.path} does not exist.`);
    return false;
  }
}

