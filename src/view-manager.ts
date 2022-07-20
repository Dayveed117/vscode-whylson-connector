import * as vscode from "vscode";
import { Logger } from "./logger";

/**
 * Manager class for Michelson Views instances
 */
export class ViewManager implements vscode.TextDocumentContentProvider {
  static readonly scheme = "michelson";

  private readonly _log: Logger;
  private readonly _context: vscode.ExtensionContext;
  private readonly _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  private _views: Map<vscode.Uri, MichelsonView>;

  get onDidChange() {
    return this._onDidChange.event;
  }

  constructor(context: vscode.ExtensionContext, logger: Logger) {
    this._context = context;
    this._log = logger;
    this._views = new Map<vscode.Uri, MichelsonView>();
  }

  /**
   * Display text according to the returned value.
   * @param uri The document to be affected by the changes.
   * @returns The returned string serves as contents for the document.
   */
  provideTextDocumentContent(uri: vscode.Uri): string {
    // Simply return the contents of the Michelson View instance mapped by the michelson uri
    const view = this._views.get(uri);
    return view ? view.contents : `# Contents of ${uri.fsPath} are empty`;
  }

  /**
   * Display the michelson contract contents for the specified uri.
   * @param ligoUri Uri of the ligo document whose contract representation is to be instatiated.
   * @param michelsonUri Uri of the michelson contract to be displayed.
   * @param contents Contents of michelson file.
   */
  public async display(
    ligoUri: vscode.Uri,
    michelsonUri: vscode.Uri,
    contents: string
  ) {
    let view = this._views.get(michelsonUri);

    // Document attribute might become nullable unexpectedly
    if (!view || !view.doc) {
      view = await this.createView(ligoUri, michelsonUri, contents);
    } else {
      // Refresh michelson view with the new content
      // fire method triggers provideTextDocumentContent
      this.updateContents(view, contents);
      this._onDidChange.fire(michelsonUri);
    }

    vscode.window.showTextDocument(view.doc, {
      viewColumn: vscode.ViewColumn.Beside,
      preserveFocus: true,
      preview: true,
    });
  }

  /**
   * Create an instance of Michelson View for a ligo document uri.
   * @param ligoUri Uri of the ligo document whose contract representation is to be instatiated.
   * @param michelsonUri Uri of the michelson contract file.
   * @param contents Contents of michelson file.
   */
  private async createView(
    ligoUri: vscode.Uri,
    michelsonUri: vscode.Uri,
    contents: string
  ): Promise<MichelsonView> {
    const doc = await vscode.workspace.openTextDocument(michelsonUri);
    const newView = new MichelsonView(ligoUri, doc, contents);
    this._views.set(michelsonUri, newView);

    return newView;
  }

  /**
   * Update contents of a michelson view object
   * @param view Michelson view
   * @param contents Michelson code as a string.
   */
  private updateContents(view: MichelsonView, contents: string) {
    view.contents = contents;
    this._views.set(view.doc.uri, view);
  }
}

/**
 * Representation of a michelson document
 */
class MichelsonView {
  private _ligoUri: vscode.Uri;
  private _doc: vscode.TextDocument;
  private _contents: string;

  constructor(ligoUri: vscode.Uri, doc: vscode.TextDocument, contents: string) {
    this._ligoUri = ligoUri;
    this._doc = doc;
    this._contents = contents;
  }

  public get ligoUri(): vscode.Uri {
    return this._ligoUri;
  }

  public get doc(): vscode.TextDocument {
    return this._doc;
  }
  public set doc(value: vscode.TextDocument) {
    this._doc = value;
  }

  public get contents(): string {
    return this._contents;
  }
  public set contents(value: string) {
    this._contents = value;
  }
}
