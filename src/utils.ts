import { execSync, Serializable } from "child_process";
import { posix } from "path";
import { TextDecoder, TextEncoder } from "util";
import * as vscode from "vscode";
import {
  CompileContractOptions,
  CompileContractOutput,
  ContractEntryScheme,
  ExecutionResult,
  Maybe,
} from "./types";

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
   * Verifies if Whylson program is found within the sytem.
   * @returns `true` if Whylson is found, `false` otherwise.
   */
  export function verifyWhylsonBinaries(): boolean {
    throw new Error("Method not implemented.");
  }

  /**
   * Verifies if current focused file is ligo language.
   * @param e The active editor for vscode instance.
   * @returns `true` if active editor is a ligo file, `false` otherwise.
   */
  export function isLigoFileDetected(e: vscode.TextDocument): boolean {
    if (!e) {
      return false;
    }
    return !!e.languageId.match(/^(m|js|re)?ligo$/g);
  }

  /**
   * Verifies if ligo-vscode is installed and active.
   * @returns `true` if the above condition is true, `false` otherwise.
   */
  export function isLigoExtensionActive(): boolean {
    const a = vscode.extensions.getExtension("ligolang-publish.ligo-vscode");
    return !!a && a.isActive;
  }

  /**
   * Creates and returns `ContractEntryScheme` object from params.
   * @param ligoPath Path to a ligo document.
   * @param michelsonPath Destination path for compilations of specified ligo document.
   * @param entrypoint Entrypoint to michelson contract as string.
   * @returns A `ContractEntryScheme` object.
   */
  export function createEntry(
    ligoPath: string,
    michelsonPath: string,
    entrypoint: string
  ): ContractEntryScheme {
    return {
      title: posix.basename(ligoPath).split(".")[0],
      source: ligoPath,
      onPath: michelsonPath,
      entrypoint: entrypoint,
      flags: [],
    };
  }

  /**
   * Compiles the active ligo document using a set of options.
   * @param source File path to active ligo document.
   * @param cco Set of compilation options for a ligo contract.
   * @returns `CompileContractOutput` object.
   */
  export function compileLigo(
    source: string,
    cco: CompileContractOptions
  ): CompileContractOutput {
    let command = `ligo compile contract ${source} -e ${
      cco.entrypoint
    } ${cco.flags.join(" ")}`.trimEnd();

    if (cco.onPath) {
      command = command.concat(` -o ${cco.onPath}`);
    }

    try {
      // Compile without outputting to file
      const stdout = execSync(command, { encoding: "utf-8" });
      return { command: command, stdout: stdout, status: true };
    } catch (error) {
      return { command: command, stdout: undefined, status: false };
    }
  }

  /**
   * Calls to `ligo.silentCompileContract` command with compile contract options.
   * @param cco Set of compilation options for a ligo contract.
   * @returns Set of contract compilation results as `ExecutionResult` or a promise to one.
   */
  export async function _compileLigo(
    cco: CompileContractOptions
  ): Promise<ExecutionResult> {
    return await vscode.commands.executeCommand("ligo.silentCompileContract", {
      ...cco,
      printToConsole: false,
    });
  }

  /**
   * Preppend all lines of text with `"# "`.
   * @param content Text as a string.
   * @returns The same text with each line preppended with `"# "`.
   */
  function commentMichelson(content: string) {
    const lines = content.split("\n");
    let arr = lines.map((line) => {
      return `# ${line}\n`;
    });
    return arr.join("\n");
  }

  /**
   * Extract and parse data from ligo compilation process.
   * @param results Object pertaining information regarding ligo compilation.
   * @returns Data parsed from compilation results.
   */
  export function extractResults(results: ExecutionResult) {
    // ? Is there any terser way to do this?
    switch (results.t) {
      case "Success":
        return { ok: true, text: results.result };
      case "LigoExecutionException":
        return { ok: true, text: commentMichelson(results.error) };
      default:
        return { ok: false, text: results.t };
    }
  }

  /**
   * Evaluate `vscode.Uri` to an existing resource.
   * @param uri Uri subject to existence check.
   * @returns `true` if argument represents an existing resource, `false` otherwise.
   */
  export async function isExistsFile(uri: vscode.Uri): Promise<boolean> {
    try {
      return !!(await vscode.workspace.fs.stat(uri));
    } catch {
      return false;
    }
  }

  /**
   * Attempts to read a file and returns its contents as string.
   * @param uri Uri of the file to be read.
   * @returns The contents of the resource as `string`,
   * or `empty string` if unsuccessful.
   */
  export async function safeRead(uri: vscode.Uri): Promise<string> {
    try {
      let encoded = await vscode.workspace.fs.readFile(uri);
      let decoded = new TextDecoder("utf-8").decode(encoded);
      return decoded;
    } catch {
      return "";
    }
  }

  /**
   * Attempts to write content into uri descriptor.
   * @param uri Uri of the file to be written on.
   * @param contents Contents to be written to the file
   * @returns `true` if successful, `false` otherwise.
   */
  export async function safeWrite(
    uri: vscode.Uri,
    contents: Serializable
  ): Promise<boolean> {
    try {
      await vscode.workspace.fs.writeFile(
        uri,
        new TextEncoder().encode(JSON.stringify(contents))
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Attepmts to delete resource in specified uri.
   * @param uri Uri of the resource(s) to be deleted.
   * @returns `true` if successful, `false` otherwise.
   */
  export async function safeDelete(
    uri: vscode.Uri,
    options: Maybe<{ recursive?: boolean; useTrash?: boolean }>
  ): Promise<boolean> {
    try {
      await vscode.workspace.fs.delete(uri, options);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Attempts to create a new directory at designed destination.
   * @param uri Uri of the destination folder.
   * @returns `true` if successful, `false` otherwise.
   */
  export async function safeCreateDir(uri: vscode.Uri): Promise<boolean> {
    try {
      await vscode.workspace.fs.createDirectory(uri);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Parse string contents into type parameter `type`.
   * @param contents String representation of initial contents.
   * @returns Contents parsed into type parameter `type`.
   */
  export function safeParse<T>(contents: string): Maybe<T> {
    try {
      return JSON.parse(contents) as T;
    } catch {
      return undefined;
    }
  }

  /**
   * Creates a quickpick with `showInputBox`.
   * Manually input a valid entrypoint for a ligo document.
   * @returns Chosen entrypoint designation as string.
   */
  export async function entrypointInput(): Promise<Maybe<string>> {
    return await vscode.window.showInputBox({
      title: "First Time Ligo Compile",
      placeHolder: "main",
      prompt: "Pick entrypoint for ligo contract",
      value: "main",
      validateInput: (text) => {
        // undefined, null or empty string accepts the prompt
        return new RegExp(/^[a-zA-Z_]+[a-zA-Z0-9'_]*$/g).test(text)
          ? undefined
          : "Values must conform to ligo's function nomenclature";
      },
    });
  }
}
