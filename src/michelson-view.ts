import * as vscode from 'vscode';


/**
 * Encapsulates data and logic regarding Ligo-Michelson pair view
 */
export class MichelsonView implements vscode.TextDocumentContentProvider {
  onDidChange?: vscode.Event<vscode.Uri> | undefined;
  provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): vscode.ProviderResult<string> {
    throw new Error('Method not implemented.');
  }

  // TODO : Implement logic and restrictions
  // * Michelson View activates when Ligo source is automatically detected as active document
  // * Only one instance of Michelson View at a time
  // * If active ligo source is not specified in .whylson/config.json add contract entry
}
