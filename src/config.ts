import * as vscode from "vscode";

/**
 * Encapsulation and ease of acess for extension configurations
 */
export class Config {
  private _context: vscode.ExtensionContext;
  private _configs: vscode.WorkspaceConfiguration;

  constructor(context: vscode.ExtensionContext) {
    this._context = context;
    this._configs = vscode.workspace.getConfiguration("whylson-connector");
  }

  /**
   * Used together with the onDidChangeConfigurations event, refreshing configs object
   */
  public refresh() {
    this._configs = vscode.workspace.getConfiguration("whylson-connector");
  }

  /**
   * Gets the configurations for auto saving ligo documents.
   * @returns `true' if enabled, `false` otherwise.
   */
  public getDocumentAutoSave() {
    return this._configs.get<boolean>("autoSave");
  }

  /**
   * Gets the configurations for auto saving ligo documents.
   * @returns The threshold as a `number' if defined, `undefined` otherwise.
   */
  public getAutoSaveThreshold(): number {
    // ? Might be risky, but in this case, [get] always returns a number
    return this._configs.get<number>("autoSaveThreshold")!;
  }

  /**
   * Gets the configurations for background compilation on save (view not visible).
   * @returns `true' if enabled, `false` otherwise.
   */
  public getOnSaveBackgroundCompilation() {
    return this._configs.get<boolean>("onSaveBackgroundCompilation");
  }

  /**
   * Controls wheather or not whylson annotations are highlighted in ligo documents.
   * @returns `true' if enabled, `false` otherwise.
   */
  public getHighlightAnnotations() {
    return this._configs.get<boolean>("highlightAnnotations");
  }

  /**
   * Controls wheather extension will output messages to Whylson-Connector output channel.
   * @returns `true' if enabled, `false` otherwise.
   */
  public getShowOutputMessages() {
    return this._configs.get<boolean>("showOutputMessages");
  }
}
