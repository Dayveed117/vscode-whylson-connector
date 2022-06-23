import { posix } from 'path';
import * as vscode from 'vscode';

// TODO : Implement logic and restrictions
// * Michelson View may activate after clicking a button on UI or command
// * Only one instance of Michelson View at a time
// * If active ligo source is not specified in .whylson/config.json add contract entry

/**
 * Encapsulates data and logic regarding Ligo-Michelson pair view
 */
export class MichelsonView implements vscode.TextDocumentContentProvider {

  onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
  onDidChange = this.onDidChangeEmitter.event;
  public isOpen: boolean = false;

  // TODO : Is this the best way to receive the contents?
  private _contractText: string = "";
  private _context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this._context = context;
  }

  provideTextDocumentContent(_: vscode.Uri): string {
    return this._contractText;
  }

  /**
   * Open michelson view beside ligo document.  
   * Uri is modified to fit "whylson" scheme.
   * @param contractUri `vscode.Uri` New uri for contract to fit whylson scheme.
   * @param contractText 'string` the contents of the real contract.
   */
  async display(contractUri: vscode.Uri, contractText: string): Promise<void> {
    this.isOpen = true;
    this._contractText = contractText;
    // openTextDocument triggers provideTextDocuement method
    const contractDoc = await vscode.workspace.openTextDocument(
      contractUri.with({
        scheme: "michelson",
        path: "View : ".concat(posix.basename(contractUri.path))
      })
    );
    await vscode.window.showTextDocument(contractDoc, {
      preview: false,
      viewColumn: vscode.ViewColumn.Beside,
      preserveFocus: true
    });
  }

  close() {
    this.isOpen = false;
  }
}
