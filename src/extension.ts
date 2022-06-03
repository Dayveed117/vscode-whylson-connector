import * as vscode from 'vscode';
import { compileActiveLigo, isLigoDetected, isLigoExtensionActive } from './utils';

// Method called when extension is activated
export function activate(context: vscode.ExtensionContext) {

  // * Change both name and add further functionality
  // Wrapper for isLigoDetected, adding further logic
  const checkLigo = () => {
    // TODO : isExtensionActive requires small timeout, enabling instance to load all extensions
    const a = isLigoExtensionActive();
    const b = isLigoDetected(vscode.window.activeTextEditor);
    if (!a) {
      vscode.window.showWarningMessage("Please install or activate \"ligo-vscode\" extension!");
    } else if (!b) {
      vscode.window.showWarningMessage("No ligo file active!");
    } else {
      vscode.window.showInformationMessage("Extension ready to proceed!");
    }
    return a && b;
  };

  // TODO : Specify contract entrypoint and then open compiled Michelson
  // ! Compile command is ligo.compileContract
  const openContract = () => {
    compileActiveLigo().then(res => {
      console.log(res);
    });
    vscode.window.showErrorMessage("Not yet implemented!");
  };


  // Check if active document is a ligo file
  if (checkLigo()) {
    openContract();
  }

  // Command that checks if a file is ligo
  context.subscriptions.push(vscode.commands.registerCommand('whylson-connector.check-ligo', checkLigo));

  // Command that starts the whylson session for the current contract
  context.subscriptions.push(vscode.commands.registerCommand('whylson-connector.start-session', () => {
    vscode.window.showErrorMessage("Not yet implemented!");
  }));

  // Event that detects if there is a ligo file opened
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor( async () => {
    setTimeout(() => {
      checkLigo();
    }, 250);
  }));
}

// Method called when extension is deactivated
export function deactivate() {}
