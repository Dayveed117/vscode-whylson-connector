import * as vscode from 'vscode';

function isLigoDetected(e: vscode.TextEditor | undefined): Promise<boolean> {

	if (!e) {
		console.log("No active editor!");
		return Promise.reject(false);
	}
	const b = e.document.languageId.match(/^(m|js|re)?ligo$/g) ? true : false;
	return b ? Promise.resolve(b) : Promise.reject(b);
}

// Method called when extension is activated
export function activate(context: vscode.ExtensionContext) {

	const checkLigo = async () => {
		const a = await isLigoDetected(vscode.window.activeTextEditor);
		if (a.valueOf()) {
			vscode.window.showInformationMessage("Ligo File!");
		} else {
			vscode.window.showInformationMessage("Not a Ligo File...");
		}
	};

	// Check if active document is a ligo file
	checkLigo();

	// Enable a command that checks if a file is ligo
	context.subscriptions.push(vscode.commands.registerCommand('whylson-connector.open-session', checkLigo));

	// Event that detects if there is a ligo file opened
	// TODO : Figure out why this event is fired twice?
	vscode.window.onDidChangeActiveTextEditor(checkLigo);
}

// Method called when extension is deactivated
export function deactivate() {}
