import * as vscode from 'vscode';
import { WhylsonContext } from './whylson-context';

// Method called when extension is activated
export function activate(context: vscode.ExtensionContext) {

  // Test WhylsonContext object
  const whylsonContext = new WhylsonContext(context);

  // Acivate after 200 ms, letting other components load first
  setTimeout(() => {
    whylsonContext.activate();
  }, 200);
}

// Method called when extension is deactivated
export function deactivate() { }
