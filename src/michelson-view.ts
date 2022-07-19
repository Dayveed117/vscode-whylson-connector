import * as vscode from "vscode";
import { Maybe } from "./types";

/**
 * Encapsulates data and logic regarding michelson view
 */
export class MichelsonView implements vscode.TextDocumentContentProvider {
  static readonly scheme = "michelson";

  private _isOpen: boolean = false;
  private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  private _contents: Maybe<string>;
  private _doc: Maybe<vscode.TextDocument>;

  get isOpen() {
    return this._isOpen;
  }
  get onDidChange() {
    return this._onDidChange.event;
  }

  constructor() {}

  provideTextDocumentContent(_uri: vscode.Uri): string {
    return this._contents!;
  }

  /**
   * Open michelson view beside ligo document.
   * @param contents 'string` the contents of the michelson file.
   */
  // TODO : Adjust for instance michelson view
  public async display(contents: string): Promise<void> {}

  /**
   * Closes michelson view if open.
   */
  // TODO : Adjust for instance michelson view
  public close(): void {}
}
