import { execSync } from 'child_process';
import { posix } from 'path';
import { TextDecoder, TextEncoder } from 'util';
import * as vscode from 'vscode';
import { info } from './logger';
import { MichelsonView } from './michelson-view';
import { isExistsFile } from './utils';

interface CompileContractOptions {
  entrypoint: string
  onPath?: string
  flags: string[]
};

interface ContractEntryScheme extends CompileContractOptions {
  source: string
  onPath: string
};

type Maybe<T> = T | undefined;

async function entrypointInput() {

  const result = await vscode.window.showInputBox({
    title: "First Time Ligo Compile",
    placeHolder: "Most generically, \"main\"",
    prompt: "Pick entrypoint for ligo contract",
    value: "main",
    validateInput: text => {
      // undefined, null or empty string accepts the prompt
      return new RegExp(/^[a-zA-Z_]+[a-zA-Z0-9'_]*$/g).test(text) ? undefined : "main";
    }
  });
  return result;
}

/**
 * Encapsulation of relevant data for a well functioning Ligo-Michelson pair view
 */
export class WhylsonContext {

  protected _context: vscode.ExtensionContext;
  protected _rootFolder: Maybe<vscode.WorkspaceFolder>;
  protected _configUri: Maybe<vscode.Uri>;
  protected _contractsBinUri: Maybe<vscode.Uri>;
  protected _michelsonView: Maybe<MichelsonView>;

  /**
   * Creates a WhylsonContext instance.  
   * Constructor solely establishes safe base values if trusted workspace exists.
   * @param context `vscode.ExtensionContext`.
   */
  constructor(context: vscode.ExtensionContext) {
    this._context = context;

    if (this.isWorkspaceAvailable()) {
      this._rootFolder = vscode.workspace.workspaceFolders![0];
      this._configUri = vscode.Uri.parse(posix.join(this._rootFolder.uri.path, ".whylson/contracts.json"));
      this._contractsBinUri = vscode.Uri.parse(posix.join(this._rootFolder.uri.path, ".whylson/bin-contracts"));
      this._michelsonView = new MichelsonView();
    } else {
      vscode.window.showWarningMessage(
        "Whylson-Connector requires an available workspace to operate.");
    }
  }

  /**
   * Activation process Whylson Context, for now only context.
   */
  activate() {
    this.initWhylsonFolder();
    this.registerEvents();
    this.registerCommands();
  }

  private deactivate() {
    this._context.subscriptions.forEach(disposable => {
      disposable.dispose();
    });
    if (this._michelsonView?.isOpen) {
      this._michelsonView.closeMichelsonView();
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
    if (!await isExistsFile(this._configUri!)) {
      this.createContractsJSON();
      info(`Created contracts configuration file at ${this._configUri!.path}`);
    }

    // Verify if ".whylson/bin-contracts" exists
    if (!await isExistsFile(this._contractsBinUri!)) {
      this.createContractsDir(false);
      info(`Created directory at ${this._contractsBinUri!.path}`);
    }
  }

  /**
   * Creates a new `".whylson/contracts.json"` file.
   */
  private async createContractsJSON() {
    await vscode.workspace.fs.writeFile(
      this._configUri!,
      new TextEncoder().encode("[]"));
  }

  /**
   * Creates a new `".whylson/bin-contracts"` folder.
   * @param reset `boolean`. If `true` recursively deletes contents and recreates folder.
   */
  private async createContractsDir(reset: boolean) {
    if (reset) {
      vscode.workspace.fs.delete(this._contractsBinUri!, { recursive: true, useTrash: true });
    }

    await vscode.workspace.fs.createDirectory(this._contractsBinUri!);
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
      info("Failed to read \".whylson/contracts.json\"", true);
      return undefined;
    }
  }

  /**
   * Retrieves the contract entry for the active ligo document.
   * @param e `vscode.TextEditor`.
   * @returns `ContractEntryScheme` of active ligo document if found, undefined otherwise.
   */
  private async getContractEntry(e: vscode.TextEditor): Promise<Maybe<ContractEntryScheme>> {
    const contents = await this.readContractsJSON();
    if (contents) {
      for (const ces of contents) {
        if (ces.source === e.document.uri.path) {
          return ces;
        }
      }
    }
    return undefined;
  }

  /**
   * Creates entry for activo ligo document on `".whylson/contracts.json"`.
   * @param src `string`. File path to ligo document.
   * @param dst `string`. File path to michelson document.
   * @return
   */
  private async createContractEntry(src: string, dst: string): Promise<Maybe<ContractEntryScheme>> {
    const ep = await entrypointInput();
    if (!ep) {
      vscode.window.showErrorMessage("Failed to accept entrypoint, aborting operation.");
      return undefined;
    }
    const contents = await this.readContractsJSON();
    if (contents) {
      const contractEntry: ContractEntryScheme = {
        source: src,
        onPath: dst,
        entrypoint: ep,
        flags: []
      };
      contents.push(contractEntry);
      vscode.workspace.fs.writeFile(this._configUri!, new TextEncoder().encode(JSON.stringify(contents)));

      return contractEntry;
    }
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

  // TODO : Redesign function
  /**
   * Checks wheather active ligo document has an entry in `".whylson/contracts.json"` or not.  
   * Adds entry if not found.
   * @param e `vscode.TextEditor`.
   * @returns `vscode.Uri` for the michelson contract of active ligo source file.
   */
  private async findContractBin(e: vscode.TextEditor) {

    const inPath = e.document.uri.path;
    const onPath = this.michelsonOfLigo(e.document.uri.path);

    if (await isExistsFile(e.document.uri)) {
      return onPath;
    } else {
      info(`Creating entry for ${e.document.uri.path} in \".whylson/contracts.json\".`);
      const entry = await this.createContractEntry(inPath, onPath);
      if (entry) {
        this.compileContract(entry);
      }
      // TODO : What do here?
    }
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
    return WhylsonContext._compileActiveLigo(ces.source, ces);
  }

  private isWhylsonDetected(): boolean {
    throw new Error("Method not implement.");
  }

  launchWhylson(contractPath: string) {
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
  static isLigoFileDetected(e: vscode.TextEditor | vscode.TextDocument | undefined): boolean {
    if (!e) {
      vscode.window.showWarningMessage("No ligo source detected.");
      return false;
    }
    return !!(e as vscode.TextDocument).languageId.match(/^(m|js|re)?ligo$/g);
  }

  /**
   * Verifies if ligo-vscode is installed and active.
   * @returns `true` if the above condition is true, `false` otherwise.
   */
  static isLigoExtensionActive(): boolean {
    const a = vscode.extensions.getExtension("ligolang-publish.ligo-vscode");
    return (!!a && a.isActive);
  }

  /**
   * Compiles the active ligo document using a set of options.
   * @param cco `CompileContractOptions` : Set of options added for ligo compilation.
   * @returns `true` if compilation is successful, `false` otherwise.
   */
  // ! This function might be overhauled by an API call to ligo extension
  static _compileActiveLigo(source: string, cco: CompileContractOptions) {

    let command = `ligo compile contract ${source} -e ${cco.entrypoint} ${cco.flags.join(" ")}`;

    if (cco.onPath) {
      command = command.concat(` -o ${cco.onPath}`);
    }

    try {
      info(`Compilation command\n${command}`);
      let result = execSync(command, { encoding: "utf-8" });
      return result;
    } catch (error) {
      return;
    }
  }

  // -------------------------------------------------------- //
  //                     EVENTS & COMMANDS                    //
  // -------------------------------------------------------- //

  /**
   * Registers events that concern whylson context.
   */
  private registerEvents() {

    // Triggers every time a tab is swapped
    this._context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor(async (e) => {
        if (!WhylsonContext.isLigoFileDetected(e)) {
          if (this._michelsonView?.isOpen) {
            // ? Close Dual View if active?
            this._michelsonView.closeMichelsonView();
          }
          return;
        }
        // * Attempt to find contract in bin-contracts
        const contractUri = await this.findContractBin(e!);

        // * Open it in michelson view
        // TODO : Depending on extension config for automatic open view
      })
    );

    // Triggers everytime a document is saved
    this._context.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument((e) => {
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
        if (!WhylsonContext.isLigoFileDetected(e.document)) {
          return;
        }
        if (this._michelsonView?.isOpen) {
          const fname = e.document.fileName;
          const timer = changeTimers.get(fname);
          if (timer) {
            clearTimeout(timer);
          }

          changeTimers.set(fname, setTimeout(() => {
            changeTimers.delete(fname);
            // this._michelsonView?.refreshView();
          }));

        } else {
          // open michelson view
          // this._michelsonView?.openMichelsonView();
        }
      })
    );

    // Deactivate context if ligo extension becomes inactive
    this._context.subscriptions.push(
      vscode.extensions.onDidChange(() => {
        if (!WhylsonContext.isLigoExtensionActive()) {
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

    // ! Placeholder ligo test command
    this._context.subscriptions.push(
      vscode.commands.registerCommand("whylson-connector.check-ligo", () => {
        vscode.window.showErrorMessage("Not implemented yet.");
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
}
