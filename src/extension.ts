import * as vscode from 'vscode';
import { ligo } from './utils';

// Method called when extension is activated
export function activate(context: vscode.ExtensionContext) {

  // --------------------------------------------------- //
  //                     DECLARATIONS                    //
  // -------------------------------------------------- //

  // ! Requires MEGA refactoring
  const checkLigo = () => {
    const a = ligo.isLigoExtensionActive();
    const b = ligo.isLigoFileDetected(vscode.window.activeTextEditor);
    const c = ligo.verifyLigoBinaries();

    if (!a) {
      vscode.window.showWarningMessage("Please install or activate \"ligo-vscode\" extension!");
    } else if (!b) {
      vscode.window.showWarningMessage("No ligo file active!");
    } else if (!c) {
      vscode.window.showWarningMessage("LIGO not found in the system.");
    } else {
      vscode.window.showInformationMessage("Extension ready to proceed!");
    }
    return a && b && c;
  };

  // ! Requires MEGA refactoring
  const openContract = () => {
    const isCompiled = ligo.compileActiveLigo({
      inPath: vscode.window.activeTextEditor?.document.fileName!,
      entrypoint: "main",
      outPath: vscode.window.activeTextEditor?.document.fileName!.concat(".tz")!,
      flags: new Map<string, string>([
        ["--michelson-comments", "location"]
      ])
    });

    if (isCompiled) {
      vscode.window.showTextDocument(
        vscode.Uri.parse(vscode.window.activeTextEditor?.document.fileName!.concat(".tz")!),
        { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true, preview: true }
      );
    }
  };

  // Initial Invocation
  // setTimeout(() => {
  //   if (checkLigo()) {
  //     openContract();
  //   }
  // }, 100);

  // --------------------------------------------- //
  //                     EVENTS                    //
  // --------------------------------------------- //

  // Refresh contract each time ligo source is saved
  vscode.workspace.onDidSaveTextDocument(() => {
    if (!ligo.isLigoFileDetected(vscode.window.activeTextEditor)) {
      return;
    }
    openContract();
  });

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
}

// Method called when extension is deactivated
export function deactivate() { }
