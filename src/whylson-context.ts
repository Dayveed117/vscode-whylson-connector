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
    this.registerEvents();
    this.registerCommands();
  }

  private deactivate() {
    this._context.subscriptions.forEach(disposable => {
      disposable.dispose();
    });

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

  private findContractBin() {
    throw new Error("Method not Implemented");
  }

  private compileContract(e: vscode.TextDocument) {
    throw new Error("Method not Implemented");
  }

  private isWhylsonDetected(): boolean {
    throw new Error("Method not implement.");
  }

  launchWhylson(contract: vscode.Uri) {
    throw new Error("Method not implement.");
  }

  // --------------------------------------------- //
  //                     STATIC                    //
  // --------------------------------------------- //

  /**
   * Verifies if current focused file is ligo language.
   * @param e vscode.TextEditor : The active editor for vscode instance.
   * @returns True if active editor is a ligo file, false otherwise.
   */
  static isLigoFileDetected(e: vscode.TextEditor | undefined): boolean {
    if (!e) {
      return false;
    }
    return !!e.document.languageId.match(/^(m|js|re)?ligo$/g);
  }

  /**
   * Verifies if ligo-vscode is installed and active.
   * @returns `true` if the above condition is true, `false` otherwise.
   */
  static isLigoExtensionActive(): boolean {
    const a = vscode.extensions.getExtension("ligolang-publish.ligo-vscode");
    return (!!a && a.isActive);
  }

  // --------------------------------------------- //
  //                     EVENTS                    //
  // --------------------------------------------- //

  /**
   * Registers events that concern whylson context
   */
  private registerEvents() {

    // ? Close Dual View if active?
    this._context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor((e) => {

      })
    );

    // ? Saving on a ligo contract opens/refreshes michelson view
    // ? Adds entry to contracts.json if not present
    this._context.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument((e) => {

      })
    );

    // ? If ligo or michelson are removed from group
    this._context.subscriptions.push(
      vscode.window.onDidChangeVisibleTextEditors((e) => {

      })
    );

    // ? Changes made to ligo attempt to refresh michelson view
    this._context.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument((e) => {

      })
    );

    this._context.subscriptions.push(
      vscode.extensions.onDidChange(() => {
        if (!WhylsonContext.isLigoExtensionActive()) {
          this.deactivate();
        }
      })
    );
  }

  // ----------------------------------------------- //
  //                     COMMANDS                    //
  // ----------------------------------------------- //

  private registerCommands() {

    // ! Placeholder check ligo
    this._context.subscriptions.push(
      vscode.commands.registerCommand("whylson-connector.check-ligo", () => {

      })
    );

    // Open a michelson view from current ligo source
    this._context.subscriptions.push(
      vscode.commands.registerCommand("whylson-connector.open-michelson-view", () => {

      })
    );

    // * Future Whylson start session
    this._context.subscriptions.push(
      vscode.commands.registerCommand("whylson-connector.start-session", () => {

      })
    );
  }
}
