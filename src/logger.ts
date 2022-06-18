import * as vscode from 'vscode';

let extensionOutput: vscode.OutputChannel = vscode.window.createOutputChannel('Whylson-Connector');

export function info(msg: string) {
  extensionOutput.appendLine(msg);
}

export function debug(msg: string) {
  extensionOutput.appendLine(`Debug: ${msg}`);
}
