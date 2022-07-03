import * as vscode from 'vscode';
import { Logger } from './logger';
import { Maybe } from './types';

/**
 * Encapsulates data and logic regarding michelson view
 */
export class MichelsonView implements vscode.TextDocumentContentProvider {

  static readonly scheme = "michelson";
  static readonly viewUri = vscode.Uri.parse(`${MichelsonView.scheme}:michelson.tz`);

  private _isOpen: boolean = false;
  private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  private _contents: Maybe<string>;
  private _doc: Maybe<vscode.TextDocument>;
  private _log: Logger;

  get isOpen() { return this._isOpen; }
  get onDidChange() { return this._onDidChange.event; }

  constructor(logger: Logger) {
    this._log = logger;
  }

  provideTextDocumentContent(_uri: vscode.Uri): string {
    return this._contents!;
  }

  /**
   * Open michelson view beside ligo document.
   * @param contents 'string` the contents of the michelson file.
   */
  public async display(contents: string): Promise<void> {

    // Just refresh view contents if already opened
    if (this.isOpen) {
      this._contents = contents;
      // event's fire method triggers provideTextDocument method, refreshing contents
      this._onDidChange.fire(MichelsonView.viewUri);
      return;
    }

    this._isOpen = true;
    this._contents = contents;
    // openTextDocument method triggers provideTextDocument method
    this._doc = await vscode.workspace.openTextDocument(MichelsonView.viewUri);
    vscode.window.showTextDocument(this._doc, {
      viewColumn: vscode.ViewColumn.Beside,
      preserveFocus: true,
    });
  }

  /**
   * Closes michelson view if open.
   */
  public close(): void {
    // Ignore if not visible
    if (!this.isOpen) { return; }
    this._isOpen = false;

    // This is cluncky, but the only way for now
    vscode.window.showTextDocument(this._doc!, {
      viewColumn: vscode.ViewColumn.Beside,
      preserveFocus: false,
    }).then(() => { return vscode.commands.executeCommand('workbench.action.closeActiveEditor'); });
  }
}
