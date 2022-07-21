import path, { posix } from "path";
import { debounce } from "ts-debounce";
import * as vscode from "vscode";
import { Config } from "./config";
import { Logger } from "./logger";
import {
  CompileContractOutput,
  ContractEntryScheme,
  ExecutionResult,
  Maybe,
} from "./types";
import { utils } from "./utils";
import { ViewManager } from "./view-manager";

/**
 * Encapsulation of relevant data for a well functioning Ligo-Michelson pair view.
 */
export class WhylsonContext {
  private readonly _context: vscode.ExtensionContext;
  private readonly _rootFolder: Maybe<vscode.WorkspaceFolder>;
  private readonly _contractsJsonUri: Maybe<vscode.Uri>;
  private readonly _contractsBinUri: Maybe<vscode.Uri>;
  private readonly _log: Logger;
  private readonly _config: Config;
  private readonly _manager: ViewManager;
  private readonly _watcher: Maybe<vscode.FileSystemWatcher>;
  private _entries: ContractEntryScheme[];

  private readonly cjpath = ".whylson/contracts.json" as const;
  private readonly cbpath = ".whylson/bin-contracts/" as const;

  /**
   * Creates a WhylsonContext instance.
   * Constructor establishes safe base values if trusted workspace exists.
   * @param context Initial context from vscode active entrypoint function.
   */
  constructor(context: vscode.ExtensionContext) {
    this._context = context;
    this._log = new Logger(context);
    this._config = new Config(context);
    this._manager = new ViewManager(context, this._log);
    this._entries = [];

    if (!this.isWorkspaceAvailable()) {
      vscode.window.showWarningMessage(
        "Whylson-Connector requires an available workspace to operate."
      );
      return;
    }

    this._rootFolder = vscode.workspace.workspaceFolders![0];
    this._contractsJsonUri = vscode.Uri.parse(
      posix.join(this._rootFolder.uri.fsPath, this.cjpath)
    );
    this._contractsBinUri = vscode.Uri.parse(
      posix.join(this._rootFolder.uri.fsPath, this.cbpath)
    );
    this._watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(this._rootFolder, this.cjpath),
      true,
      false,
      true
    );
  }

  /**
   * Registers commands, events, providers and initializes `.whylson` folder.
   */
  public async activate() {
    if (this.checkups() && (await this.initWhylsonFolder())) {
      this.registerEvents();
      this.registerCommands();
      this.registerProviders();
    } else {
      vscode.window.showErrorMessage(
        `${this._context.extension.id} is unable to run.`
      );
      this.deactivate();
    }
  }

  /**
   * Dispose all of the disposable resources.
   */
  private deactivate() {
    this._context.subscriptions.forEach((disposable) => {
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
    }
    return false;
  }

  /**
   * Attempts to find `".whylson/"` and its contents at root workfolder.
   * If non existent, fills folder with contents.
   */
  private async initWhylsonFolder() {
    if (!this._rootFolder) {
      return false;
    }

    // Verify if "contracts.json" exists
    // If exists, load contract schemes
    if (!(await utils.isExistsFile(this._contractsJsonUri!))) {
      this.createContractsJSON();
    } else {
      this.loadContractEntries();
    }

    // Verify if ".whylson/bin-contracts" exists
    if (!(await utils.isExistsFile(this._contractsBinUri!))) {
      this.createContractsDir(false);
    }

    return true;
  }

  /**
   * Runs verification functions guarateeing the well functioning
   * of the extension.
   * If verifications fail, all context disposables will be disposed.
   */
  // TODO : Think better about procedures on first checkup
  private checkups() {
    const a = utils.isLigoExtensionActive();
    const b = utils.verifyLigoBinaries();
    // ? Also verify if whylson is on machine
    return a && b;
  }

  /**
   * Creates a new `".whylson/contracts.json"` file.
   * Recreating overwrites existing contents.
   */
  private async createContractsJSON() {
    (await utils.safeWrite(this._contractsJsonUri!, []))
      ? this._log.info(`Created file at ${this._contractsJsonUri!.fsPath}`)
      : vscode.window.showErrorMessage(`Unable to create ${this.cjpath}`);
  }

  /**
   * Creates a new `".whylson/bin-contracts"` folder.
   * @param reset If `true` recursively deletes contents and recreates folder.
   */
  private async createContractsDir(reset: boolean) {
    if (reset) {
      await utils.safeDelete(this._contractsBinUri!, {
        recursive: true,
      });
    }

    (await utils.safeCreateDir(this._contractsBinUri!))
      ? this._log.info(`Created directory at ${this._contractsBinUri!.fsPath}`)
      : vscode.window.showErrorMessage(`Unable to create ${this.cbpath}`);
  }

  /**
   * Attempts to load `contracts.json` contents into `_entries` attribute.
   */
  private async loadContractEntries() {
    this._entries =
      utils.safeParse(await utils.safeRead(this._contractsJsonUri!)) ||
      this._entries;
  }

  /**
   * Builds the michelson contract path from ligo document path.
   * @param pathlike A uri or path value for a ligo document.
   * @returns Uri or filepath to michelson contract.
   */
  private ligoToMichelson<T extends string | vscode.Uri>(pathlike: T): T {
    if (pathlike instanceof vscode.Uri) {
      const base = posix.basename(pathlike.fsPath).split(".")[0].concat(".tz");
      return pathlike.with({
        path: posix.join(this._contractsBinUri!.fsPath, base),
      }) as T;
    }
    const base = posix.basename(pathlike).split(".")[0].concat(".tz");
    return posix.join(this._contractsBinUri!.fsPath, base) as T;
  }

  /**
   * Creates entry for activo ligo document on `contracts.json`.
   * Any duplicates found in file are removed.
   * @param uri Uri of the active ligo document.
   * @return Possibly a `ContractEntryScheme` or a promise to one.
   */
  private async createContractEntry(
    uri: vscode.Uri
  ): Promise<Maybe<ContractEntryScheme>> {
    // User prompt for entering an entrypoint
    const ep = await utils.entrypointInput();
    if (!ep) {
      return undefined;
    }

    // Create a new contract entry from active ligo doc and chosen entrypoint
    // Update internal list of entries, update `contracts.json`.
    const entry = utils.createEntry(
      uri.fsPath,
      this.ligoToMichelson(uri.fsPath),
      ep
    );

    // Remove entries that are already existent in file
    const lst = this._entries.filter((ces) => {
      ces.source !== uri.fsPath;
    });

    // safeWrite will automatically update entries
    return (await utils.safeWrite(this._contractsJsonUri!, [...lst, entry]))
      ? entry
      : undefined;
  }

  /**
   * Retrieves the contract entry for the active ligo document.
   * @param uri Uri for active ligo document.
   * @returns Possibly a ContractEntryScheme object for active ligo document.
   */
  private getContractEntry(uri: vscode.Uri): Maybe<ContractEntryScheme> {
    return this._entries.find((ces) => ces.source === uri.fsPath);
  }

  /**
   * Remove entry from `contracts.json` from a given ligo document.
   * @param uri Uri for active ligo document.
   * @returns `true` if removal is successful, `false` otherwise.
   */
  private async removeContractEntry(uri: vscode.Uri): Promise<boolean> {
    const lst = this._entries.filter((ces) => {
      ces.source !== uri.fsPath;
    });

    // Modifying contracts.json will trigger onDidChange, updating entries automatically
    return await utils.safeWrite(this._contractsJsonUri!, lst);
  }

  /**
   * Checks wheather active ligo document has its michelson counterpart
   * stored in `".whylson/bin"` folder or not.
   * @param doc Active ligo document in the editor.
   * @returns `true` if contract is found, `false` otherwise.
   */
  private async findContractBin(doc: vscode.TextDocument): Promise<boolean> {
    return await utils.isExistsFile(this.ligoToMichelson(doc.uri));
  }

  /**
   * Call compile contract function with `ContractEntryScheme` object.
   * @param ces An object describing ligo source metadata.
   * @param save Controls wheather to compile into stdout or file.
   * @returns An object describring results from compilation process.
   */
  private compileContract(
    ces: ContractEntryScheme,
    save: boolean
  ): CompileContractOutput {
    // We should not change original ces object
    // use object destructuring and rest operator
    return save
      ? utils.compileLigo(ces.source, ces)
      : utils.compileLigo(ces.source, { ...ces, onPath: undefined });
  }

  /**
   * Call compile contract with ligo.silentCompileContract command implementation.
   * @param ces An object describing ligo source metadata.
   * @returns An object describring results from compilation process.
   */
  private async _compileContract(
    ces: ContractEntryScheme,
    save: boolean
  ): Promise<ExecutionResult> {
    // We should not change original ces object
    // use object destructuring and rest operator
    return save
      ? await utils._compileLigo(ces)
      : await utils._compileLigo({ ...ces, onPath: undefined });
  }

  /**
   * Procedures that entail the first time a contract is compiled within whylson context.
   * Attempts to create an entry followed by attempting to compile contract.
   * If successful, entry is accepted, otherwise, entry is removed.
   * @param doc Active ligo document in the editor.
   * @returns Possibly an uri of the michelson compiled contract.
   */
  private async firstContractCompilation(
    doc: vscode.TextDocument
  ): Promise<Maybe<ContractEntryScheme>> {
    const entry = await this.createContractEntry(doc.uri);
    if (entry) {
      const { status } = this.compileContract(entry, true);
      if (status) {
        return entry;
      }
      vscode.window.showErrorMessage(`First contract compilation failed.`);
      await this.removeContractEntry(doc.uri);
      return undefined;
    }
    vscode.window.showErrorMessage(`Invalid entry for ligo contract.`);
    return undefined;
  }

  /**
   * Display contents of michelson contract of ligo document.
   * If no contents passed, attempts to read contract
   * @param uri Uri of the active ligo document.
   * @param contents Contents of the michelson contract.
   */
  private async displayContract(uri: vscode.Uri, contents: Maybe<string>) {
    const michelsonUri = this.ligoToMichelson(uri);
    const contractText = contents || (await utils.safeRead(michelsonUri));
    this._manager.display(uri, michelsonUri, contractText);
  }

  /**
   * Save ligo document, compile it, display it.
   * A failed compilation displays an error in the michelson view.
   * @param doc `vscode.TextDocument` Active ligo document.
   */
  // * Requires arrow function to retain the "this" context in debounced function
  private throttledSaveAndCompile = async (doc: vscode.TextDocument) => {
    if (!(await doc.save())) {
      return;
    }

    const entry = this.getContractEntry(doc.uri);
    if (entry) {
      const results = await this._compileContract(entry, false);
      const contractText = utils.extractResults(results);

      this._manager.display(
        doc.uri,
        this.ligoToMichelson(doc.uri),
        contractText
      );
    }
  };

  // --------------------------------------------------------------------------
  // --------------------------------------------------------------------------
  // --------------------------------------------------------------------------

  launchWhylson(contractPath: string) {
    throw new Error("Method not implemented.");
  }

  // ------------------------------------------------------------------- //
  //                     EVENTS & COMMANDS & PROVIDERS                   //
  // ------------------------------------------------------------------- //

  /**
   * Registers events that concern whylson context.
   */
  private registerEvents() {
    // Triggers every when any change to a document in the tabs' group is made
    const throttledDisplay = debounce(this.throttledSaveAndCompile, 750, {
      isImmediate: false,
    });
    this._context.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument(async (e) => {
        // Only perform onChange operations when in ligo document
        // with michelson view open
        // TODO : adjust logic for instance
        // if (
        //   utils.isLigoFileDetected(e.document) &&
        //   this._config.getDocumentAutoSave() &&
        //   this._view.isOpen
        // ) {
        //   throttledDisplay(e.document);
        // }
      })
    );

    // Triggers everytime a document is saved
    this._context.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument(async (e) => {
        // 1. Ignore if not ligo document
        // 2. Having autosave turned on returns
        // 3. Having MichelsonView of active ligo contract open returns

        // if (
        //   !utils.isLigoFileDetected(e) ||
        //   (this._config.getDocumentAutoSave() && this._view.isOpen)
        // ) {
        //   return;
        // }

        // From this point on
        // 1. Active document is definitely a ligo document
        // 2. Autosave is turned off and if there is MichelsonView is not of active ligo document

        // Attempt to fetch contract entry for active ligo document
        // If non existent, attempt to create entry, depending on createEntry configuration
        let entry = this.getContractEntry(e.uri);
        if (!entry && this._config.getOnSaveCreateActions()?.createEntry) {
          entry = await this.createContractEntry(e.uri);
        }

        // If a valid entry is found or created, compile contract and display it
        // Only display if compilation successful and if extension configuration allows
        if (entry) {
          const { status } = this.compileContract(entry, true);
          this._log.info(
            `${status ? "Successful" : "Failed"} compilation of ${e.uri.fsPath}`
          );
          if (status && this._config.getOnSaveCreateActions()?.openView) {
            this.displayContract(e.uri, undefined);
          }
        }
      })
    );

    // Triggers when tab group is changed (opened file, closed file, moved to other group)
    this._context.subscriptions.push(
      vscode.window.onDidChangeVisibleTextEditors((e) => {
        // Might not be needed for view manager logic
      })
    );

    // Triggers when there are changes in the extensions
    // Running extensions are only truly disabled after reloading window
    this._context.subscriptions.push(
      vscode.extensions.onDidChange(() => {
        this._log.debug("Extensions changed!");
        // Deactivate context if ligo extension becomes inactive
        if (!utils.isLigoExtensionActive()) {
          vscode.window.showErrorMessage(
            "ligo-vscode deactivated, shutting down whylson context"
          );
          this.deactivate();
        }
      })
    );

    // Triggers when any changes are made into configurations
    this._context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("whylson-connector")) {
          this._config.refresh();
        }
      })
    );

    // Triggers when any changes are made into contracts.json file
    // Minimize I/O by having the document loaded into memory
    // ? May be a source of problems if too many contracts are loaded
    this._context.subscriptions.push(
      this._watcher!.onDidChange(async (e) => {
        this.loadContractEntries();
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
      vscode.commands.registerCommand(
        "whylson-connector.check-ligo",
        async () => {
          // vscode.window.showErrorMessage("Not implemented yet.");
        }
      )
    );

    // Open the michelson view for current ligo document
    this._context.subscriptions.push(
      vscode.commands.registerCommand(
        "whylson-connector.open-michelson-view",
        async () => {
          // This command is only ran when file is ligo due to contributes when clauses
          const doc = vscode.window.activeTextEditor!.document;

          // 1. Contract found? Attempt to display it
          // 2. Not found? Attempt to create, then attempt to display it
          // Only possible due to lazy evaluation
          (await this.findContractBin(doc)) ||
          (await this.firstContractCompilation(doc))
            ? this.displayContract(doc.uri, undefined)
            : undefined;
        }
      )
    );

    // Wipe out .whylson data remakes it
    this._context.subscriptions.push(
      vscode.commands.registerCommand(
        "whylson-connector.remake-dot-whylson",
        () => {
          this.createContractsJSON();
          this.createContractsDir(true);
        }
      )
    );

    // Delete active ligo document's data (michelson and entry)
    this._context.subscriptions.push(
      vscode.commands.registerCommand(
        "whylson-connector.erase-contract-info",
        async () => {
          const uri = vscode.window.activeTextEditor!.document.uri;

          // Remove entry from both memory and file
          if (await this.removeContractEntry(uri)) {
            this._log.info("Entry removed successfully.");
          }

          if (await utils.safeDelete(this.ligoToMichelson(uri), undefined)) {
            this._log.info("Michelson contract removed successfully.");
          }
        }
      )
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
      vscode.workspace.registerTextDocumentContentProvider(
        ViewManager.scheme,
        this._manager
      )
    );
  }
}
