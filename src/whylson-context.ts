import { execSync } from 'child_process';
import { posix } from 'path';
import { TextDecoder, TextEncoder } from 'util';
import * as vscode from 'vscode';
import { info } from './logger';

interface CompileContractOptions {
  entrypoint: string
  onPath?: string
  flags: string[]
};

interface ContractEntryScheme extends CompileContractOptions {
  source: string
  onPath: string
};

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
  protected _rootFolder: vscode.WorkspaceFolder | undefined;
  protected _configUri: vscode.Uri | undefined;
  protected _contractsBinUri: vscode.Uri | undefined;

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
      this._contractsBinUri = vscode.Uri.parse(posix.join(this._rootFolder.uri.path, ".whylson/bin-contracts"));
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
    // this.registerEvents();
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
        new TextEncoder().encode("[]"));
      info(`Created contracts configuration file at ${this._configUri!.path}`);
    }

    try {
      !!await vscode.workspace.fs.stat(this._contractsBinUri!);
    } catch {
      // Create /.whylson/bin-contracts
      await vscode.workspace.fs.createDirectory(this._contractsBinUri!);
      info(`Created directory at ${this._contractsBinUri!.path}`);
    }
  }

  /**
   * Checks wheather current active ligo source has an entry in `contracts.json` or not.  
   * Adds entry if not found.
   * @param e `vscode.TextEditor`.
   * @returns `vscode.Uri` for the michelson contract of active ligo source file.
   */
  private async findContractBin(e: vscode.TextEditor | undefined) {

    if (!WhylsonContext.isLigoFileDetected(e)) { return; }

    const basename = posix.basename(e!.document.uri.path).split(".")[0];
    const onPath = posix.join(this._contractsBinUri!.path, basename.concat(".tz"));

    try {
      await vscode.workspace.fs.stat(vscode.Uri.parse(onPath));
    } catch {

      info(`Michelson for ${e!.document.uri.path} not found.\nCreating entry in contracts.json.`);

      const ep = await entrypointInput();
      if (!ep) {
        vscode.window.showErrorMessage("Entrypoint not defined successfully.");
        // ? : Shouldn't return null
        return;
      }

      const entry = await this.getOrCreateContractEntry(e!, {
        source: e!.document.uri.path,
        onPath: onPath,
        entrypoint: ep,
        flags: ["--michelson-comments", "location"]
      });

      // ? This piece of code should belong to other function
      if (entry) {
        await this.compileContract(entry);
      }
    }
    return vscode.Uri.parse(onPath);
  }

  /**
   * Get or create an entry for active ligo file in contracts.json.
   * @param e `vscode.TextEditor`.
   */
  private async getOrCreateContractEntry(e: vscode.TextEditor, options?: ContractEntryScheme) {

    try {

      const encodedJSON = await vscode.workspace.fs.readFile(this._configUri!);
      const contractsJSON: ContractEntryScheme[] = JSON.parse(new TextDecoder("utf-8").decode(encodedJSON));

      if (options) {

        contractsJSON.push(options);
        await vscode.workspace.fs.writeFile(this._configUri!, new TextEncoder().encode(JSON.stringify(contractsJSON)));
        return options;

      } else {

        for (const ces of contractsJSON) {
          if (ces.source === e!.document.uri.path) {
            return ces;
          }
        }
      }
    } catch {
      vscode.window.showErrorMessage("Malformed contracts.json. Please fix before attempting to continue.");
      return;
    }
  }

  private async compileContract(ces: ContractEntryScheme) {
    const result = WhylsonContext._compileActiveLigo(ces.source, ces);
  }

  // --------------------------------------------------------------------------
  // --------------------------------------------------------------------------
  // --------------------------------------------------------------------------

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
  static isLigoFileDetected(e: vscode.TextEditor | undefined): boolean {
    if (!e) {
      vscode.window.showWarningMessage("No ligo source detected");
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

  /**
   * Registers Whylson-Connector extensions commands.  
   * Only some commands are available in the contributions menu.
   */
  private registerCommands() {

    // ! Placeholder check ligo
    this._context.subscriptions.push(
      vscode.commands.registerCommand("whylson-connector.check-ligo", () => {
        this.findContractBin(vscode.window.activeTextEditor);
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
        // TODO : This shouldn't work yet
        this.deactivate();
        this.activate();
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
