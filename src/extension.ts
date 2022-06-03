import * as vscode from 'vscode';
import { isLigoDetected } from './utils';

// Method called when extension is activated
export function activate(context: vscode.ExtensionContext) {

  const checkLigo = () => {
    const a = isLigoDetected(vscode.window.activeTextEditor);
    if (a) {
      vscode.window.showInformationMessage("Ligo File!");
    } else {
      vscode.window.showWarningMessage("Not a Ligo File...");
    } return a;
  };

  const openContract = () => {
    vscode.window.showErrorMessage("Not yet implemented!");
  };


  // Check if active document is a ligo file
  if (checkLigo()) {
    // TODO : Specify contract entrypoint and then open compiled Michelson
    openContract();
  }

  // Command that checks if a file is ligo
  context.subscriptions.push(vscode.commands.registerCommand('whylson-connector.check-ligo', checkLigo));

  // Command that starts the whylson session for the current contract
  context.subscriptions.push(vscode.commands.registerCommand('whylson-connector.start-session', () => {
    vscode.window.showErrorMessage("Not yet implemented!");
  }));

  // Event that detects if there is a ligo file opened
  // TODO : Figure out why this event is fired twice?
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(checkLigo));
}

// Method called when extension is deactivated
export function deactivate() {}
