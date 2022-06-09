import * as vscode from 'vscode';
import { compileActiveLigo, isLigoFileDetected, isLigoExtensionActive } from './utils';

// Method called when extension is activated
export function activate(context: vscode.ExtensionContext) {

  // --------------------------------------------------- //
  //                     DECLARATIONS                    //
  // -------------------------------------------------- //

  const checkLigo = () => {
    const a = isLigoExtensionActive();
    const b = isLigoFileDetected(vscode.window.activeTextEditor);
    if (!a) {
      vscode.window.showWarningMessage("Please install or activate \"ligo-vscode\" extension!");
    } else if (!b) {
      vscode.window.showWarningMessage("No ligo file active!");
    } else {
      vscode.window.showInformationMessage("Extension ready to proceed!");
    }
    return a && b;
  };

  const openContract = () => {
    compileActiveLigo();
    // vscode.window.showErrorMessage("Not yet implemented!");
  };

  // Initial Invocation
  setTimeout(() => {
    if (checkLigo()) {
      openContract();
    }
  }, 100);

  // --------------------------------------------- //
  //                     EVENTS                    //
  // --------------------------------------------- //

  // Command that checks if a file is ligo
  context.subscriptions.push(vscode.commands.registerCommand('whylson-connector.check-ligo', () => {
    if (checkLigo()) {
      openContract();
    }
  }));

  // Command that starts the whylson session for the current contract
  context.subscriptions.push(vscode.commands.registerCommand('whylson-connector.start-session', () => {
    vscode.window.showErrorMessage("Not yet implemented!");
  }));

  // Output channel for the extension
  context.subscriptions.push(vscode.commands.registerCommand('whylson-connector.start-terminal', () => {
    console.log('Creating terminal');
    const t = vscode.window.createOutputChannel("Whylson Connector");
    t.appendLine("Output channel created");
    t.show();
  }));
}

// Method called when extension is deactivated
export function deactivate() {}
