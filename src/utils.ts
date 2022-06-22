import { execSync } from 'child_process';
import { TextDecoder } from 'util';
import * as vscode from 'vscode';

/**
 * Verifies if ligo executable is found within the sytem.
 * @returns `true` if ligo executable is found, `false` otherwise.
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
    return false;
  }
}

/**
 * Attempts to read a file and returns its contents as string.
 * @param uri `vscode.Uri`.
 * @returns The contents of the read file as a string, 
 * empty string if failed to be read.
 */
export async function readFile(uri: vscode.Uri) {
  try {
    let encoded = await vscode.workspace.fs.readFile(uri);
    let contract = new TextDecoder("utf-8").decode(encoded);
    return contract;
  } catch {
    return "";
  }
}

/**
 * Attempts to write content into uri descriptor.
 * @param uri `vscode.Uri`
 * @param content `Uint8Array` encoded content
 * @returns `true` if successful, `false` otherwise.
 */
export async function writeFile(uri: vscode.Uri, content: Uint8Array) {
  try {
    await vscode.workspace.fs.writeFile(uri, content);
    return true;
  } catch {
    return false;
  }
}

