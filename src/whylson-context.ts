import { posix } from "path";
import { debounce } from "ts-debounce";
import * as vscode from "vscode";
import { Config } from "./config";
import { Logger } from "./logger";
import { ContractEntryScheme, CompilationResult, Maybe } from "./types";
import { io, verifiers, utils } from "./utils";
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
  public deactivate() {
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
    if (!(await io.isExistsFile(this._contractsJsonUri!))) {
      this.createContractsJSON();
    } else {
      this.loadContractEntries();
    }

    // Verify if ".whylson/bin-contracts" exists
    if (!(await io.isExistsFile(this._contractsBinUri!))) {
      this.createContractsDir(false);
    }

    return true;
  }

  /**
   * Runs verification functions guarateeing the well functioning
   * of the extension.
   * If verifications fail, all context disposables will be disposed.
   */
  private checkups() {
    if (!verifiers.ligoBinaries()) {
      vscode.window.showWarningMessage(
        "LIGO not found in path, unable to start WhylsonContext"
      );
      return false;
    }
    return true;
  }

  /**
   * Creates a new `".whylson/contracts.json"` file.
   * Recreating overwrites existing contents.
   */
  private async createContractsJSON() {
    (await io.safeWrite(this._contractsJsonUri!, []))
      ? this._log.info(`Created file at ${this._contractsJsonUri!.fsPath}`)
      : vscode.window.showErrorMessage(`Unable to create ${this.cjpath}`);
  }

  /**
   * Creates a new `".whylson/bin-contracts"` folder.
   * @param reset If `true` recursively deletes contents and recreates folder.
   */
  private async createContractsDir(reset: boolean) {
    if (reset) {
      await io.safeDelete(this._contractsBinUri!, {
        recursive: true,
      });
    }

    (await io.safeCreateDir(this._contractsBinUri!))
      ? this._log.info(`Created directory at ${this._contractsBinUri!.fsPath}`)
      : vscode.window.showErrorMessage(`Unable to create ${this.cbpath}`);
  }

  /**
   * Attempts to load `contracts.json` contents into `_entries` attribute.
   */
  private async loadContractEntries() {
    this._entries =
      io.safeParse(await io.safeRead(this._contractsJsonUri!)) || this._entries;
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
    const lst = this._entries.filter((ces) => ces.source !== uri.fsPath);

    // safeWrite will automatically update entries
    return (await io.safeWrite(this._contractsJsonUri!, [...lst, entry]))
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
    const lst = this._entries.filter((ces) => ces.source !== uri.fsPath);

    // Modifying contracts.json will trigger onDidChange, updating entries automatically
    return await io.safeWrite(this._contractsJsonUri!, lst);
  }

  /**
   * Checks wheather active ligo document has its michelson counterpart
   * stored in `".whylson/bin"` folder or not.
   * @param doc Active ligo document in the editor.
   * @returns `true` if contract is found, `false` otherwise.
   */
  private async findContractBin(doc: vscode.TextDocument): Promise<boolean> {
    return await io.isExistsFile(this.ligoToMichelson(doc.uri));
  }

  /**
   * Compile ligo source according to `ContractEntryScheme` object.
   * @param ces An object describing ligo source metadata.
   * @param save Controls wheather to compile into standard output or file.
   * @returns An object describring results from compilation process.
   */
  private compileContract(
    ces: ContractEntryScheme,
    save: boolean
  ): CompilationResult {
    return save
      ? utils.compileLigo(ces.source, ces)
      : utils.compileLigo(ces.source, { ...ces, onPath: undefined });
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
      // This compilation results in outputting to file, resulting in no text
      const { ok } = this.compileContract(entry, true);
      if (ok) {
        return entry;
      }

      vscode.window.showErrorMessage(`First compilation failed.`);
      await this.removeContractEntry(doc.uri);
      return undefined;
    }
    vscode.window.showErrorMessage(`Invalid entry for ligo contract.`);
    return undefined;
  }

  /**
   * Attempts to find if specified uri has a visible michelson view.
   * @param uri Uri of for ligo document whose contract is possibly displayed.
   * @returns `true` if michelson view for specified uri is visible, `false` otherwise.
   */
  private isContractDisplayed(uri: vscode.Uri) {
    // Change uri scheme to match "michelson"
    uri = this.ligoToMichelson(uri).with({ scheme: ViewManager.scheme });
    // Filter visible text editors
    return !!vscode.window.visibleTextEditors.find(
      (ed) =>
        ed.document.uri.fsPath === uri.fsPath &&
        ed.document.uri.scheme === uri.scheme
    );
  }

  /**
   * Display contents of specified ligo source as michelson.
   * If no contents are passed beforehand, attempts to read contract.
   * @param uri Uri of the active ligo document.
   * @param contents Contents of the michelson contract.
   */
  private async displayContract(uri: vscode.Uri, contents: Maybe<string>) {
    const michelsonUri = this.ligoToMichelson(uri);
    const contractText = contents || (await io.safeRead(michelsonUri));
    this._manager.display(uri, michelsonUri, contractText);
  }

  /**
   * Save ligo document, compile it, display it.
   * A failed compilation displays an error in the michelson view.
   * @param doc `vscode.TextDocument` Active ligo document.
   */
  // * Requires arrow function to retain the "this" context in debounced function
  private throttledOnChangeActions = async (doc: vscode.TextDocument) => {
    if (!(await doc.save())) {
      return;
    }

    const entry = this.getContractEntry(doc.uri);
    if (entry) {
      const { disp, content } = this.compileContract(entry, false);
      return disp
        ? this._manager.display(doc.uri, this.ligoToMichelson(doc.uri), content)
        : undefined;
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
    // ? Modify to use threshold config as interval instead of 750 ms
    const throttledDisplay = debounce(this.throttledOnChangeActions, 750, {
      isImmediate: false,
    });
    this._context.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument(async (e) => {
        // 1. Proceed if ligo document
        // 2. Proceed if auto save config is turned on
        // 3. Proceed if michelson view for active ligo document is visible
        if (
          verifiers.isLigoFile(e.document) &&
          this._config.getDocumentAutoSave() &&
          this.isContractDisplayed(e.document.uri)
        ) {
          throttledDisplay(e.document);
        }
      })
    );

    // Triggers everytime a document is saved
    this._context.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument(async (e) => {
        // 1. Ignore if not ligo document OR
        // 2.1. Ignore if autosave configuration is on AND
        // 2.2. Ignore if view of active ligo contract is visible
        if (
          !verifiers.isLigoFile(e) ||
          (this._config.getDocumentAutoSave() &&
            this.isContractDisplayed(e.uri))
        ) {
          return;
        }

        // ? Separate background compilation from compilation to michelson view

        // 3.1. Proceed only if there is contract entry
        // 3.2. Autosave is off, saving attempts to compile contract
        const entry = this.getContractEntry(e.uri);
        if (entry && this._config.getOnSaveBackgroundCompilation()) {
          const { ok, disp, content } = this.compileContract(entry, false);

          // 4. Compile to modify michelson file on disk
          if (ok) {
            this.compileContract(entry, true);
            this._log.info(`BG Compilation successful for ${e.uri.fsPath}`);
          } else {
            this._log.info(`BG Compilation failed for ${e.uri.fsPath}`);
          }

          // 5. Only display if view is visible, can display both code and error
          if (disp && this.isContractDisplayed(e.uri)) {
            this.displayContract(e.uri, content);
          }
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
    // Open the michelson view for current ligo document
    this._context.subscriptions.push(
      vscode.commands.registerCommand(
        "whylson-connector.open-michelson-view",
        async () => {
          // This command is only ran when file is ligo due to contributes when clauses
          const doc = vscode.window.activeTextEditor!.document;

          // 1. Early return if contract is visible
          if (this.isContractDisplayed(doc.uri)) {
            return;
          }

          // 2. Contract found? Attempt to display it
          // 3. Not found? Attempt to create, then attempt to display it
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

          // Remove entry from both memory and contracts.json
          this.removeContractEntry(uri);
          io.safeDelete(this.ligoToMichelson(uri), undefined);
        }
      )
    );

    // Manually save compilation to specified outpath in entry
    this._context.subscriptions.push(
      vscode.commands.registerCommand(
        "whylson-connector.save-ligo-compilation",
        async () => {
          const uri = vscode.window.activeTextEditor!.document.uri;

          const entry = this.getContractEntry(uri);
          if (entry) {
            let { ok, content } = this.compileContract(entry, true);
            if (ok) {
              this._log.info(`Compilation successful for ${uri.fsPath}`);
            } else {
              this._log.info(`${content}`, true);
            }
          }
        }
      )
    );

    // * Future Whylson start session
    this._context.subscriptions.push(
      vscode.commands.registerCommand("whylson-connector.start-session", () => {
        // vscode.window.showErrorMessage("Not implemented yet.");
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
