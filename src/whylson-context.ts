import { posix } from 'path';
import { TextEncoder } from 'util';
import * as vscode from 'vscode';
import { info } from './logger';

/**
 * Encapsulation of relevant data for a well functioning Ligo-Michelson pair view
 */
export class WhylsonContext {

  protected _context: vscode.ExtensionContext;
  protected _rootFolder: vscode.WorkspaceFolder | undefined;
  protected _configUri: vscode.Uri | undefined;
  protected _contractsUri: vscode.Uri | undefined;

  /**
   * Creates a WhylsonContext instance.  
   * Constructor solely establishes safe base values if trusted workspace exists.
   * @param context `vscode.ExtensionContext`
   */
  constructor(context: vscode.ExtensionContext) {
    this._context = context;

    if (this.isWorkspaceAvailable()) {
      this._rootFolder = vscode.workspace.workspaceFolders![0];
      this._configUri = vscode.Uri.parse(posix.join(this._rootFolder.uri.path, ".whylson/contracts.json"));
      this._contractsUri = vscode.Uri.parse(posix.join(this._rootFolder.uri.path, ".whylson/bin-contracts"));
    } else {
      vscode.window.showWarningMessage(
        "Whylson-Connector requires an available workspace to operate.");
    }
  }

  /**
   * Activation process Whylson Context, for now only context.
   */
  async activate() {
    this.initWhylsonFolder();
  }

  /**
   * Checks wheather current instance has a trusted workspace/folder opened.
   * @returns `true` if trusted workspace/folder is opened, `false` otherwise.
   */
  private isWorkspaceAvailable(): boolean {
    if (vscode.workspace.workspaceFolders) {
      return true && vscode.workspace.isTrusted;
    } return false;
  }

  /**
   * Attempts to find `.whylson/` and its contents at root workfolder.  
   * If non existant, fills folder with contents.
   */
  private async initWhylsonFolder() {
    if (!this._rootFolder) { return; }

    try {
      !!await vscode.workspace.fs.stat(this._configUri!);
    } catch {
      await vscode.workspace.fs.writeFile(
        this._configUri!,
        new TextEncoder().encode("{}"));
      info(`Created contracts configuration file at ${this._configUri!.path}`);
    }

    try {
      !!await vscode.workspace.fs.stat(this._contractsUri!);
    } catch {
      // Create /.whylson/bin-contracts
      await vscode.workspace.fs.createDirectory(this._contractsUri!);
      info(`Created directory at ${this._contractsUri!.path}`);
    }
  }
}
