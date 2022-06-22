import { execSync } from 'child_process';
import { TextDecoder } from 'util';
import * as vscode from 'vscode';
import { CompileContractOptions, CompileContractOutput, Maybe } from './types';

export namespace utils {

  /**
   * Verifies if ligo executable is found within the sytem.
   * @returns `true` if ligo executable is found, `false` otherwise.
   */
  export function verifyLigoBinaries(): boolean {
    try {
      execSync("which ligo", { encoding: "utf-8" });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Verifies if current focused file is ligo language.
   * @param e vscode.TextEditor : The active editor for vscode instance.
   * @returns True if active editor is a ligo file, false otherwise.
   */
  export function isLigoFileDetected(e: vscode.TextEditor | undefined) {
    if (!e) { return false; }
    return !!e.document.languageId.match(/^(m|js|re)?ligo$/g);
  }

  /**
   * Verifies if ligo-vscode is installed and active.
   * @returns `true` if the above condition is true, `false` otherwise.
   */
  export function isLigoExtensionActive(): boolean {
    const a = vscode.extensions.getExtension("ligolang-publish.ligo-vscode");
    return (!!a && a.isActive);
  }

  /**
   * Compiles the active ligo document using a set of options.
   * @param source `string` File path to active ligo document.
   * @param cco `CompileContractOptions`.
   * @returns `CompileContractOutput` object
   */
  // ! This function might be overhauled by an API call to ligo extension
  export function compileLigo(source: string, cco: CompileContractOptions): CompileContractOutput {

    let command = `ligo compile contract ${source} -e ${cco.entrypoint} ${cco.flags.join(" ")}`.trimEnd();
    if (cco.onPath) {
      command = command.concat(` -o ${cco.onPath}`);
    }

    try {
      let text = execSync(command, { encoding: "utf-8" });
      return { command: command, stdout: text, status: true };
    } catch (error) {
      return { command: command, stdout: undefined, status: false };
    }
  }

  /**
   * Evaluate `vscode.Uri` to an existing resource.
   * @param uri `vscode.Uri`.
   * @returns `true` if argument represents an existing resource, `false` otherwise.
   */
  export async function isExistsFile(uri: vscode.Uri): Promise<boolean> {
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
  export async function readFile(uri: vscode.Uri): Promise<string> {
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
  export async function writeFile(uri: vscode.Uri, content: Uint8Array): Promise<boolean> {
    try {
      await vscode.workspace.fs.writeFile(uri, content);
      return true;
    } catch {
      return false;
    }
  }

  export async function entrypointInput(): Promise<Maybe<string>> {

    return await vscode.window.showInputBox({
      title: "First Time Ligo Compile",
      placeHolder: "Most generically, \"main\"",
      prompt: "Pick entrypoint for ligo contract",
      value: "main",
      validateInput: text => {
        // undefined, null or empty string accepts the prompt
        return new RegExp(/^[a-zA-Z_]+[a-zA-Z0-9'_]*$/g).test(text) ? undefined : "main";
      }
    });
  }
}
