import { posix } from 'path';
import { TextDecoder, TextEncoder } from 'util';
import * as vscode from 'vscode';
import { WhylsonLogger } from './logger';
import { MichelsonView } from './michelson-view';
import { ContractEntryScheme, Maybe } from './types';
import { utils } from './utils';

/**
 * Encapsulation of relevant data for a well functioning Ligo-Michelson pair view
 */
export class WhylsonContext {

  protected _context: vscode.ExtensionContext;
  protected _rootFolder: Maybe<vscode.WorkspaceFolder>;
  protected _configUri: Maybe<vscode.Uri>;
  protected _contractsBinUri: Maybe<vscode.Uri>;
  static view: MichelsonView;
  static log: WhylsonLogger;

  /**
   * Creates a WhylsonContext instance.  
   * Constructor solely establishes safe base values if trusted workspace exists.
   * @param context `vscode.ExtensionContext`.
   */
  constructor(context: vscode.ExtensionContext) {
    this._context = context;
    WhylsonContext.view = new MichelsonView(context);
    WhylsonContext.log = new WhylsonLogger(context);

    if (this.isWorkspaceAvailable()) {
      this._rootFolder = vscode.workspace.workspaceFolders![0];
      this._configUri = vscode.Uri.parse(posix.join(this._rootFolder.uri.path, ".whylson/contracts.json"));
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
    WhylsonContext.log.dispose();
    if (WhylsonContext.view?.isOpen) {
      WhylsonContext.view.closeMichelsonView();
    };
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
    if (!await utils.isExistsFile(this._configUri!)) {
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
    await vscode.workspace.fs.writeFile(
      this._configUri!,
      new TextEncoder().encode("[]"));
    WhylsonContext.log.info(`Created contracts configuration file at ${this._configUri!.path}`);
  }

  /**
   * Creates a new `".whylson/bin-contracts"` folder.
   * @param reset `boolean` If `true` recursively deletes contents and recreates folder.
   */
  private async createContractsDir(reset: boolean) {
    if (reset) {
      try {
        await vscode.workspace.fs.delete(this._contractsBinUri!, { recursive: true, useTrash: true });
      } catch { return; }
    }
    await vscode.workspace.fs.createDirectory(this._contractsBinUri!);
    WhylsonContext.log.info(`Created directory at ${this._contractsBinUri!.path}`);
  }

  /**
   * Attempts to read `".whylson/contracts.json"`.
   * @returns `ContractEntryScheme[]` if read successfully, `undefined` otherwise.
   */
  private async readContractsJSON(): Promise<Maybe<ContractEntryScheme[]>> {
    try {
      const encodedJSON = await vscode.workspace.fs.readFile(this._configUri!);
      return JSON.parse(new TextDecoder("utf-8").decode(encodedJSON));
    } catch {
      WhylsonContext.log.info("Failed to read \".whylson/contracts.json\"", true);
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
      return await utils.writeFile(this._configUri!, new TextEncoder().encode(JSON.stringify(nc)));
    }
    return false;
  }

  /**
   * Creates entry for activo ligo document on `".whylson/contracts.json"`.
   * @param uri `vscode.Uri`. Uri of the active ligo document.
   * @return `Maybe<ContractEntryScheme>`.
   */
  private async createContractEntry(uri: vscode.Uri): Promise<Maybe<ContractEntryScheme>> {

    const ep = await utils.entrypointInput();
    if (!ep) {
      vscode.window.showErrorMessage("Failed to accept entrypoint, aborting entry creation.");
      return undefined;
    }

    const contents = await this.readContractsJSON();
    if (contents) {
      const contractEntry: ContractEntryScheme = {
        source: uri.path,
        onPath: this.michelsonOfLigo(uri.path),
        entrypoint: ep,
        flags: ["--michelson-comments", "location"]
      };
      contents.push(contractEntry);
      await utils.writeFile(this._configUri!, new TextEncoder().encode(JSON.stringify(contents)));
      return contractEntry;
    }
    vscode.window.showErrorMessage(`Failed to create an entry for ${uri.path}`);
    return undefined;
  }

  /**
   * Builds the michelson contract path from ligo document path.
   * @param ligoDocPath `string` Path to ligo document source.
   * @returns `string` File path to michelson contract.
   */
  private michelsonOfLigo(ligoDocPath: string) {
    const basename = posix.basename(ligoDocPath).split(".")[0];
    return posix.join(this._contractsBinUri!.path, basename.concat(".tz"));
  }

  /**
   * Checks wheather active ligo document has its michelson counterpart or not.  
   * If it does not, attempts to creates an entry in `contracts.json` and compiles document.  
   * If contract compilation fails removes contract entry.
   * @param e `vscode.TextEditor`.
   * @returns `vscode.Uri` of the michelson contract.
   */
  private async findContractBin(e: vscode.TextEditor): Promise<Maybe<vscode.Uri>> {

    const onPath = this.michelsonOfLigo(e.document.uri.path);

    // Contract is found
    if (await utils.isExistsFile(vscode.Uri.parse(onPath))) {
      return vscode.Uri.parse(onPath);
    }

    // Contract not found, create entry
    const entry = await this.createContractEntry(e.document.uri);
    if (entry) {
      const { status } = this.compileContract(entry);
      if (status) {
        // Contract compiled successfully
        return vscode.Uri.parse(onPath);
      }
      // First contract compilation has to be successful
      await this.removeContractEntry(e.document.uri);
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

    // ! Do not make this automatic trigger this action with an editor icon
    // Triggers every time a tab is swapped
    this._context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor((e) => {
        // ? Close michelson view if not ligo?
      })
    );

    // Triggers everytime a document is saved
    this._context.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument((e) => {
        // ? If ligo document compile contract and open/refresh michelson view
        // ? Saving on a ligo contract opens/refreshes michelson view
        // ? Adds entry to contracts.json if not present
      })
    );

    // Triggers everytime tab vector changes
    this._context.subscriptions.push(
      vscode.window.onDidChangeVisibleTextEditors((e) => {
        // ? If ligo or michelson are removed from group
      })
    );

    // Mapping from file to latest onDidChangeTextDocument event
    const changeTimers = new Map<string, NodeJS.Timeout>();

    // Triggers every when any change to a document in the tabs is made
    this._context.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument((e) => {
        // if (!WhylsonContext.isLigoFileDetected(e.document)) {
        //   return;
        // }
        // if (WhylsonContext.view?.isOpen) {
        //   const fname = e.document.fileName;
        //   const timer = changeTimers.get(fname);
        //   if (timer) {
        //     clearTimeout(timer);
        //   }

        //   changeTimers.set(fname, setTimeout(() => {
        //     changeTimers.delete(fname);
        //     // WhylsonContext.view?.refreshView();
        //   }));

        // } else {
        //   // open michelson view
        //   // WhylsonContext.view?.openMichelsonView();
        // }
      })
    );

    // Deactivate context if ligo extension becomes inactive
    this._context.subscriptions.push(
      vscode.extensions.onDidChange(() => {
        WhylsonContext.log.debug("Extensions changed!");
        if (!utils.isLigoExtensionActive()) {
          vscode.window.showErrorMessage("ligo-vscode deactivated, shutting down whylson context");
          this.deactivate();
        }
      })
    );
  }

  /**
   * Registers Whylson-Connector extensions commands.  
   * Only some commands are available in the contributions menu.
   */
  private registerCommands() {

    this._context.subscriptions.push(
      vscode.commands.registerCommand("whylson-connector.check-ligo", async () => {
        const activeEditor = vscode.window.activeTextEditor;

        if (utils.isLigoFileDetected(activeEditor)) {
          const contractUri = await this.findContractBin(activeEditor!);

          if (contractUri) {
            const contractText = await utils.readFile(contractUri);

            WhylsonContext.log.debug("Attempting to open michelson-view.");
            WhylsonContext.view.openMichelsonView(contractUri, contractText);
            WhylsonContext.log.debug("Opened michelson-view.");
          }
        }
      })
    );

    // Open a michelson view from current ligo source
    this._context.subscriptions.push(
      vscode.commands.registerCommand("whylson-connector.open-michelson-view", () => {
        vscode.window.showErrorMessage("Not implemented yet.");
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
      vscode.workspace.registerTextDocumentContentProvider("whylson", WhylsonContext.view)
    );
  }
}
