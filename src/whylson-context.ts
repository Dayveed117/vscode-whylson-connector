import { posix } from 'path';
import { debounce } from 'ts-debounce';
import { TextDecoder, TextEncoder } from 'util';
import * as vscode from 'vscode';
import { Config } from './config';
import { Logger } from './logger';
import { MichelsonView, TestView } from './michelson-view';
import { CompileContractOptions, CompileContractOutput, ContractEntryScheme, Maybe } from './types';
import { utils } from './utils';

/**
 * Encapsulation of relevant data for a well functioning Ligo-Michelson pair view
 */
export class WhylsonContext {

  private readonly _context: vscode.ExtensionContext;
  private readonly _rootFolder: Maybe<vscode.WorkspaceFolder>;
  private readonly _contractsJsonUri: Maybe<vscode.Uri>;
  private readonly _contractsBinUri: Maybe<vscode.Uri>;
  private readonly _view: MichelsonView;
  private readonly _log: Logger;
  private readonly _config: Config;
  private readonly _viewT: TestView;

  /**
   * Creates a WhylsonContext instance.  
   * Constructor solely establishes safe base values if trusted workspace exists.
   * @param context `vscode.ExtensionContext`.
   */
  constructor(context: vscode.ExtensionContext) {
    this._context = context;
    this._log = new Logger(context);
    this._config = new Config(context);
    this._view = new MichelsonView(context, this._log);
    this._viewT = new TestView();

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
        await vscode.workspace.fs.delete(this._contractsBinUri!, { recursive: true });
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
    }
  }

  /**
   * Builds the michelson contract path from ligo document path.
   * @param ligoDocPath `string` Path to ligo document source.
   * @param shorten `boolean` Flag to control return value.
   * @returns `string` File path to michelson contract.
   */
  private ligoToMichelsonPath(ligoDocPath: string, shorten: boolean = true): string {
    const fname = posix.basename(ligoDocPath).split(".")[0].concat(".tz");
    return shorten ? fname : posix.join(this._contractsBinUri!.path, fname);
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
        onPath: this.ligoToMichelsonPath(uri.path, false),
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
   * Checks wheather active ligo document has its michelson counterpart or not.
   * @param doc `vscode.TextDocument`.
   * @returns `vscode.Uri` of the michelson contract.
   */
  private async findContractBin(doc: vscode.TextDocument): Promise<Maybe<vscode.Uri>> {
    const michelsonPath = this.ligoToMichelsonPath(doc.uri.path, false);
    const michelsonUri = vscode.Uri.parse(michelsonPath);
    return await utils.isExistsFile(michelsonUri) ? michelsonUri : undefined;
  }

  /**
 * Call compile contract function with `ContractEntryScheme` object.
 * @param ces `ContractEntryScheme`.
 * @param save `boolean` Controls compilation output (stdout, file).
 * @returns `CompileContractOutput`.
 */
  private compileContract(ces: ContractEntryScheme, save: boolean): CompileContractOutput {
    // We should not change original ces object
    // use object destructuring and rest operator
    return save ?
      utils.compileLigo(ces.source, ces) :
      utils.compileLigo(ces.source, { ...ces, onPath: undefined });
  }

  /**
   * Call compile contract with ligo.silentCompileContract command implementation.
   * @param ces `ContractEntryScheme`.
   * @returns `CompileContractOutput`.
   */
  private async _compileContract(ces: ContractEntryScheme, save: boolean): Promise<CompileContractOutput> {
    // We should not change original ces object
    // use object destructuring and rest operator
    return save ?
      await utils._compileLigo(ces) :
      await utils._compileLigo({ ...ces, onPath: undefined });
  }

  /**
   * Procedures that entail the first time a contract is compiled within the whylson context.  
   * Attempts to create an entry followed by attempting to compile contract. 
   * If successful, entry is accepted, otherwise, entry is removed.
   * @param doc `vscode.TextDocument`.
   * @returns Maybe `vscode.Uri` of the michelson compiled contract
   */
  private async firstContractCompilation(doc: vscode.TextDocument): Promise<Maybe<vscode.Uri>> {
    const entry = await this.createContractEntry(doc.uri);
    if (entry) {
      const { status } = this.compileContract(entry, true);
      if (status) {
        return vscode.Uri.parse(entry.onPath);
      }
      await this.removeContractEntry(doc.uri);
    }
  }

  /**
   * Display contents of contract into michelson view.
   * @param uri `vscode.Uri` Michelson contract uri, whose contents are to be displayed.
   * @param text `string` The contents of the file to be displayed.
   */
  private async displayContract(uri: vscode.Uri, text?: string) {
    const contractText = text ? text : await utils.readFile(uri);
    this._view.display(this.ligoToMichelsonPath(uri.path), contractText);
  }

  /**
   * Attempts to compile current ligo document and display it in michelson view.  
   * The compilation does not store michelson in a file, 
   * but rather only to update michelson view.
   * @param doc `vscode.TextDocument` Active ligo document.
   */
  // * Requires arrow function to retain the "this" context in debounced function
  private displayContractFromSource = async (doc: vscode.TextDocument) => {
    // Find if contract has entry
    this._log.debug("Starting debounced function");
    let entry = await this.getContractEntry(doc.uri);
    if (entry) {
      // Attempts to compile contract, result is written into a file
      const { status, stdout } = this.compileContract(entry, false);
      if (status) {
        // Display contract on successful compilation
        this.displayContract(doc.uri, stdout);
      }
    }
  };

  // --------------------------------------------------------------------------
  // --------------------------------------------------------------------------
  // --------------------------------------------------------------------------

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
        // Ignore if not ligo document
        if (!utils.isLigoFileDetected(e)) {
          return;
        }

        // Find if contract has entry
        // If not, attempt to create entry, depending on extension configuration
        let entry = await this.getContractEntry(e.uri);
        if (!entry && this._config.getOnSaveCreateActions()?.createEntry) {
          entry = await this.createContractEntry(e.uri);
        }

        // If a valid entry is found or created, compile contract and display it
        // Only display if compilation successful and if extension configuration allows
        if (entry) {
          const { status } = this.compileContract(entry, true);
          this._log.info(`${status ? "Successful" : "Failed"} compilation of ${e.uri.path}`);
          if (status && this._config.getOnSaveCreateActions()?.openView) {
            this.displayContract(e.uri);
          }
        }
      })
    );

    // Triggers every when any change to a document in the tabs' group is made
    // * This function only executes every 750 miliseconds
    const throttledDisplay = debounce(this.displayContractFromSource, 750, { isImmediate: false });
    const f = debounce(this._viewT.display, 750, { isImmediate: false });
    this._context.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument(async (e) => {
        if (utils.isLigoFileDetected(e.document) && this._viewT.isOpen) {
          // throttledDisplay(e.document);
          console.log("changes!?");
          f(e.document.uri);
        }
      })
    );

    // Triggers when tab group is changed (opened file, closed file, moved to other group)
    // This event is more reliable for knowing when a document is closed
    this._context.subscriptions.push(
      vscode.window.onDidChangeVisibleTextEditors((e) => {
        // console.log(JSON.stringify(e));
        // let michelsonView = e.filter((v) => { (v.document.uri.scheme === "michelson"); });
        // console.log(michelsonView);
      })
    );

    // Triggers when there are changes in the extensions
    // TODO : Understand why event does not trigger under right circumstances
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
        this._viewT.display(vscode.window.activeTextEditor?.document.uri!);
        // vscode.window.showErrorMessage("Not implemented yet.");
      })
    );

    // Open the michelson view for current ligo document
    this._context.subscriptions.push(
      vscode.commands.registerCommand("whylson-connector.open-michelson-view", async () => {
        // This command is only ran when file is ligo due to contributes when clauses
        const doc = vscode.window.activeTextEditor!.document;
        let contractUri = await this.findContractBin(doc);

        // Did not find michelson counterpart for active ligo document
        if (!contractUri) {
          contractUri = await this.firstContractCompilation(doc);
        }

        // If creation successful display contract
        return contractUri ? this.displayContract(contractUri) : undefined;
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
        this._viewT.close();
        // vscode.window.showErrorMessage("Not implemented yet.");
      })
    );
  }

  /**
   * Registers providers for the extension
   */
  private registerProviders() {

    this._context.subscriptions.push(
      vscode.workspace.registerTextDocumentContentProvider(MichelsonView.scheme, this._view)
    );

    this._context.subscriptions.push(
      vscode.workspace.registerTextDocumentContentProvider(TestView.scheme, this._viewT)
    );
  }
}
