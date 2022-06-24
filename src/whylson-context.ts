import { posix } from 'path';
import { TextDecoder, TextEncoder } from 'util';
import * as vscode from 'vscode';
import { Config } from './config';
import { Logger } from './logger';
import { MichelsonView } from './michelson-view';
import { ContractEntryScheme, Maybe } from './types';
import { utils } from './utils';

/**
 * Encapsulation of relevant data for a well functioning Ligo-Michelson pair view
 */
export class WhylsonContext {

  protected _context: vscode.ExtensionContext;
  protected _rootFolder: Maybe<vscode.WorkspaceFolder>;
  protected _contractsJsonUri: Maybe<vscode.Uri>;
  protected _contractsBinUri: Maybe<vscode.Uri>;
  protected _view: MichelsonView;
  protected _log: Logger;
  protected _config: Config;

  /**
   * Creates a WhylsonContext instance.  
   * Constructor solely establishes safe base values if trusted workspace exists.
   * @param context `vscode.ExtensionContext`.
   */
  constructor(context: vscode.ExtensionContext) {
    this._context = context;
    this._view = new MichelsonView(context);
    this._log = new Logger(context);
    this._config = new Config(context);

    if (this.isWorkspaceAvailable()) {
      this._rootFolder = vscode.workspace.workspaceFolders![0];
      this._contractsJsonUri = vscode.Uri.parse(posix.join(this._rootFolder.uri.path, ".whylson/contracts.json"));
      this._contractsBinUri = vscode.Uri.parse(posix.join(this._rootFolder.uri.path, ".whylson/bin-contracts"));
    } else {
      vscode.window.showWarningMessage(
        "Whylson-Connector requires an available workspace to operate.");
    }
  }

  /**
   * Registers commands, events, providers and initializes
   * the .whylson folder.
   */
  activate() {
    this.initWhylsonFolder();
    this.registerCommands();
    this.registerEvents();
    this.registerProviders();
    this.checkups();
  }

  private deactivate() {
    this._context.subscriptions.forEach(disposable => {
      disposable.dispose();
    });
    this._log.dispose();
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
 * Attempts to find `".whylson/"` and its contents at root workfolder.  
 * If non existant, fills folder with contents.
 */
  private async initWhylsonFolder() {
    if (!this._rootFolder) { return; }

    // Verify if ".whylson/contracts.json" exists
    if (!await utils.isExistsFile(this._contractsJsonUri!)) {
      this.createContractsJSON();
    }

    // Verify if ".whylson/bin-contracts" exists
    if (!await utils.isExistsFile(this._contractsBinUri!)) {
      this.createContractsDir(false);
    }
  }

  // TODO : Think better about procedures on first checkup
  /**
   * Runs verification functions guarateeing the well functioning
   * of the extension.  
   * If verifications fail, all context disposables will be disposed.
   */
  private async checkups() {
    // ? Verify is ligo extension is on?
    // ? Verify if ligo is on machine
    // ? Verify if whylson is on machine
    const a = utils.isLigoExtensionActive();
    const b = utils.verifyLigoBinaries();
    if (!a || !b) {
      vscode.window.showErrorMessage("Whylson-Connector cannot run, aborting");
      this.deactivate();
    }
  }

  /**
   * Creates a new `".whylson/contracts.json"` file.  
   * Recreating overwrites existing contents.
   */
  private async createContractsJSON() {
    try {
      await vscode.workspace.fs.writeFile(
        this._contractsJsonUri!,
        new TextEncoder().encode("[]"));
      this._log.info(`Created contracts configuration file at ${this._contractsJsonUri!.path}`);
    } catch {
      vscode.window.showErrorMessage("Unable to create \".whylson/contracts.json\"");
    }
  }

  /**
   * Creates a new `".whylson/bin-contracts"` folder.
   * @param reset `boolean` If `true` recursively deletes contents and recreates folder.
   */
  private async createContractsDir(reset: boolean) {
    if (reset) {
      try {
        await vscode.workspace.fs.delete(this._contractsBinUri!, { recursive: true, useTrash: true });
      } catch {
        vscode.window.showErrorMessage("Unable to delete \".whylson\" folder");
        return;
      }
    }
    try {
      await vscode.workspace.fs.createDirectory(this._contractsBinUri!);
      this._log.info(`Created directory at ${this._contractsBinUri!.path}`);
    } catch (error) {
      vscode.window.showErrorMessage("Unable to create \".whylson/bin-contracts\" folder");
    }
  }

  /**
   * Attempts to read `".whylson/contracts.json"`.
   * @returns `ContractEntryScheme[]` if read successfully, `undefined` otherwise.
   */
  private async readContractsJSON(): Promise<Maybe<ContractEntryScheme[]>> {
    try {
      const encodedJSON = await vscode.workspace.fs.readFile(this._contractsJsonUri!);
      return JSON.parse(new TextDecoder("utf-8").decode(encodedJSON));
    } catch {
      this._log.info("Failed to read \".whylson/contracts.json\"", true);
      return undefined;
    }
  }

  /**
   * Retrieves the contract entry for the active ligo document.
   * @param uri `vscode.Uri` for active ligo document.
   * @returns `Maybe<ContractEntryScheme>` for active ligo document.
   */
  private async getContractEntry(uri: vscode.Uri): Promise<Maybe<ContractEntryScheme>> {
    const contents = await this.readContractsJSON();
    if (contents) {
      for (const ces of contents) {
        if (ces.source === uri.path) {
          return ces;
        }
      }
    }
    return undefined;
  }

  /**
   * Remove entry from `contracts.json` from a given ligo document.
   * @param uri `vscode.Uri` Uri for active ligo document.
   * @returns `true` if operation successful, `false` otherwise.
   */
  private async removeContractEntry(uri: vscode.Uri): Promise<boolean> {
    const contents = await this.readContractsJSON();
    if (contents) {
      let nc = contents.filter((v, _) => { v.source !== uri.path; });
      return await utils.writeFile(this._contractsJsonUri!, new TextEncoder().encode(JSON.stringify(nc)));
    }
    return false;
  }

  /**
   * Creates entry for activo ligo document on `".whylson/contracts.json"`.
   * @param uri `vscode.Uri`. Uri of the active ligo document.
   * @return `Maybe<ContractEntryScheme>`.
   */
  private async createContractEntry(uri: vscode.Uri): Promise<Maybe<ContractEntryScheme>> {

    // User prompt for entering an entrypoint
    const ep = await utils.entrypointInput();
    if (!ep) {
      vscode.window.showErrorMessage("Failed to accept entrypoint, aborting entry creation.");
      return undefined;
    }

    const contents = await this.readContractsJSON();
    if (contents) {
      const contractEntry: ContractEntryScheme = {
        title: posix.basename(uri.path).split(".")[0],
        source: uri.path,
        onPath: this.michelsonOfLigo(uri.path, false),
        entrypoint: ep,
        flags: ["--michelson-comments", "location"]
      };
      // Push new entry to the end of the file, rewritting it
      contents.push(contractEntry);
      await utils.writeFile(this._contractsJsonUri!, new TextEncoder().encode(JSON.stringify(contents)));
      return contractEntry;
    }
    vscode.window.showErrorMessage(`Failed to create an entry for ${uri.path}`);
    return undefined;
  }

  /**
   * Builds the michelson contract path from ligo document path.
   * @param ligoDocPath `string` Path to ligo document source.
   * @param shorten `boolean` Flag to control return value.
   * @returns `string` File path to michelson contract.
   */
  private michelsonOfLigo(ligoDocPath: string, shorten: boolean = true): string {
    const fname = posix.basename(ligoDocPath).split(".")[0].concat(".tz");
    return shorten ? fname : posix.join(this._contractsBinUri!.path, fname);
  }

  /**
   * Checks wheather active ligo document has its michelson counterpart or not.  
   * If it does not, attempts to creates an entry in `contracts.json` and compiles document.  
   * If contract compilation fails removes contract entry.
   * @param doc `vscode.TextDocument`.
   * @returns `vscode.Uri` of the michelson contract.
   */
  private async findContractBin(doc: vscode.TextDocument): Promise<Maybe<vscode.Uri>> {

    const onPath = this.michelsonOfLigo(doc.uri.path, false);

    // Contract is found
    if (await utils.isExistsFile(vscode.Uri.parse(onPath))) {
      return vscode.Uri.parse(onPath);
    }

    // Contract not found, create entry
    const entry = await this.createContractEntry(doc.uri);
    if (entry) {
      const { status } = this.compileContract(entry);
      if (status) {
        // Contract compiled successfully
        return vscode.Uri.parse(onPath);
      }
      // First contract compilation has to be successful
      await this.removeContractEntry(doc.uri);
      return undefined;
    }
    return undefined;
  }

  // --------------------------------------------------------------------------
  // --------------------------------------------------------------------------
  // --------------------------------------------------------------------------

  /**
   * Call compile contract function with `ContractEntryScheme` object.
   * @param ces `ContractEntryScheme`.
   * @returns Contract text as string is compilation successful.
   */
  private compileContract(ces: ContractEntryScheme) {
    return utils.compileLigo(ces.source, ces);
  }

  private isWhylsonDetected(): boolean {
    throw new Error("Method not implemented.");
  }

  launchWhylson(contractPath: string) {
    throw new Error("Method not implemented.");
  }

  // -------------------------------------------------------- //
  //                     EVENTS & COMMANDS                    //
  // -------------------------------------------------------- //

  /**
   * Registers events that concern whylson context.
   */
  private registerEvents() {

    // Triggers everytime a document is saved
    this._context.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument(async (e) => {

        // Ignore if not ligo
        if (!utils.isLigoFileDetected(e)) {
          return;
        }

        // Find if contract has entry
        let entry = await this.getContractEntry(e.uri);

        if (!entry && this._config.getOnSaveCreateActions()?.createEntry) {
          // Attempt to create an entry
          entry = await this.createContractEntry(e.uri);
        }

        // If entry successful, compile contract and display it
        if (entry) {
          const { status, stdout } = this.compileContract(entry);
          if (status && this._config.getOnSaveCreateActions()?.openView) {
            this._view.display(this.michelsonOfLigo(e.uri.path), stdout!);
            return;
          }
        }
      })
    );

    // Mapping from file to latest onDidChangeTextDocument event
    const changeTimers = new Map<string, NodeJS.Timeout>();

    // Triggers every when any change to a document in the tabs is made
    this._context.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument((e) => {

      })
    );

    // Triggers when documents are closed
    this._context.subscriptions.push(
      vscode.workspace.onDidCloseTextDocument((e) => {
        // Close michelson views
        if (e.uri.scheme === "michelson") {
          this._view.close();
        }
      })
    );

    // Triggers when there are changes in the extensions
    this._context.subscriptions.push(
      vscode.extensions.onDidChange(() => {
        this._log.debug("Extensions changed!");
        // Deactivate context if ligo extension becomes inactive
        if (!utils.isLigoExtensionActive()) {
          vscode.window.showErrorMessage("ligo-vscode deactivated, shutting down whylson context");
          this.deactivate();
        }
      })
    );

    // Triggers when any changes are made into configurations
    this._context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        this._log.debug("Configurations changed!");
        if (e.affectsConfiguration('whylson-connector')) {
          this._config.refresh();
        }
      })
    );
  }

  /**
   * Registers Whylson-Connector extensions commands.  
   * Only some commands are available in the contributions menu.
   */
  private registerCommands() {

    // Tester command
    this._context.subscriptions.push(
      vscode.commands.registerCommand("whylson-connector.check-ligo", async () => {
        vscode.window.showErrorMessage("Not implemented yet.");
      })
    );

    // Open the michelson view for current ligo document
    this._context.subscriptions.push(
      vscode.commands.registerCommand("whylson-connector.open-michelson-view", async () => {
        // This command is only ran when file is ligo due to contributes when clauses
        const doc = vscode.window.activeTextEditor!.document;
        const contractUri = await this.findContractBin(doc);
        if (contractUri) {
          const contractText = await utils.readFile(contractUri);
          this._view.display(this.michelsonOfLigo(contractUri.path), contractText);
        }
      })
    );

    // Wipe out .whylson data remakes it
    this._context.subscriptions.push(
      vscode.commands.registerCommand("whylson-connector.remake-dot-whylson", () => {
        this.createContractsJSON();
        this.createContractsDir(true);
      })
    );

    // * Future Whylson start session
    this._context.subscriptions.push(
      vscode.commands.registerCommand("whylson-connector.start-session", () => {
        vscode.window.showErrorMessage("Not implemented yet.");
      })
    );
  }

  /**
   * Registers providers for the extension
   */
  private registerProviders() {

    this._context.subscriptions.push(
      vscode.workspace.registerTextDocumentContentProvider("michelson", this._view)
    );
  }
}
