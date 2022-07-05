import * as vscode from "vscode";
import { OnSaveActions } from "./types";

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
   * Gets the configurations for ligo documents on save actions.
   * @returns `OnSaveActions' type or undefined if not found.
   */
  public getOnSaveCreateActions() {
    return this._configs.get<OnSaveActions>("onSaveActions");
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
