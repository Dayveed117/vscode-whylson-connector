import * as vscode from 'vscode';
import { WhylsonContext } from './whylson-context';


// TODO : Implement logic and restrictions
// * Michelson View activates when Ligo source is automatically detected as active document
// * Only one instance of Michelson View at a time
// * If active ligo source is not specified in .whylson/config.json add contract entry

/**
 * Encapsulates data and logic regarding Ligo-Michelson pair view
 */
export class MichelsonView implements vscode.TextDocumentContentProvider {

  static active: boolean = false;
  private _wContext: WhylsonContext;

  constructor(wContext: WhylsonContext) {
    this._wContext = wContext;
  }

  onDidChange?: vscode.Event<vscode.Uri> | undefined;
  provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): vscode.ProviderResult<string> {
    throw new Error('Method not implemented.');
  }

  findContractBin() {
    throw new Error("Method not Implemented");
  }

  compileContract() {
    throw new Error("Method not Implemented");
  }

  openMichelsonView() {
    throw new Error("Method not Implemented");
  }

  /**
   * Verifies if current focused file is ligo language.
   * @param e vscode.TextEditor : The active editor for vscode instance.
   * @returns True if active editor is a ligo file, false otherwise.
   */
  static isLigoFileDetected(e: vscode.TextEditor | undefined): boolean {
    if (!e) {
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
}
