import * as vscode from 'vscode';

// TODO : Implement logic and restrictions
// * Michelson View may activate when Ligo source is detected as active document
// * Only one instance of Michelson View at a time
// * If active ligo source is not specified in .whylson/config.json add contract entry

/**
 * Encapsulates data and logic regarding Ligo-Michelson pair view
 */
export class MichelsonView implements vscode.TextDocumentContentProvider {

  static active: boolean = false;

  constructor() {

  }

  onDidChange?: vscode.Event<vscode.Uri> | undefined;
  provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): vscode.ProviderResult<string> {
    throw new Error('Method not implemented.');
  }

  openMichelsonView(contract: vscode.Uri) {
    throw new Error("Method not Implemented");
  }

  closeMichelsonView() {
    throw new Error("Method not Implemented");
  }

  refreshView(contract: vscode.Uri) {
    throw new Error("Method not Implemented");
  }
}
