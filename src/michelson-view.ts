import * as vscode from 'vscode';
import { Logger } from './logger';
import { ContractEntryScheme, Maybe } from './types';

/**
 * Encapsulates data and logic regarding michelson view
 */
export class MichelsonView implements vscode.TextDocumentContentProvider {

  static readonly scheme = "michelson";

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
      vscode.Uri.parse(`${MichelsonView.scheme}:View : ${title}`));

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

export class TestView implements vscode.TextDocumentContentProvider {

  static scheme = "example";
  private _isOpen: boolean = false;
  public get isOpen(): boolean { return this._isOpen; }
  private counter: number = 0;
  private michelsonDoc: Maybe<vscode.TextDocument>;

  private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  get onDidChange() { return this._onDidChange.event; }

  constructor() { }

  provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): vscode.ProviderResult<string> {
    this.counter++;
    return `Counter is ${this.counter}\nUri : ${uri}`;
  }

  display = async (uri: vscode.Uri) => {

    if (this.isOpen) {
      console.log("Refresh!");
      this._onDidChange.fire(vscode.Uri.parse(`${TestView.scheme}:example.txt`));
      return;
    }

    this._isOpen = true;
    this.michelsonDoc = await vscode.workspace.openTextDocument(vscode.Uri.parse(`${TestView.scheme}:example.txt`));
    vscode.window.showTextDocument(this.michelsonDoc, {
      viewColumn: vscode.ViewColumn.Beside,
      preserveFocus: true,
    });
  };

  public close() {
    this._isOpen = false;
    vscode.window.showTextDocument(this.michelsonDoc!, {
      viewColumn: vscode.ViewColumn.Beside,
      preserveFocus: false,
    }).then(() => { return vscode.commands.executeCommand('workbench.action.closeActiveEditor'); });
    this.michelsonDoc = undefined;
  }
}
