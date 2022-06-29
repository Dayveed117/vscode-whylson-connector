import * as vscode from 'vscode';
import { Logger } from './logger';
import { Maybe } from './types';

/**
 * Encapsulates data and logic regarding michelson view
 */
export class MichelsonView implements vscode.TextDocumentContentProvider {

  onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
  onDidChange = this.onDidChangeEmitter.event;
  public isOpen: boolean = false;

  // TODO : Is this the best way to receive the contents?
  private _content: string = "";
  private _context: vscode.ExtensionContext;
  private _log: Logger;
  private _editor: Maybe<vscode.TextEditor>;

  constructor(context: vscode.ExtensionContext, logger: Logger) {
    this._context = context;
    this._log = logger;
  }

  provideTextDocumentContent(uri: vscode.Uri): string {
    return this._content;
  }

  /**
   * Open michelson view beside ligo document.  
   * Uri is modified to fit "whylson" scheme.
   * @param title `string` View name.
   * @param contents 'string` the contents of the michelson file.
   */
  async display(title: Maybe<string>, contents: string): Promise<void> {
    if (!title) {
      title = "contract.tz";
    }

    if (this.isOpen) {
      this.refresh(contents);
    }

    // openTextDocument triggers provideTextDocuement method
    this.isOpen = true;
    this._content = contents;
    const doc = await vscode.workspace.openTextDocument(
      vscode.Uri.parse(`michelson:View : ${title}`));

    this._editor = await vscode.window.showTextDocument(doc!, {
      viewColumn: vscode.ViewColumn.Beside,
      preserveFocus: true,
    });
  }

  async refresh(contents: string) {
    this._content = contents;
    const edited = await this._editor!.edit((edit) => {
      edit.insert(new vscode.Position(0, 0), this._content);
    });
    if (edited) {
      this._log.debug("View updated!");
    } else {
      this._log.debug("Couldn't update view.");
    }
  }

  close() {
    this.isOpen = false;
  }
}
