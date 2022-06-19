import { TextEncoder } from 'util';
import * as vscode from 'vscode';
import { info } from './logger';

/**
 * Encapsulation of relevant data for a well functioning Ligo-Michelson pair view
 */
export class WhylsonContext {

  private _context: vscode.ExtensionContext;
  private _rootFolder: vscode.WorkspaceFolder | undefined;
  private _configPath: vscode.Uri | undefined;
  private _contractsPath: vscode.Uri | undefined;

  /**
   * Creates a WhylsonContext instance.
   * Constructor solely establishes safe base values if
   * @param context `vscode.ExtensionContext`
   */
  constructor(context: vscode.ExtensionContext) {
    this._context = context;

    if (this.isWorkspaceAvailable()) {
      this._rootFolder = vscode.workspace.workspaceFolders![0];
    } else {
      vscode.window.showWarningMessage(
        "Whylson-Connector requires an available workspace to operate.");
    }
  }

  /**
   * Fills out the extension with relevant information
   */
  activate() {
    if (!this.findWhylsonFolder()) {
      info("Creating \".whylson\" folder and its contents in workspace root...");
      this.createWhylsonFolder();
    }
  }

  /**
   * Checks wheather current instance has a trusted workspace/folder opened
   * @returns `true` if trusted workspace/folder is opened, `false` otherwise
   */
  private isWorkspaceAvailable(): boolean {
    if (vscode.workspace.workspaceFolders) {
      return true && vscode.workspace.isTrusted;
    } return false;
  }

  /**
   * Checks wheather or not .whylson folder has correct structure
   * @returns `true` if it has the minimum structure, `false` otherwise
   */
  private async findWhylsonFolder() {
    if (!this._rootFolder) { return; }

    // * Find /.whylson/contracts
    // * Find /.whylson/config.json
    const target = new vscode.RelativePattern(this._rootFolder.uri, "**/.whylson/config.json");
    const found = await vscode.workspace.findFiles(target, "**/node_modules/**", 1);
    this._configPath = found[0];
    return !!this._configPath;
  }

  /**
   * Creates a new .whylson folder and its contents at the workspace root
   */
  private createWhylsonFolder() {
    if (!this._rootFolder) { return; }

    // * Create /.whylson/contracts
    // * Create /.whylson/config.json
    vscode.workspace.fs.createDirectory(vscode.Uri.parse("./.whylson/contracts"));
    vscode.workspace.fs.writeFile(
      vscode.Uri.parse("./whylson/config.json"),
      new TextEncoder().encode("{}"));
  }

  /**
   * Find the respective michelson contract of the current ligo source
   * @param e `vscode.TextEditor`
   */
  findContract(e: vscode.TextEditor) {

  }

}
